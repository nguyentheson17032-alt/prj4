package com.example.backend.repository;

import com.example.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    @Query(value = "SELECT * FROM notifications WHERE user_id = :userId AND (status IS NULL OR status = 'ACTIVE') ORDER BY created_at DESC", nativeQuery = true)
    List<Notification> findActiveNotificationsForUser(@Param("userId") Long userId);
    
    @Query(value = "SELECT COUNT(*) FROM notifications WHERE user_id = :userId AND is_read = false AND (status IS NULL OR status = 'ACTIVE')", nativeQuery = true)
    Long countUnreadNotifications(@Param("userId") Long userId);
    
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query(value = "UPDATE notifications SET is_read = true WHERE user_id = :userId AND is_read = false", nativeQuery = true)
    void markAllAsReadForUser(@Param("userId") Long userId);
    
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query(value = "UPDATE notifications SET status = 'DELETED' WHERE user_id = :userId AND is_read = true", nativeQuery = true)
    void deleteAllReadForUser(@Param("userId") Long userId);
    
    void deleteByUserIdAndType(Long userId, String type);

    List<Notification> findByUserIdAndStatus(Long userId, String status);
    List<Notification> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);
    List<Notification> findByUserIdAndIsRead(Long userId, boolean isRead);
    List<Notification> findByUserIdAndType(Long userId, String type);

    void deleteByUserId(Long userId);
} 