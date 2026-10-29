package com.example.backend.service;

import com.example.backend.dto.DetailMessageDTO;
import com.example.backend.dto.RealtimeNotificationDTO;
import com.example.backend.entity.Notification;
import com.example.backend.entity.User;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class WebSocketRealtimeService {

    private static final Logger log = LoggerFactory.getLogger(WebSocketRealtimeService.class);
    private static final int MAX_SSE_PER_USER = 3;

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    @Lazy
    private NotificationRepository notificationRepository;

    @Autowired
    @Lazy
    private MessageRepository messageRepository;

    @Autowired
    @Lazy
    private UserRepository userRepository;

    // SSE emitters per user ID
    private final Map<Long, List<SseEmitter>> sseEmitters = new ConcurrentHashMap<>();

    @Autowired
    public WebSocketRealtimeService(@Lazy SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Broadcast new chat message over STOMP and SSE
     */
    public void broadcastChatMessage(DetailMessageDTO message, String senderUsername, String receiverUsername) {
        try {
            // 1. Topic per recipient user ID
            messagingTemplate.convertAndSend("/topic/messages/user/" + message.getReceiverId(), message);
            // 2. Topic per sender user ID (to sync sender across tabs/devices)
            messagingTemplate.convertAndSend("/topic/messages/user/" + message.getSenderId(), message);

            // 3. Pair conversation channel
            long minId = Math.min(message.getSenderId(), message.getReceiverId());
            long maxId = Math.max(message.getSenderId(), message.getReceiverId());
            messagingTemplate.convertAndSend("/topic/conversations/" + minId + "_" + maxId, message);

            // 4. STOMP user queue if receiver username is available
            if (receiverUsername != null && !receiverUsername.isEmpty()) {
                messagingTemplate.convertAndSendToUser(receiverUsername, "/queue/messages", message);
            }

            // 5. SSE fallback
            sendSseEvent(message.getReceiverId(), "chat_message", message);
            sendSseEvent(message.getSenderId(), "chat_message", message);

            log.info("WebSocket chat message broadcasted from {} to {}", message.getSenderId(), message.getReceiverId());
        } catch (Exception e) {
            log.error("Error broadcasting chat message: {}", e.getMessage(), e);
        }
    }

    /**
     * Broadcast notification over STOMP and SSE
     */
    public void broadcastNotification(Notification notification) {
        if (notification == null || notification.getUser() == null) {
            return;
        }

        try {
            RealtimeNotificationDTO dto = new RealtimeNotificationDTO(
                    notification.getId(),
                    notification.getUser().getId(),
                    notification.getTitle(),
                    notification.getMessage(),
                    notification.getType(),
                    notification.getIsRead(),
                    notification.getActionUrl(),
                    notification.getOrderId(),
                    notification.getStatus(),
                    notification.getCreatedAt()
            );

            Long userId = notification.getUser().getId();
            String username = notification.getUser().getUsername();

            // 1. STOMP topic for user
            messagingTemplate.convertAndSend("/topic/notifications/user/" + userId, dto);

            // 2. STOMP user queue
            if (username != null && !username.isEmpty()) {
                messagingTemplate.convertAndSendToUser(username, "/queue/notifications", dto);
            }

            // 3. SSE fallback
            sendSseEvent(userId, "notification", dto);

            log.info("WebSocket notification broadcasted to userId: {}", userId);
        } catch (Exception e) {
            log.error("Error broadcasting notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Broadcast unread counters update
     */
    public void broadcastUnreadCounts(Long userId, long unreadMessages, long unreadNotifications) {
        if (userId == null) return;
        Map<String, Object> payload = Map.of(
                "userId", userId,
                "unreadMessages", unreadMessages,
                "unreadNotifications", unreadNotifications
        );
        messagingTemplate.convertAndSend("/topic/counts/user/" + userId, payload);
        sendSseEvent(userId, "counts_update", payload);
    }

    /**
     * Overload: query database directly and broadcast current unread counts for user
     */
    public void broadcastUnreadCounts(Long userId) {
        if (userId == null) return;
        try {
            long unreadNotifs = 0L;
            if (notificationRepository != null) {
                Long cnt = notificationRepository.countUnreadNotifications(userId);
                unreadNotifs = cnt != null ? cnt : 0L;
            }

            long unreadMsgs = 0L;
            if (messageRepository != null && userRepository != null) {
                User u = userRepository.findById(userId).orElse(null);
                if (u != null) {
                    unreadMsgs = messageRepository.countUnreadMessages(u);
                }
            }
            broadcastUnreadCounts(userId, unreadMsgs, unreadNotifs);
        } catch (Exception e) {
            log.warn("Error calculating and broadcasting unread counts for user {}: {}", userId, e.getMessage());
        }
    }

    // --- SSE Emitter Management ---

    public SseEmitter registerSseEmitter(Long userId) {
        SseEmitter emitter = new SseEmitter(10 * 60 * 1000L); // 10 minutes timeout
        List<SseEmitter> list = sseEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>());

        // Limit concurrent SSE connections per user to prevent resource exhaustion
        while (list.size() >= MAX_SSE_PER_USER) {
            SseEmitter old = list.remove(0);
            try {
                old.complete();
            } catch (Exception ignored) {}
        }

        list.add(emitter);

        emitter.onCompletion(() -> list.remove(emitter));
        emitter.onTimeout(() -> list.remove(emitter));
        emitter.onError((e) -> list.remove(emitter));

        try {
            // Send initial connected confirmation
            emitter.send(SseEmitter.event().name("connected").data(Map.of("message", "SSE Connected successfully", "userId", userId)));
        } catch (IOException e) {
            list.remove(emitter);
        }

        return emitter;
    }

    /**
     * Periodic heartbeat every 20s: keeps proxy connection active and detects dead connections.
     */
    @Scheduled(fixedRate = 20000)
    public void sendHeartbeat() {
        sseEmitters.forEach((userId, list) -> {
            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (Exception e) {
                    dead.add(emitter);
                }
            }
            list.removeAll(dead);
        });
    }

    private void sendSseEvent(Long userId, String eventName, Object data) {
        List<SseEmitter> list = sseEmitters.get(userId);
        if (list == null || list.isEmpty()) return;

        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception e) {
                list.remove(emitter);
            }
        }
    }
}
