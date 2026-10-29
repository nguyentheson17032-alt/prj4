package com.example.backend.service;

import com.example.backend.entity.Notification;
import com.example.backend.entity.User;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;

    @Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private WebSocketRealtimeService webSocketRealtimeService;

    public NotificationService(NotificationRepository notificationRepository,
                             UserRepository userRepository,
                             PushNotificationService pushNotificationService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.pushNotificationService = pushNotificationService;
    }

    private void runAfterCommitOrImmediately(Runnable action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        action.run();
                    } catch (Exception e) {
                        logger.warn("[NotificationService] Action execution after commit failed: {}", e.getMessage());
                    }
                }
            });
        } else {
            try {
                action.run();
            } catch (Exception e) {
                logger.warn("[NotificationService] Action execution failed: {}", e.getMessage());
            }
        }
    }

    public Notification createNotification(Long userId, String title, String message,
                                         String type, String actionUrl, String relatedId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title != null ? title : "");
        notification.setMessage(message != null ? message : "");
        notification.setType(type != null ? type : "SYSTEM");
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setActionUrl(actionUrl);
        notification.setStatus("ACTIVE");
        if (relatedId != null && !relatedId.trim().isEmpty()) {
            try {
                notification.setOrderId(Long.valueOf(relatedId.trim()));
            } catch (NumberFormatException ignored) {}
        }

        notification = notificationRepository.save(notification);

        // Phát thông báo thời gian thực CHỈ SAU KHI TRANSACTION COMMIT THÀNH CÔNG (tránh thông báo ma khi rollback)
        final Notification savedNotification = notification;
        final Long targetUserId = userId;
        runAfterCommitOrImmediately(() -> {
            if (webSocketRealtimeService != null) {
                webSocketRealtimeService.broadcastNotification(savedNotification);
                webSocketRealtimeService.broadcastUnreadCounts(targetUserId);
            }
        });

        // Gửi push notification bất đồng bộ qua Firebase nếu user có deviceToken
        if (user.getDeviceToken() != null && !user.getDeviceToken().trim().isEmpty()) {
            Map<String, String> data = new HashMap<>();
            data.put("notificationId", String.valueOf(notification.getId()));
            data.put("type", notification.getType());
            if (notification.getActionUrl() != null) {
                data.put("actionUrl", notification.getActionUrl());
            }
            if (notification.getOrderId() != null) {
                data.put("orderId", String.valueOf(notification.getOrderId()));
            }

            pushNotificationService.sendPushNotificationAsync(
                user.getDeviceToken(),
                notification.getTitle(),
                notification.getMessage(),
                null,
                data
            );
        }

        return notification;
    }

    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        if (saved.getUser() != null) {
            final Long uid = saved.getUser().getId();
            runAfterCommitOrImmediately(() -> {
                if (webSocketRealtimeService != null) {
                    webSocketRealtimeService.broadcastUnreadCounts(uid);
                }
            });
        }
        return saved;
    }

    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadForUser(userId);
        runAfterCommitOrImmediately(() -> {
            if (webSocketRealtimeService != null) {
                webSocketRealtimeService.broadcastUnreadCounts(userId);
            }
        });
    }

    public void deleteAllReadNotifications(Long userId) {
        List<Notification> readNotifs = notificationRepository.findByUserIdAndIsRead(userId, true);
        if (readNotifs != null && !readNotifs.isEmpty()) {
            for (Notification n : readNotifs) {
                n.setStatus("DELETED");
            }
            notificationRepository.saveAll(readNotifs);
        }
        notificationRepository.deleteAllReadForUser(userId);
        runAfterCommitOrImmediately(() -> {
            if (webSocketRealtimeService != null) {
                webSocketRealtimeService.broadcastUnreadCounts(userId);
            }
        });
    }

    public void deleteNotification(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));

        notification.setStatus("DELETED");
        Notification saved = notificationRepository.save(notification);
        if (saved.getUser() != null) {
            final Long uid = saved.getUser().getId();
            runAfterCommitOrImmediately(() -> {
                if (webSocketRealtimeService != null) {
                    webSocketRealtimeService.broadcastUnreadCounts(uid);
                }
            });
        }
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findActiveNotificationsForUser(userId);
    }

    public Page<Notification> getUserNotificationsPaged(Long userId, Pageable pageable) {
        return notificationRepository.findActiveNotificationsForUser(userId, pageable);
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        Long count = notificationRepository.countUnreadNotifications(userId);
        return count != null ? count : 0L;
    }

    public List<Notification> getNotificationsByType(Long userId, String type) {
        return notificationRepository.findByUserIdAndType(userId, type);
    }

    public List<Notification> getRecentNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Tương thích ngược: Gửi push notification trực tiếp
     */
    public void sendPushNotification(String deviceToken, String title, String body, String imageUrl) {
        pushNotificationService.sendPushNotificationAsync(deviceToken, title, body, imageUrl, null);
    }

    public void updateDeviceToken(Long userId, String deviceToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        user.setDeviceToken(deviceToken);
        userRepository.save(user);
        logger.info("[NotificationService] Device token updated for user: {}", user.getUsername());
    }

    public void removeDeviceToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        user.setDeviceToken(null);
        userRepository.save(user);
        logger.info("[NotificationService] Device token removed for user: {}", user.getUsername());
    }
}
