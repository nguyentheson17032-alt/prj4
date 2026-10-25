package com.example.backend.controller;

import com.example.backend.entity.Notification;
import com.example.backend.entity.User;
import com.example.backend.service.NotificationService;
import com.example.backend.service.UserService;
import com.example.backend.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notification", description = "Notification management APIs")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserService userService;

    public NotificationController(NotificationService notificationService, UserService userService) {
        this.notificationService = notificationService;
        this.userService = userService;
    }

    @Operation(summary = "Create a new notification")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Notification> createNotification(
            @Valid @RequestBody NotificationRequest request) {
        try {
            Notification notification = notificationService.createNotification(
                    request.getUserId(),
                    request.getTitle(),
                    request.getMessage(),
                    request.getType(),
                    request.getActionUrl(),
                    request.getOrderId() != null ? request.getOrderId().toString() : null
            );
            return ResponseEntity.ok(notification);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Mark notification as read")
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Notification> markAsRead(
            @Parameter(description = "Notification ID") @PathVariable Long id) {
        try {
            Notification notification = notificationService.markAsRead(id);
            return ResponseEntity.ok(notification);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Delete all read notifications")
    @RequestMapping(value = {"/clear-read", "/read", "/read-all"}, method = {RequestMethod.DELETE, RequestMethod.POST})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteAllReadNotifications(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        notificationService.deleteAllReadNotifications(user.getId());
        return ResponseEntity.ok(java.util.Map.of("message", "Đã xóa tất cả thông báo đã đọc"));
    }

    @Operation(summary = "Delete a notification")
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(
            @Parameter(description = "Notification ID") @PathVariable Long id) {
        try {
            notificationService.deleteNotification(id);
            return ResponseEntity.ok().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get user notifications")
    @GetMapping("/user")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Notification>> getUserNotifications(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId()));
    }

    @Operation(summary = "Get unread notifications")
    @GetMapping("/unread")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Notification>> getUnreadNotifications(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        return ResponseEntity.ok(notificationService.getUnreadNotifications(user.getId()));
    }

    @Operation(summary = "Get notifications by type")
    @GetMapping("/type/{type}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Notification>> getNotificationsByType(
            @Parameter(description = "Notification type") @PathVariable String type,
            Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        return ResponseEntity.ok(notificationService.getNotificationsByType(user.getId(), type));
    }

    @Operation(summary = "Get recent notifications")
    @GetMapping("/recent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Notification>> getRecentNotifications(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        return ResponseEntity.ok(notificationService.getRecentNotifications(user.getId()));
    }

    @Operation(summary = "Get unread notifications count")
    @GetMapping("/unread/count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.Map<String, Object>> getUnreadNotificationCount(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        long count = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(java.util.Map.of("count", count));
    }

    @Operation(summary = "Mark all notifications as read")
    @RequestMapping(value = "/read-all", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(java.util.Map.of("message", "Đã đánh dấu tất cả thông báo là đã đọc"));
    }

    @Operation(summary = "Update device token for push notifications")
    @PostMapping("/device-token")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateDeviceToken(
            @Valid @RequestBody DeviceTokenRequest request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            User user = userService.findByUsername(username);
            notificationService.updateDeviceToken(user.getId(), request.getDeviceToken());
            return ResponseEntity.ok().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Remove device token for push notifications")
    @DeleteMapping("/device-token")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> removeDeviceToken(Authentication authentication) {
        try {
            String username = authentication.getName();
            User user = userService.findByUsername(username);
            notificationService.removeDeviceToken(user.getId());
            return ResponseEntity.ok().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

@Data
class NotificationRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    @NotBlank(message = "Type is required")
    private String type;

    private String actionUrl;

    private Long orderId;
}

@Data
class DeviceTokenRequest {
    @NotBlank(message = "Device token is required")
    private String deviceToken;
} 