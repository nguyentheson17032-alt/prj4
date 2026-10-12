package com.example.backend.controller;

import com.example.backend.entity.Notification;
import com.example.backend.entity.User;
import com.example.backend.service.NotificationService;
import com.example.backend.service.UserService;
import com.example.backend.service.AdminNotificationService;
import com.example.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Notifications", description = "Admin notification management APIs")
public class AdminNotificationController {
    private final NotificationService notificationService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final AdminNotificationService adminNotificationService;

    public AdminNotificationController(NotificationService notificationService, UserService userService, UserRepository userRepository, AdminNotificationService adminNotificationService) {
        this.notificationService = notificationService;
        this.userService = userService;
        this.userRepository = userRepository;
        this.adminNotificationService = adminNotificationService;
    }

    @Operation(summary = "Get all notifications for admin")
    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications(Authentication authentication) {
        Long adminId = userService.findByUsername(authentication.getName()).getId();
        return ResponseEntity.ok(notificationService.getUserNotifications(adminId));
    }

    @Operation(summary = "Get unread notifications for admin")
    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(Authentication authentication) {
        Long adminId = userService.findByUsername(authentication.getName()).getId();
        return ResponseEntity.ok(notificationService.getUnreadNotifications(adminId));
    }

    @Operation(summary = "Get notifications by type for admin")
    @GetMapping("/type/{type}")
    public ResponseEntity<List<Notification>> getNotificationsByType(
            @PathVariable String type,
            Authentication authentication) {
        Long adminId = userService.findByUsername(authentication.getName()).getId();
        return ResponseEntity.ok(notificationService.getNotificationsByType(adminId, type));
    }

    @Operation(summary = "Mark notification as read")
    @PostMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @Operation(summary = "Delete notification")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Get notification statistics for admin")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getNotificationStats(Authentication authentication) {
        Long adminId = userService.findByUsername(authentication.getName()).getId();
        List<Notification> allNotifications = notificationService.getUserNotifications(adminId);
        List<Notification> unreadNotifications = notificationService.getUnreadNotifications(adminId);

        long topupCount = allNotifications.stream().filter(n -> "TOPUP".equals(n.getType())).count();
        long withdrawCount = allNotifications.stream().filter(n -> "WITHDRAW".equals(n.getType())).count();
        long reportCount = allNotifications.stream().filter(n -> "REPORT".equals(n.getType())).count();
        long vnpayCount = allNotifications.stream().filter(n -> "VNPAY".equals(n.getType())).count();
        long donateCount = allNotifications.stream().filter(n -> "DONATE".equals(n.getType())).count();

        return ResponseEntity.ok(Map.of(
                "total", allNotifications.size(),
                "unread", unreadNotifications.size(),
                "topup", topupCount,
                "withdraw", withdrawCount,
                "report", reportCount,
                "vnpay", vnpayCount,
                "donate", donateCount
        ));
    }

    @Operation(summary = "Mark all notifications as read")
    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        Long adminId = userService.findByUsername(authentication.getName()).getId();
        notificationService.getUnreadNotifications(adminId)
                .forEach(n -> notificationService.markAsRead(n.getId()));
        return ResponseEntity.ok().build();
    }
}
