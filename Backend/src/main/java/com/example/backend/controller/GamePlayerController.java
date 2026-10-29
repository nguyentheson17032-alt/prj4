package com.example.backend.controller;

import com.example.backend.dto.GamePlayerStatusResponse;
import com.example.backend.entity.GamePlayer;
import com.example.backend.service.GamePlayerService;
import com.example.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import com.example.backend.dto.PagedResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.Arrays;
import com.example.backend.entity.Game;
import com.example.backend.repository.GameRepository;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.service.UserService;
import com.example.backend.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import com.example.backend.entity.Payment;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.service.NotificationService;
import org.springframework.security.core.Authentication;
import java.util.stream.Collectors;
import com.example.backend.repository.RevenueRepository;
import com.example.backend.entity.Revenue;
import com.example.backend.entity.Order;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.ReviewRepository;
import com.example.backend.entity.PlayerReview;
import com.example.backend.repository.PlayerReviewRepository;
import com.example.backend.dto.ReviewRequest;
import com.example.backend.dto.GamePlayerSummaryDTO;
import com.example.backend.service.OrderService;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/game-players")
@Tag(name = "Game Player", description = "Game player management APIs")
public class GamePlayerController {
    private final GamePlayerService gamePlayerService;
    private final GameRepository gameRepository;
    private final UserService userService;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;
    private final RevenueRepository revenueRepository;
    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final PlayerReviewRepository playerReviewRepository;
    private final OrderService orderService;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.example.backend.service.OrderPayoutService orderPayoutService;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.example.backend.repository.UserBlockRepository userBlockRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.example.backend.service.CommissionService commissionService;

    @org.springframework.beans.factory.annotation.Value("${app.order.cancellation-free-hours:2}")
    private int cancellationFreeHours;

    @org.springframework.beans.factory.annotation.Value("${app.order.late-cancellation-fee-rate:0.30}")
    private double lateCancellationFeeRate;

    private static final Logger log = LoggerFactory.getLogger(GamePlayerController.class);
    private static final Set<String> VALID_STATUSES = Set.of("AVAILABLE", "HIRED", "OFFLINE", "BUSY", "PENDING", "REJECTED", "BANNED", "APPROVED");

    public GamePlayerController(GamePlayerService gamePlayerService, GameRepository gameRepository, UserService userService, PaymentRepository paymentRepository, NotificationService notificationService, RevenueRepository revenueRepository, ReviewRepository reviewRepository, OrderRepository orderRepository, PlayerReviewRepository playerReviewRepository, OrderService orderService) {
        this.gamePlayerService = gamePlayerService;
        this.gameRepository = gameRepository;
        this.userService = userService;
        this.paymentRepository = paymentRepository;
        this.notificationService = notificationService;
        this.revenueRepository = revenueRepository;
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.playerReviewRepository = playerReviewRepository;
        this.orderService = orderService;
    }

    @Data
    public static class GamePlayerRequest {
        @NotNull(message = "User ID is required")
        private Long userId;

        @NotNull(message = "Game ID is required")
        private Long gameId;

        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Rank is required")
        private String rank;

        private String role;

        @NotBlank(message = "Server is required")
        private String server;

        @NotNull(message = "Price per hour is required")
        @DecimalMin(value = "0.0", message = "Price must be greater than 0")
        private BigDecimal pricePerHour;

        @Size(max = 500, message = "Description must be less than 500 characters")
        private String description;
    }

    @Data
    public static class HireRequest {
        @NotNull(message = "User ID is required")
        private Long userId;

        @NotNull(message = "Hours is required")
        @Min(value = 1, message = "Hours must be at least 1")
        private Integer hours;

        @NotNull(message = "Coin is required")
        @Positive(message = "Coin must be positive")
        private Long coin;

        @NotNull(message = "Start time is required")
        private LocalDateTime startTime;

        @NotNull(message = "End time is required")
        private LocalDateTime endTime;

        private String specialRequest;
    }

    @Data
    public static class WorkingHoursRequest {
        private String workStartTime;
        private String workEndTime;
        private String workingDays;
        private Boolean acceptingOrders;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new game player")
    public ResponseEntity<ApiResponse<GamePlayer>> createGamePlayer(
            @Valid @RequestBody GamePlayerRequest request,
            Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
        Long targetUserId = (isAdmin && request.getUserId() != null) ? request.getUserId() : currentUser.getId();
        request.setUserId(targetUserId);

        // Kiểm tra user đã đăng ký game này chưa (cho phép đăng ký nhiều game khác nhau)
        if (gamePlayerService.existsByUserAndGame(targetUserId, request.getGameId())) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Bạn đã đăng ký game này rồi!", null));
        }
        User user = userService.findById(targetUserId);
        // Tự động cập nhật thông tin cơ bản nếu còn trống để đăng ký thuận lợi
        if (user.getFullName() == null || user.getFullName().trim().isEmpty()) {
            user.setFullName(request.getUsername());
        }
        if (user.getPhoneNumber() == null || user.getPhoneNumber().trim().isEmpty()) {
            user.setPhoneNumber("0987654321");
        }
        if (user.getDateOfBirth() == null) {
            user.setDateOfBirth(java.time.LocalDate.of(2000, 1, 1));
        }
        if (user.getAddress() == null || user.getAddress().trim().isEmpty()) {
            user.setAddress("Việt Nam");
        }
        userService.save(user);

        Game game = gameRepository.findById(request.getGameId())
                .orElseThrow(() -> new ResourceNotFoundException("Game not found"));

        if (game.getHasRoles()) {
            if (request.getRole() == null || request.getRole().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Role is required for this game", null));
            }
            if (game.getAvailableRoles() != null && !game.getAvailableRoles().isEmpty()) {
                java.util.List<String> availableUpper = game.getAvailableRoles().stream()
                    .map(r -> r.trim().toUpperCase())
                    .collect(java.util.stream.Collectors.toList());
                // Support multiple roles separated by " / "
                String[] parts = request.getRole().split("\\s*/\\s*");
                for (String part : parts) {
                    if (!availableUpper.contains(part.trim().toUpperCase())) {
                        return ResponseEntity.badRequest()
                            .body(new ApiResponse<>(false, "Invalid role for this game. Available roles: " +
                                String.join(", ", game.getAvailableRoles()), null));
                    }
                }
                // Preserve original casing joined
                String joined = java.util.Arrays.stream(parts)
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.joining(" / "));
                request.setRole(joined);
            }
        }
        // Tạo player từ thông tin user
        GamePlayer gamePlayer = gamePlayerService.createGamePlayer(
            user.getId(),
            request.getGameId(),
            request.getUsername(),
            request.getRank(),
            request.getRole(),
            request.getServer(),
            request.getPricePerHour(),
            request.getDescription()
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player created successfully", gamePlayer));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('PLAYER')")
    @Operation(summary = "Update a game player")
    public ResponseEntity<ApiResponse<GamePlayer>> updateGamePlayer(
            @PathVariable Long id,
            @Valid @RequestBody GamePlayerRequest request,
            Authentication authentication) {
        GamePlayer existing = gamePlayerService.findById(id);
        User currentUser = userService.findByUsername(authentication.getName());
        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
        if (!isAdmin && (existing.getUser() == null || !existing.getUser().getId().equals(currentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse<>(false, "Bạn không có quyền chỉnh sửa hồ sơ Player này!", null));
        }
        Long targetUserId = existing.getUser() != null ? existing.getUser().getId() : currentUser.getId();
        GamePlayer gamePlayer = gamePlayerService.updateGamePlayer(
            id,
            targetUserId,
            request.getGameId(),
            request.getUsername(),
            request.getRank(),
            request.getRole(),
            request.getServer(),
            request.getPricePerHour(),
            request.getDescription()
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player updated successfully", gamePlayer));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a game player application")
    public ResponseEntity<ApiResponse<GamePlayer>> approveGamePlayer(@PathVariable Long id) {
        GamePlayer gamePlayer = gamePlayerService.findById(id);
        gamePlayer.setStatus("AVAILABLE");
        User user = gamePlayer.getUser();
        if (user != null && !user.getRoles().contains("ROLE_PLAYER")) {
            user.getRoles().add("ROLE_PLAYER");
            userService.save(user);
        }
        gamePlayerService.save(gamePlayer);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player approved successfully", gamePlayer));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update game player status")
    public ResponseEntity<ApiResponse<GamePlayer>> updatePlayerStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        if (status == null || !VALID_STATUSES.contains(status.trim().toUpperCase())) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Trạng thái không hợp lệ. Các trạng thái cho phép: " + VALID_STATUSES, null));
        }
        GamePlayer gamePlayer = gamePlayerService.findById(id);
        String normalizedStatus = status.trim().toUpperCase();
        gamePlayer.setStatus(normalizedStatus);
        if ("AVAILABLE".equals(normalizedStatus) || "APPROVED".equals(normalizedStatus)) {
            gamePlayer.setStatus("AVAILABLE");
            User user = gamePlayer.getUser();
            if (user != null && !user.getRoles().contains("ROLE_PLAYER")) {
                user.getRoles().add("ROLE_PLAYER");
                userService.save(user);
            }
        }
        gamePlayerService.save(gamePlayer);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player status updated successfully", gamePlayer));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a game player")
    public ResponseEntity<ApiResponse<Void>> deleteGamePlayer(@PathVariable Long id) {
        gamePlayerService.deleteGamePlayer(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player deleted successfully", null));
    }

    @GetMapping("/game/{gameId}")
    @Operation(summary = "Get game players by game")
    public ResponseEntity<ApiResponse<List<GamePlayer>>> getGamePlayersByGame(@PathVariable Long gameId) {
        List<GamePlayer> gamePlayers = gamePlayerService.getGamePlayersByGame(gameId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game players retrieved successfully", gamePlayers));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get game players by user")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGamePlayersByUser(@PathVariable Long userId) {
        List<GamePlayer> gamePlayers = gamePlayerService.getGamePlayersByUser(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (GamePlayer gp : gamePlayers) {
            result.add(enrichGamePlayerData(gp));
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Game players retrieved successfully", result));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get game players by status")
    public ResponseEntity<ApiResponse<List<GamePlayer>>> getGamePlayersByStatus(@PathVariable String status) {
        List<GamePlayer> gamePlayers = gamePlayerService.getGamePlayersByStatus(status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game players retrieved successfully", gamePlayers));
    }

    @GetMapping("/rank/{rank}")
    @Operation(summary = "Get game players by rank")
    public ResponseEntity<ApiResponse<List<GamePlayer>>> getGamePlayersByRank(@PathVariable String rank) {
        List<GamePlayer> gamePlayers = gamePlayerService.getGamePlayersByRank(rank);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game players retrieved successfully", gamePlayers));
    }

    @GetMapping("/role/{role}")
    @Operation(summary = "Get game players by role")
    public ResponseEntity<ApiResponse<List<GamePlayer>>> getGamePlayersByRole(@PathVariable String role) {
        List<GamePlayer> gamePlayers = gamePlayerService.getGamePlayersByRole(role);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game players retrieved successfully", gamePlayers));
    }

    @GetMapping("/server/{server}")
    @Operation(summary = "Get game players by server")
    public ResponseEntity<ApiResponse<List<GamePlayer>>> getGamePlayersByServer(@PathVariable String server) {
        List<GamePlayer> gamePlayers = gamePlayerService.getGamePlayersByServer(server);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game players retrieved successfully", gamePlayers));
    }

    @GetMapping("/available")
    @Operation(summary = "Get available game players")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAvailableGamePlayers() {
        List<GamePlayer> gamePlayers = gamePlayerService.getAvailableGamePlayers();
        List<Map<String, Object>> result = new ArrayList<>();
        for (GamePlayer gp : gamePlayers) {
            result.add(enrichGamePlayerData(gp));
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Available game players retrieved successfully", result));
    }

    @PostMapping("/{id}/hire")
    @PreAuthorize("isAuthenticated()")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "Hire a game player")
    public ResponseEntity<ApiResponse<?>> hireGamePlayer(
            @PathVariable Long id,
            @Valid @RequestBody HireRequest request,
            Authentication authentication) {
        try {
            // Validate time
            if (request.getStartTime().isAfter(request.getEndTime())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Thời gian bắt đầu phải trước thời gian kết thúc", null));
            }

            // Check if player is available
            GamePlayer gamePlayer = gamePlayerService.findById(id);

            // Chống IDOR: User thuê luôn là user đang đăng nhập qua token
            User user = userService.findByUsername(authentication.getName());
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(false, "Vui lòng đăng nhập để thuê player", null));
            }

            // Check if user is attempting to hire themselves
            if (gamePlayer.getUser() != null && gamePlayer.getUser().getId().equals(user.getId())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Bạn không thể tự thuê chính mình", null));
            }

            // 1. Kiểm tra quan hệ chặn (UserBlock): nếu 1 trong 2 đã chặn nhau thì không cho thuê
            if (userBlockRepository != null && gamePlayer.getUser() != null) {
                if (userBlockRepository.isBlocked(user.getId(), gamePlayer.getUser().getId())) {
                    return ResponseEntity.badRequest()
                        .body(new ApiResponse<>(false, "Không thể thuê người chơi này do bạn hoặc người chơi đã chặn nhau", null));
                }
            }

            // 2. Kiểm tra player có đang bật nhận đơn hay không
            if (Boolean.FALSE.equals(gamePlayer.getAcceptingOrders())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Player hiện đang tạm ngưng nhận đơn thuê mới", null));
            }

            // 3. Kiểm tra ngày làm việc trong tuần của player
            if (gamePlayer.getWorkingDays() != null && !gamePlayer.getWorkingDays().trim().isEmpty()) {
                String dayOfWeek = request.getStartTime().getDayOfWeek().name();
                if (!gamePlayer.getWorkingDays().toUpperCase().contains(dayOfWeek)) {
                    return ResponseEntity.badRequest()
                        .body(new ApiResponse<>(false, "Player không nhận đơn vào ngày " + dayOfWeek + ". Lịch làm việc: " + gamePlayer.getWorkingDays(), null));
                }
            }

            // 4. Kiểm tra khung giờ làm việc của player
            if (gamePlayer.getWorkStartTime() != null && gamePlayer.getWorkEndTime() != null &&
                !gamePlayer.getWorkStartTime().trim().isEmpty() && !gamePlayer.getWorkEndTime().trim().isEmpty()) {
                try {
                    java.time.LocalTime workStart = java.time.LocalTime.parse(gamePlayer.getWorkStartTime().trim());
                    java.time.LocalTime workEnd = java.time.LocalTime.parse(gamePlayer.getWorkEndTime().trim());
                    java.time.LocalTime rentStart = request.getStartTime().toLocalTime();
                    java.time.LocalTime rentEnd = request.getEndTime().toLocalTime();

                    boolean withinWorkHours;
                    if (workStart.isBefore(workEnd)) {
                        withinWorkHours = !rentStart.isBefore(workStart) && !rentEnd.isAfter(workEnd);
                    } else {
                        withinWorkHours = !rentStart.isBefore(workStart) || !rentEnd.isAfter(workEnd);
                    }
                    if (!withinWorkHours) {
                        return ResponseEntity.badRequest()
                            .body(new ApiResponse<>(false, "Thời gian thuê nằm ngoài khung giờ làm việc của Player (" + 
                                    gamePlayer.getWorkStartTime() + " - " + gamePlayer.getWorkEndTime() + ")", null));
                    }
                } catch (Exception ex) {
                    log.warn("Could not parse player working hours: {}", ex.getMessage());
                }
            }

            // Calculate hours from start and end time
            long hours = java.time.Duration.between(request.getStartTime(), request.getEndTime()).toHours();
            if (hours < 1) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Thời gian thuê phải ít nhất 1 giờ", null));
            }

            // Chống Client-side Price Tampering: Server tự tính toán số coin dựa vào pricePerHour * hours
            long pricePerHour = gamePlayer.getPricePerHour() != null ? gamePlayer.getPricePerHour().longValue() : 0L;
            long originalCoin = pricePerHour * hours;
            if (originalCoin <= 0) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Giá thuê player không hợp lệ", null));
            }

            // Check user's coin balance
            if (user.getCoin() == null || user.getCoin() < originalCoin) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Số coin trong ví không đủ. Cần " + originalCoin + " xu để thuê.", null));
            }

            // 5. Kiểm tra trùng lịch: kiểm tra cả đơn CONFIRMED lẫn PENDING trong bảng orders
            List<Order> overlappingOrders = orderRepository.findOverlappingOrders(gamePlayer.getId(), request.getStartTime(), request.getEndTime());
            if (overlappingOrders != null && !overlappingOrders.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Player đã có đơn thuê khác trong khoảng thời gian này", null));
            }

            // Check if player is already hired in the requested time period via active payments
            List<Payment> activeHires = paymentRepository.findByPlayerIdAndStatusAndEndTimeAfter(
                gamePlayer.getUser().getId(), Payment.PaymentStatus.PENDING, LocalDateTime.now());
            boolean isOverlapping = activeHires.stream().anyMatch(payment ->
                request.getStartTime().isBefore(payment.getEndTime()) &&
                request.getEndTime().isAfter(payment.getStartTime())
            );
            if (isOverlapping) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Player đang được thuê trong khoảng thời gian này", null));
            }

            // 6. Tính toán chiết khấu nền tảng linh hoạt theo cấu hình / VIP / Player
            double commissionRate = commissionService != null 
                    ? commissionService.getCommissionRateForPlayer(gamePlayer) 
                    : 0.15;
            long platformFee = commissionService != null 
                    ? commissionService.calculatePlatformFee(originalCoin, commissionRate) 
                    : Math.round(originalCoin * 0.15);
            long playerReceivedTotal = originalCoin - platformFee;

            boolean deducted = userService.deductCoin(user.getId(), originalCoin);
            if (!deducted) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Số coin trong ví không đủ hoặc tài khoản đang có giao dịch khác. Cần " + originalCoin + " xu để thuê.", null));
            }
            user.setCoin(user.getCoin() - originalCoin);

            // Tạo đơn thuê (Order) với thông tin chiết khấu
            Order order = new Order();
            order.setRenter(user);
            order.setPlayer(gamePlayer);
            order.setStartTime(request.getStartTime());
            order.setEndTime(request.getEndTime());
            order.setPrice(originalCoin);
            order.setStatus("PENDING");
            order.setDiscountRate(commissionRate);
            order.setPlatformFee(platformFee);
            order.setPlayerReceived(playerReceivedTotal);
            orderRepository.save(order);

            // Tạo Payment record với type HIRE
            Payment payment = new Payment();
            payment.setUser(user); // Người thuê
            payment.setPlayer(gamePlayer.getUser()); // Người được thuê
            payment.setGamePlayer(gamePlayer);
            payment.setCoin(originalCoin);
            payment.setOriginalAmount(originalCoin);
            payment.setDiscountRate(commissionRate);
            payment.setPlatformFee(platformFee);
            payment.setPlayerReceived(playerReceivedTotal);
            payment.setCurrency("COIN");
            payment.setStatus(Payment.PaymentStatus.PENDING);
            payment.setPaymentMethod(Payment.PaymentMethod.HIRE);
            payment.setType(Payment.PaymentType.HIRE);
            payment.setStartTime(request.getStartTime());
            payment.setEndTime(request.getEndTime());
            payment.setDescription("Thuê player " + gamePlayer.getUsername() + " từ " + 
                request.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + 
                " đến " + request.getEndTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            payment.setCreatedAt(LocalDateTime.now());
            paymentRepository.save(payment);
            order.setPayment(payment);
            orderRepository.save(order);

            // Gửi notification cho player để xác nhận đơn thuê (có orderId)
            notificationService.createNotification(
                gamePlayer.getUser().getId(),
                "Bạn có đơn thuê mới!",
                "Bạn vừa nhận được yêu cầu thuê từ " + user.getUsername() + ". Vui lòng xác nhận đơn thuê trong hệ thống.",
                "rent",
                null,
                order.getId().toString()
            );
            // Gửi notification cho người thuê (user)
            notificationService.createNotification(
                user.getId(),
                "Đã gửi yêu cầu thuê player!",
                "Bạn đã gửi yêu cầu thuê player " + gamePlayer.getUsername() + ". Vui lòng chờ xác nhận từ player.",
                "rent_request",
                null,
                order.getId().toString()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("order", order);
            response.put("coin", order.getPrice());
            response.put("startTime", order.getStartTime());
            response.put("endTime", order.getEndTime());

            return ResponseEntity.ok(new ApiResponse<>(true, "Đã gửi yêu cầu thuê, chờ player xác nhận!", response));
        } catch (Exception e) {
            log.error("Error hiring game player: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error hiring game player: " + e.getMessage(), null));
        }
    }

    @PostMapping("/order/{orderId}/confirm")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "Player xác nhận đơn thuê (Order)")
    public ResponseEntity<ApiResponse<?>> confirmOrder(@PathVariable Long orderId, Authentication authentication) {
        try {
            User currentUser = userService.findByUsername(authentication.getName());
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
            GamePlayer gamePlayer = order.getPlayer();

            boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
            // Kiểm tra quyền xác nhận (player phải là người được thuê hoặc admin)
            if (!isAdmin && !gamePlayer.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse<>(false, "Bạn không có quyền xác nhận đơn này", null));
            }
            if (!"PENDING".equals(order.getStatus())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Đơn thuê không ở trạng thái chờ xác nhận", null));
            }

            // Số tiền người được thuê nhận được sẽ ở trạng thái đóng băng (PENDING) cho đến khi đơn hoàn thành + đánh giá >= 4 sao hoặc qua 24h
            User user = order.getRenter();
            long totalCoin = order.getPrice() != null ? order.getPrice() : 0L;
            double commissionRate = order.getDiscountRate() != null 
                    ? order.getDiscountRate() 
                    : (commissionService != null ? commissionService.getCommissionRateForPlayer(gamePlayer) : 0.15);
            long totalPlatformFee = commissionService != null 
                    ? commissionService.calculatePlatformFee(totalCoin, commissionRate) 
                    : Math.round(totalCoin * 0.15);
            long totalPlayerReceived = totalCoin - totalPlatformFee;

            order.setDiscountRate(commissionRate);
            order.setPlatformFee(totalPlatformFee);
            order.setPlayerReceived(totalPlayerReceived);
            order.setPayoutStatus("PENDING");
            order.setStatus("CONFIRMED");
            orderRepository.save(order);

            gamePlayer.setStatus("HIRED");
            gamePlayer.setHiredBy(user);
            gamePlayer.setHireDate(order.getStartTime());
            gamePlayer.setReturnDate(order.getEndTime());
            gamePlayer.setHoursHired((int) java.time.Duration.between(order.getStartTime(), order.getEndTime()).toHours());
            gamePlayerService.save(gamePlayer);

            // Gửi notification cho người thuê khi player xác nhận đơn
            notificationService.createNotification(
                user.getId(),
                "Đơn thuê đã được xác nhận!",
                "Player " + gamePlayer.getUsername() + " đã xác nhận đơn thuê của bạn. Hãy chuẩn bị trải nghiệm dịch vụ!",
                "rent_confirm",
                null,
                order.getId().toString()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("order", order);
            response.put("coin", order.getPrice());
            response.put("startTime", order.getStartTime());
            response.put("endTime", order.getEndTime());

            return ResponseEntity.ok(new ApiResponse<>(true, "Đã xác nhận đơn thuê thành công!", response));
        } catch (Exception e) {
            log.error("Error confirming order: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error confirming order: " + e.getMessage(), null));
        }
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Return a game player")
    public ResponseEntity<ApiResponse<GamePlayer>> returnGamePlayer(@PathVariable Long id) {
        GamePlayer gamePlayer = gamePlayerService.returnGamePlayer(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player returned successfully", gamePlayer));
    }

    @PutMapping("/{id}/rating")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Update game player rating")
    public ResponseEntity<ApiResponse<GamePlayer>> updateRating(
            @PathVariable Long id,
            @RequestParam @Min(0) @Max(5) Double rating) {
        GamePlayer gamePlayer = gamePlayerService.updateRating(id, rating);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player rating updated successfully", gamePlayer));
    }

    @PutMapping("/{id}/stats")
    @PreAuthorize("hasRole('ADMIN') or hasRole('PLAYER')")
    @Operation(summary = "Update game player stats")
    public ResponseEntity<ApiResponse<GamePlayer>> updateStats(
            @PathVariable Long id,
            @RequestParam @Min(0) Integer totalGames,
            @RequestParam @Min(0) @Max(100) Integer winRate) {
        GamePlayer gamePlayer = gamePlayerService.updateStats(id, totalGames, winRate);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player stats updated successfully", gamePlayer));
    }

    public Map<String, Object> enrichGamePlayerData(GamePlayer gp) {
        Map<String, Object> map = new HashMap<>();
        if (gp == null) return map;

        long completedOrders = orderRepository.countCompletedOrdersByPlayerId(gp.getId());
        List<PlayerReview> gpReviews = playerReviewRepository.findByGamePlayerId(gp.getId());
        List<PlayerReview> userReviews = (gp.getUser() != null)
                ? playerReviewRepository.findByGamePlayerUserId(gp.getUser().getId())
                : java.util.Collections.emptyList();
        int reviewCount = Math.max(gpReviews.size(), userReviews.size());

        Double avgRating = null;
        if (reviewCount > 0) {
            avgRating = playerReviewRepository.getAverageRatingByGamePlayerId(gp.getId());
            if (avgRating == null && gp.getUser() != null) {
                avgRating = playerReviewRepository.getAverageRatingByPlayerId(gp.getUser().getId());
            }
        }

        // Đồng bộ ngược lại DB nếu có sai lệch
        boolean dirty = false;
        if (gp.getTotalGames() == null || gp.getTotalGames() != (int) completedOrders) {
            gp.setTotalGames((int) completedOrders);
            dirty = true;
        }
        if (reviewCount > 0 && avgRating != null) {
            Double rounded = Math.round(avgRating * 10.0) / 10.0;
            if (gp.getRating() == null || !gp.getRating().equals(rounded)) {
                gp.setRating(rounded);
                dirty = true;
            }
        } else if (reviewCount == 0 && gp.getRating() != null) {
            gp.setRating(null);
            dirty = true;
        }
        if (dirty) {
            gamePlayerService.save(gp);
        }

        map.put("id", gp.getId());
        map.put("username", gp.getUsername());
        map.put("game", gp.getGame());
        map.put("rank", gp.getRank());
        map.put("role", gp.getRole());
        map.put("server", gp.getServer());
        map.put("pricePerHour", gp.getPricePerHour());
        map.put("status", gp.getStatus());
        map.put("description", gp.getDescription());
        map.put("rating", (reviewCount > 0 && avgRating != null) ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
        map.put("totalGames", gp.getTotalGames() != null ? gp.getTotalGames() : (int) completedOrders);
        map.put("orderCount", (int) completedOrders);
        map.put("totalOrders", (int) completedOrders);
        map.put("reviewCount", reviewCount);
        map.put("ratingCount", reviewCount);
        map.put("totalReviews", reviewCount);
        map.put("winRate", gp.getWinRate());
        map.put("hiredBy", gp.getHiredBy());
        map.put("user", gp.getUser());
        map.put("hireDate", gp.getHireDate());
        map.put("returnDate", gp.getReturnDate());
        map.put("hoursHired", gp.getHoursHired());
        map.put("totalMinutesHired", gp.getTotalMinutesHired());
        map.put("lastRewardMilestone", gp.getLastRewardMilestone());
        map.put("createdAt", gp.getCreatedAt());

        // Tính tổng giờ chơi đã được thuê dựa trên số đơn đã hoàn thành
        List<Order> completedOrderList = orderRepository.findByPlayer_IdAndStatus(gp.getId(), "COMPLETED");
        long totalHours = completedOrderList.stream()
            .mapToLong(o -> {
                if (o.getStartTime() != null && o.getEndTime() != null) {
                    long h = java.time.Duration.between(o.getStartTime(), o.getEndTime()).toHours();
                    if (h > 0) return h;
                }
                if (o.getPrice() != null && gp.getPricePerHour() != null && gp.getPricePerHour().compareTo(BigDecimal.ZERO) > 0) {
                    long h = Math.round((double) o.getPrice() / gp.getPricePerHour().doubleValue());
                    if (h > 0) return h;
                }
                return 1L;
            })
            .sum();
        map.put("totalHours", totalHours);

        return map;
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get game player by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGamePlayerById(@PathVariable Long id) {
        GamePlayer gamePlayer = gamePlayerService.findById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player retrieved successfully", enrichGamePlayerData(gamePlayer)));
    }

    @GetMapping
    public ResponseEntity<?> getAllGamePlayers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
            Page<GamePlayer> playerPage = gamePlayerService.getAllGamePlayers(pageable);
            Page<Map<String, Object>> enrichedPage = playerPage.map(this::enrichGamePlayerData);
            return ResponseEntity.ok(new ApiResponse<>(true, "All game players retrieved successfully", PagedResponse.from(enrichedPage)));
        }
        List<GamePlayer> gamePlayers = gamePlayerService.getAllGamePlayers();
        List<Map<String, Object>> result = new ArrayList<>();
        for (GamePlayer gp : gamePlayers) {
            result.add(enrichGamePlayerData(gp));
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "All game players retrieved successfully", result));
    }

    @GetMapping("/{playerId}/status")
    public ResponseEntity<GamePlayerStatusResponse> getPlayerStatus(@PathVariable Long playerId) {
        try {
            GamePlayerStatusResponse status = gamePlayerService.getPlayerStatus(playerId);
            return ResponseEntity.ok(status);
        } catch (ResourceNotFoundException e) {
            log.error("Player not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (RuntimeException e) {
            log.error("Error getting player status: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/order/{orderId}/reject")
    @PreAuthorize("isAuthenticated()")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "Player từ chối đơn thuê (Order)")
    public ResponseEntity<ApiResponse<?>> rejectOrder(
            @PathVariable Long orderId,
            Authentication authentication) {
        try {
            User currentUser = userService.findByUsername(authentication.getName());
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
            GamePlayer gamePlayer = order.getPlayer();

            boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
            // Kiểm tra quyền từ chối (player phải là người được thuê hoặc admin)
            if (!isAdmin && !gamePlayer.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse<>(false, "Bạn không có quyền từ chối đơn này", null));
            }

            // Chỉ cho phép từ chối khi đơn đang chờ xác nhận
            if (!"PENDING".equals(order.getStatus())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Chỉ có thể từ chối đơn khi đang chờ xác nhận", null));
            }

            // Hoàn lại coin an toàn cho người thuê (vì đã trừ khi tạo đơn)
            User renter = order.getRenter();
            if (renter != null && order.getPrice() != null && order.getPrice() > 0) {
                userService.addCoin(renter.getId(), order.getPrice());
                renter.setCoin((renter.getCoin() != null ? renter.getCoin() : 0L) + order.getPrice());
            }

            // Cập nhật trạng thái player
            gamePlayer.setStatus("AVAILABLE");
            gamePlayer.setHiredBy(null);
            gamePlayer.setHireDate(null);
            gamePlayer.setReturnDate(null);
            gamePlayer.setHoursHired(null);
            gamePlayerService.save(gamePlayer);

            // Cập nhật trạng thái đơn
            order.setStatus("REJECTED");
            orderRepository.save(order);

            // Gửi notification cho người thuê khi player từ chối đơn
            notificationService.createNotification(
                order.getRenter().getId(),
                "Đơn thuê bị từ chối",
                "Đơn thuê của bạn đã bị từ chối bởi player " + gamePlayer.getUsername() + ".",
                "rent_reject",
                null,
                order.getId().toString()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("gamePlayer", gamePlayer);
            response.put("order", order);
            response.put("refundedCoin", order.getPrice());

            return ResponseEntity.ok(new ApiResponse<>(true, "Từ chối đơn thuê thành công", response));
        } catch (Exception e) {
            log.error("Error rejecting order: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error rejecting order: " + e.getMessage(), null));
        }
    }

    @PostMapping("/order/{orderId}/cancel")
    @PreAuthorize("isAuthenticated()")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "User hủy đơn thuê (Order)")
    public ResponseEntity<ApiResponse<?>> cancelOrder(
            @PathVariable Long orderId,
            Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName());
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
            GamePlayer gamePlayer = order.getPlayer();

            boolean isAdmin = user.getRoles() != null && user.getRoles().contains("ROLE_ADMIN");
            boolean isRenter = order.getRenter() != null && user.getId().equals(order.getRenter().getId());
            boolean isPlayer = gamePlayer != null && gamePlayer.getUser() != null && user.getId().equals(gamePlayer.getUser().getId());

            if (!isAdmin && !isRenter && !isPlayer) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse<>(false, "Bạn không có quyền hủy đơn này", null));
            }

            // Chỉ cho phép hủy khi đơn đang ở trạng thái PENDING hoặc CONFIRMED
            String orderStatus = order.getStatus() != null ? order.getStatus().toUpperCase() : "";
            if (!"PENDING".equals(orderStatus) && !"CONFIRMED".equals(orderStatus)) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Không thể hủy đơn hàng ở trạng thái " + order.getStatus(), null));
            }

            LocalDateTime now = LocalDateTime.now();
            long totalOrderPrice = order.getPrice() != null ? order.getPrice() : 0L;
            long cancellationFee = 0L;
            long refundedCoin = totalOrderPrice;
            String cancelReason;

            if (isAdmin && !isRenter && !isPlayer) {
                // Quản trị viên (Admin) can thiệp hủy đơn của người khác: hoàn 100%, không tính phí phạt
                cancellationFee = 0L;
                refundedCoin = totalOrderPrice;
                cancelReason = "Quản trị viên (Admin) can thiệp hủy đơn hàng #" + order.getId();
            } else if ("PENDING".equals(orderStatus)) {
                // Đơn PENDING: Hủy tự do, hoàn tiền 100%, không phạt
                cancellationFee = 0L;
                refundedCoin = totalOrderPrice;
                cancelReason = isPlayer ? "Player hủy yêu cầu thuê khi đang chờ xác nhận" : "Khách hàng hủy yêu cầu thuê khi đang chờ xác nhận";
            } else {
                // Đơn CONFIRMED: Áp dụng chính sách hủy
                if (isPlayer) {
                    // Nếu chính Player hủy đơn đã cam kết: Hoàn 100% cho renter, không phạt renter
                    cancellationFee = 0L;
                    refundedCoin = totalOrderPrice;
                    cancelReason = "Player chủ động hủy đơn thuê đã xác nhận";
                } else {
                    // Người thuê (Renter) hủy đơn đã CONFIRMED:
                    if (order.getStartTime() != null && now.isAfter(order.getStartTime())) {
                        return ResponseEntity.badRequest().body(new ApiResponse<>(false,
                            "Đơn thuê đã bắt đầu lúc " + order.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")) +
                            ". Không thể tự ý hủy đơn, vui lòng gửi khiếu nại (Report) nếu có sự cố.", null));
                    }

                    long minutesBeforeStart = order.getStartTime() != null 
                            ? java.time.Duration.between(now, order.getStartTime()).toMinutes() 
                            : 0L;

                    if (minutesBeforeStart >= cancellationFreeHours * 60) {
                        // Hủy sớm (>= 2h trước giờ bắt đầu): Hoàn 100%
                        cancellationFee = 0L;
                        refundedCoin = totalOrderPrice;
                        cancelReason = "Khách hàng hủy sớm trước giờ bắt đầu (" + minutesBeforeStart + " phút). Hoàn tiền 100%.";
                    } else {
                        // Hủy muộn sát giờ (< 2h trước giờ bắt đầu): Phạt 30% phí hủy
                        cancellationFee = Math.round(totalOrderPrice * lateCancellationFeeRate);
                        refundedCoin = Math.max(0L, totalOrderPrice - cancellationFee);
                        cancelReason = "Khách hàng hủy sát giờ (" + minutesBeforeStart + " phút trước khi bắt đầu). Áp dụng phí hủy " +
                                (int)(lateCancellationFeeRate * 100) + "% (" + cancellationFee + " xu).";

                        // Bồi thường khoản phí hủy 30% cho Player
                        if (gamePlayer != null && gamePlayer.getUser() != null && cancellationFee > 0) {
                            User playerUser = gamePlayer.getUser();
                            userService.addCoin(playerUser.getId(), cancellationFee);
                            playerUser.setCoin((playerUser.getCoin() != null ? playerUser.getCoin() : 0L) + cancellationFee);

                            try {
                                Payment compPayment = new Payment();
                                if (order.getRenter() != null) compPayment.setUser(order.getRenter());
                                compPayment.setPlayer(playerUser);
                                compPayment.setGamePlayer(gamePlayer);
                                compPayment.setCoin(cancellationFee);
                                compPayment.setCurrency("COIN");
                                compPayment.setStatus(Payment.PaymentStatus.COMPLETED);
                                compPayment.setType(Payment.PaymentType.HIRE);
                                compPayment.setPaymentMethod(Payment.PaymentMethod.HIRE);
                                compPayment.setCreatedAt(now);
                                compPayment.setCompletedAt(now);
                                compPayment.setDescription("Bồi thường phí hủy muộn đơn #" + order.getId() + " từ khách hàng");
                                paymentRepository.save(compPayment);
                            } catch (Exception ex) {
                                log.error("Failed to save compensation payment: {}", ex.getMessage());
                            }

                            try {
                                notificationService.createNotification(
                                    playerUser.getId(),
                                    "Nhận bồi thường phí hủy đơn",
                                    "Đơn thuê #" + order.getId() + " bị hủy sát giờ. Bạn nhận được " +
                                            String.format("%,d", cancellationFee) + " xu phí bồi thường.",
                                    "rent_cancel_compensation",
                                    "/wallet",
                                    order.getId().toString()
                                );
                            } catch (Exception ex) {
                                log.error("Failed to notify player about compensation: {}", ex.getMessage());
                            }
                        }
                    }
                }
            }

            // Hoàn lại coin an toàn cho người thuê
            User renter = order.getRenter();
            if (renter != null && refundedCoin > 0) {
                userService.addCoin(renter.getId(), refundedCoin);
                renter.setCoin((renter.getCoin() != null ? renter.getCoin() : 0L) + refundedCoin);
            }

            // Cập nhật trạng thái payment gốc
            if (order.getPayment() != null) {
                Payment origPayment = order.getPayment();
                origPayment.setStatus(Payment.PaymentStatus.CANCELED);
                origPayment.setDescription("Đã hủy đơn: " + cancelReason);
                paymentRepository.save(origPayment);
            }

            // Cập nhật trạng thái player
            gamePlayer.setStatus("AVAILABLE");
            gamePlayer.setHiredBy(null);
            gamePlayer.setHireDate(null);
            gamePlayer.setReturnDate(null);
            gamePlayer.setHoursHired(null);
            gamePlayerService.save(gamePlayer);

            // Cập nhật trạng thái đơn
            order.setStatus("CANCELED");
            order.setPayoutStatus("REFUNDED");
            order.setCancellationFee(cancellationFee);
            order.setCancellationReason(cancelReason);
            order.setCancelledBy(user);
            orderRepository.save(order);

            // Gửi notification phù hợp
            if (isPlayer) {
                // Player hủy đơn: gửi cho renter
                if (renter != null) {
                    notificationService.createNotification(
                        renter.getId(),
                        "Đơn thuê đã bị hủy bởi Player",
                        "Đơn thuê #" + order.getId() + " đã bị hủy bởi player " + gamePlayer.getUsername() +
                        ". Số tiền " + String.format("%,d", refundedCoin) + " xu đã được hoàn lại đầy đủ vào ví.",
                        "rent_reject",
                        "/orders",
                        order.getId().toString()
                    );
                }
            } else {
                // Khách hàng hủy: gửi cho renter và player
                if (renter != null) {
                    notificationService.createNotification(
                        renter.getId(),
                        "Hủy đơn thuê thành công",
                        "Bạn đã hủy đơn thuê #" + order.getId() + ". " +
                        (cancellationFee > 0 
                            ? "Khấu trừ phí hủy sát giờ " + String.format("%,d", cancellationFee) + " xu (30%). Hoàn lại " + String.format("%,d", refundedCoin) + " xu vào ví."
                            : "Hoàn lại đầy đủ 100% (" + String.format("%,d", refundedCoin) + " xu) vào ví của bạn."),
                        "rent_cancel",
                        "/orders",
                        order.getId().toString()
                    );
                }
                if (gamePlayer.getUser() != null) {
                    notificationService.createNotification(
                        gamePlayer.getUser().getId(),
                        "Khách hàng đã hủy đơn thuê",
                        "Khách hàng " + (renter != null ? renter.getUsername() : "") + " đã hủy đơn thuê #" + order.getId() + ". " +
                        (cancellationFee > 0 ? "Bạn được cộng bồi thường " + String.format("%,d", cancellationFee) + " xu." : ""),
                        "rent_cancel",
                        "/orders",
                        order.getId().toString()
                    );
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("gamePlayer", gamePlayer);
            response.put("order", order);
            response.put("refundedCoin", refundedCoin);
            response.put("cancellationFee", cancellationFee);
            response.put("reason", cancelReason);

            return ResponseEntity.ok(new ApiResponse<>(true, "Hủy đơn thuê thành công", response));
        } catch (Exception e) {
            log.error("Error canceling order: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error canceling order: " + e.getMessage(), null));
        }
    }

    @PutMapping("/{id}/working-hours")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Player hoặc Admin thiết lập khung giờ làm việc và trạng thái nhận đơn")
    public ResponseEntity<ApiResponse<?>> updateWorkingHours(
            @PathVariable Long id,
            @RequestBody WorkingHoursRequest request,
            Authentication authentication) {
        GamePlayer player = gamePlayerService.findById(id);
        if (player == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse<>(false, "Không tìm thấy hồ sơ người chơi", null));
        }

        User currentUser = userService.findByUsername(authentication.getName());
        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
        boolean isOwner = player.getUser() != null && player.getUser().getId().equals(currentUser.getId());

        if (!isAdmin && !isOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse<>(false, "Bạn không có quyền cập nhật lịch làm việc của người chơi này", null));
        }

        if (request.getWorkStartTime() != null) player.setWorkStartTime(request.getWorkStartTime().trim());
        if (request.getWorkEndTime() != null) player.setWorkEndTime(request.getWorkEndTime().trim());
        if (request.getWorkingDays() != null) player.setWorkingDays(request.getWorkingDays().trim());
        if (request.getAcceptingOrders() != null) player.setAcceptingOrders(request.getAcceptingOrders());

        gamePlayerService.save(player);

        Map<String, Object> data = new HashMap<>();
        data.put("id", player.getId());
        data.put("workStartTime", player.getWorkStartTime());
        data.put("workEndTime", player.getWorkEndTime());
        data.put("workingDays", player.getWorkingDays());
        data.put("acceptingOrders", player.getAcceptingOrders());

        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật khung giờ làm việc thành công", data));
    }

    @GetMapping("/{id}/working-hours")
    @Operation(summary = "Xem khung giờ làm việc và trạng thái nhận đơn của player")
    public ResponseEntity<ApiResponse<?>> getWorkingHours(@PathVariable Long id) {
        GamePlayer player = gamePlayerService.findById(id);
        if (player == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse<>(false, "Không tìm thấy hồ sơ người chơi", null));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("id", player.getId());
        data.put("workStartTime", player.getWorkStartTime() != null ? player.getWorkStartTime() : "00:00");
        data.put("workEndTime", player.getWorkEndTime() != null ? player.getWorkEndTime() : "23:59");
        data.put("workingDays", player.getWorkingDays() != null ? player.getWorkingDays() : "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY");
        data.put("acceptingOrders", player.getAcceptingOrders() != null ? player.getAcceptingOrders() : true);

        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy khung giờ làm việc thành công", data));
    }

    @GetMapping("/hired")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of currently hired players")
    public ResponseEntity<ApiResponse<?>> getHiredPlayers(Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName());
            
            // Get all active payments for the user
            List<Payment> activeHires = paymentRepository.findByUserIdAndStatusAndEndTimeAfter(
                user.getId(), Payment.PaymentStatus.PENDING, LocalDateTime.now());

            List<Map<String, Object>> hiredPlayers = activeHires.stream()
                .map(payment -> {
                    Map<String, Object> playerInfo = new HashMap<>();
                    GamePlayer gamePlayer = payment.getGamePlayer();
                    playerInfo.put("gamePlayer", gamePlayer);
                    playerInfo.put("payment", payment);
                    playerInfo.put("startTime", payment.getStartTime());
                    playerInfo.put("endTime", payment.getEndTime());
                    playerInfo.put("coin", payment.getCoin());
                    return playerInfo;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(new ApiResponse<>(true, "Successfully retrieved hired players", hiredPlayers));
        } catch (Exception e) {
            log.error("Error getting hired players: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error getting hired players: " + e.getMessage(), null));
        }
    }

    @GetMapping("/hired-by-me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of players hired by the current user")
    public ResponseEntity<ApiResponse<?>> getPlayersHiredByMe(Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName());
            
            // Get all active payments where the user is the hirer
            List<Payment> activeHires = paymentRepository.findByUserIdAndStatusAndEndTimeAfter(
                user.getId(), Payment.PaymentStatus.PENDING, LocalDateTime.now());

            List<Map<String, Object>> hiredPlayers = activeHires.stream()
                .map(payment -> {
                    Map<String, Object> playerInfo = new HashMap<>();
                    GamePlayer gamePlayer = payment.getGamePlayer();
                    playerInfo.put("gamePlayer", gamePlayer);
                    playerInfo.put("payment", payment);
                    playerInfo.put("startTime", payment.getStartTime());
                    playerInfo.put("endTime", payment.getEndTime());
                    playerInfo.put("coin", payment.getCoin());
                    return playerInfo;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(new ApiResponse<>(true, "Successfully retrieved players hired by you", hiredPlayers));
        } catch (Exception e) {
            log.error("Error getting players hired by user: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error getting players hired by you: " + e.getMessage(), null));
        }
    }

    @GetMapping("/hired-by-others")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of players that are currently hired by others")
    public ResponseEntity<ApiResponse<?>> getPlayersHiredByOthers(Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName());
            
            // Get all active payments where the user is the player
            List<Payment> activeHires = paymentRepository.findByPlayerIdAndStatusAndEndTimeAfter(
                user.getId(), Payment.PaymentStatus.PENDING, LocalDateTime.now());

            List<Map<String, Object>> hiredPlayers = activeHires.stream()
                .map(payment -> {
                    Map<String, Object> playerInfo = new HashMap<>();
                    GamePlayer gamePlayer = payment.getGamePlayer();
                    playerInfo.put("gamePlayer", gamePlayer);
                    playerInfo.put("payment", payment);
                    playerInfo.put("startTime", payment.getStartTime());
                    playerInfo.put("endTime", payment.getEndTime());
                    playerInfo.put("coin", payment.getCoin());
                    playerInfo.put("hirer", payment.getUser());
                    return playerInfo;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(new ApiResponse<>(true, "Successfully retrieved players hired by others", hiredPlayers));
        } catch (Exception e) {
            log.error("Error getting players hired by others: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error getting players hired by others: " + e.getMessage(), null));
        }
    }

    // API từ chối đơn thuê cho player
    @PostMapping("/hire/{paymentId}/reject")
    @PreAuthorize("hasRole('PLAYER')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "Player từ chối đơn thuê")
    public ResponseEntity<ApiResponse<?>> rejectHire(@PathVariable Long paymentId, Authentication authentication) {
        try {
            User player = userService.findByUsername(authentication.getName());
            Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
            GamePlayer gamePlayer = payment.getGamePlayer();

            // Kiểm tra quyền từ chối
            if (!payment.getPlayer().getId().equals(player.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse<>(false, "Bạn không có quyền từ chối đơn này", null));
            }
            if (!Payment.PaymentStatus.PENDING.equals(payment.getStatus())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Đơn thuê không ở trạng thái chờ xác nhận", null));
            }

            // Cập nhật trạng thái đơn thuê
            payment.setStatus(Payment.PaymentStatus.CANCELED);
            paymentRepository.save(payment);

            // Player vẫn giữ trạng thái AVAILABLE

            // Lấy user thuê từ payment
            User user = payment.getUser();
            // Gửi notification cho user khi bị từ chối đơn thuê
            notificationService.createNotification(
                user.getId(),
                "Đơn thuê bị từ chối",
                "Yêu cầu thuê player " + gamePlayer.getUsername() + " đã bị từ chối.",
                "rent_reject",
                null,
                payment.getId().toString()
            );

            return ResponseEntity.ok(new ApiResponse<>(true, "Đã từ chối đơn thuê thành công!", null));
        } catch (Exception e) {
            log.error("Error rejecting hire: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error rejecting hire: " + e.getMessage(), null));
        }
    }

    @GetMapping("/revenue/total")
    public ResponseEntity<Long> getTotalRevenue() {
        Long total = revenueRepository.sumTotalRevenue();
        return ResponseEntity.ok(total);
    }

    @GetMapping("/revenue/growth-percent-yesterday")
    public ResponseEntity<Double> getRevenueGrowthPercentComparedToYesterday() {
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate yesterday = today.minusDays(1);
        java.time.LocalDateTime startToday = today.atStartOfDay();
        java.time.LocalDateTime endToday = today.atTime(23,59,59);
        java.time.LocalDateTime startYesterday = yesterday.atStartOfDay();
        java.time.LocalDateTime endYesterday = yesterday.atTime(23,59,59);
        Long todayRevenue = revenueRepository.sumRevenueByCreatedAtBetween(startToday, endToday);
        Long yesterdayRevenue = revenueRepository.sumRevenueByCreatedAtBetween(startYesterday, endYesterday);
        if (todayRevenue == null) todayRevenue = 0L;
        if (yesterdayRevenue == null) yesterdayRevenue = 0L;
        double percent;
        if (yesterdayRevenue == 0) {
            percent = todayRevenue > 0 ? 100.0 : 0.0;
        } else {
            percent = ((double)(todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100.0;
        }
        return ResponseEntity.ok(percent);
    }

    @PostMapping("/order/{orderId}/complete")
    @PreAuthorize("isAuthenticated()")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "Hoàn thành đơn thuê (Order)")
    public ResponseEntity<ApiResponse<?>> completeOrder(@PathVariable Long orderId, Authentication authentication) {
        try {
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
            GamePlayer gamePlayer = order.getPlayer();

            User currentUser = userService.findByUsername(authentication.getName());
            boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
            boolean isRenter = order.getRenter() != null && currentUser.getId().equals(order.getRenter().getId());
            boolean isPlayer = gamePlayer != null && gamePlayer.getUser() != null && currentUser.getId().equals(gamePlayer.getUser().getId());

            if (!isAdmin && !isRenter && !isPlayer) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse<>(false, "Bạn không có quyền hoàn thành đơn này", null));
            }

            // Chỉ cho phép hoàn thành khi trạng thái là CONFIRMED
            if (!"CONFIRMED".equals(order.getStatus())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Chỉ có thể hoàn thành đơn khi đã xác nhận", null));
            }

            // Chỉ cho phép hoàn thành khi đã hết giờ thuê (hoặc là Admin)
            if (!isAdmin && order.getEndTime() != null && LocalDateTime.now().isBefore(order.getEndTime())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Thời gian thuê chưa kết thúc! Chỉ có thể hoàn thành đơn sau khi hết giờ chơi.", null));
            }

            // Cập nhật trạng thái đơn
            order.setStatus("COMPLETED");
            order.setPayoutStatus("PENDING");

            long totalCoin = order.getPrice();
            long appRevenue = Math.round(totalCoin * 0.15); // 15% chiết khấu hệ thống
            long playerTotalReceived = totalCoin - appRevenue; // 85% tổng nhận
            order.setPlatformFee(appRevenue);
            order.setPlayerReceived(playerTotalReceived);
            orderRepository.save(order);

            // Nếu đơn đã có đánh giá từ trước với rating >= 4 sao -> giải phóng tiền ngay
            PlayerReview existingReview = playerReviewRepository.findByOrderId(order.getId());
            if (existingReview != null && existingReview.getRating() != null && existingReview.getRating() >= 4.0) {
                if (orderPayoutService != null) {
                    orderPayoutService.releaseOrderPayout(order, "Đã được đánh giá " + existingReview.getRating() + " sao");
                }
            }

            // Tạo Payment record cho tiền thuê
            Payment paymentRecv = new Payment();
            paymentRecv.setUser(order.getRenter()); // Người thuê
            paymentRecv.setPlayer(gamePlayer.getUser()); // Người được thuê
            paymentRecv.setGamePlayer(gamePlayer);
            paymentRecv.setCoin(playerTotalReceived);
            paymentRecv.setOriginalAmount(totalCoin);
            paymentRecv.setDiscountRate(0.15);
            paymentRecv.setPlatformFee(appRevenue);
            paymentRecv.setPlayerReceived(playerTotalReceived);
            paymentRecv.setCurrency("COIN");
            paymentRecv.setStatus(Payment.PaymentStatus.COMPLETED);
            paymentRecv.setPaymentMethod(Payment.PaymentMethod.HIRE);
            paymentRecv.setType(Payment.PaymentType.HIRE);
            paymentRecv.setStartTime(order.getStartTime());
            paymentRecv.setEndTime(order.getEndTime());
            paymentRecv.setDescription("Tiền thuê dịch vụ (tổng 85%, phí sàn 15%) từ " + order.getRenter().getUsername() + " - " + gamePlayer.getUsername());
            paymentRecv.setCreatedAt(LocalDateTime.now());
            paymentRecv.setCompletedAt(LocalDateTime.now());
            paymentRepository.save(paymentRecv);
            
            // Lưu doanh thu app 15%
            Payment appPayment = new Payment();
            appPayment.setUser(order.getRenter());
            appPayment.setPlayer(gamePlayer.getUser());
            appPayment.setCoin(appRevenue);
            appPayment.setOriginalAmount(totalCoin);
            appPayment.setDiscountRate(0.15);
            appPayment.setPlatformFee(appRevenue);
            appPayment.setPlayerReceived(playerTotalReceived);
            appPayment.setStatus(Payment.PaymentStatus.COMPLETED);
            appPayment.setType(Payment.PaymentType.HIRE);
            appPayment.setPaymentMethod(Payment.PaymentMethod.HIRE);
            appPayment.setCurrency("COIN");
            appPayment.setCreatedAt(LocalDateTime.now());
            appPayment.setCompletedAt(LocalDateTime.now());
            appPayment.setStartTime(order.getStartTime());
            appPayment.setEndTime(order.getEndTime());
            appPayment.setGamePlayer(gamePlayer);
            appPayment.setDescription("Phí chiết khấu hệ thống 15% từ đơn thuê #" + order.getId() + " - " + gamePlayer.getUsername());
            paymentRepository.save(appPayment);
            
            Revenue revenue = new Revenue();
            revenue.setAmount(appRevenue);
            revenue.setCreatedAt(LocalDateTime.now());
            revenue.setPayment(appPayment);
            revenueRepository.save(revenue);

            gamePlayer.setStatus("AVAILABLE");
            gamePlayer.setHiredBy(null);
            gamePlayer.setHireDate(null);
            gamePlayer.setReturnDate(null);
            gamePlayer.setHoursHired(null);
            
            // Cập nhật số đơn hoàn tất cho player
            long completedOrders = orderRepository.countCompletedOrdersByPlayerId(gamePlayer.getId());
            gamePlayer.setTotalGames((int) completedOrders);

            gamePlayerService.save(gamePlayer);

            // Gửi notification cho user và player
            notificationService.createNotification(
                order.getRenter().getId(),
                "Đơn thuê đã hoàn thành",
                "Đơn thuê của bạn đã được hoàn thành.",
                "rent_complete",
                null,
                order.getId().toString()
            );
            notificationService.createNotification(
                gamePlayer.getUser().getId(),
                "Đơn thuê đã hoàn thành",
                "Bạn đã hoàn thành đơn thuê với " + order.getRenter().getUsername() + ".",
                "rent_complete",
                null,
                order.getId().toString()
            );

            // Gửi thông báo đánh giá cho người thuê
            orderService.sendReviewNotificationForCompletedOrder(order);

            Map<String, Object> response = new HashMap<>();
            response.put("order", order);
            response.put("gamePlayer", gamePlayer);

            return ResponseEntity.ok(new ApiResponse<>(true, "Đơn thuê đã hoàn thành", response));
        } catch (Exception e) {
            log.error("Error completing order: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error completing order: " + e.getMessage(), null));
        }
    }

    @PostMapping("/order/{orderId}/review")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Đánh giá player cho đơn thuê (Order)")
    public ResponseEntity<ApiResponse<?>> reviewOrder(@PathVariable Long orderId, @Valid @RequestBody ReviewRequest request, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName());
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
            GamePlayer gamePlayer = order.getPlayer();

            // Chỉ cho phép đánh giá khi đơn đã hoàn thành
            if (!"COMPLETED".equals(order.getStatus())) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Chỉ có thể đánh giá sau khi đơn đã hoàn thành", null));
            }

            // Kiểm tra user là người thuê
            if (!order.getRenter().getId().equals(user.getId())) {
                return ResponseEntity.status(403)
                    .body(new ApiResponse<>(false, "Chỉ người thuê mới có quyền đánh giá đơn này", null));
            }

            // Kiểm tra đã đánh giá chưa
            if (playerReviewRepository.existsByOrderId(orderId)) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Bạn đã đánh giá đơn này rồi", null));
            }

            PlayerReview review = new PlayerReview();
            review.setOrder(order);
            review.setGamePlayer(gamePlayer);
            review.setUser(user);
            review.setRating(request.getRating());
            review.setComment(request.getComment());
            review.setCreatedAt(java.time.LocalDateTime.now());
            playerReviewRepository.save(review);

            // Cập nhật rating trung bình cho player
            Double avgRating = playerReviewRepository.getAverageRatingByGamePlayerId(gamePlayer.getId());
            if (avgRating != null) {
                gamePlayer.setRating(Math.round(avgRating * 10.0) / 10.0);
                gamePlayerService.save(gamePlayer);
            }

            // Gửi notification cho player
            notificationService.createNotification(
                gamePlayer.getUser().getId(),
                "Bạn nhận được đánh giá mới!",
                "Bạn vừa nhận được đánh giá từ " + user.getUsername() + ".",
                "review",
                null,
                order.getId().toString()
            );

            // Nếu đánh giá từ 4 sao trở lên -> chuyển tiền đóng băng vào số dư khả dụng ngay lập tức
            if (request.getRating() != null && request.getRating() >= 4.0) {
                if (orderPayoutService != null && "PENDING".equalsIgnoreCase(order.getPayoutStatus())) {
                    orderPayoutService.releaseOrderPayout(order, "Được đánh giá " + request.getRating() + " sao");
                }
            }

            return ResponseEntity.ok(new ApiResponse<>(true, "Đánh giá thành công!", review));
        } catch (Exception e) {
            log.error("Error review order: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error review order: " + e.getMessage(), null));
        }
    }

    @Data
    public static class BanRequest {
        @NotBlank(message = "Lý do ban là bắt buộc")    private String reason;
        
        @Size(max = 500, message = "Mô tả chi tiết không được quá 500")    private String description;
    }

    @PostMapping("/ban/{playerId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "Ban player")
    public ResponseEntity<ApiResponse<?>> banPlayer(
            @PathVariable Long playerId, 
            @Valid @RequestBody BanRequest request,
            Authentication authentication) {
        try {
            User admin = userService.findByUsername(authentication.getName());
            GamePlayer player = gamePlayerService.findById(playerId);
            User playerUser = player.getUser();

            // Hủy các đơn thuê PENDING/CONFIRMED của player này
            List<Order> ordersToCancel = orderRepository.findActiveOrdersByPlayerId(player.getId());
            for (Order order : ordersToCancel) {
                // Hoàn coin cho user nếu chưa hoàn thành
                if (order.getRenter() != null && order.getPrice() != null && order.getPrice() > 0) {
                    order.getRenter().setCoin(order.getRenter().getCoin() + order.getPrice());
                    userService.save(order.getRenter());
                }
                order.setStatus("CANCELED");
                orderRepository.save(order);
                // Gửi notification cho user
                if (order.getRenter() != null) {
                    notificationService.createNotification(
                        order.getRenter().getId(),
                        "Đơn thuê bị hủy do player vi phạm",
                        "Đơn thuê với player này đã bị hủy và bạn đã được hoàn coin.",
                        "order_cancel_ban",
                        null,
                        order.getId().toString()
                    );
                }
            }

            // Cập nhật trạng thái player
            player.setStatus("BANNED");
            gamePlayerService.save(player);

            // Khóa tài khoản user
            playerUser.setAccountNonLocked(false);
            userService.save(playerUser);

            // Đăng xuất player (set offline)
            userService.setUserOffline(playerUser.getId());

            // Gửi notification cho player bị ban
            String notificationMessage = "Bạn đã bị ban vì lý do: " + request.getReason();
            if (request.getDescription() != null && !request.getDescription().trim().isEmpty()) {
                notificationMessage += "\nChi tiết: " + request.getDescription();
            }
            
            notificationService.createNotification(
                playerUser.getId(),
                "Tài khoản của bạn đã bị ban",
                notificationMessage,
                "account_banned",
                null,
                null
            );

            return ResponseEntity.ok(new ApiResponse<>(true, "Player đã bị ban thành công", Map.of(
                "playerId", playerId,
                "reason", request.getReason(),
                "description", request.getDescription(),
                "bannedBy", admin.getUsername(),
                "bannedAt", java.time.LocalDateTime.now()
            )));
        } catch (Exception e) {
            log.error("Error banning player: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Error banning player: " + e.getMessage(), null));
        }
    }

    @PostMapping("/unban/{playerId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Operation(summary = "Unban player")
    public ResponseEntity<ApiResponse<?>> unbanPlayer(@PathVariable Long playerId, Authentication authentication) {
        try {
            User admin = userService.findByUsername(authentication.getName());
            GamePlayer player = gamePlayerService.findById(playerId);
            if (!"BANNED".equalsIgnoreCase(player.getStatus())) {
                return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Player không bị ban", null));
            }
            player.setStatus("AVAILABLE");
            gamePlayerService.save(player);

            // Mở khóa tài khoản user
            User playerUser = player.getUser();
            playerUser.setAccountNonLocked(true);
            userService.save(playerUser);

            return ResponseEntity.ok(new ApiResponse<>(true, "Player đã được mở ban", null));
        } catch (Exception e) {
            log.error("Error unbanning player: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Error unbanning player: " + e.getMessage(), null));
        }
    }

    @GetMapping("/{id}/stats")
    @Operation(summary = "Get player stats for profile page")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlayerStats(@PathVariable Long id) {
        GamePlayer gp = gamePlayerService.findById(id);
        Long userId = gp.getUser() != null ? gp.getUser().getId() : null;

        // Lấy tất cả các GamePlayer của Idol (User) này để tổng hợp thống kê toàn diện
        List<GamePlayer> userGamePlayers = userId != null ? gamePlayerService.getGamePlayersByUser(userId) : List.of(gp);
        List<Long> gpIds = userGamePlayers != null && !userGamePlayers.isEmpty()
                ? userGamePlayers.stream().map(GamePlayer::getId).collect(Collectors.toList())
                : List.of(gp.getId());

        long completedOrders = 0L;
        long canceledOrders = 0L;
        long totalHours = 0L;

        for (Long pId : gpIds) {
            completedOrders += orderRepository.countCompletedOrdersByPlayerId(pId);
            canceledOrders += orderRepository.countCanceledOrdersByPlayerId(pId);

            List<Order> completedOrderList = orderRepository.findByPlayer_IdAndStatus(pId, "COMPLETED");
            BigDecimal pPrice = null;
            if (userGamePlayers != null) {
                for (GamePlayer ugp : userGamePlayers) {
                    if (ugp.getId().equals(pId)) {
                        pPrice = ugp.getPricePerHour();
                        break;
                    }
                }
            }
            final BigDecimal effectivePrice = pPrice != null ? pPrice : gp.getPricePerHour();
            totalHours += completedOrderList.stream()
                .mapToLong(o -> {
                    if (o.getStartTime() != null && o.getEndTime() != null) {
                        long h = java.time.Duration.between(o.getStartTime(), o.getEndTime()).toHours();
                        if (h > 0) return h;
                    }
                    if (o.getPrice() != null && effectivePrice != null && effectivePrice.compareTo(BigDecimal.ZERO) > 0) {
                        long h = Math.round((double) o.getPrice() / effectivePrice.doubleValue());
                        if (h > 0) return h;
                    }
                    return 1L;
                })
                .sum();
        }

        Double avgRating = playerReviewRepository.getAverageRatingByGamePlayerId(gp.getId());
        int reviewCount = playerReviewRepository.findByGamePlayerId(gp.getId()).size();

        // 1. Tính Exp từ số giờ chơi hoàn thành (1 giờ = 600 Exp)
        long playExp = totalHours * 600L;

        // 2. Tính số quà tặng đã nhận và Exp từ quà tặng (DONATE)
        long giftExp = 0L;
        long giftCount = 0L;
        long giftCoin = 0L;

        // Ưu tiên 1: Lấy từ lịch sử nhận quà trực tiếp của Idol (chính xác 100%, không bị trùng lặp)
        List<Payment> myDonates = userId != null ? paymentRepository.findDonateHistoryByUserId(userId) : List.of();
        for (Payment p : myDonates) {
            if (p.getStatus() != Payment.PaymentStatus.COMPLETED) continue;
            String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
            boolean isReceive = desc.startsWith("nhận") || desc.contains("nhận quà") || desc.contains("nhận donate") || p.getPlayerReceived() != null;
            if (isReceive) {
                Long orig = p.getOriginalAmount() != null && p.getOriginalAmount() > 0 ? p.getOriginalAmount() : (p.getCoin() != null ? p.getCoin() : 0L);
                if (orig > 0) {
                    giftCount++;
                    giftExp += PaymentController.calculateExpFromCoin(orig, desc);
                    giftCoin += orig;
                }
            }
        }

        // Dự phòng 2: Nếu chưa có bản ghi nhận quà theo User, quét qua tất cả Payment DONATE
        if (giftCount == 0) {
            List<Payment> donatePayments = paymentRepository.findByTypeOrderByCreatedAtDesc(Payment.PaymentType.DONATE);
            for (Payment p : donatePayments) {
                if (p.getStatus() != Payment.PaymentStatus.COMPLETED) continue;
                Long coin = p.getOriginalAmount() != null && p.getOriginalAmount() > 0 ? p.getOriginalAmount() : (p.getCoin() != null ? p.getCoin() : 0L);
                if (coin <= 0) continue;

                String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                boolean isReceive = desc.startsWith("nhận") || desc.contains("nhận quà") || desc.contains("nhận donate");

                if (!isReceive) {
                    boolean isMatch = (userId != null && p.getPlayer() != null && p.getPlayer().getId().equals(userId))
                            || (p.getGamePlayer() != null && gpIds.contains(p.getGamePlayer().getId()))
                            || (p.getPlayer() != null && gpIds.contains(p.getPlayer().getId()));
                    if (isMatch) {
                        giftCount++;
                        giftExp += PaymentController.calculateExpFromCoin(coin, desc);
                        giftCoin += coin;
                    }
                }
            }
        }

        long totalExp = playExp + giftExp;

        Map<String, Object> stats = new HashMap<>();
        stats.put("id", gp.getId());
        stats.put("username", gp.getUsername());
        stats.put("pricePerHour", gp.getPricePerHour());
        stats.put("rating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : (gp.getRating() != null ? gp.getRating() : 0.0));
        stats.put("reviewCount", reviewCount);
        stats.put("completedOrders", completedOrders);
        stats.put("canceledOrders", canceledOrders);
        stats.put("totalHours", totalHours);
        stats.put("status", gp.getStatus());
        stats.put("rank", gp.getRank());
        stats.put("game", gp.getGame() != null ? gp.getGame().getName() : "");
        stats.put("description", gp.getDescription());

        // Điểm Exp và Quà tặng
        stats.put("exp", totalExp);
        stats.put("playExp", playExp);
        stats.put("giftExp", giftExp);
        stats.put("giftCount", giftCount);
        stats.put("receivedGiftsCount", giftCount);
        stats.put("giftCoin", giftCoin);

        return ResponseEntity.ok(new ApiResponse<>(true, "Player stats retrieved successfully", stats));
    }

    @Data
    public static class UpdateInfoRequest {
        private String rank;
        private String role;
        private String server;
        private BigDecimal pricePerHour;
    }

    @PatchMapping("/{id}/info")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update player rank/role/server/price")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updatePlayerInfo(
            @PathVariable Long id,
            @RequestBody UpdateInfoRequest request,
            Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        GamePlayer gp = gamePlayerService.findById(id);
        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
        if (!isAdmin && !gp.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse<>(false, "Bạn không có quyền cập nhật thông tin này", null));
        }
        if (request.getRank() != null && !request.getRank().isBlank()) gp.setRank(request.getRank());
        if (request.getRole() != null) gp.setRole(request.getRole());
        if (request.getServer() != null && !request.getServer().isBlank()) gp.setServer(request.getServer());
        if (request.getPricePerHour() != null) gp.setPricePerHour(request.getPricePerHour());
        gamePlayerService.save(gp);
        Map<String, Object> result = new HashMap<>();
        result.put("id", gp.getId());
        result.put("rank", gp.getRank());
        result.put("role", gp.getRole());
        result.put("server", gp.getServer());
        result.put("pricePerHour", gp.getPricePerHour());
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật thông tin thành công", result));
    }

    @Data
    public static class UpdatePriceRequest {
        @NotNull(message = "Price per hour is required")
        @DecimalMin(value = "0.0", message = "Price must be greater than 0")
        private BigDecimal pricePerHour;
    }

    @PatchMapping("/{id}/price")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update player price per hour")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updatePlayerPrice(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePriceRequest request,
            Authentication authentication) {
        User currentUser = userService.findByUsername(authentication.getName());
        GamePlayer gp = gamePlayerService.findById(id);
        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
        if (!isAdmin && !gp.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse<>(false, "Bạn không có quyền cập nhật giá này", null));
        }
        gp.setPricePerHour(request.getPricePerHour());
        gamePlayerService.save(gp);
        Map<String, Object> result = new HashMap<>();
        result.put("id", gp.getId());
        result.put("pricePerHour", gp.getPricePerHour());
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật giá thành công", result));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<List<GamePlayerSummaryDTO>>> getGamePlayerSummary() {
        List<GamePlayer> gamePlayers = gamePlayerService.getAllGamePlayers();
        List<GamePlayerSummaryDTO> result = new ArrayList<>();
        for (GamePlayer gp : gamePlayers) {
            GamePlayerSummaryDTO dto = new GamePlayerSummaryDTO();
            dto.setId(gp.getId());
            dto.setUserId(gp.getUser() != null ? gp.getUser().getId() : null);
            dto.setName(gp.getUser() != null ? gp.getUser().getFullName() : "");
            dto.setEmail(gp.getUser() != null ? gp.getUser().getEmail() : "");
            dto.setPlayerName(gp.getUsername()); // Tên player khi đăng ký làm player
            // Số đơn thuê
            int totalOrders = (int) orderRepository.countByPlayer_Id(gp.getId());
            dto.setTotalOrders(totalOrders);
            // Số đánh giá
            int totalReviews = playerReviewRepository.findByGamePlayerUserId(gp.getUser().getId()).size();
            dto.setTotalReviews(totalReviews);
            // Thu nhập: tổng price các order hoàn thành
            long totalRevenue = orderRepository.sumCompletedRevenueByPlayerId(gp.getId());
            dto.setTotalRevenue(totalRevenue);
            // Trạng thái
            dto.setStatus(gp.getStatus());
            // Xếp hạng (label)
            dto.setRankLabel(gp.getRank());
            // Rating (sao)
            dto.setRating(totalReviews > 0 && gp.getRating() != null ? gp.getRating() : 0.0);
            // Thể loại game
            dto.setGameName(gp.getGame() != null ? gp.getGame().getName() : "");
            // Avatar URL
            dto.setAvatarUrl(gp.getUser() != null ? gp.getUser().getAvatarUrl() : "");
            // Giá thuê & thông tin chi tiết
            dto.setPricePerHour(gp.getPricePerHour());
            dto.setBio(gp.getDescription());
            dto.setServer(gp.getServer());
            dto.setRole(gp.getRole());
            result.add(dto);
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Game player summary", result));
    }
} 