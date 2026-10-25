package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.security.JwtTokenUtil;
import com.example.backend.service.UserService;
import com.example.backend.service.NotificationService;
import com.example.backend.service.PasswordResetService;
import lombok.Data;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.URL;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.example.backend.service.FileStorageService;
import com.example.backend.service.OrderPayoutService;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final AuthenticationManager authenticationManager;
    private final JwtTokenUtil jwtTokenUtil;
    private final UserService userService;
    private final NotificationService notificationService;
    private final PasswordResetService passwordResetService;
    private final FileStorageService fileStorageService;

    @Autowired(required = false)
    private OrderPayoutService orderPayoutService;

    @Autowired(required = false)
    private com.example.backend.repository.UserBanRepository userBanRepository;

    @Autowired(required = false)
    private com.example.backend.service.UserBanService userBanService;

    @Autowired(required = false)
    private com.example.backend.repository.UserRepository userRepository;

    @Autowired(required = false)
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager,
                         JwtTokenUtil jwtTokenUtil,
                         UserService userService,
                         NotificationService notificationService,
                         PasswordResetService passwordResetService,
                         FileStorageService fileStorageService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenUtil = jwtTokenUtil;
        this.userService = userService;
        this.notificationService = notificationService;
        this.passwordResetService = passwordResetService;
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/register")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            // Validate username
            if (registerRequest.getUsername() == null || registerRequest.getUsername().length() < 3) {
                return ResponseEntity.badRequest().body("Tên đăng nhập phải có ít nhất 3 ký tự");
            }

            // Validate password
            if (registerRequest.getPassword() == null || registerRequest.getPassword().length() < 8) {
                return ResponseEntity.badRequest().body("Mật khẩu phải có ít nhất 8 ký tự");
            }
            if (!registerRequest.getPassword().matches("^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$")) {
                return ResponseEntity.badRequest().body("Mật khẩu phải chứa ít nhất 1 chữ số, 1 chữ thường, 1 chữ hoa và 1 ký tự đặc biệt");
            }

            // Validate email
            if (registerRequest.getEmail() == null || !registerRequest.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                return ResponseEntity.badRequest().body("Email không hợp lệ");
            }

            // Check existing username/email
        if (userService.existsByUsername(registerRequest.getUsername())) {
            return ResponseEntity.badRequest().body("Tên đăng nhập đã tồn tại");
        }
        if (userService.existsByEmail(registerRequest.getEmail())) {
            return ResponseEntity.badRequest().body("Email đã tồn tại");
        }

            // Create user
        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setPassword(registerRequest.getPassword());
        user.setEmail(registerRequest.getEmail());
        user.setFullName(registerRequest.getFullName());
        user.setDateOfBirth(registerRequest.getDateOfBirth());
        user.setPhoneNumber(registerRequest.getPhoneNumber());
        user.setAddress(registerRequest.getAddress());
        user.setGender(registerRequest.getGender());
            user.setCoin(0L); // Initialize coin balance
        user.getRoles().add("ROLE_USER");
            user.setEnabled(true);
            user.setAccountNonExpired(true);
            user.setCredentialsNonExpired(true);
            user.setAccountNonLocked(true);

            // Gán avatar vui nhộn ngẫu nhiên
            String randomSeed = registerRequest.getUsername() + "_" + System.currentTimeMillis();
            String funAvatar = "https://api.dicebear.com/7.x/adventurer/svg?seed=" + randomSeed + "&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
            user.setAvatarUrl(funAvatar);

            userService.save(user);

            // Gửi notification chào mừng khi đăng ký
            notificationService.createNotification(
                user.getId(),
                "Chào mừng đến với PlayerDuo!",
                "Cảm ơn bạn đã đăng ký tài khoản tại PlayerDuo. Chúc bạn có những trải nghiệm tuyệt vời!",
                "welcome",
                null,
                null
            );

            return ResponseEntity.ok(Map.of(
                "message", "Đăng ký thành công",
                "username", user.getUsername(),
                "email", user.getEmail(),
                "phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "",
                "phone", user.getPhoneNumber() != null ? user.getPhoneNumber() : "",
                "avatarUrl", user.getAvatarUrl()
            ));
        } catch (Exception e) {
            logger.error("Lỗi khi đăng ký: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi khi đăng ký: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Validate input
            if (loginRequest.getUsername() == null || loginRequest.getUsername().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Tên đăng nhập không được để trống");
            }
            if (loginRequest.getPassword() == null || loginRequest.getPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Mật khẩu không được để trống");
            }

            // Check if user exists and ban status
            User existingUser = userService.findByUsername(loginRequest.getUsername().trim());
            if (existingUser == null && userRepository != null) {
                existingUser = userRepository.findByEmail(loginRequest.getUsername().trim()).orElse(null);
            }

            if (existingUser != null) {
                // Auto-check expired temporary ban
                if (userBanRepository != null) {
                    try {
                        java.util.Optional<com.example.backend.entity.UserBan> activeBanOpt = userBanRepository.findActiveBanByUserId(existingUser.getId());
                        if (activeBanOpt.isPresent()) {
                            com.example.backend.entity.UserBan ban = activeBanOpt.get();
                            if ("TEMPORARY".equalsIgnoreCase(ban.getBanType()) && ban.getBanExpiresAt() != null) {
                                if (java.time.LocalDateTime.now().isAfter(ban.getBanExpiresAt())) {
                                    ban.setStatus("EXPIRED");
                                    userBanRepository.save(ban);
                                    existingUser.setEnabled(true);
                                    existingUser.setAccountNonLocked(true);
                                    userService.save(existingUser);
                                }
                            }
                        }
                    } catch (Exception e) {
                        logger.warn("Lỗi kiểm tra ban hết hạn: {}", e.getMessage());
                    }
                }

                // Check if currently locked / disabled / active ban
                boolean isAccountLocked = !existingUser.isEnabled() || !existingUser.isAccountNonLocked();
                java.util.Optional<com.example.backend.entity.UserBan> currentActiveBan = userBanRepository != null ? 
                    userBanRepository.findActiveBanByUserId(existingUser.getId()) : java.util.Optional.empty();

                if (isAccountLocked || currentActiveBan.isPresent()) {
                    // Check password first
                    boolean passwordMatches = false;
                    if (passwordEncoder != null) {
                        passwordMatches = passwordEncoder.matches(loginRequest.getPassword(), existingUser.getPassword());
                    } else {
                        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
                        passwordMatches = encoder.matches(loginRequest.getPassword(), existingUser.getPassword());
                    }

                    if (passwordMatches) {
                        return buildBanResponse(existingUser, currentActiveBan.orElse(null));
                    } else {
                        return ResponseEntity.status(401).body("Tên đăng nhập hoặc mật khẩu không đúng");
                    }
                }
            }

            // Authenticate
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername().trim(),
                    loginRequest.getPassword()
                )
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtTokenUtil.generateToken(userDetails);
            String refreshToken = jwtTokenUtil.generateRefreshToken(userDetails);

            // Get user info
            User user = userService.findByUsername(loginRequest.getUsername().trim());
            if (user == null && userRepository != null) {
                user = userRepository.findByEmail(loginRequest.getUsername().trim()).orElse(null);
            }

            String avatar = user.getAvatarUrl();
            if (avatar == null || avatar.trim().isEmpty()) {
                avatar = "https://api.dicebear.com/7.x/adventurer/svg?seed=" + user.getUsername() + "&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
            }

            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("token", token);
            response.put("refreshToken", refreshToken);
            response.put("username", user.getUsername());
            response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
            response.put("email", user.getEmail() != null ? user.getEmail() : "");
            response.put("phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
            response.put("phone", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
            Long userBalance = user.getCoin() != null ? user.getCoin() : 0L;
            response.put("roles", user.getRoles());
            response.put("coin", userBalance);
            response.put("balance", userBalance);
            response.put("walletBalance", userBalance);
            response.put("id", user.getId());
            response.put("avatar", avatar);
            response.put("avatarUrl", avatar);

            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            logger.warn("Đăng nhập thất bại cho user: {}", loginRequest.getUsername());
            return ResponseEntity.status(401).body("Tên đăng nhập hoặc mật khẩu không đúng");
        } catch (org.springframework.security.authentication.LockedException | org.springframework.security.authentication.DisabledException e) {
            logger.warn("Tài khoản bị khóa đăng nhập: {}", loginRequest.getUsername());
            User targetUser = userService.findByUsername(loginRequest.getUsername().trim());
            if (targetUser == null && userRepository != null) {
                targetUser = userRepository.findByEmail(loginRequest.getUsername().trim()).orElse(null);
            }
            if (targetUser != null) {
                java.util.Optional<com.example.backend.entity.UserBan> b = userBanRepository != null ?
                    userBanRepository.findActiveBanByUserId(targetUser.getId()) : java.util.Optional.empty();
                return buildBanResponse(targetUser, b.orElse(null));
            }
            return ResponseEntity.status(403).body("Tài khoản của bạn đã bị khóa.");
        } catch (Exception e) {
            logger.error("Lỗi khi đăng nhập: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi khi đăng nhập: " + e.getMessage());
        }
    }

    private ResponseEntity<?> buildBanResponse(User user, com.example.backend.entity.UserBan ban) {
        java.util.Map<String, Object> banDetails = new java.util.HashMap<>();
        if (ban != null) {
            banDetails.put("reason", ban.getReason() != null ? ban.getReason() : "Vi phạm quy định cộng đồng");
            banDetails.put("description", ban.getDescription() != null ? ban.getDescription() : "");
            banDetails.put("banType", ban.getBanType() != null ? ban.getBanType() : "TEMPORARY");
            banDetails.put("bannedAt", ban.getBannedAt() != null ? ban.getBannedAt().toString() : java.time.LocalDateTime.now().toString());
            banDetails.put("banExpiresAt", ban.getBanExpiresAt() != null ? ban.getBanExpiresAt().toString() : null);
            banDetails.put("bannedBy", ban.getBannedBy() != null ? (ban.getBannedBy().getFullName() != null ? ban.getBannedBy().getFullName() : ban.getBannedBy().getUsername()) : "Ban Quản Trị");

            if ("TEMPORARY".equalsIgnoreCase(ban.getBanType()) && ban.getBanExpiresAt() != null) {
                java.time.Duration diff = java.time.Duration.between(java.time.LocalDateTime.now(), ban.getBanExpiresAt());
                long totalHours = Math.max(0, diff.toHours());
                long days = Math.max(0, diff.toDays());
                long hours = totalHours % 24;
                long minutes = Math.max(0, diff.toMinutes() % 60);
                banDetails.put("remainingDays", days);
                banDetails.put("remainingHours", hours);
                banDetails.put("remainingMinutes", minutes);
                banDetails.put("remainingFormatted", days > 0 ? (days + " ngày " + hours + " giờ") : (hours + " giờ " + minutes + " phút"));
            } else {
                banDetails.put("remainingDays", -1);
                banDetails.put("remainingFormatted", "Vĩnh viễn");
            }
        } else {
            banDetails.put("reason", "Tài khoản của bạn đang bị khóa bởi Quản trị viên.");
            banDetails.put("description", "Vui lòng liên hệ bộ phận hỗ trợ để được hỗ trợ kiểm tra và mở khóa.");
            banDetails.put("banType", "PERMANENT");
            banDetails.put("remainingDays", -1);
            banDetails.put("remainingFormatted", "Vĩnh viễn");
            banDetails.put("bannedBy", "Ban Quản Trị");
        }

        java.util.Map<String, Object> errResponse = new java.util.HashMap<>();
        errResponse.put("status", "BANNED");
        errResponse.put("error", "ACCOUNT_BANNED");
        errResponse.put("message", "Tài khoản của bạn đã bị khóa.");
        errResponse.put("banDetails", banDetails);

        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(errResponse);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            String username = jwtTokenUtil.getUsernameFromToken(request.getRefreshToken());
            UserDetails userDetails = userService.loadUserByUsername(username);
            
            if (jwtTokenUtil.validateToken(request.getRefreshToken(), userDetails)) {
                String newToken = jwtTokenUtil.generateToken(userDetails);
                String newRefreshToken = jwtTokenUtil.generateRefreshToken(userDetails);
                
                return ResponseEntity.ok(Map.of(
                    "token", newToken,
                    "refreshToken", newRefreshToken
                ));
            }
            
            return ResponseEntity.status(401).body("Refresh token không hợp lệ");
        } catch (Exception e) {
            logger.error("Lỗi khi refresh token: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi khi refresh token: " + e.getMessage());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, Authentication authentication) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            try {
                jwtTokenUtil.invalidateToken(jwt);
            } catch (Exception e) {
                logger.warn("Could not invalidate JWT on logout: {}", e.getMessage());
            }
        }
        if (authentication == null) return ResponseEntity.ok().build();
        User user = userService.findByUsername(authentication.getName());
        if (user != null) {
            userService.setUserOffline(user.getId());
            user.setDeviceToken(null);
            userRepository.save(user);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("Chưa đăng nhập");
        }
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        long frozenBalance = 0L;
        if (orderPayoutService != null) {
            try {
                orderPayoutService.checkAndReleasePendingPayouts();
                User refreshed = userService.findById(user.getId());
                if (refreshed != null) {
                    user = refreshed;
                }
                frozenBalance = orderPayoutService.getFrozenBalanceForUser(user.getId());
            } catch (Exception e) {
                logger.error("Lỗi khi quét kiểm tra giải ngân: {}", e.getMessage());
            }
        }

        String avatar = user.getAvatarUrl();
        if (avatar == null || avatar.trim().isEmpty()) {
            avatar = "https://api.dicebear.com/7.x/adventurer/svg?seed=" + user.getUsername() + "&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
        }

        Long userBalance = user.getCoin() != null ? user.getCoin() : 0L;
        // If out of sync with DB walletBalance, persist synced value
        if (user.getWalletBalance() == null || user.getWalletBalance().longValue() != userBalance) {
            user.setCoin(userBalance);
            userService.save(user);
        }

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        response.put("email", user.getEmail() != null ? user.getEmail() : "");
        response.put("phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
        response.put("phone", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
        response.put("address", user.getAddress());
        response.put("bio", user.getBio());
        response.put("gender", user.getGender());
        response.put("roles", user.getRoles());
        response.put("coin", userBalance);
        response.put("walletBalance", userBalance);
        response.put("balance", userBalance);
        response.put("availableBalance", userBalance);
        response.put("frozenBalance", frozenBalance);
        response.put("avatar", avatar);
        response.put("avatarUrl", avatar);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateUser(
            @Valid @RequestBody UpdateUserRequest request,
            Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        User updatedUser = userService.update(
            currentUser.getId(),
            request.getFullName(),
            request.getDateOfBirth(),
            request.getPhoneNumber(),
            request.getAddress(),
            request.getBio(),
            request.getGender()
        );
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/update/avatar")
    public ResponseEntity<?> updateAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        User updatedUser = userService.updateAvatar(currentUser.getId(), file);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/update/profile-image")
    public ResponseEntity<?> updateProfileImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        User updatedUser = userService.updateProfileImage(currentUser.getId(), file);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/update/cover-image")
    public ResponseEntity<?> updateCoverImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        String url = fileStorageService.storeFile(file, "cover-images");
        currentUser.setCoverImageUrl(url);
        userService.save(currentUser);
        return ResponseEntity.ok(Map.of("coverImageUrl", url));
    }

    @DeleteMapping("/delete/avatar")
    public ResponseEntity<?> deleteAvatar(Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        userService.deleteAvatar(currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/delete/profile-image")
    public ResponseEntity<?> deleteProfileImage(Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        userService.deleteProfileImage(currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/device-token")
    public ResponseEntity<?> saveDeviceToken(@RequestBody DeviceTokenRequest request, Authentication authentication) {
        try {
            if (request.getDeviceToken() == null || request.getDeviceToken().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Token thiết bị không được để trống");
            }
            User user = userService.findByUsername(authentication.getName());
            user.setDeviceToken(request.getDeviceToken().trim());
            userService.save(user);
            return ResponseEntity.ok(Map.of(
                "message", "Cập nhật token thiết bị thành công",
                "deviceToken", user.getDeviceToken()
            ));
        } catch (Exception e) {
            logger.error("Lỗi khi cập nhật device token: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Không thể cập nhật token thiết bị"));
        }
    }

    @PostMapping("/update/avatar-db")
    public ResponseEntity<?> updateAvatarDb(@RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        currentUser.setAvatarData(file.getBytes());
        userService.save(currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping(value = "/avatar/{userId}", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getAvatar(@PathVariable Long userId) {
        User user = userService.findById(userId);
        byte[] image = user.getAvatarData();
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(image);
    }

    @PostMapping("/update/profile-image-db")
    public ResponseEntity<?> updateProfileImageDb(@RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        currentUser.setProfileImageData(file.getBytes());
        userService.save(currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping(value = "/profile-image/{userId}", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getProfileImage(@PathVariable Long userId) {
        User user = userService.findById(userId);
        byte[] image = user.getProfileImageData();
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(image);
    }

    @PostMapping("/update/avatar-from-url")
    public ResponseEntity<?> updateAvatarFromUrl(@RequestBody ImageUrlRequest request, Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        URL url = new URL(request.getUrl());
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (InputStream is = url.openStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = is.read(buffer)) > 0) {
                baos.write(buffer, 0, n);
            }
        }
        currentUser.setAvatarData(baos.toByteArray());
        userService.save(currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/update/profile-image-from-url")
    public ResponseEntity<?> updateProfileImageFromUrl(@RequestBody ImageUrlRequest request, Authentication authentication) throws IOException {
        User currentUser = userService.findByUsername(authentication.getName());
        URL url = new URL(request.getUrl());
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (InputStream is = url.openStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = is.read(buffer)) > 0) {
                baos.write(buffer, 0, n);
            }
        }
        currentUser.setProfileImageData(baos.toByteArray());
        userService.save(currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/update/avatar-from-gallery")
    public ResponseEntity<?> updateAvatarFromGallery(@RequestBody Map<String, Object> request, Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        Object imageUrlObj = request.get("imageUrl");
        if (imageUrlObj == null) {
            return ResponseEntity.badRequest().body("imageUrl is required");
        }
        String imageUrl = imageUrlObj.toString();
        currentUser.setAvatarUrl(imageUrl);
        userService.save(currentUser);
        return ResponseEntity.ok(Map.of("avatarUrl", imageUrl));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        passwordResetService.createAndSendResetToken(email);
        return ResponseEntity.ok(Map.of("message", "Nếu email tồn tại, một liên kết đặt lại mật khẩu đã được gửi."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        if (token == null || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body("Token và mật khẩu mới là bắt buộc");
        }
        boolean result = passwordResetService.resetPassword(token, newPassword);
        if (result) {
            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công!"));
        } else {
            return ResponseEntity.badRequest().body("Token không hợp lệ hoặc đã hết hạn");
        }
    }

    @PostMapping("/change-password")
    @Transactional
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập để thực hiện"));
        }
        String oldPassword = request.get("oldPassword");
        String newPassword = request.get("newPassword");
        if (oldPassword == null || oldPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu hiện tại và mật khẩu mới là bắt buộc"));
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu mới phải có ít nhất 6 ký tự"));
        }
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy thông tin tài khoản"));
        }
        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        if (!encoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu hiện tại không chính xác"));
        }
        user.setPassword(encoder.encode(newPassword));
        userService.save(user);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công!"));
    }
}

@Data
class LoginRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    private String username;
    
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}

@Data
class RegisterRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, message = "Tên đăng nhập phải có ít nhất 3 ký tự")
    private String username;
    
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$", 
             message = "Mật khẩu phải chứa ít nhất 1 chữ số, 1 chữ thường, 1 chữ hoa và 1 ký tự đặc biệt")
    private String password;
    
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;
    
    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;
    
    private LocalDate dateOfBirth;
    
    private String phoneNumber;
    private String phone;
    
    private String address;
    
    private String gender;

    public String getPhoneNumber() {
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            return phoneNumber.trim();
        }
        if (phone != null && !phone.trim().isEmpty()) {
            return phone.trim();
        }
        return null;
    }
}

@Data
class RefreshTokenRequest {
    @NotBlank(message = "Refresh token không được để trống")
    private String refreshToken;
}

@Data
class UpdateUserRequest {
    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;
    
    private LocalDate dateOfBirth;
    
    private String phoneNumber;
    private String phone;
    
    private String address;
    
    private String bio;
    
    private String gender;

    public String getPhoneNumber() {
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            return phoneNumber.trim();
        }
        if (phone != null && !phone.trim().isEmpty()) {
            return phone.trim();
        }
        return null;
    }
}

@Data
class JwtResponse {
    private String token;

    public JwtResponse(String token) {
        this.token = token;
    }
}

@Data
class ImageUrlRequest {
    private String url;
} 