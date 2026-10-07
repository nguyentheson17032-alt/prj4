package com.example.backend.controller;

import com.example.backend.entity.UserBan;
import com.example.backend.service.UserBanService;
import com.example.backend.service.UserService;
import com.example.backend.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/user-bans")
@CrossOrigin(origins = "http://localhost:3000")
@Tag(name = "User Ban", description = "User ban management APIs")
public class UserBanController {

    @Autowired
    private UserBanService userBanService;

    @Autowired
    private UserService userService;

    @Operation(summary = "Ban user permanently")
    @PostMapping("/ban-permanent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserBan> banUserPermanently(
            @Valid @RequestBody BanUserRequest request,
            Authentication authentication) {
        try {
            Long adminId = userService.findByUsername(authentication.getName()).getId();
            
            UserBan userBan = userBanService.banUserPermanently(
                    request.getUserId(),
                    adminId,
                    request.getReason(),
                    request.getDescription()
            );
            
            return ResponseEntity.ok(userBan);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Ban user temporarily")
    @PostMapping("/ban-temporary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserBan> banUserTemporarily(
            @Valid @RequestBody TemporaryBanUserRequest request,
            Authentication authentication) {
        try {
            Long adminId = userService.findByUsername(authentication.getName()).getId();
            
            UserBan userBan = userBanService.banUserTemporarily(
                    request.getUserId(),
                    adminId,
                    request.getReason(),
                    request.getDescription(),
                    request.getBanExpiresAt()
            );
            
            return ResponseEntity.ok(userBan);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Unban user")
    @PostMapping("/unban")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserBan> unbanUser(
            @Valid @RequestBody UnbanUserRequest request,
            Authentication authentication) {
        try {
            Long adminId = userService.findByUsername(authentication.getName()).getId();
            
            UserBan userBan = userBanService.unbanUser(
                    request.getUserId(),
                    adminId,
                    request.getUnbanReason()
            );
            
            return ResponseEntity.ok(userBan);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Check if user is banned")
    @GetMapping("/check/{userId}")
    public ResponseEntity<BanStatusResponse> checkUserBanStatus(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        try {
            boolean isBanned = userBanService.isUserBanned(userId);
            Optional<UserBan> activeBan = userBanService.getActiveBan(userId);
            
            BanStatusResponse response = new BanStatusResponse();
            response.setBanned(isBanned);
            response.setActiveBan(activeBan.orElse(null));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Get all bans for a user")
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserBan>> getAllBansByUserId(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        try {
            List<UserBan> bans = userBanService.getAllBansByUserId(userId);
            return ResponseEntity.ok(bans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Get all active bans")
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserBan>> getAllActiveBans() {
        try {
            List<UserBan> activeBans = userBanService.getAllActiveBans();
            return ResponseEntity.ok(activeBans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Get bans by status")
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserBan>> getBansByStatus(
            @Parameter(description = "Ban status") @PathVariable String status) {
        try {
            List<UserBan> bans = userBanService.getBansByStatus(status);
            return ResponseEntity.ok(bans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Get bans by type")
    @GetMapping("/type/{banType}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserBan>> getBansByType(
            @Parameter(description = "Ban type") @PathVariable String banType) {
        try {
            List<UserBan> bans = userBanService.getBansByType(banType);
            return ResponseEntity.ok(bans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Process expired temporary bans")
    @PostMapping("/process-expired")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> processExpiredBans() {
        try {
            userBanService.processExpiredBans();
            return ResponseEntity.ok("Expired bans processed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error processing expired bans: " + e.getMessage());
        }
    }

    @Operation(summary = "Resend ban emails")
    @PostMapping("/resend-ban-emails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> resendBanEmails() {
        try {
            userBanService.resendBanEmails();
            return ResponseEntity.ok("Ban emails resent successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error resending ban emails: " + e.getMessage());
        }
    }

    @Operation(summary = "Resend unban emails")
    @PostMapping("/resend-unban-emails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> resendUnbanEmails() {
        try {
            userBanService.resendUnbanEmails();
            return ResponseEntity.ok("Unban emails resent successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error resending unban emails: " + e.getMessage());
        }
    }

    @Operation(summary = "Get ban statistics")
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserBanService.BanStatistics> getBanStatistics() {
        try {
            UserBanService.BanStatistics statistics = userBanService.getBanStatistics();
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Request DTOs
    @Data
    public static class BanUserRequest {
        @NotNull(message = "User ID is required")
        private Long userId;

        @NotBlank(message = "Reason is required")
        private String reason;

        private String description;
    }

    @Data
    public static class TemporaryBanUserRequest {
        @NotNull(message = "User ID is required")
        private Long userId;

        @NotBlank(message = "Reason is required")
        private String reason;

        private String description;

        @NotNull(message = "Ban expiration date is required")
        private LocalDateTime banExpiresAt;
    }

    @Data
    public static class UnbanUserRequest {
        @NotNull(message = "User ID is required")
        private Long userId;

        private String unbanReason;
    }

    @Data
    public static class BanStatusResponse {
        private boolean banned;
        private UserBan activeBan;
    }
} 