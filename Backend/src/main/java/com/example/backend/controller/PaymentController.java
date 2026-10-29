package com.example.backend.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.Collections;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.ReviewRequest;
import com.example.backend.dto.TopupUserDTO;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.PlayerReview;
import com.example.backend.entity.User;
import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Revenue;
import com.example.backend.exception.PaymentException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.PlayerReviewRepository;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.RevenueRepository;
import com.example.backend.service.NotificationService;
import com.example.backend.service.PaymentService;
import com.example.backend.service.QRCodeService;
import com.example.backend.service.UserService;
import com.example.backend.service.VnPayService;
import com.example.backend.service.AdminNotificationService;
import com.example.backend.dto.TopupUserDTO;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Payment", description = "Payment management APIs")
public class PaymentController {
    private final PaymentService paymentService;
    private final UserService userService;
    private final PaymentRepository paymentRepository;
    private final QRCodeService qrCodeService;
    private final PlayerReviewRepository playerReviewRepository;
    private final NotificationService notificationService;
    private final VnPayService vnPayService;
    private final OrderRepository orderRepository;
    private final GamePlayerRepository gamePlayerRepository;
    private final AdminNotificationService adminNotificationService;
    private final RevenueRepository revenueRepository;
    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @org.springframework.beans.factory.annotation.Value("${app.withdraw.min-amount:50000}")
    private long minWithdrawAmount;

    @org.springframework.beans.factory.annotation.Value("${app.withdraw.max-per-request:20000000}")
    private long maxWithdrawPerRequest;

    @org.springframework.beans.factory.annotation.Value("${app.withdraw.max-per-day:50000000}")
    private long maxWithdrawPerDay;

    @org.springframework.beans.factory.annotation.Value("${app.withdraw.require-kyc:true}")
    private boolean requireKyc;

    @Autowired(required = false)
    private com.example.backend.service.WalletReconciliationService walletReconciliationService;

    @Autowired(required = false)
    private com.example.backend.service.CommissionService commissionService;

    @Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.example.backend.service.MomoService momoService;

    @Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.example.backend.service.ZaloPayService zaloPayService;

    public PaymentController(PaymentService paymentService, UserService userService,
            PaymentRepository paymentRepository, QRCodeService qrCodeService,
            PlayerReviewRepository playerReviewRepository,
            NotificationService notificationService,
            VnPayService vnPayService,
            OrderRepository orderRepository,
            GamePlayerRepository gamePlayerRepository,
            AdminNotificationService adminNotificationService,
            RevenueRepository revenueRepository) {
        this.paymentService = paymentService;
        this.userService = userService;
        this.paymentRepository = paymentRepository;
        this.qrCodeService = qrCodeService;
        this.playerReviewRepository = playerReviewRepository;
        this.notificationService = notificationService;
        this.vnPayService = vnPayService;
        this.orderRepository = orderRepository;
        this.gamePlayerRepository = gamePlayerRepository;
        this.adminNotificationService = adminNotificationService;
        this.revenueRepository = revenueRepository;
    }

    @Operation(summary = "Create a new payment")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Payment> createPayment(
            @Valid @RequestBody PaymentRequest request,
            Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName());
            Payment payment = paymentService.createPayment(
                    request.getGamePlayerId(),
                    user.getId(),
                    BigDecimal.valueOf(request.getCoin()),
                    "COIN",
                    request.getPaymentMethod());
            return ResponseEntity.ok(payment);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Process a payment")
    @PostMapping("/{id}/process")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> processPayment(
            @Parameter(description = "Payment ID") @PathVariable Long id,
            @Valid @RequestBody ProcessPaymentRequest request,
            Authentication authentication) {
        try {
            Payment existingPayment = paymentRepository.findById(id).orElse(null);
            if (existingPayment == null) {
                return ResponseEntity.notFound().build();
            }
            User currentUser = userService.findByUsername(authentication.getName());
            boolean isAdmin = currentUser != null && currentUser.getRoles() != null &&
                    (currentUser.getRoles().contains("ROLE_ADMIN") || currentUser.getRoles().contains("ADMIN"));
            boolean isOwner = existingPayment.getUser() != null && currentUser != null &&
                    existingPayment.getUser().getId().equals(currentUser.getId());
            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(403).body("Bạn không có quyền xử lý thanh toán này");
            }

            Payment payment = paymentService.processPayment(id, request.getTransactionId());
            if (Payment.PaymentType.WITHDRAW.equals(payment.getType()) && payment.getUser() != null) {
                try {
                    notificationService.createNotification(
                        payment.getUser().getId(),
                        "✅ Rút tiền thành công",
                        "Yêu cầu rút " + (payment.getCoin() != null ? payment.getCoin() : 0) + " đ về tài khoản " + (payment.getBankAccountNumber() != null ? payment.getBankAccountNumber() : "") + " (" + (payment.getBankName() != null ? payment.getBankName() : "") + ") đã được Admin xử lý thành công.",
                        "withdraw_success",
                        "/wallet",
                        payment.getId().toString()
                    );
                } catch (Exception ignored) {}
            }
            return ResponseEntity.ok(payment);
        } catch (PaymentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Refund a payment")
    @PostMapping("/{id}/refund")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> refundPayment(
            @Parameter(description = "Payment ID") @PathVariable Long id,
            @Valid @RequestBody RefundRequest request,
            Authentication authentication) {
        try {
            Payment existingPayment = paymentRepository.findById(id).orElse(null);
            if (existingPayment == null) {
                return ResponseEntity.notFound().build();
            }
            User currentUser = userService.findByUsername(authentication.getName());
            boolean isAdmin = currentUser != null && currentUser.getRoles() != null &&
                    (currentUser.getRoles().contains("ROLE_ADMIN") || currentUser.getRoles().contains("ADMIN"));
            boolean isOwner = existingPayment.getUser() != null && currentUser != null &&
                    existingPayment.getUser().getId().equals(currentUser.getId());
            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(403).body("Bạn không có quyền yêu cầu hoàn tiền thanh toán này");
            }

            Payment payment = paymentService.refundPayment(id, request.getReason());
            if (Payment.PaymentType.WITHDRAW.equals(payment.getType()) && payment.getUser() != null) {
                try {
                    notificationService.createNotification(
                        payment.getUser().getId(),
                        "❌ Yêu cầu rút tiền bị từ chối",
                        "Yêu cầu rút " + (payment.getCoin() != null ? payment.getCoin() : 0) + " đ đã bị từ chối. Lý do: " + (request.getReason() != null ? request.getReason() : "Thông tin không hợp lệ") + ". Số tiền đã được hoàn lại vào ví.",
                        "withdraw_rejected",
                        "/wallet",
                        payment.getId().toString()
                    );
                } catch (Exception ignored) {}
            }
            return ResponseEntity.ok(payment);
        } catch (PaymentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Get user payments")
    @GetMapping("/user")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Payment>> getUserPayments(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        return ResponseEntity.ok(paymentService.getUserPayments(user.getId()));
    }

    @Operation(summary = "Get game player payments")
    @GetMapping("/game-player/{gamePlayerId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getGamePlayerPayments(
            @Parameter(description = "Game player ID") @PathVariable Long gamePlayerId,
            Authentication authentication) {
        GamePlayer gamePlayer = gamePlayerRepository.findById(gamePlayerId).orElse(null);
        if (gamePlayer == null) {
            return ResponseEntity.notFound().build();
        }
        User currentUser = userService.findByUsername(authentication.getName());
        boolean isAdmin = currentUser != null && currentUser.getRoles() != null &&
                (currentUser.getRoles().contains("ROLE_ADMIN") || currentUser.getRoles().contains("ADMIN"));
        boolean isOwner = gamePlayer.getUser() != null && currentUser != null &&
                gamePlayer.getUser().getId().equals(currentUser.getId());
        if (!isAdmin && !isOwner) {
            return ResponseEntity.status(403).body("Bạn không có quyền xem lịch sử thanh toán của game player này");
        }
        return ResponseEntity.ok(paymentService.getGamePlayerPayments(gamePlayerId));
    }

    @Operation(summary = "Get payments by status")
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Payment>> getPaymentsByStatus(
            @Parameter(description = "Payment status") @PathVariable String status) {
        try {
            Payment.PaymentStatus paymentStatus = Payment.PaymentStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(paymentService.getPaymentsByStatus(paymentStatus.name()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Get payments by date range")
    @GetMapping("/date-range")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Payment>> getPaymentsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(paymentService.getPaymentsByDateRange(start, end));
    }

    @PostMapping("/topup")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ResponseEntity<?> topUp(@Valid @RequestBody TopUpRequest request, Authentication authentication) {
        try {
            User user = userService.findByUsername(authentication.getName());
            if (user == null) {
                return ResponseEntity.badRequest().body("Không tìm thấy người dùng");
            }

            // Kiểm tra số coin
            if (request.getCoin() == null || request.getCoin() <= 0) {
                return ResponseEntity.badRequest().body("Số coin phải lớn hơn 0");
            }

            // Cộng coin vào tài khoản (setCoin tự động đồng bộ walletBalance)
            long currentCoin = user.getCoin() != null ? user.getCoin() : 0L;
            user.setCoin(currentCoin + request.getCoin());
            user = userService.save(user);

            // Tạo bản ghi thanh toán
            Payment payment = new Payment();
            payment.setUser(user);
            payment.setCoin(request.getCoin());
            payment.setCurrency("COIN");
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setPaymentMethod(Payment.PaymentMethod.TOPUP);
            payment.setType(Payment.PaymentType.TOPUP);
            payment.setCreatedAt(java.time.LocalDateTime.now());
            paymentRepository.save(payment);

            // Gửi notification khi nạp tiền thành công
            notificationService.createNotification(
                    user.getId(),
                    "Nạp xu thành công!",
                    "Bạn vừa nạp thành công " + request.getCoin() + " xu vào tài khoản.",
                    "topup",
                    null,
                    payment.getId().toString());

            // Gửi thông báo cho admin
            try {
                adminNotificationService.notifyAdminsAboutTopup(user, request.getCoin());
            } catch (Exception e) {
                System.err.println("[PaymentController] Error calling adminNotificationService.notifyAdminsAboutTopup: " + e.getMessage());
                e.printStackTrace();
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Nạp coin thành công",
                    "coin", user.getCoin(),
                    "walletBalance", user.getWalletBalance(),
                    "balance", user.getWalletBalance()));
        } catch (Exception e) {
            log.error("Lỗi khi nạp coin: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi khi nạp coin: " + e.getMessage());
        }
    }

    @GetMapping("/hire/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getHireHistory(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        List<Payment> hires = paymentRepository.findByUserIdAndTypeOrderByCreatedAtDesc(user.getId(),
                Payment.PaymentType.HIRE);
        return ResponseEntity.ok(hires);
    }

    @GetMapping("/hire/player/{playerId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getPlayerHireHistory(@PathVariable Long playerId) {
        List<Payment> hires = paymentRepository.findByPlayerIdAndTypeOrderByCreatedAtDesc(playerId,
                Payment.PaymentType.HIRE);
        return ResponseEntity.ok(hires);
    }

    @PostMapping("/hire/{paymentId}/review")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> reviewPlayer(
            @PathVariable Long paymentId,
            @Valid @RequestBody ReviewRequest request,
            Authentication authentication) {
        User reviewer = userService.findByUsername(authentication.getName());
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        // Kiểm tra quyền đánh giá
        if (!payment.getUser().getId().equals(reviewer.getId())) {
            return ResponseEntity.status(403).body("Không có quyền đánh giá");
        }

        // Kiểm tra thời gian đánh giá
        if (payment.getEndTime().isAfter(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("Chưa thể đánh giá, hợp đồng chưa kết thúc");
        }

        Order order = orderRepository.findByPaymentId(paymentId);
        if (order == null) {
            return ResponseEntity.badRequest().body("Không tìm thấy đơn thuê tương ứng với paymentId");
        }
        if (playerReviewRepository.existsByOrderId(order.getId())) {
            return ResponseEntity.badRequest().body("Đã đánh giá cho hợp đồng này");
        }

        // Tạo đánh giá
        PlayerReview review = new PlayerReview();
        review.setGamePlayer(payment.getGamePlayer());
        review.setUser(reviewer);
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        playerReviewRepository.save(review);

        return ResponseEntity.ok("Đánh giá thành công");
    }

    @GetMapping("/hire/player/{playerId}/reviews")
    public ResponseEntity<?> getPlayerReviews(@PathVariable Long playerId) {
        List<PlayerReview> reviews = playerReviewRepository.findByGamePlayerUserId(playerId);
        Double averageRating = playerReviewRepository.getAverageRatingByPlayerId(playerId);
        int reviewCount = reviews.size();
        return ResponseEntity.ok(Map.of(
                "reviews", reviews,
                "averageRating", averageRating != null ? averageRating : 0.0,
                "reviewCount", reviewCount));
    }

    @PostMapping("/withdraw")
    @PreAuthorize("isAuthenticated()")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ResponseEntity<?> withdraw(@RequestBody WithdrawRequest request, Authentication authentication) {
        try {
            User player = userService.findByUsername(authentication.getName());
            if (player == null) {
                return ResponseEntity.badRequest().body("Không tìm thấy người dùng");
            }
            Long coin = request.getCoin();

            if (coin == null || coin <= 0) {
                return ResponseEntity.badRequest().body("Số tiền rút không hợp lệ");
            }

            // 1. Kiểm tra hạn mức rút tối thiểu và tối đa trên mỗi giao dịch
            if (coin < minWithdrawAmount) {
                return ResponseEntity.badRequest().body("Số tiền rút tối thiểu là " + String.format("%,d", minWithdrawAmount) + " đ");
            }
            if (coin > maxWithdrawPerRequest) {
                return ResponseEntity.badRequest().body("Số tiền rút tối đa cho một giao dịch là " + String.format("%,d", maxWithdrawPerRequest) + " đ");
            }

            // 2. Kiểm tra hạn mức rút tiền tối đa trong ngày
            java.time.LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
            java.time.LocalDateTime endOfDay = java.time.LocalDate.now().atTime(java.time.LocalTime.MAX);
            long todayWithdrawn = paymentRepository.sumTodayWithdrawalsByUserId(player.getId(), startOfDay, endOfDay);
            if (todayWithdrawn + coin > maxWithdrawPerDay) {
                return ResponseEntity.badRequest().body("Vượt quá hạn mức rút tiền trong ngày (" +
                        String.format("%,d", maxWithdrawPerDay) + " đ/ngày). Bạn đã yêu cầu rút " +
                        String.format("%,d", todayWithdrawn) + " đ hôm nay.");
            }

            // 3. Kiểm tra xác minh danh tính (KYC) cho player
            if (requireKyc && !"VERIFIED".equalsIgnoreCase(player.getKycStatus())) {
                return ResponseEntity.badRequest().body("Tài khoản chưa hoàn tất xác minh danh tính (KYC). Vui lòng xác thực KYC trước khi thực hiện rút tiền.");
            }

            // 4. Kiểm tra đối soát giữa số dư ví và tổng giao dịch
            String auditTag = "";
            if (walletReconciliationService != null) {
                com.example.backend.dto.WalletReconciliationDTO reconciliation = walletReconciliationService.reconcile(player);
                if (reconciliation != null && Boolean.TRUE.equals(reconciliation.getIsAnomalous())) {
                    log.warn("[PaymentController] CẢNH BÁO ĐỐI SOÁT khi user #{} tạo yêu cầu rút: chênh lệch ví +{} xu",
                            player.getId(), reconciliation.getDiscrepancy());
                    auditTag = " [CẢNH BÁO ĐỐI SOÁT: Chênh lệch +" + reconciliation.getDiscrepancy() + " xu]";
                }
            }

            long currentCoin = player.getCoin() != null ? player.getCoin() : 0L;
            if (currentCoin < coin) {
                // Gửi thông báo lỗi cho người rút tiền
                try {
                    notificationService.createNotification(
                        player.getId(),
                        "❌ Rút tiền thất bại",
                        "Số dư khả dụng không đủ để rút " + coin + " đ. Số dư hiện tại: " + currentCoin + " đ.",
                        "withdraw_failed",
                        null,
                        null
                    );
                } catch (Exception e) {
                    System.err.println("[PaymentController] Error sending insufficient balance notification: " + e.getMessage());
                }
                
                return ResponseEntity.badRequest().body("Số dư khả dụng không đủ để rút số tiền này");
            }

            // Validate thông tin ngân hàng
            if (request.getBankAccountNumber() == null || request.getBankAccountNumber().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Số tài khoản ngân hàng không được để trống");
            }

            if (request.getBankAccountName() == null || request.getBankAccountName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Tên chủ tài khoản không được để trống");
            }

            if (request.getBankName() == null || request.getBankName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Tên ngân hàng không được để trống");
            }

            // Khấu trừ coin an toàn ngay lập tức để tránh double-spending
            boolean deducted = userService.deductCoin(player.getId(), coin);
            if (!deducted) {
                return ResponseEntity.badRequest().body("Số dư coin không đủ hoặc tài khoản đang có giao dịch khác.");
            }
            player.setCoin(currentCoin - coin);

            Payment payment = new Payment();
            payment.setUser(player);
            payment.setCoin(coin);
            payment.setCurrency("COIN");
            payment.setStatus(Payment.PaymentStatus.PENDING);
            payment.setPaymentMethod(Payment.PaymentMethod.WITHDRAW);
            payment.setType(Payment.PaymentType.WITHDRAW);
            payment.setCreatedAt(java.time.LocalDateTime.now());
            
            // Lưu thông tin ngân hàng
            payment.setBankAccountNumber(request.getBankAccountNumber().trim());
            payment.setBankAccountName(request.getBankAccountName().trim());
            payment.setBankName(request.getBankName().trim());
            if (!auditTag.isEmpty()) {
                payment.setDescription("Yêu cầu rút tiền" + auditTag);
            }
            
            Payment savedPayment = paymentRepository.save(payment);

            // Gửi notification khi tạo yêu cầu rút tiền
            try {
                notificationService.createNotification(
                        player.getId(),
                        "⏳ Đã gửi yêu cầu rút tiền",
                        "Bạn đã gửi yêu cầu rút " + coin + " đ về tài khoản " + request.getBankAccountNumber() + " - " + request.getBankAccountName() + " (" + request.getBankName() + "). Hệ thống đang chờ Admin xử lý chuyển khoản.",
                        "withdraw",
                        "/wallet",
                        savedPayment.getId().toString());
            } catch (Exception e) {
                System.err.println("[PaymentController] Error creating notification: " + e.getMessage());
            }
            
            // Gửi push notification đặc biệt cho rút tiền
            try {
                sendWithdrawPushNotification(player, coin, request.getBankAccountNumber(), request.getBankAccountName(), request.getBankName());
            } catch (Exception e) {
                System.err.println("[PaymentController] Error sending push notification: " + e.getMessage());
            }

            // Gửi thông báo cho admin
            try {
                adminNotificationService.notifyAdminsAboutWithdraw(player, coin, request.getBankAccountNumber(), request.getBankAccountName(), request.getBankName());
            } catch (Exception e) {
                System.err.println("[PaymentController] Error calling adminNotificationService.notifyAdminsAboutWithdraw: " + e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Yêu cầu rút tiền thành công, đang chờ xử lý",
                    "coin", coin,
                    "bankAccountNumber", request.getBankAccountNumber(),
                    "bankAccountName", request.getBankAccountName(),
                    "bankName", request.getBankName(),
                    "newBalance", player.getCoin(),
                    "paymentId", savedPayment.getId()));
        } catch (Exception e) {
            log.error("Lỗi khi rút tiền: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi khi rút tiền: " + e.getMessage());
        }
    }

    @Operation(summary = "Get user wallet balance")
    @GetMapping("/wallet-balance")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Long> getWalletBalance(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        return ResponseEntity.ok(user.getCoin());
    }

    @Operation(summary = "Get all balance change history for current user")
    @GetMapping("/balance-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Payment>> getBalanceHistory(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        // Lấy tất cả payment mà user là người gửi hoặc người nhận
        List<Payment> payments = paymentRepository.findByUserIdOrPlayerIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(payments);
    }

    @PostMapping("/deposit")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deposit(@RequestBody DepositRequest request, Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        DepositResponse response = new DepositResponse();

        // Validate số coin
        if (request.getCoin() == null || request.getCoin() <= 0) {
            response.setMessage("Số coin nạp tối thiểu là 1");
            return ResponseEntity.badRequest().body(response);
        }

        String method = request.getMethod().toUpperCase();
        String transactionId = "TXN_" + System.currentTimeMillis();

        try {
            switch (method) {
                case "MOMO":
                case "VNPAY":
                case "ZALOPAY":
                    String qrCode = qrCodeService.generatePaymentQRCode(
                            method,
                            request.getCoin().toString(),
                            user.getId().toString(),
                            transactionId);
                    response.setQrCode(qrCode);
                    response.setMessage("Quét mã QR bằng ứng dụng " + method + " để thanh toán");
                    break;
                case "BANK_TRANSFER":
                    response.setBankAccount("123456789");
                    response.setBankName("Ngân hàng ABC");
                    response.setBankOwner("CTY TNHH PLAYERDUO");
                    String transferContent = "NAPTIEN_" + user.getId() + "_" + transactionId;
                    response.setTransferContent(transferContent);
                    response.setMessage("Vui lòng chuyển khoản đúng nội dung để được cộng coin tự động.");
                    break;
                default:
                    response.setMessage("Phương thức thanh toán không hợp lệ!");
                    return ResponseEntity.badRequest().body(response);
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.setMessage("Lỗi khi tạo mã QR: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/topup-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TopupHistoryDTO>> getTopupHistory(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        List<Payment> topups = paymentRepository.findByUserIdAndTypeOrderByCreatedAtDesc(user.getId(),
                Payment.PaymentType.TOPUP);
        List<TopupHistoryDTO> result = topups.stream().map(payment -> {
            TopupHistoryDTO dto = new TopupHistoryDTO();
            dto.setId(payment.getId());
            dto.setDateTime(payment.getCreatedAt().toString());
            dto.setCoin(payment.getCoin());
            dto.setMethod(payment.getPaymentMethod());
            dto.setStatus(payment.getStatus());
            switch (payment.getStatus()) {
                case COMPLETED:
                    dto.setStatusText("Thành công");
                    dto.setStatusColor("#4CAF50");
                    break;
                case PENDING:
                    dto.setStatusText("Đang xử lý");
                    dto.setStatusColor("#FFA500");
                    break;
                case FAILED:
                    dto.setStatusText("Thất bại");
                    dto.setStatusColor("#F44336");
                    break;
                default:
                    dto.setStatusText(payment.getStatus().name());
                    dto.setStatusColor("#9E9E9E");
            }
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/withdraw-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TopupUserDTO>> getWithdrawHistory(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Payment> withdraws = paymentRepository.findByUserIdAndTypeOrderByCreatedAtDesc(user.getId(),
                Payment.PaymentType.WITHDRAW);
        List<TopupUserDTO> result = withdraws.stream().map(payment -> {
            TopupUserDTO dto = new TopupUserDTO();
            dto.setId(payment.getId());
            if (payment.getUser() != null) {
                String name = payment.getUser().getFullName();
                dto.setFullName(name != null && !name.trim().isEmpty() ? name : payment.getUser().getUsername());
                dto.setAvatarUrl(payment.getUser().getAvatarUrl());
                dto.setPhoneNumber(payment.getUser().getPhoneNumber());
            }
            dto.setCreatedAt(payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null);
            dto.setCoin(payment.getCoin());
            dto.setStatus(payment.getStatus());
            dto.setMethod(payment.getPaymentMethod());
            dto.setBankAccountNumber(payment.getBankAccountNumber());
            dto.setBankAccountName(payment.getBankAccountName());
            dto.setBankName(payment.getBankName());
            dto.setCompletedAt(payment.getCompletedAt() != null ? payment.getCompletedAt().toString() : null);
            dto.setDescription(payment.getDescription());
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/topup-users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TopupUserDTO>> getAllTopupUsers() {
        List<Payment> topups = paymentService.getAllTopupPayments();
        List<TopupUserDTO> result = topups.stream().map(payment -> {
            TopupUserDTO dto = new TopupUserDTO();
            dto.setId(payment.getId());
            if (payment.getUser() != null) {
                String name = payment.getUser().getFullName();
                dto.setFullName(name != null && !name.trim().isEmpty() ? name : payment.getUser().getUsername());
                dto.setAvatarUrl(payment.getUser().getAvatarUrl());
                dto.setPhoneNumber(payment.getUser().getPhoneNumber());
            }
            dto.setCreatedAt(payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null);
            dto.setCoin(payment.getCoin());
            dto.setStatus(payment.getStatus());
            dto.setMethod(payment.getPaymentMethod());
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/withdraw-users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TopupUserDTO>> getAllWithdrawUsers() {
        List<Payment> withdraws = paymentService.getAllWithdrawPayments();
        List<TopupUserDTO> result = withdraws.stream().map(payment -> {
            TopupUserDTO dto = new TopupUserDTO();
            dto.setId(payment.getId());
            if (payment.getUser() != null) {
                String name = payment.getUser().getFullName();
                dto.setFullName(name != null && !name.trim().isEmpty() ? name : payment.getUser().getUsername());
                dto.setAvatarUrl(payment.getUser().getAvatarUrl());
                dto.setPhoneNumber(payment.getUser().getPhoneNumber());
            }
            dto.setCreatedAt(payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null);
            dto.setCoin(payment.getCoin());
            dto.setStatus(payment.getStatus());
            dto.setMethod(payment.getPaymentMethod());
            dto.setBankAccountNumber(payment.getBankAccountNumber());
            dto.setBankAccountName(payment.getBankAccountName());
            dto.setBankName(payment.getBankName());
            dto.setCompletedAt(payment.getCompletedAt() != null ? payment.getCompletedAt().toString() : null);
            dto.setDescription(payment.getDescription());
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/admin/reconcile/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Kiểm tra đối soát giữa số dư ví và tổng giao dịch của người dùng")
    public ResponseEntity<?> reconcileUserWallet(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        if (walletReconciliationService == null) {
            return ResponseEntity.badRequest().body("Dịch vụ đối soát chưa được khởi tạo");
        }
        com.example.backend.dto.WalletReconciliationDTO report = walletReconciliationService.reconcile(user);
        return ResponseEntity.ok(report);
    }

    @PostMapping("/vnpay/create")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createVnPayPayment(
            @RequestParam Long amount,
            @RequestParam String orderInfo,
            @RequestParam(required = false) Long userId,
            HttpServletRequest request,
            Authentication authentication) {
        log.info("=== BẮT ĐẦU: Tạo link VNPay ===");
        log.info("Request params: amount={}, orderInfo={}, requestedUserId={}", amount, orderInfo, userId);
        log.info("Request URI: {}", request.getRequestURI());
        log.info("Request method: {}", request.getMethod());

        try {
            log.info("Bước 1: Lấy IP address");
            String ipAddr = request.getRemoteAddr();
            log.info("IP address: {}", ipAddr);

            log.info("Bước 2: Tạo txnRef");
            String txnRef = String.valueOf(System.currentTimeMillis());
            log.info("TxnRef: {}", txnRef);

            log.info("Bước 3: Gọi VnPayService.createPaymentUrl");
            String paymentUrl = vnPayService.createPaymentUrl(amount, orderInfo, ipAddr, txnRef);
            log.info("Payment URL tạo thành công: {}", paymentUrl);

            log.info("Bước 4: Tìm user theo authentication");
            User user = userService.findByUsername(authentication.getName());
            if (user == null) {
                return ResponseEntity.status(401).body("Không tìm thấy thông tin người dùng đăng nhập");
            }
            log.info("User xác thực: id={}, username={}", user.getId(), user.getUsername());

            log.info("Bước 5: Tạo Payment entity");
            Payment payment = new Payment();
            payment.setUser(user);
            payment.setCoin(amount);
            payment.setCurrency("VND");
            payment.setPaymentMethod(Payment.PaymentMethod.VNPAY);
            payment.setStatus(Payment.PaymentStatus.PENDING);
            payment.setVnpTxnRef(txnRef);
            payment.setDescription(orderInfo);
            payment.setCreatedAt(LocalDateTime.now());
            payment.setType(Payment.PaymentType.TOPUP);
            log.info("Payment entity đã tạo: {}", payment);

            log.info("Bước 6: Lưu Payment vào database");
            Payment savedPayment = paymentRepository.save(payment);
            log.info("Payment đã lưu thành công: id={}", savedPayment.getId());

            log.info("Bước 7: Trả về response");
            Map<String, Object> response = new HashMap<>();
            response.put("paymentUrl", paymentUrl);
            response.put("txnRef", txnRef);
            response.put("paymentId", savedPayment.getId());
            log.info("Response: {}", response);

            log.info("=== KẾT THÚC: Tạo link VNPay thành công ===");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("=== LỖI: Tạo link VNPay thất bại ===");
            log.error("Exception type: {}", e.getClass().getSimpleName());
            log.error("Exception message: {}", e.getMessage());
            log.error("Stack trace:", e);
            return ResponseEntity.badRequest().body("Lỗi tạo link thanh toán: " + e.getMessage());
        }
    }

    @Transactional
    @GetMapping("/vnpay-return")
    public ResponseEntity<String> vnpayReturn(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((k, v) -> params.put(k, v[0]));
        boolean valid = vnPayService.verifyVnpayCallback(new HashMap<>(params));
        String html;
        // Lấy thông tin chi tiết từ callback VNPAY
        String amount = params.getOrDefault("vnp_Amount", "-");
        String bankCode = params.getOrDefault("vnp_BankCode", "-");
        String cardNumber = params.getOrDefault("vnp_CardNumber", "-");
        String payDate = params.getOrDefault("vnp_PayDate", "-");
        String accountName = params.getOrDefault("vnp_AccountName", "-");
        String txnRef = params.getOrDefault("vnp_TxnRef", "-");
        String responseCode = params.get("vnp_ResponseCode");
        Payment payment = paymentRepository.findByVnpTxnRef(txnRef).orElse(null);
        String amountDisplay = "-";
        String amountRaw = "-";
        String coinDisplay = "-";
        if (amount != null && !amount.equals("-")) {
            try {
                long vnd = Long.parseLong(amount) / 100;
                amountDisplay = String.format("%,d VND", vnd).replace(",", ".");
                amountRaw = String.valueOf(vnd);
                coinDisplay = String.format("%,d xu", vnd).replace(",", ".");
            } catch (Exception ignore) {}
        }
        // Chuyển đổi thời gian thanh toán sang định dạng dễ đọc nếu có
        String payDateDisplay = "-";
        if (payDate != null && payDate.length() == 14) {
            try {
                String year = payDate.substring(0, 4);
                String month = payDate.substring(4, 6);
                String day = payDate.substring(6, 8);
                String hour = payDate.substring(8, 10);
                String minute = payDate.substring(10, 12);
                String second = payDate.substring(12, 14);
                payDateDisplay = hour + ":" + minute + ":" + second + " " + day + "/" + month + "/" + year;
            } catch (Exception ignore) {}
        }
        if (!valid) {
            html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Giao dịch không hợp lệ!</h1></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }
        if (payment == null) {
            html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Không tìm thấy đơn hàng!</h1></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }
        if ("00".equals(responseCode)) {
            // Chống Replay Attack / Race Condition: Nếu giao dịch đã hoàn tất trước đó thì không cộng xu trùng lặp
            if (Payment.PaymentStatus.COMPLETED.equals(payment.getStatus())) {
                html = "<div style='text-align:center;margin-top:50px;'>"
                    + "<h1 style='color:green;font-size:2.5em;'>Giao dịch đã được ghi nhận thành công!</h1>"
                    + "<p style='font-size:1.2em;'>Số xu đã được cộng vào tài khoản của bạn trước đó.</p>"
                    + "</div>";
                return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
            }

            // Atomic UPDATE ... WHERE status='PENDING' để ngăn chặn cộng xu nhiều lần khi concurrent callback
            int affectedRows = paymentRepository.updatePaymentStatusIfExpected(
                payment.getId(),
                Payment.PaymentStatus.COMPLETED,
                LocalDateTime.now(),
                Payment.PaymentStatus.PENDING
            );

            if (affectedRows == 0) {
                // Đã có callback/request khác xử lý thành công trước đó
                html = "<div style='text-align:center;margin-top:50px;'>"
                    + "<h1 style='color:green;font-size:2.5em;'>Giao dịch đã được ghi nhận thành công!</h1>"
                    + "<p style='font-size:1.2em;'>Số xu đã được cộng vào tài khoản của bạn trước đó.</p>"
                    + "</div>";
                return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
            }

            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setCompletedAt(LocalDateTime.now());

            // Cộng xu cho user (chỉ thực hiện 1 lần duy nhất khi chuyển trạng thái thành công)
            User user = payment.getUser();
            if (user != null) {
                userService.addCoin(user.getId(), payment.getCoin());
                user.setCoin((user.getCoin() != null ? user.getCoin() : 0L) + payment.getCoin());

                // Gửi thông báo cho admin về giao dịch VNPay thành công
                try {
                    adminNotificationService.notifyAdminsAboutVnPayTransaction(user, payment.getCoin(), "THÀNH CÔNG");
                } catch (Exception e) {
                    System.err.println("[PaymentController] Error calling adminNotificationService.notifyAdminsAboutVnPayTransaction: " + e.getMessage());
                    e.printStackTrace();
                }
            }
            html = "<div style='text-align:center;margin-top:50px;'>"
                + "<h1 style='color:green;font-size:2.5em;'>Nạp tiền thành công!</h1>"
                + "<div style='margin: 30px auto; display: inline-block; text-align:left; font-size:1.3em; background:#f6fff6; border-radius:12px; padding:32px 48px; box-shadow:0 2px 12px #d0e6d0;'>"
                + "<p><b>Số tiền nạp:</b> <span style='color:#388e3c;'>" + amountRaw + "</span></p>"
                + "<p><b>Số xu bạn nhận được:</b> <span style='color:#388e3c;'>" + coinDisplay + "</span></p>"
                + "<p><b>Ngân hàng:</b> " + bankCode + "</p>"
                + (cardNumber != null && !cardNumber.equals("-") ? ("<p><b>Số thẻ:</b> " + cardNumber + "</p>") : "")
                + (accountName != null && !accountName.equals("-") ? ("<p><b>Tên chủ thẻ:</b> " + accountName + "</p>") : "")
                + (payDateDisplay != null && !payDateDisplay.equals("-") ? ("<p><b>Thời gian thanh toán:</b> " + payDateDisplay + "</p>") : "")
                + "</div>"
                + "<p style='font-size:1.5em;margin-top:30px;'>Cảm ơn bạn đã sử dụng dịch vụ.</p>"
                + "</div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        } else {
            html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Giao dịch thất bại!</h1></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }
    }

    @PostMapping("/momo/create")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createMomoPayment(
            @RequestParam Long amount,
            @RequestParam String orderInfo,
            Authentication authentication) {
        log.info("=== BẮT ĐẦU: Tạo link MoMo ===");
        try {
            if (amount == null || amount <= 0) {
                return ResponseEntity.badRequest().body("Số tiền nạp không hợp lệ");
            }
            User user = userService.findByUsername(authentication.getName());
            if (user == null) {
                return ResponseEntity.status(401).body("Không tìm thấy thông tin người dùng đăng nhập");
            }

            String txnRef = "MOMO_" + System.currentTimeMillis();
            Payment payment = new Payment();
            payment.setUser(user);
            payment.setCoin(amount);
            payment.setCurrency("VND");
            payment.setPaymentMethod(Payment.PaymentMethod.MOMO);
            payment.setStatus(Payment.PaymentStatus.PENDING);
            payment.setTransactionId(txnRef);
            payment.setVnpTxnRef(txnRef);
            payment.setDescription(orderInfo);
            payment.setCreatedAt(LocalDateTime.now());
            payment.setType(Payment.PaymentType.TOPUP);
            Payment savedPayment = paymentRepository.save(payment);

            if (momoService == null) {
                return ResponseEntity.badRequest().body("Dịch vụ MoMo chưa được khởi tạo");
            }
            Map<String, Object> result = momoService.createPayment(amount, orderInfo, txnRef);
            result.put("paymentId", savedPayment.getId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Lỗi khi tạo giao dịch MoMo: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Lỗi tạo giao dịch MoMo: " + e.getMessage());
        }
    }

    @Transactional
    @GetMapping("/momo-return")
    public ResponseEntity<String> momoReturn(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((k, v) -> params.put(k, v[0]));
        if (momoService == null) {
            String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;'>Dịch vụ MoMo chưa sẵn sàng</h1></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }
        boolean valid = momoService.verifyCallback(new HashMap<>(params));

        String orderId = params.get("orderId");
        String amountStr = params.get("amount");
        String transId = params.getOrDefault("transId", "-");

        if (!valid) {
            String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Chữ ký MoMo không hợp lệ!</h1><p>Giao dịch đã bị từ chối.</p></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        Payment payment = null;
        if (orderId != null) {
            payment = paymentRepository.findByTransactionId(orderId)
                    .orElseGet(() -> paymentRepository.findByVnpTxnRef(orderId).orElse(null));
        }

        if (payment == null) {
            String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Không tìm thấy thông tin đơn hàng MoMo!</h1></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        if (amountStr != null) {
            try {
                long amount = Long.parseLong(amountStr);
                if (payment.getCoin() == null || payment.getCoin() != amount) {
                    log.warn("MoMo amount mismatch: order={}, payment={}", amount, payment.getCoin());
                    String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Số tiền thanh toán MoMo không khớp!</h1></div>";
                    return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
                }
            } catch (NumberFormatException ignored) {}
        }

        if (Payment.PaymentStatus.COMPLETED.equals(payment.getStatus())) {
            String html = "<div style='text-align:center;margin-top:50px;font-family:sans-serif;'>"
                    + "<h1 style='color:green;font-size:2.5em;'>Giao dịch MoMo đã được ghi nhận trước đó!</h1>"
                    + "<p style='font-size:1.2em;'>Số xu đã được cộng vào tài khoản của bạn.</p>"
                    + "<a href='http://localhost:5173/wallet' style='display:inline-block;margin-top:20px;padding:12px 24px;background:#ec4899;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;'>Về ví PlayZone</a>"
                    + "</div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        int affectedRows = paymentRepository.updatePaymentStatusIfExpected(
                payment.getId(),
                Payment.PaymentStatus.COMPLETED,
                LocalDateTime.now(),
                Payment.PaymentStatus.PENDING
        );

        if (affectedRows == 0) {
            String html = "<div style='text-align:center;margin-top:50px;font-family:sans-serif;'>"
                    + "<h1 style='color:green;font-size:2.5em;'>Giao dịch MoMo đã được xử lý thành công!</h1>"
                    + "<p style='font-size:1.2em;'>Số xu đã được cộng vào ví của bạn.</p>"
                    + "<a href='http://localhost:5173/wallet' style='display:inline-block;margin-top:20px;padding:12px 24px;background:#ec4899;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;'>Về ví PlayZone</a>"
                    + "</div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        payment.setStatus(Payment.PaymentStatus.COMPLETED);
        payment.setCompletedAt(LocalDateTime.now());

        User user = payment.getUser();
        if (user != null) {
            userService.addCoin(user.getId(), payment.getCoin());
            user.setCoin((user.getCoin() != null ? user.getCoin() : 0L) + payment.getCoin());

            notificationService.createNotification(
                    user.getId(),
                    "Nạp xu MoMo thành công!",
                    "Bạn vừa nạp thành công " + payment.getCoin() + " xu qua Ví MoMo.",
                    "topup",
                    "/wallet",
                    payment.getId().toString()
            );

            try {
                adminNotificationService.notifyAdminsAboutTopup(user, payment.getCoin());
            } catch (Exception ignored) {}
        }

        String html = "<div style='text-align:center;margin-top:50px;font-family:sans-serif;'>"
                + "<h1 style='color:#ec4899;font-size:2.5em;'>Nạp Tiền Qua MoMo Thành Công!</h1>"
                + "<div style='margin: 30px auto; max-width:480px; text-align:left; font-size:1.1em; background:#fdf2f8; border-radius:12px; padding:24px 32px; border:1px solid #fbcfe8;'>"
                + "<p><b>Mã giao dịch:</b> " + transId + "</p>"
                + "<p><b>Số xu nhận được:</b> <span style='color:#db2777;font-weight:bold;'>" + String.format("%,d xu", payment.getCoin()).replace(',', '.') + "</span></p>"
                + "<p><b>Phương thức:</b> Ví điện tử MoMo</p>"
                + "</div>"
                + "<a href='http://localhost:5173/wallet' style='display:inline-block;margin-top:20px;padding:12px 28px;background:#ec4899;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:1.05rem;'>Quay Lại Ví PlayZone</a>"
                + "</div>";
        return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
    }

    @Transactional
    @PostMapping("/momo-ipn")
    public ResponseEntity<Map<String, Object>> momoIpn(@RequestBody(required = false) Map<String, String> body, HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        if (body != null && !body.isEmpty()) {
            params.putAll(body);
        } else {
            request.getParameterMap().forEach((k, v) -> params.put(k, v[0]));
        }

        if (momoService == null || !momoService.verifyCallback(new HashMap<>(params))) {
            return ResponseEntity.badRequest().body(Map.of("resultCode", 99, "message", "Invalid signature"));
        }

        String orderId = params.get("orderId");
        Payment payment = paymentRepository.findByTransactionId(orderId)
                .orElseGet(() -> paymentRepository.findByVnpTxnRef(orderId).orElse(null));

        if (payment == null) {
            return ResponseEntity.badRequest().body(Map.of("resultCode", 99, "message", "Order not found"));
        }

        if (Payment.PaymentStatus.PENDING.equals(payment.getStatus())) {
            int affected = paymentRepository.updatePaymentStatusIfExpected(
                    payment.getId(),
                    Payment.PaymentStatus.COMPLETED,
                    LocalDateTime.now(),
                    Payment.PaymentStatus.PENDING
            );
            if (affected > 0 && payment.getUser() != null) {
                userService.addCoin(payment.getUser().getId(), payment.getCoin());
            }
        }
        return ResponseEntity.ok(Map.of("resultCode", 0, "message", "Success"));
    }

    @PostMapping("/zalopay/create")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createZaloPayPayment(
            @RequestParam Long amount,
            @RequestParam String orderInfo,
            Authentication authentication) {
        log.info("=== BẮT ĐẦU: Tạo link ZaloPay ===");
        try {
            if (amount == null || amount <= 0) {
                return ResponseEntity.badRequest().body("Số tiền nạp không hợp lệ");
            }
            User user = userService.findByUsername(authentication.getName());
            if (user == null) {
                return ResponseEntity.status(401).body("Không tìm thấy thông tin người dùng đăng nhập");
            }

            String txnRef = "ZP_" + System.currentTimeMillis();
            Payment payment = new Payment();
            payment.setUser(user);
            payment.setCoin(amount);
            payment.setCurrency("VND");
            payment.setPaymentMethod(Payment.PaymentMethod.ZALOPAY);
            payment.setStatus(Payment.PaymentStatus.PENDING);
            payment.setTransactionId(txnRef);
            payment.setVnpTxnRef(txnRef);
            payment.setDescription(orderInfo);
            payment.setCreatedAt(LocalDateTime.now());
            payment.setType(Payment.PaymentType.TOPUP);
            Payment savedPayment = paymentRepository.save(payment);

            if (zaloPayService == null) {
                return ResponseEntity.badRequest().body("Dịch vụ ZaloPay chưa được khởi tạo");
            }
            Map<String, Object> result = zaloPayService.createPayment(amount, orderInfo, txnRef);
            result.put("paymentId", savedPayment.getId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Lỗi khi tạo giao dịch ZaloPay: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Lỗi tạo giao dịch ZaloPay: " + e.getMessage());
        }
    }

    @Transactional
    @GetMapping("/zalopay-return")
    public ResponseEntity<String> zaloPayReturn(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((k, v) -> params.put(k, v[0]));
        if (zaloPayService == null) {
            String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;'>Dịch vụ ZaloPay chưa sẵn sàng</h1></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }
        boolean valid = zaloPayService.verifyCallback(new HashMap<>(params));

        String rawTxnRef = params.get("txnRef");
        if (rawTxnRef == null && params.get("apptransid") != null) {
            String apptransid = params.get("apptransid");
            int idx = apptransid.indexOf('_');
            if (idx >= 0) rawTxnRef = apptransid.substring(idx + 1);
        }
        final String txnRef = rawTxnRef;
        String amountStr = params.get("amount");

        if (!valid) {
            String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Chữ ký ZaloPay không hợp lệ!</h1><p>Giao dịch đã bị từ chối.</p></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        Payment payment = null;
        if (txnRef != null) {
            payment = paymentRepository.findByTransactionId(txnRef)
                    .orElseGet(() -> paymentRepository.findByVnpTxnRef(txnRef).orElse(null));
        }

        if (payment == null) {
            String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Không tìm thấy thông tin đơn hàng ZaloPay!</h1></div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        if (amountStr != null) {
            try {
                long amount = Long.parseLong(amountStr);
                if (payment.getCoin() == null || payment.getCoin() != amount) {
                    log.warn("ZaloPay amount mismatch: order={}, payment={}", amount, payment.getCoin());
                    String html = "<div style='text-align:center;margin-top:50px;'><h1 style='color:red;font-size:2.5em;'>Số tiền thanh toán ZaloPay không khớp!</h1></div>";
                    return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
                }
            } catch (NumberFormatException ignored) {}
        }

        if (Payment.PaymentStatus.COMPLETED.equals(payment.getStatus())) {
            String html = "<div style='text-align:center;margin-top:50px;font-family:sans-serif;'>"
                    + "<h1 style='color:green;font-size:2.5em;'>Giao dịch ZaloPay đã được ghi nhận trước đó!</h1>"
                    + "<p style='font-size:1.2em;'>Số xu đã được cộng vào tài khoản của bạn.</p>"
                    + "<a href='http://localhost:5173/wallet' style='display:inline-block;margin-top:20px;padding:12px 24px;background:#0068ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;'>Về ví PlayZone</a>"
                    + "</div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        int affectedRows = paymentRepository.updatePaymentStatusIfExpected(
                payment.getId(),
                Payment.PaymentStatus.COMPLETED,
                LocalDateTime.now(),
                Payment.PaymentStatus.PENDING
        );

        if (affectedRows == 0) {
            String html = "<div style='text-align:center;margin-top:50px;font-family:sans-serif;'>"
                    + "<h1 style='color:green;font-size:2.5em;'>Giao dịch ZaloPay đã được xử lý thành công!</h1>"
                    + "<p style='font-size:1.2em;'>Số xu đã được cộng vào ví của bạn.</p>"
                    + "<a href='http://localhost:5173/wallet' style='display:inline-block;margin-top:20px;padding:12px 24px;background:#0068ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;'>Về ví PlayZone</a>"
                    + "</div>";
            return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
        }

        payment.setStatus(Payment.PaymentStatus.COMPLETED);
        payment.setCompletedAt(LocalDateTime.now());

        User user = payment.getUser();
        if (user != null) {
            userService.addCoin(user.getId(), payment.getCoin());
            user.setCoin((user.getCoin() != null ? user.getCoin() : 0L) + payment.getCoin());

            notificationService.createNotification(
                    user.getId(),
                    "Nạp xu ZaloPay thành công!",
                    "Bạn vừa nạp thành công " + payment.getCoin() + " xu qua Ví ZaloPay.",
                    "topup",
                    "/wallet",
                    payment.getId().toString()
            );

            try {
                adminNotificationService.notifyAdminsAboutTopup(user, payment.getCoin());
            } catch (Exception ignored) {}
        }

        String html = "<div style='text-align:center;margin-top:50px;font-family:sans-serif;'>"
                + "<h1 style='color:#0068ff;font-size:2.5em;'>Nạp Tiền Qua ZaloPay Thành Công!</h1>"
                + "<div style='margin: 30px auto; max-width:480px; text-align:left; font-size:1.1em; background:#eff6ff; border-radius:12px; padding:24px 32px; border:1px solid #bfdbfe;'>"
                + "<p><b>Mã giao dịch:</b> " + (params.getOrDefault("apptransid", "-")) + "</p>"
                + "<p><b>Số xu nhận được:</b> <span style='color:#1d4ed8;font-weight:bold;'>" + String.format("%,d xu", payment.getCoin()).replace(',', '.') + "</span></p>"
                + "<p><b>Phương thức:</b> Ví điện tử ZaloPay</p>"
                + "</div>"
                + "<a href='http://localhost:5173/wallet' style='display:inline-block;margin-top:20px;padding:12px 28px;background:#0068ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:1.05rem;'>Quay Lại Ví PlayZone</a>"
                + "</div>";
        return ResponseEntity.ok().header("Content-Type", "text/html; charset=UTF-8").body(html);
    }


    @Transactional(isolation = Isolation.SERIALIZABLE)
    @PostMapping("/donate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> donate(@RequestBody DonateRequest request, Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Vui lòng đăng nhập để thực hiện"));
        }

        if (request == null || request.getPlayerId() == null || request.getCoin() == null || request.getCoin() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thông tin tặng quà không hợp lệ"));
        }
        
        // Tìm GamePlayer trước, sau đó lấy User từ GamePlayer (hỗ trợ cả gamePlayerId và userId)
        GamePlayer gamePlayer = gamePlayerRepository.findById(request.getPlayerId())
                .orElse(null);
        User player = null;
        if (gamePlayer != null) {
            player = gamePlayer.getUser();
        } else {
            List<GamePlayer> gps = gamePlayerRepository.findByUserId(request.getPlayerId());
            if (gps != null && !gps.isEmpty()) {
                gamePlayer = gps.get(0);
                player = gamePlayer.getUser();
            } else {
                try {
                    player = userService.findById(request.getPlayerId());
                } catch (Exception ignored) {}
            }
        }

        if (player == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy người nhận quà"));
        }

        if (user.getId().equals(player.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bạn không thể tự tặng quà cho chính mình"));
        }
        
        String recipientDisplayName = gamePlayer != null ? gamePlayer.getUsername() : (player.getFullName() != null ? player.getFullName() : player.getUsername());
        
        
        if (user.getCoin() < request.getCoin()) {
            // Gửi thông báo cho người donate về việc số dư không đủ
            try {
                notificationService.createNotification(
                    user.getId(),
                    "Donate thất bại",
                    "Số dư không đủ để tặng " + request.getCoin() + " xu cho " + recipientDisplayName + ". Số dư hiện tại: " + user.getCoin() + " xu.",
                    "donate_failed",
                    null,
                    null
                );
            } catch (Exception e) {
                System.err.println("[PaymentController] Error sending insufficient balance notification: " + e.getMessage());
            }
            
            return ResponseEntity.badRequest().body(Map.of("message", "Số dư ví không đủ để tặng quà. Vui lòng nạp thêm!"));
        }
        
        // Tính toán chiết khấu hệ thống (VIP/Custom/Default)
        long originalCoin = request.getCoin();
        double commissionRate = commissionService != null 
                ? (gamePlayer != null ? commissionService.getCommissionRateForPlayer(gamePlayer) : commissionService.getCommissionRateForUser(player)) 
                : 0.15;
        long platformFee = commissionService != null 
                ? commissionService.calculatePlatformFee(originalCoin, commissionRate) 
                : Math.round(originalCoin * 0.15);
        long playerReceive = originalCoin - platformFee;

        // Trừ 100% xu người donate
        user.setCoin(user.getCoin() - originalCoin);
        User savedUser = userService.save(user);
        
        // Cộng xu thực nhận cho player (Idol)
        player.setCoin(player.getCoin() + playerReceive);
        User savedPlayer = userService.save(player);

        // Lưu Payment DONATE cho người gửi (trừ 100% xu)
        Payment paymentFrom = new Payment();
        paymentFrom.setUser(user);
        paymentFrom.setPlayer(player);
        paymentFrom.setGamePlayer(gamePlayer);
        paymentFrom.setCoin(originalCoin);
        paymentFrom.setOriginalAmount(originalCoin);
        paymentFrom.setDiscountRate(commissionRate);
        paymentFrom.setPlatformFee(platformFee);
        paymentFrom.setPlayerReceived(playerReceive);
        paymentFrom.setCurrency("COIN");
        paymentFrom.setStatus(Payment.PaymentStatus.COMPLETED);
        paymentFrom.setPaymentMethod(Payment.PaymentMethod.DONATE);
        paymentFrom.setType(Payment.PaymentType.DONATE);
        paymentFrom.setCreatedAt(java.time.LocalDateTime.now());
        paymentFrom.setCompletedAt(java.time.LocalDateTime.now());
        paymentFrom.setDescription("Tặng quà cho " + recipientDisplayName + ": " + (request.getMessage() != null ? request.getMessage() : ""));
        Payment savedPaymentFrom = paymentRepository.save(paymentFrom);

        // Lưu Payment DONATE cho người nhận (cộng xu thực nhận)
        Payment paymentTo = new Payment();
        paymentTo.setUser(player);
        paymentTo.setPlayer(user);
        paymentTo.setGamePlayer(gamePlayer);
        paymentTo.setCoin(playerReceive);
        paymentTo.setOriginalAmount(originalCoin);
        paymentTo.setDiscountRate(commissionRate);
        paymentTo.setPlatformFee(platformFee);
        paymentTo.setPlayerReceived(playerReceive);
        paymentTo.setCurrency("COIN");
        paymentTo.setStatus(Payment.PaymentStatus.COMPLETED);
        paymentTo.setPaymentMethod(Payment.PaymentMethod.DONATE);
        paymentTo.setType(Payment.PaymentType.DONATE);
        paymentTo.setCreatedAt(java.time.LocalDateTime.now());
        paymentTo.setCompletedAt(java.time.LocalDateTime.now());
        paymentTo.setDescription("Nhận quà từ " + (user.getFullName() != null ? user.getFullName() : user.getUsername()) + " (Đã khấu trừ phí sàn " + (int)(commissionRate * 100) + "%): " + (request.getMessage() != null ? request.getMessage() : ""));
        Payment savedPaymentTo = paymentRepository.save(paymentTo);

        // Lưu doanh thu nền tảng (Revenue)
        try {
            Revenue revenue = new Revenue();
            revenue.setAmount(platformFee);
            revenue.setCreatedAt(java.time.LocalDateTime.now());
            revenue.setPayment(savedPaymentFrom);
            revenueRepository.save(revenue);
        } catch (Exception e) {
            System.err.println("[PaymentController] Error saving donate revenue: " + e.getMessage());
        }

        // Gửi thông báo cho người donate
        try {
            notificationService.createNotification(
                user.getId(),
                "✅ Tặng quà thành công",
                "Bạn đã tặng quà trị giá " + originalCoin + " xu cho " + recipientDisplayName + " thành công. Số dư còn lại: " + savedUser.getCoin() + " xu.",
                "donate_sent",
                "/donate-history",
                savedPaymentFrom.getId().toString()
            );
        } catch (Exception e) {
            System.err.println("[PaymentController] Error sending notification to donor: " + e.getMessage());
        }

        // Gửi thông báo cho người nhận donate
        try {
            notificationService.createNotification(
                player.getId(),
                "🎁 Bạn nhận được quà tặng mới!",
                (user.getFullName() != null ? user.getFullName() : user.getUsername()) + " đã tặng quà trị giá " + originalCoin + " xu cho bạn (Thực nhận: " + playerReceive + " xu sau khi trừ 15% phí hệ thống). Lời nhắn: " + (request.getMessage() != null ? request.getMessage() : ""),
                "donate_received",
                "/donate-history",
                savedPaymentTo.getId().toString()
            );
            
            // Gửi push notification riêng cho người nhận donate
            sendDonatePushNotification(player, user, playerReceive, request.getMessage());
        } catch (Exception e) {
            System.err.println("[PaymentController] Error sending notification to recipient: " + e.getMessage());
        }

        // Gửi thông báo cho admin về giao dịch donate
        try {
            adminNotificationService.notifyAdminsAboutDonate(user, player, originalCoin, recipientDisplayName);
        } catch (Exception e) {
            System.err.println("[PaymentController] Error calling adminNotificationService.notifyAdminsAboutDonate: " + e.getMessage());
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Tặng quà thành công");
        resp.put("newBalance", savedUser.getCoin());
        resp.put("coin", originalCoin);
        resp.put("platformFee", platformFee);
        resp.put("playerReceived", playerReceive);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/donate-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getDonateHistory(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body(List.of());
        }
        List<Payment> donateHistory = paymentRepository.findDonateHistoryByUserId(user.getId());
        List<Map<String, Object>> result = donateHistory.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("coin", p.getCoin());

            long orig = p.getOriginalAmount() != null ? p.getOriginalAmount() : (p.getCoin() != null ? p.getCoin() : 0L);
            long fee = p.getPlatformFee() != null ? p.getPlatformFee() : Math.round(orig * 0.15);
            long recv = p.getPlayerReceived() != null ? p.getPlayerReceived() : (orig - fee);

            map.put("originalAmount", orig);
            map.put("discountRate", p.getDiscountRate() != null ? p.getDiscountRate() : 0.15);
            map.put("platformFee", fee);
            map.put("playerReceived", recv);
            map.put("currency", p.getCurrency());
            map.put("status", p.getStatus() != null ? p.getStatus().name() : "COMPLETED");
            map.put("description", p.getDescription());
            map.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : "");

            String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
            boolean isReceive = desc.startsWith("nhận") || desc.contains("nhận quà") || desc.contains("nhận donate");
            map.put("isReceive", isReceive);
            map.put("type", isReceive ? "RECEIVE" : "DONATE");

            if (p.getPlayer() != null) {
                map.put("partnerId", p.getPlayer().getId());
                map.put("partnerName", p.getPlayer().getFullName() != null ? p.getPlayer().getFullName() : p.getPlayer().getUsername());
                map.put("partnerAvatar", p.getPlayer().getAvatarUrl());
            }
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard() {
        // 1. Lấy tất cả GamePlayer
        List<GamePlayer> allPlayers = gamePlayerRepository.findAll();

        // 2. Lấy tất cả Payment DONATE
        List<Payment> donatePayments = paymentRepository.findByTypeOrderByCreatedAtDesc(Payment.PaymentType.DONATE);

        Map<Long, Long> playerGiftExpMap = new HashMap<>();
        Map<Long, Long> playerGiftCoinMap = new HashMap<>();
        Map<Long, Long> userDonateSpentMap = new HashMap<>();

        for (Payment p : donatePayments) {
            if (p.getStatus() != Payment.PaymentStatus.COMPLETED) continue;
            Long coin = p.getCoin() != null ? p.getCoin() : 0L;
            if (coin <= 0) continue;

            String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
            boolean isReceive = desc.startsWith("nhận") || desc.contains("nhận quà") || desc.contains("nhận donate");

            if (!isReceive) {
                // 1. Bản ghi gửi tặng quà: tính tiền chi tiêu cho Đại Gia
                if (p.getUser() != null) {
                    Long senderId = p.getUser().getId();
                    userDonateSpentMap.put(senderId, userDonateSpentMap.getOrDefault(senderId, 0L) + coin);
                }
                // 2. Tính điểm Exp quà tặng cho Idol nhận quà (từ p.getPlayer())
                if (p.getPlayer() != null) {
                    Long recipientId = p.getPlayer().getId();
                    long expAward = calculateExpFromCoin(coin, desc);
                    playerGiftExpMap.put(recipientId, playerGiftExpMap.getOrDefault(recipientId, 0L) + expAward);
                    playerGiftCoinMap.put(recipientId, playerGiftCoinMap.getOrDefault(recipientId, 0L) + coin);
                }
            } else {
                // Dự phòng nếu bản ghi nhận quà đứng độc lập
                if (p.getUser() != null && p.getPlayer() == null) {
                    Long recipientId = p.getUser().getId();
                    long expAward = calculateExpFromCoin(coin, desc);
                    playerGiftExpMap.put(recipientId, playerGiftExpMap.getOrDefault(recipientId, 0L) + expAward);
                }
            }
        }

        // 3. Lấy tất cả đơn thuê (Orders)
        List<Order> allOrders = orderRepository.findAll();
        Map<Long, Long> userHireSpentMap = new HashMap<>();
        Map<Long, Long> playerCompletedOrderCountMap = new HashMap<>();
        Map<Long, Long> playerTotalHoursMap = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        for (Order o : allOrders) {
            String status = o.getStatus() != null ? o.getStatus().toUpperCase() : "";
            boolean isCanceledOrRejected = "CANCELED".equals(status) || "REJECTED".equals(status);
            Long price = o.getPrice() != null ? o.getPrice() : 0L;

            // 1. Tiền thuê mà Renter đã chi: tính các đơn hợp lệ đã thanh toán (không bị hủy/từ chối)
            if (!isCanceledOrRejected && price > 0 && o.getRenter() != null) {
                Long renterId = o.getRenter().getId();
                userHireSpentMap.put(renterId, userHireSpentMap.getOrDefault(renterId, 0L) + price);
            }

            // 2. ĐƠN ĐÃ HOÀN THÀNH: chỉ tính số giờ chơi và Exp từ những đơn ĐÃ HOÀN THÀNH
            boolean isCompleted = "COMPLETED".equalsIgnoreCase(status)
                    || "FINISH".equalsIgnoreCase(status)
                    || "FINISHED".equalsIgnoreCase(status)
                    || ("CONFIRMED".equalsIgnoreCase(status) && o.getEndTime() != null && o.getEndTime().isBefore(now))
                    || (o.getPayment() != null && o.getPayment().getStatus() == Payment.PaymentStatus.COMPLETED && !isCanceledOrRejected && !"PENDING".equalsIgnoreCase(status));

            if (isCompleted && o.getPlayer() != null) {
                Long gpId = o.getPlayer().getId();
                playerCompletedOrderCountMap.put(gpId, playerCompletedOrderCountMap.getOrDefault(gpId, 0L) + 1);

                // Tính số giờ chơi thực tế của đơn ĐÃ HOÀN THÀNH này
                long hours = 0;
                if (o.getStartTime() != null && o.getEndTime() != null) {
                    hours = java.time.Duration.between(o.getStartTime(), o.getEndTime()).toHours();
                    if (hours <= 0) {
                        long mins = java.time.Duration.between(o.getStartTime(), o.getEndTime()).toMinutes();
                        hours = mins > 0 ? Math.max(1L, Math.round((double) mins / 60.0)) : 1L;
                    }
                }
                if (hours <= 0 && price > 0 && o.getPlayer().getPricePerHour() != null && o.getPlayer().getPricePerHour().doubleValue() > 0) {
                    hours = Math.max(1L, Math.round((double) price / o.getPlayer().getPricePerHour().doubleValue()));
                }
                if (hours <= 0) {
                    hours = 1L;
                }
                playerTotalHoursMap.put(gpId, playerTotalHoursMap.getOrDefault(gpId, 0L) + hours);
            }
        }

        // 4. Danh sách Top Player kèm Exp (Số giờ chơi của đơn ĐÃ HOÀN THÀNH * 600 + Exp Quà Tặng) - Gộp theo userId
        Map<Long, Map<String, Object>> userPlayerMap = new java.util.LinkedHashMap<>();

        // Batch prefetch review stats to eliminate N+1 queries in leaderboard
        List<Object[]> allGpReviewStats = playerReviewRepository.getAllGamePlayerReviewStats();
        Map<Long, Object[]> gpReviewMap = new HashMap<>();
        for (Object[] row : allGpReviewStats) {
            if (row != null && row[0] != null) gpReviewMap.put(((Number) row[0]).longValue(), row);
        }

        List<Object[]> allUserReviewStats = playerReviewRepository.getAllUserReviewStats();
        Map<Long, Object[]> userReviewMap = new HashMap<>();
        for (Object[] row : allUserReviewStats) {
            if (row != null && row[0] != null) userReviewMap.put(((Number) row[0]).longValue(), row);
        }

        for (GamePlayer gp : allPlayers) {
            if ("BANNED".equalsIgnoreCase(gp.getStatus())) continue;
            Long gpId = gp.getId();
            Long userId = gp.getUser() != null ? gp.getUser().getId() : gpId;

            // Chỉ tính số đơn và số giờ từ các đơn ĐÃ HOÀN THÀNH thực tế
            long completedOrders = playerCompletedOrderCountMap.getOrDefault(gpId, 0L);
            long orderHours = playerTotalHoursMap.getOrDefault(gpId, 0L);

            // Lấy review stats từ precomputed batch maps (Zero N+1)
            Object[] userStat = (gp.getUser() != null) ? userReviewMap.get(gp.getUser().getId()) : null;
            Object[] gpStat = gpReviewMap.get(gpId);

            int userReviewCount = (userStat != null && userStat[1] != null) ? ((Number) userStat[1]).intValue() : 0;
            int gpReviewCount = (gpStat != null && gpStat[1] != null) ? ((Number) gpStat[1]).intValue() : 0;
            int reviewCount = Math.max(userReviewCount, gpReviewCount);

            Double avgRating = null;
            if (userStat != null && userStat[2] != null) {
                avgRating = ((Number) userStat[2]).doubleValue();
            } else if (gpStat != null && gpStat[2] != null) {
                avgRating = ((Number) gpStat[2]).doubleValue();
            }
            double finalRating = (reviewCount > 0 && avgRating != null)
                    ? Math.round(avgRating * 10.0) / 10.0
                    : 0.0;

            if (!userPlayerMap.containsKey(userId)) {
                Map<String, Object> pMap = new HashMap<>();
                pMap.put("id", gp.getId());
                pMap.put("userId", userId);
                pMap.put("username", gp.getUsername());
                String fullName = gp.getUser() != null && gp.getUser().getFullName() != null ?
                        gp.getUser().getFullName() : gp.getUsername();
                pMap.put("fullName", fullName);
                String avatar = gp.getUser() != null ? gp.getUser().getAvatarUrl() : null;
                pMap.put("avatar", avatar);
                pMap.put("orderCount", completedOrders);
                pMap.put("totalHours", orderHours);
                pMap.put("rating", finalRating);
                pMap.put("reviewCount", reviewCount);
                pMap.put("ratingCount", reviewCount);
                pMap.put("totalReviews", reviewCount);
                pMap.put("pricePerHour", gp.getPricePerHour());
                userPlayerMap.put(userId, pMap);
            } else {
                Map<String, Object> existing = userPlayerMap.get(userId);
                long prevOrders = (long) existing.get("orderCount");
                long prevHours = (long) existing.get("totalHours");
                existing.put("orderCount", prevOrders + completedOrders);
                existing.put("totalHours", prevHours + orderHours);
                int prevReviews = ((Number) existing.getOrDefault("reviewCount", 0)).intValue();
                if (reviewCount > prevReviews) {
                    existing.put("reviewCount", reviewCount);
                    existing.put("ratingCount", reviewCount);
                    existing.put("totalReviews", reviewCount);
                    existing.put("rating", finalRating);
                }
            }
        }

        List<Map<String, Object>> topPlayerList = new java.util.ArrayList<>();
        for (Map.Entry<Long, Map<String, Object>> entry : userPlayerMap.entrySet()) {
            Long userId = entry.getKey();
            Map<String, Object> pMap = entry.getValue();

            long totalHours = (long) pMap.get("totalHours");
            long playExp = totalHours * 600L; // Số giờ chơi * 600 Exp
            long giftExp = playerGiftExpMap.getOrDefault(userId, 0L);
            long totalExp = playExp + giftExp;

            pMap.put("totalHours", totalHours);
            pMap.put("playExp", playExp);
            pMap.put("giftExp", giftExp);
            pMap.put("exp", totalExp);
            topPlayerList.add(pMap);
        }

        // Sắp xếp Player theo exp giảm dần
        topPlayerList.sort((a, b) -> {
            Long expA = (Long) a.get("exp");
            Long expB = (Long) b.get("exp");
            if (!expB.equals(expA)) return expB.compareTo(expA);
            Double ratA = (Double) a.get("rating");
            Double ratB = (Double) b.get("rating");
            return ratB.compareTo(ratA);
        });

        // 5. Danh sách Top Phú Hộ (Chỉ load các user có giao dịch chi tiêu > 0)
        Set<Long> activeSpenderIds = new HashSet<>(userDonateSpentMap.keySet());
        activeSpenderIds.addAll(userHireSpentMap.keySet());
        List<User> spenderUsers = activeSpenderIds.isEmpty() ? Collections.emptyList() : userService.findAllById(activeSpenderIds);
        List<Map<String, Object>> topDonatorList = new java.util.ArrayList<>();

        for (User u : spenderUsers) {
            Long uId = u.getId();
            long donateSpent = userDonateSpentMap.getOrDefault(uId, 0L);
            long hireSpent = userHireSpentMap.getOrDefault(uId, 0L);
            long totalSpent = donateSpent + hireSpent;
            if (totalSpent <= 0) continue;

            Map<String, Object> uMap = new HashMap<>();
            uMap.put("id", u.getId());
            uMap.put("username", u.getUsername());
            uMap.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUsername());
            uMap.put("avatar", u.getAvatarUrl());
            uMap.put("roles", u.getRoles());
            uMap.put("donateSpent", donateSpent);
            uMap.put("hireSpent", hireSpent);
            uMap.put("totalSpent", totalSpent);
            topDonatorList.add(uMap);
        }

        // Sắp xếp Phú Hộ theo totalSpent giảm dần
        topDonatorList.sort((a, b) -> {
            Long spentA = (Long) a.get("totalSpent");
            Long spentB = (Long) b.get("totalSpent");
            return spentB.compareTo(spentA);
        });

        Map<String, Object> res = new HashMap<>();
        res.put("topPlayers", topPlayerList);
        res.put("topDonators", topDonatorList);
        return ResponseEntity.ok(res);
    }

    public static long calculateExpFromCoin(Long coin, String desc) {
        if (coin == null || coin <= 0) return 0;
        if (coin % 1000000L == 0) return (coin / 1000000L) * 8000L;
        if (coin % 500000L == 0) return (coin / 500000L) * 3500L;
        if (coin % 200000L == 0) return (coin / 200000L) * 1200L;
        if (coin % 100000L == 0) return (coin / 100000L) * 600L;
        if (coin % 50000L == 0) return (coin / 50000L) * 250L;
        if (coin % 30000L == 0) return (coin / 30000L) * 150L;
        if (coin >= 1000000L) return 8000L;
        if (coin >= 500000L) return 3500L;
        if (coin >= 200000L) return 1200L;
        if (coin >= 100000L) return 600L;
        if (coin >= 50000L) return 250L;
        if (coin >= 30000L) return 150L;
        return Math.round(coin * 0.006);
    }

    @Data
    static class DonateRequest {
        private Long playerId;
        private Long coin;
        private String message;
    }

    /**
     * Gửi push notification đặc biệt cho donate
     */
    private void sendDonatePushNotification(User recipient, User donor, Long coinAmount, String message) {
        try {
            if (recipient.getDeviceToken() != null && !recipient.getDeviceToken().isEmpty()) {
                String title = "🎁 Bạn có donate mới!";
                String body = donor.getUsername() + " đã donate " + coinAmount + " xu cho bạn";
                
                // Luôn hiển thị tin nhắn trong push notification nếu có
                if (message != null && !message.trim().isEmpty()) {
                    body += "\n💬 Tin nhắn: " + message;
                }
                
                notificationService.sendPushNotification(
                    recipient.getDeviceToken(),
                    title,
                    body,
                    null // Có thể thêm image URL nếu muốn
                );
                
            } else {
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi gửi push notification donate: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Gửi push notification đặc biệt cho rút tiền
     */
    private void sendWithdrawPushNotification(User user, Long coinAmount, String bankAccountNumber, String bankAccountName, String bankName) {
        try {
            if (user.getDeviceToken() != null && !user.getDeviceToken().isEmpty()) {
                String title = "💰 Rút coin thành công";
                String body = "Bạn đã rút " + coinAmount + " coin vào tài khoản " + bankAccountNumber + " - " + bankAccountName + " (" + bankName + "). Số dư còn lại: " + user.getCoin() + " coin.";
                
                notificationService.sendPushNotification(
                    user.getDeviceToken(),
                    title,
                    body,
                    null // Có thể thêm image URL nếu muốn
                );
                
            } else {
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi gửi push notification rút tiền: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Data
    public static class WithdrawRequest {
        @NotNull
        @Positive
        private Long coin;
        
        @NotBlank(message = "Số tài khoản ngân hàng là bắt buộc")
        private String bankAccountNumber;
        
        @NotBlank(message = "Tên chủ tài khoản là bắt buộc")
        private String bankAccountName;
        
        @NotBlank(message = "Tên ngân hàng là bắt buộc")
        private String bankName;
    }
}

@Data
class PaymentRequest {
    @NotNull(message = "Game player ID is required")
    private Long gamePlayerId;

    @NotNull(message = "Coin is required")
    @Positive(message = "Coin must be positive")
    private Long coin;

    @NotBlank(message = "Payment method is required")
    private String paymentMethod;
}

@Data
class ProcessPaymentRequest {
    @NotBlank(message = "Transaction ID is required")
    private String transactionId;
}

@Data
class RefundRequest {
    @NotBlank(message = "Reason is required")
    private String reason;
}

@Data
class TopUpRequest {
    @NotNull
    @Positive
    private Long coin;
}

@Data
class DepositRequest {
    @NotNull
    @Positive
    private Long coin;

    @NotBlank
    private String method;
}

@Data
class DepositResponse {
    private String qrCode; // Base64 encoded QR code image
    private String message;
    private String bankAccount;
    private String bankName;
    private String bankOwner;
    private String transferContent;
}

@Data
class TopupHistoryDTO {
    private Long id;
    private String dateTime;
    private Long coin;
    private Payment.PaymentMethod method;
    private Payment.PaymentStatus status;
    private String statusText;
    private String statusColor;
}

