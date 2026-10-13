package com.example.backend.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);
    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

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
    public ResponseEntity<Payment> processPayment(
            @Parameter(description = "Payment ID") @PathVariable Long id,
            @Valid @RequestBody ProcessPaymentRequest request) {
        try {
            Payment payment = paymentService.processPayment(id, request.getTransactionId());
            return ResponseEntity.ok(payment);
        } catch (PaymentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Refund a payment")
    @PostMapping("/{id}/refund")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Payment> refundPayment(
            @Parameter(description = "Payment ID") @PathVariable Long id,
            @Valid @RequestBody RefundRequest request) {
        try {
            Payment payment = paymentService.refundPayment(id, request.getReason());
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
    public ResponseEntity<List<Payment>> getGamePlayerPayments(
            @Parameter(description = "Game player ID") @PathVariable Long gamePlayerId) {
        return ResponseEntity.ok(paymentService.getGamePlayerPayments(gamePlayerId));
    }

    @Operation(summary = "Get payments by status")
    @GetMapping("/status/{status}")
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
    public ResponseEntity<List<Payment>> getPaymentsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(paymentService.getPaymentsByDateRange(start, end));
    }

    @PostMapping("/topup")
    @PreAuthorize("isAuthenticated()")
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
            logger.error("Lỗi khi nạp coin: {}", e.getMessage());
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
    @PreAuthorize("hasRole('PLAYER')")
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ResponseEntity<?> withdraw(@RequestBody WithdrawRequest request, Authentication authentication) {
        try {
            User player = userService.findByUsername(authentication.getName());
            Long coin = request.getCoin();

            if (coin == null || coin <= 0) {
                return ResponseEntity.badRequest().body("Số coin không hợp lệ");
            }

            if (player.getCoin() < coin) {
                // Gửi thông báo lỗi cho người rút tiền
                try {
                    notificationService.createNotification(
                        player.getId(),
                        "❌ Rút coin thất bại",
                        "Số dư không đủ để rút " + coin + " coin. Số dư hiện tại: " + player.getCoin() + " coin.",
                        "withdraw_failed",
                        null,
                        null
                    );
                } catch (Exception e) {
                    System.err.println("[PaymentController] Error sending insufficient balance notification: " + e.getMessage());
                    e.printStackTrace();
                }
                
                return ResponseEntity.badRequest().body("Số coin không đủ");
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

            player.setCoin(player.getCoin() - coin);
            userService.save(player);

            Payment payment = new Payment();
            payment.setUser(player);
            payment.setCoin(coin);
            payment.setCurrency("COIN");
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setPaymentMethod(Payment.PaymentMethod.WITHDRAW);
            payment.setType(Payment.PaymentType.WITHDRAW);
            payment.setCreatedAt(java.time.LocalDateTime.now());
            
            // Lưu thông tin ngân hàng
            payment.setBankAccountNumber(request.getBankAccountNumber().trim());
            payment.setBankAccountName(request.getBankAccountName().trim());
            payment.setBankName(request.getBankName().trim());
            
            paymentRepository.save(payment);

            // Gửi notification khi rút tiền thành công
            notificationService.createNotification(
                    player.getId(),
                    "💰 Rút coin thành công",
                    "Bạn đã rút thành công " + coin + " coin vào tài khoản " + request.getBankAccountNumber() + " - " + request.getBankAccountName() + " (" + request.getBankName() + "). Số dư còn lại: " + player.getCoin() + " coin.",
                    "withdraw",
                    "/balance-history", // URL để xem lịch sử giao dịch
                    payment.getId().toString());
            
            // Gửi push notification đặc biệt cho rút tiền
            sendWithdrawPushNotification(player, coin, request.getBankAccountNumber(), request.getBankAccountName(), request.getBankName());

            // Gửi thông báo cho admin
            try {
                adminNotificationService.notifyAdminsAboutWithdraw(player, coin, request.getBankAccountNumber(), request.getBankAccountName(), request.getBankName());
            } catch (Exception e) {
                System.err.println("[PaymentController] Error calling adminNotificationService.notifyAdminsAboutWithdraw: " + e.getMessage());
                e.printStackTrace();
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Rút coin thành công",
                    "coin", coin,
                    "bankAccountNumber", request.getBankAccountNumber(),
                    "bankAccountName", request.getBankAccountName(),
                    "bankName", request.getBankName()));
        } catch (Exception e) {
            logger.error("Lỗi khi rút coin: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi khi rút coin: " + e.getMessage());
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

    @GetMapping("/topup-users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TopupUserDTO>> getAllTopupUsers() {
        List<Payment> topups = paymentService.getAllTopupPayments();
        List<TopupUserDTO> result = topups.stream().map(payment -> {
            TopupUserDTO dto = new TopupUserDTO();
            dto.setId(payment.getId());
            if (payment.getUser() != null) {
                dto.setFullName(payment.getUser().getFullName());
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
                dto.setFullName(payment.getUser().getFullName());
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
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/vnpay/create")
    public ResponseEntity<?> createVnPayPayment(@RequestParam Long amount, @RequestParam String orderInfo,
            @RequestParam Long userId, HttpServletRequest request) {
        log.info("=== BẮT ĐẦU: Tạo link VNPay ===");
        log.info("Request params: amount={}, orderInfo={}, userId={}", amount, orderInfo, userId);
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

            log.info("Bước 4: Tìm user theo userId");
            User user = userService.findById(userId);
            log.info("User tìm thấy: id={}, username={}", user.getId(), user.getUsername());

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
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            paymentRepository.save(payment);
            // Cộng xu cho user
            User user = payment.getUser();
            user.setCoin(user.getCoin() + payment.getCoin());
            userService.save(user);
            
            // Gửi thông báo cho admin về giao dịch VNPay thành công
            try {
                adminNotificationService.notifyAdminsAboutVnPayTransaction(user, payment.getCoin(), "THÀNH CÔNG");
            } catch (Exception e) {
                System.err.println("[PaymentController] Error calling adminNotificationService.notifyAdminsAboutVnPayTransaction: " + e.getMessage());
                e.printStackTrace();
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

    @Transactional
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
        
        // Tính toán chiết khấu hệ thống 15%
        long originalCoin = request.getCoin();
        long platformFee = Math.round(originalCoin * 0.15); // 15% phí sàn
        long playerReceive = originalCoin - platformFee;     // 85% Idol thực nhận

        // Trừ 100% xu người donate
        user.setCoin(user.getCoin() - originalCoin);
        User savedUser = userService.save(user);
        
        // Cộng 85% xu cho player (Idol)
        player.setCoin(player.getCoin() + playerReceive);
        User savedPlayer = userService.save(player);

        // Lưu Payment DONATE cho người gửi (trừ 100% xu)
        Payment paymentFrom = new Payment();
        paymentFrom.setUser(user);
        paymentFrom.setPlayer(player);
        paymentFrom.setGamePlayer(gamePlayer);
        paymentFrom.setCoin(originalCoin);
        paymentFrom.setOriginalAmount(originalCoin);
        paymentFrom.setDiscountRate(0.15);
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

        // Lưu Payment DONATE cho người nhận (cộng 85% xu)
        Payment paymentTo = new Payment();
        paymentTo.setUser(player);
        paymentTo.setPlayer(user);
        paymentTo.setGamePlayer(gamePlayer);
        paymentTo.setCoin(playerReceive);
        paymentTo.setOriginalAmount(originalCoin);
        paymentTo.setDiscountRate(0.15);
        paymentTo.setPlatformFee(platformFee);
        paymentTo.setPlayerReceived(playerReceive);
        paymentTo.setCurrency("COIN");
        paymentTo.setStatus(Payment.PaymentStatus.COMPLETED);
        paymentTo.setPaymentMethod(Payment.PaymentMethod.DONATE);
        paymentTo.setType(Payment.PaymentType.DONATE);
        paymentTo.setCreatedAt(java.time.LocalDateTime.now());
        paymentTo.setCompletedAt(java.time.LocalDateTime.now());
        paymentTo.setDescription("Nhận quà từ " + (user.getFullName() != null ? user.getFullName() : user.getUsername()) + " (Đã khấu trừ 15% phí hệ thống): " + (request.getMessage() != null ? request.getMessage() : ""));
        Payment savedPaymentTo = paymentRepository.save(paymentTo);

        // Lưu doanh thu nền tảng (Revenue) 15%
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

        for (GamePlayer gp : allPlayers) {
            if ("BANNED".equalsIgnoreCase(gp.getStatus())) continue;
            Long gpId = gp.getId();
            Long userId = gp.getUser() != null ? gp.getUser().getId() : gpId;

            // Chỉ tính số đơn và số giờ từ các đơn ĐÃ HOÀN THÀNH thực tế
            long completedOrders = playerCompletedOrderCountMap.getOrDefault(gpId, 0L);
            long orderHours = playerTotalHoursMap.getOrDefault(gpId, 0L);

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
                pMap.put("rating", gp.getRating() != null ? gp.getRating() : 5.0);
                pMap.put("pricePerHour", gp.getPricePerHour());
                userPlayerMap.put(userId, pMap);
            } else {
                Map<String, Object> existing = userPlayerMap.get(userId);
                long prevOrders = (long) existing.get("orderCount");
                long prevHours = (long) existing.get("totalHours");
                existing.put("orderCount", prevOrders + completedOrders);
                existing.put("totalHours", prevHours + orderHours);
                Double currentRating = (Double) existing.get("rating");
                if (gp.getRating() != null && (currentRating == null || currentRating < gp.getRating())) {
                    existing.put("rating", gp.getRating());
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

        // 5. Danh sách Top Phú Hộ (Chỉ tính Donate Quà + Thuê Player)
        List<User> allUsers = userService.findAll();
        List<Map<String, Object>> topDonatorList = new java.util.ArrayList<>();

        for (User u : allUsers) {
            Long uId = u.getId();
            long donateSpent = userDonateSpentMap.getOrDefault(uId, 0L);
            long hireSpent = userHireSpentMap.getOrDefault(uId, 0L);
            long totalSpent = donateSpent + hireSpent;

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

    private long calculateExpFromCoin(Long coin, String desc) {
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
class WithdrawRequest {
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

