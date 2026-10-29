package com.example.backend.controller;

import com.example.backend.dto.ApiResponse;
import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.NotificationService;
import com.example.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kyc")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "KYC", description = "Xác minh danh tính (KYC) người chơi và duyệt KYC")
public class KycController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Data
    public static class KycSubmitRequest {
        @NotBlank(message = "Số CCCD/CMND không được để trống")
        private String citizenId;
        private String idCardFrontUrl;
        private String idCardBackUrl;
    }

    @Data
    public static class KycRejectRequest {
        private String reason;
    }

    private String maskCitizenId(String citizenId) {
        if (citizenId == null || citizenId.isBlank()) return "***";
        String trimmed = citizenId.trim();
        if (trimmed.length() <= 4) return "***" + trimmed;
        return "*".repeat(trimmed.length() - 4) + trimmed.substring(trimmed.length() - 4);
    }

    private boolean isValidImageUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }
        String lower = url.trim().toLowerCase();
        boolean hasValidPrefix = lower.startsWith("/uploads/") || lower.startsWith("http://") || lower.startsWith("https://");
        boolean hasValidExt = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".pdf");
        return hasValidPrefix && hasValidExt;
    }

    @PostMapping("/submit")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Người dùng gửi yêu cầu xác minh danh tính (KYC)")
    public ResponseEntity<ApiResponse<?>> submitKyc(@RequestBody KycSubmitRequest request, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Người dùng không tồn tại", null));
        }

        if ("VERIFIED".equalsIgnoreCase(user.getKycStatus())) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Tài khoản của bạn đã được xác minh danh tính trước đó", null));
        }

        if (!isValidImageUrl(request.getIdCardFrontUrl()) || !isValidImageUrl(request.getIdCardBackUrl())) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false,
                    "Đường dẫn ảnh mặt trước hoặc mặt sau CCCD không hợp lệ. Vui lòng tải lên ảnh (.jpg, .jpeg, .png, .webp, .pdf) từ nguồn an toàn", null));
        }

        user.setCitizenId(request.getCitizenId().trim());
        user.setIdCardFrontUrl(request.getIdCardFrontUrl().trim());
        user.setIdCardBackUrl(request.getIdCardBackUrl().trim());
        user.setKycStatus("PENDING");
        user.setKycRejectionReason(null);
        userRepository.save(user);

        log.info("[KYC] User #{} ({}) submitted KYC request with citizenId: {}", user.getId(), user.getUsername(), maskCitizenId(user.getCitizenId()));

        return ResponseEntity.ok(new ApiResponse<>(true, "Gửi thông tin KYC thành công. Vui lòng chờ quản trị viên phê duyệt.", Map.of(
                "kycStatus", user.getKycStatus(),
                "citizenId", maskCitizenId(user.getCitizenId())
        )));
    }

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xem trạng thái xác minh danh tính (KYC) của bản thân")
    public ResponseEntity<ApiResponse<?>> getKycStatus(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Người dùng không tồn tại", null));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("kycStatus", user.getKycStatus() != null ? user.getKycStatus() : "UNVERIFIED");
        data.put("citizenId", user.getCitizenId() != null ? maskCitizenId(user.getCitizenId()) : null);
        data.put("idCardFrontUrl", user.getIdCardFrontUrl());
        data.put("idCardBackUrl", user.getIdCardBackUrl());
        data.put("kycVerifiedAt", user.getKycVerifiedAt());
        data.put("kycRejectionReason", user.getKycRejectionReason());

        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy trạng thái KYC thành công", data));
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Admin lấy danh sách người dùng đang chờ duyệt KYC")
    public ResponseEntity<ApiResponse<?>> getPendingKycUsers() {
        List<User> pendingUsers = userRepository.findByKycStatusIgnoreCase("PENDING");

        List<Map<String, Object>> result = pendingUsers.stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("userId", u.getId());
            map.put("username", u.getUsername());
            map.put("fullName", u.getFullName());
            map.put("email", u.getEmail());
            map.put("phoneNumber", u.getPhoneNumber());
            map.put("citizenId", u.getCitizenId());
            map.put("idCardFrontUrl", u.getIdCardFrontUrl());
            map.put("idCardBackUrl", u.getIdCardBackUrl());
            map.put("kycStatus", u.getKycStatus());
            map.put("createdAt", u.getCreatedAt());
            return map;
        }).toList();

        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách chờ duyệt KYC thành công", result));
    }

    @PostMapping("/admin/{userId}/verify")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Admin phê duyệt KYC cho người dùng")
    public ResponseEntity<ApiResponse<?>> verifyKyc(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Người dùng không tồn tại", null));
        }

        user.setKycStatus("VERIFIED");
        user.setKycVerifiedAt(LocalDateTime.now());
        user.setKycRejectionReason(null);
        userRepository.save(user);

        try {
            notificationService.createNotification(
                    user.getId(),
                    "Xác minh danh tính (KYC) thành công!",
                    "Hồ sơ danh tính của bạn đã được Admin phê duyệt. Bây giờ bạn có thể thực hiện rút tiền đầy đủ.",
                    "kyc_verified",
                    "/wallet",
                    String.valueOf(user.getId())
            );
        } catch (Exception e) {
            log.error("[KYC] Failed to send verification notification: {}", e.getMessage());
        }

        log.info("[KYC] Admin verified KYC for user #{} ({})", user.getId(), user.getUsername());
        return ResponseEntity.ok(new ApiResponse<>(true, "Phê duyệt KYC thành công", Map.of("userId", user.getId(), "kycStatus", "VERIFIED")));
    }

    @PostMapping("/admin/{userId}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Admin từ chối KYC kèm lý do")
    public ResponseEntity<ApiResponse<?>> rejectKyc(@PathVariable Long userId, @RequestBody(required = false) KycRejectRequest request) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Người dùng không tồn tại", null));
        }

        String reason = (request != null && request.getReason() != null && !request.getReason().trim().isEmpty())
                ? request.getReason().trim()
                : "Hình ảnh hoặc thông tin CCCD không hợp lệ hoặc không rõ ràng";

        user.setKycStatus("REJECTED");
        user.setKycRejectionReason(reason);
        userRepository.save(user);

        try {
            notificationService.createNotification(
                    user.getId(),
                    "Xác minh danh tính (KYC) bị từ chối",
                    "Hồ sơ danh tính của bạn đã bị từ chối. Lý do: " + reason + ". Vui lòng cập nhật lại thông tin.",
                    "kyc_rejected",
                    "/wallet",
                    String.valueOf(user.getId())
            );
        } catch (Exception e) {
            log.error("[KYC] Failed to send rejection notification: {}", e.getMessage());
        }

        log.info("[KYC] Admin rejected KYC for user #{} ({}), reason: {}", user.getId(), user.getUsername(), reason);
        return ResponseEntity.ok(new ApiResponse<>(true, "Từ chối KYC thành công", Map.of("userId", user.getId(), "kycStatus", "REJECTED", "reason", reason)));
    }
}

