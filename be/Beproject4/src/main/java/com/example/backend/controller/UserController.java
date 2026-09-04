package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.service.UserService;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PlayerReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Map;
import java.util.Set;
import org.springframework.http.MediaType;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final OrderRepository orderRepository;
    private final PlayerReviewRepository playerReviewRepository;

    @Autowired
    public UserController(UserService userService, OrderRepository orderRepository, PlayerReviewRepository playerReviewRepository) {
        this.userService = userService;
        this.orderRepository = orderRepository;
        this.playerReviewRepository = playerReviewRepository;
    }

    @GetMapping("/distribution")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getUserDistribution() {
        try {
            List<User> allUsers = userService.findAll();
            
            // Đếm số lượng user theo vai trò
            long regularUsers = 0;
            long gamers = 0;
            long newUsers = 0;
            long admins = 0;
            
            LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
            
            for (User user : allUsers) {
                // Kiểm tra vai trò
                boolean isAdmin = false;
                boolean isGamer = false;
                
                if (user.getRoles() != null) {
                    String rolesStr = user.getRoles().toString().toUpperCase();
                    isAdmin = rolesStr.contains("ADMIN") || rolesStr.contains("ROLE_ADMIN");
                    isGamer = rolesStr.contains("GAMER") || rolesStr.contains("PLAYER") || rolesStr.contains("ROLE_GAMER");
                }
                
                // Kiểm tra user mới (đăng ký trong 7 ngày qua)
                boolean isNewUser = user.getCreatedAt() != null && 
                                  user.getCreatedAt().isAfter(oneWeekAgo);
                
                if (isAdmin) {
                    admins++;
                } else if (isGamer) {
                    gamers++;
                } else if (isNewUser) {
                    newUsers++;
                } else {
                    regularUsers++;
                }
            }
            
            // Tạo dữ liệu cho biểu đồ
            List<Map<String, Object>> chartData = new ArrayList<>();
            
            if (regularUsers > 0) {
                chartData.add(Map.of(
                    "name", "Người dùng thường",
                    "value", regularUsers,
                    "color", "#4F46E5"
                ));
            }
            
            if (gamers > 0) {
                chartData.add(Map.of(
                    "name", "Game thủ",
                    "value", gamers,
                    "color", "#10B981"
                ));
            }
            
            if (newUsers > 0) {
                chartData.add(Map.of(
                    "name", "Người dùng mới",
                    "value", newUsers,
                    "color", "#F59E0B"
                ));
            }
            
            if (admins > 0) {
                chartData.add(Map.of(
                    "name", "Admin",
                    "value", admins,
                    "color", "#EF4444"
                ));
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("data", chartData);
            result.put("total", allUsers.size());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Lỗi khi lấy dữ liệu phân bổ người dùng: " + e.getMessage()));
        }
    }

    @GetMapping("/count")
    public ResponseEntity<Long> countUsers() {
        long count = userService.countUsers();
        return ResponseEntity.ok(count);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        // Trả về thông tin cơ bản, không trả về password
        return ResponseEntity.ok(new UserInfoDTO(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFullName(),
            user.getAvatarUrl(),
            user.getCoverImageUrl()
        ));
    }

    @GetMapping("/growth-percent")
    public ResponseEntity<Double> getUserGrowthPercent() {
        double percent = userService.getUserGrowthPercentComparedToLastWeek();
        return ResponseEntity.ok(percent);
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/details")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsersDetails() {
        List<User> users = userService.findAll();
        List<UserDetailDTO> userDetails = users.stream()
            .map(user -> {
                UserDetailDTO dto = UserDetailDTO.fromUser(user);
                // Tính toán thống kê
                dto.setTotalOrders(calculateTotalOrders(user.getId()));
                dto.setTotalReviews(calculateTotalReviews(user.getId()));
                dto.setAverageRating(calculateAverageRating(user.getId()));
                return dto;
            })
            .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(userDetails);
    }

    private int calculateTotalOrders(Long userId) {
        // Đếm số đơn hàng mà user đã thuê
        return orderRepository.findAll().stream()
            .filter(order -> order.getRenter() != null && order.getRenter().getId().equals(userId))
            .toList().size();
    }

    private int calculateTotalReviews(Long userId) {
        // Đếm số đánh giá mà user đã nhận (khi làm player)
        return playerReviewRepository.findByGamePlayerUserId(userId).size();
    }

    private Double calculateAverageRating(Long userId) {
        // Tính rating trung bình mà user nhận được
        return playerReviewRepository.getAverageRatingByPlayerId(userId);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userService.existsByUsername(user.getUsername())) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        if (userService.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body("Email already exists");
        }
        userService.save(user);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody User updatedUser) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        // Cập nhật các trường cho phép
        user.setFullName(updatedUser.getFullName());
        user.setEmail(updatedUser.getEmail());
        user.setPhoneNumber(updatedUser.getPhoneNumber());
        user.setAddress(updatedUser.getAddress());
        user.setBio(updatedUser.getBio());
        user.setGender(updatedUser.getGender());
        userService.save(user);
        return ResponseEntity.ok(user);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        userService.deleteById(userId);
        return ResponseEntity.ok("User deleted successfully");
    }

    @PatchMapping("/{userId}/lock")
    public ResponseEntity<?> lockUser(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        user.setAccountNonLocked(false);
        userService.save(user);
        return ResponseEntity.ok("User locked successfully");
    }

    @PatchMapping("/{userId}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        user.setAccountNonLocked(true);
        userService.save(user);
        return ResponseEntity.ok("User unlocked successfully");
    }

    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body("Password must be at least 8 characters");
        }
        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        user.setPassword(encoder.encode(newPassword));
        userService.save(user);
        return ResponseEntity.ok("Password reset successfully");
    }

    @PutMapping("/{userId}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserRoles(@PathVariable Long userId, @RequestBody Set<String> roles) {
        userService.updateUserRoles(userId, roles);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/online-status")
    public ResponseEntity<?> getUserOnlineStatus(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
            "userId", user.getId(),
            "isOnline", user.getIsOnline(),
            "lastActiveAt", user.getLastActiveAt()
        ));
    }

    @GetMapping("/{userId}/cover-image")
    public ResponseEntity<?> getUserCoverImage(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("coverImageUrl", user.getCoverImageUrl()));
    }

    @GetMapping(value = "/{userId}/cover-image-bytes", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getUserCoverImageBytes(@PathVariable Long userId) throws IOException {
        User user = userService.findById(userId);
        if (user == null || user.getCoverImageUrl() == null) {
            return ResponseEntity.notFound().build();
        }
        String filePath = user.getCoverImageUrl();
        // Đảm bảo đường dẫn vật lý đúng thư mục uploads/cover-images
        if (!filePath.startsWith("uploads/")) {
            if (filePath.startsWith("cover-images/")) {
                filePath = "uploads/" + filePath;
            } else {
                filePath = "uploads/cover-images/" + filePath;
            }
        }
        String absPath = System.getProperty("user.dir") + java.io.File.separator + filePath.replace("/", java.io.File.separator);
        java.io.File file = new java.io.File(absPath);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        byte[] imageBytes = Files.readAllBytes(Paths.get(file.getAbsolutePath()));
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(imageBytes);
    }

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentUsers() {
        var users = userService.findRecentUsers();
        return ResponseEntity.ok(users.stream().map(UserRecentDTO::fromUser).toList());
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getUserSummary() {
        var users = userService.findAll();
        return ResponseEntity.ok(users.stream().map(UserSummaryDTO::fromUser).toList());
    }
}

class UserInfoDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String coverImageUrl;

    public UserInfoDTO(Long id, String username, String email, String fullName, String avatarUrl, String coverImageUrl) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.coverImageUrl = coverImageUrl;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getCoverImageUrl() { return coverImageUrl; }
}

class UserRecentDTO {
    private String fullName;
    private String email;
    private String role;
    private String status;
    private String joinedDate;
    private Long balance;

    public static UserRecentDTO fromUser(User user) {
        UserRecentDTO dto = new UserRecentDTO();
        dto.fullName = user.getFullName();
        dto.email = user.getEmail();
        dto.role = user.getRoles() != null && !user.getRoles().isEmpty() ? user.getRoles().iterator().next() : "User";
        if (user.isEnabled() && user.isAccountNonLocked()) {
            dto.status = "Đang hoạt động";
        } else if (user.isEnabled() && !user.isAccountNonLocked()) {
            dto.status = "Bị khóa";
        } else if (!user.isEnabled() && user.isAccountNonLocked()) {
            dto.status = "Đang chờ duyệt";
        } else {
            dto.status = "Không hoạt động";
        }
        dto.joinedDate = user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate().toString() : "";
        dto.balance = user.getCoin();
        return dto;
    }

    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public String getJoinedDate() { return joinedDate; }
    public Long getBalance() { return balance; }
}

class UserSummaryDTO {
    private String fullName;
    private String email;
    private String role;
    private String status;
    private String createdDate;

    public static UserSummaryDTO fromUser(User user) {
        UserSummaryDTO dto = new UserSummaryDTO();
        dto.fullName = user.getFullName();
        dto.email = user.getEmail();
        dto.role = user.getRoles() != null && !user.getRoles().isEmpty() ? user.getRoles().iterator().next() : "User";
        if (user.isEnabled() && user.isAccountNonLocked()) {
            dto.status = "Đang hoạt động";
        } else if (user.isEnabled() && !user.isAccountNonLocked()) {
            dto.status = "Bị khóa";
        } else if (!user.isEnabled() && user.isAccountNonLocked()) {
            dto.status = "Đang chờ duyệt";
        } else {
            dto.status = "Không hoạt động";
        }
        dto.createdDate = user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate().toString() : "";
        return dto;
    }

    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public String getCreatedDate() { return createdDate; }
}

class UserDetailDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String dateOfBirth;
    private String phoneNumber;
    private String address;
    private String avatarUrl;
    private String coverImageUrl;
    private String bio;
    private String gender;
    private Long walletBalance;
    private Long coin;
    private Set<String> roles;
    private boolean enabled;
    private boolean accountNonLocked;
    private boolean isOnline;
    private String lastActiveAt;
    private String createdAt;
    private String status;
    private int totalOrders;
    private int totalReviews;
    private Double averageRating;

    public static UserDetailDTO fromUser(User user) {
        UserDetailDTO dto = new UserDetailDTO();
        dto.id = user.getId();
        dto.username = user.getUsername();
        dto.email = user.getEmail();
        dto.fullName = user.getFullName();
        dto.dateOfBirth = user.getDateOfBirth() != null ? user.getDateOfBirth().toString() : null;
        dto.phoneNumber = user.getPhoneNumber();
        dto.address = user.getAddress();
        dto.avatarUrl = user.getAvatarUrl();
        dto.coverImageUrl = user.getCoverImageUrl();
        dto.bio = user.getBio();
        dto.gender = user.getGender();
        dto.walletBalance = user.getWalletBalance() != null ? user.getWalletBalance().longValue() : 0L;
        dto.coin = user.getCoin();
        dto.roles = user.getRoles();
        dto.enabled = user.isEnabled();
        dto.accountNonLocked = user.isAccountNonLocked();
        dto.isOnline = user.getIsOnline();
        dto.lastActiveAt = user.getLastActiveAt() != null ? user.getLastActiveAt().toString() : null;
        dto.createdAt = user.getCreatedAt() != null ? user.getCreatedAt().toString() : null;
        
        // Xác định trạng thái
        if (user.isEnabled() && user.isAccountNonLocked()) {
            dto.status = "Đang hoạt động";
        } else if (user.isEnabled() && !user.isAccountNonLocked()) {
            dto.status = "Bị khóa";
        } else if (!user.isEnabled() && user.isAccountNonLocked()) {
            dto.status = "Đang chờ duyệt";
        } else {
            dto.status = "Không hoạt động";
        }
        
        return dto;
    }

    // Getters
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getDateOfBirth() { return dateOfBirth; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getAddress() { return address; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public String getBio() { return bio; }
    public String getGender() { return gender; }
    public Long getWalletBalance() { return walletBalance; }
    public Long getCoin() { return coin; }
    public Set<String> getRoles() { return roles; }
    public boolean isEnabled() { return enabled; }
    public boolean isAccountNonLocked() { return accountNonLocked; }
    public boolean getIsOnline() { return isOnline; }
    public String getLastActiveAt() { return lastActiveAt; }
    public String getCreatedAt() { return createdAt; }
    public String getStatus() { return status; }
    public int getTotalOrders() { return totalOrders; }
    public int getTotalReviews() { return totalReviews; }
    public Double getAverageRating() { return averageRating; }

    // Setters
    public void setTotalOrders(int totalOrders) { this.totalOrders = totalOrders; }
    public void setTotalReviews(int totalReviews) { this.totalReviews = totalReviews; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
} 