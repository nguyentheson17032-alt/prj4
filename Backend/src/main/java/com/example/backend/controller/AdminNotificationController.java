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
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/notifications")
@CrossOrigin(origins = "*")
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
        System.out.println("[AdminNotificationController] Controller initialized");
    }

    @Operation(summary = "Test endpoint")
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        System.out.println("[AdminNotificationController] Test endpoint called");
        return ResponseEntity.ok("AdminNotificationController is working!");
    }

    @Operation(summary = "Test admin detection")
    @GetMapping("/test-admin")
    public ResponseEntity<Map<String, Object>> testAdminDetection() {
        System.out.println("[AdminNotificationController] Test admin detection called");
        
        List<User> allUsers = userService.findAll();
        List<User> admins = userRepository.findAdmins();
        
        Map<String, Object> result = new HashMap<>();
        result.put("totalUsers", allUsers.size());
        result.put("totalAdmins", admins.size());
        result.put("admins", admins.stream().map(u -> Map.of(
            "id", u.getId(),
            "username", u.getUsername(),
            "roles", u.getRoles()
        )).collect(Collectors.toList()));
        
        System.out.println("[AdminNotificationController] Total users: " + allUsers.size());
        System.out.println("[AdminNotificationController] Total admins: " + admins.size());
        
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Test different admin queries")
    @GetMapping("/test-admin-queries")
    public ResponseEntity<Map<String, Object>> testAdminQueries() {
        System.out.println("[AdminNotificationController] Test admin queries called");
        
        List<User> allUsers = userService.findAll();
        List<User> admins1 = userRepository.findAdmins();
        List<User> admins2 = userRepository.findAllAdmins();
        List<User> admins3 = userRepository.findAdminsWithRole();
        List<User> admins4 = userRepository.findAllAdminsWithRole();
        
        Map<String, Object> result = new HashMap<>();
        result.put("totalUsers", allUsers.size());
        result.put("findAdmins", admins1.size());
        result.put("findAllAdmins", admins2.size());
        result.put("findAdminsWithRole", admins3.size());
        result.put("findAllAdminsWithRole", admins4.size());
        
        result.put("admins1", admins1.stream().map(u -> Map.of("id", u.getId(), "username", u.getUsername(), "roles", u.getRoles())).collect(Collectors.toList()));
        result.put("admins2", admins2.stream().map(u -> Map.of("id", u.getId(), "username", u.getUsername(), "roles", u.getRoles())).collect(Collectors.toList()));
        result.put("admins3", admins3.stream().map(u -> Map.of("id", u.getId(), "username", u.getUsername(), "roles", u.getRoles())).collect(Collectors.toList()));
        result.put("admins4", admins4.stream().map(u -> Map.of("id", u.getId(), "username", u.getUsername(), "roles", u.getRoles())).collect(Collectors.toList()));
        
        System.out.println("[AdminNotificationController] Query results:");
        System.out.println("[AdminNotificationController] findAdmins: " + admins1.size());
        System.out.println("[AdminNotificationController] findAllAdmins: " + admins2.size());
        System.out.println("[AdminNotificationController] findAdminsWithRole: " + admins3.size());
        System.out.println("[AdminNotificationController] findAllAdminsWithRole: " + admins4.size());
        
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Test send notification manually")
    @PostMapping("/test-send")
    public ResponseEntity<String> testSendNotification(Authentication authentication) {
        System.out.println("[AdminNotificationController] Test send notification called");
        
        try {
            User currentUser = userService.findByUsername(authentication.getName());
            System.out.println("[AdminNotificationController] Current user: " + currentUser.getUsername());
            
            // Tạo một thông báo test
            notificationService.createNotification(
                currentUser.getId(),
                "Test Notification",
                "Đây là thông báo test từ admin",
                "TEST",
                "/admin/test",
                null
            );
            
            System.out.println("[AdminNotificationController] Test notification sent successfully");
            return ResponseEntity.ok("Test notification sent successfully");
        } catch (Exception e) {
            System.err.println("[AdminNotificationController] Error sending test notification: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @Operation(summary = "Test AdminNotificationService directly")
    @PostMapping("/test-admin-service")
    public ResponseEntity<String> testAdminNotificationService(Authentication authentication) {
        System.out.println("[AdminNotificationController] Test AdminNotificationService called");
        
        try {
            User currentUser = userService.findByUsername(authentication.getName());
            System.out.println("[AdminNotificationController] Current user: " + currentUser.getUsername());
            
            // Test tìm admin
            List<User> admins = userRepository.findAdmins();
            System.out.println("[AdminNotificationController] Found " + admins.size() + " admins");
            
            if (admins.isEmpty()) {
                return ResponseEntity.badRequest().body("No admins found in database");
            }
            
            // Test gửi thông báo cho admin
            adminNotificationService.notifyAdminsAboutTopup(currentUser, 1000L);
            
            System.out.println("[AdminNotificationController] AdminNotificationService test completed successfully");
            return ResponseEntity.ok("AdminNotificationService test completed successfully. Found " + admins.size() + " admins.");
        } catch (Exception e) {
            System.err.println("[AdminNotificationController] Error testing AdminNotificationService: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @Operation(summary = "Get all notifications for admin")
    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications(Authentication authentication) {
        System.out.println("[AdminNotificationController] getAllNotifications called");
        Long adminId = userService.findByUsername(authentication.getName()).getId();
        System.out.println("[AdminNotificationController] Admin ID: " + adminId);
        List<Notification> notifications = notificationService.getUserNotifications(adminId);
        System.out.println("[AdminNotificationController] Found " + notifications.size() + " notifications");
        return ResponseEntity.ok(notifications);
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
        System.out.println("[AdminNotificationController] getNotificationStats called");
        Long adminId = userService.findByUsername(authentication.getName()).getId();
        System.out.println("[AdminNotificationController] Admin ID: " + adminId);
        List<Notification> allNotifications = notificationService.getUserNotifications(adminId);
        List<Notification> unreadNotifications = notificationService.getUnreadNotifications(adminId);
        
        long topupCount = allNotifications.stream()
                .filter(n -> "TOPUP".equals(n.getType()))
                .count();
        long withdrawCount = allNotifications.stream()
                .filter(n -> "WITHDRAW".equals(n.getType()))
                .count();
        long reportCount = allNotifications.stream()
                .filter(n -> "REPORT".equals(n.getType()))
                .count();
        long vnpayCount = allNotifications.stream()
                .filter(n -> "VNPAY".equals(n.getType()))
                .count();
        long donateCount = allNotifications.stream()
                .filter(n -> "DONATE".equals(n.getType()))
                .count();

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
        List<Notification> unreadNotifications = notificationService.getUnreadNotifications(adminId);
        
        for (Notification notification : unreadNotifications) {
            notificationService.markAsRead(notification.getId());
        }
        
        return ResponseEntity.ok().build();
    }
} 