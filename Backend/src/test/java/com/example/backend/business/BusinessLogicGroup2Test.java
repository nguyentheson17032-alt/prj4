package com.example.backend.business;

import com.example.backend.controller.GamePlayerController;
import com.example.backend.controller.GamePlayerController.HireRequest;
import com.example.backend.controller.PaymentController;
import com.example.backend.controller.PaymentController.WithdrawRequest;
import com.example.backend.dto.ApiResponse;
import com.example.backend.dto.WalletReconciliationDTO;
import com.example.backend.entity.*;
import com.example.backend.repository.*;
import com.example.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class BusinessLogicGroup2Test {

    private OrderRepository orderRepository;
    private UserRepository userRepository;
    private PaymentRepository paymentRepository;
    private PlayerReviewRepository playerReviewRepository;
    private ReportRepository reportRepository;
    private NotificationService notificationService;
    private GamePlayerService gamePlayerService;
    private GamePlayerRepository gamePlayerRepository;
    private GameRepository gameRepository;
    private UserService userService;
    private RevenueRepository revenueRepository;
    private ReviewRepository reviewRepository;
    private CommissionService commissionService;
    private OrderPayoutService orderPayoutService;
    private OrderService orderService;
    private WalletReconciliationService walletReconciliationService;

    private User renter;
    private User playerUser;
    private GamePlayer gamePlayer;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        userRepository = mock(UserRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        playerReviewRepository = mock(PlayerReviewRepository.class);
        reportRepository = mock(ReportRepository.class);
        notificationService = mock(NotificationService.class);
        gamePlayerService = mock(GamePlayerService.class);
        gamePlayerRepository = mock(GamePlayerRepository.class);
        gameRepository = mock(GameRepository.class);
        userService = mock(UserService.class);
        revenueRepository = mock(RevenueRepository.class);
        reviewRepository = mock(ReviewRepository.class);

        commissionService = new CommissionService();

        orderPayoutService = new OrderPayoutService(
                orderRepository,
                userRepository,
                paymentRepository,
                playerReviewRepository,
                reportRepository,
                notificationService,
                commissionService
        );

        renter = new User();
        renter.setId(10L);
        renter.setUsername("customer1");
        renter.setCoin(100000L);
        renter.setRoles(Set.of("ROLE_USER"));

        playerUser = new User();
        playerUser.setId(20L);
        playerUser.setUsername("idol1");
        playerUser.setCoin(0L);
        playerUser.setKycStatus("VERIFIED");
        playerUser.setRoles(Set.of("ROLE_PLAYER"));

        gamePlayer = new GamePlayer();
        gamePlayer.setId(100L);
        gamePlayer.setUsername("idol1");
        gamePlayer.setUser(playerUser);
        gamePlayer.setPricePerHour(BigDecimal.valueOf(50000));
        gamePlayer.setAcceptingOrders(true);
        gamePlayer.setWorkStartTime("08:00");
        gamePlayer.setWorkEndTime("22:00");
        gamePlayer.setWorkingDays("MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY");
    }

    @Test
    @DisplayName("1. Đơn PENDING tự hết hạn: Dùng atomic update markOrderExpiredIfPending để hoàn 100% xu an toàn")
    void testAutoCancelExpiredPendingOrdersAtomicSuccess() {
        orderService = new OrderService();
        ReflectionTestUtils.setField(orderService, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(orderService, "userRepository", userRepository);
        ReflectionTestUtils.setField(orderService, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(orderService, "notificationService", notificationService);
        ReflectionTestUtils.setField(orderService, "gamePlayerService", gamePlayerService);
        ReflectionTestUtils.setField(orderService, "commissionService", commissionService);
        ReflectionTestUtils.setField(orderService, "pendingTimeoutMinutes", 15);

        Order expiredPendingOrder = new Order();
        expiredPendingOrder.setId(101L);
        expiredPendingOrder.setRenter(renter);
        expiredPendingOrder.setPlayer(gamePlayer);
        expiredPendingOrder.setPrice(100000L);
        expiredPendingOrder.setStatus("PENDING");
        expiredPendingOrder.setCreatedAt(LocalDateTime.now().minusMinutes(20));

        Payment pendingPayment = new Payment();
        pendingPayment.setId(201L);
        pendingPayment.setStatus(Payment.PaymentStatus.PENDING);
        expiredPendingOrder.setPayment(pendingPayment);

        when(orderRepository.findPendingOrdersCreatedBefore(any(LocalDateTime.class)))
                .thenReturn(List.of(expiredPendingOrder));
        when(orderRepository.markOrderExpiredIfPending(eq(101L), anyString()))
                .thenReturn(1);

        orderService.autoCancelExpiredPendingOrders();

        verify(orderRepository, times(1)).markOrderExpiredIfPending(eq(101L), anyString());
        assertEquals("EXPIRED", expiredPendingOrder.getStatus());
        assertEquals("REFUNDED", expiredPendingOrder.getPayoutStatus());
        assertEquals(Payment.PaymentStatus.CANCELED, pendingPayment.getStatus());
        verify(userRepository, times(1)).addCoinSafely(eq(renter.getId()), eq(100000L));
        verify(notificationService, times(1)).createNotification(eq(renter.getId()), contains("Đơn thuê đã tự động hủy"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("2. Race condition tự hủy: Nếu đơn đã bị hủy/chấp thuận trước đó thì atomic update trả về 0 và KHÔNG hoàn tiền lần 2")
    void testAutoCancelExpiredPendingOrdersSkippedWhenAlreadyCancelled() {
        orderService = new OrderService();
        ReflectionTestUtils.setField(orderService, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(orderService, "userRepository", userRepository);
        ReflectionTestUtils.setField(orderService, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(orderService, "notificationService", notificationService);
        ReflectionTestUtils.setField(orderService, "gamePlayerService", gamePlayerService);
        ReflectionTestUtils.setField(orderService, "pendingTimeoutMinutes", 15);

        Order order = new Order();
        order.setId(102L);
        order.setRenter(renter);
        order.setPrice(100000L);
        order.setStatus("PENDING");

        when(orderRepository.findPendingOrdersCreatedBefore(any(LocalDateTime.class)))
                .thenReturn(List.of(order));
        when(orderRepository.markOrderExpiredIfPending(eq(102L), anyString())).thenReturn(0);

        orderService.autoCancelExpiredPendingOrders();

        verify(userRepository, never()).addCoinSafely(anyLong(), anyLong());
    }

    @Test
    @DisplayName("3. Tranh chấp: Chặn giải ngân khi đơn có khiếu nại PENDING hoặc INVESTIGATING kể cả khi đánh giá 5 sao")
    void testBlockPayoutWhenDisputeActiveEvenWithFiveStars() {
        Order order = new Order();
        order.setId(202L);
        order.setPrice(200000L);
        order.setRenter(renter);
        order.setPlayer(gamePlayer);
        order.setStatus("COMPLETED");
        order.setPayoutStatus("PENDING");

        when(reportRepository.existsByOrderIdAndStatusIn(eq(202L), anyCollection())).thenReturn(true);

        boolean released = orderPayoutService.releaseOrderPayout(order, "Được đánh giá 5.0 sao");
        assertFalse(released, "Giải ngân phải bị chặn khi đơn có tranh chấp chưa xử lý");
        assertEquals("PENDING", order.getPayoutStatus(), "Tiền phải tiếp tục bị đóng băng (PENDING)");
        verify(userRepository, never()).addCoinSafely(anyLong(), anyLong());
    }

    @Test
    @DisplayName("4. Tranh chấp: Giải ngân thành công khi không có khiếu nại và đánh giá >= 4 sao")
    void testReleasePayoutWhenNoDispute() {
        Order order = new Order();
        order.setId(203L);
        order.setPrice(100000L);
        order.setRenter(renter);
        order.setPlayer(gamePlayer);
        order.setStatus("COMPLETED");
        order.setPayoutStatus("PENDING");

        when(reportRepository.existsByOrderIdAndStatusIn(eq(203L), anyCollection())).thenReturn(false);

        boolean released = orderPayoutService.releaseOrderPayout(order, "Được đánh giá 4.5 sao");
        assertTrue(released);
        assertEquals("RELEASED", order.getPayoutStatus());
        verify(userRepository, times(1)).addCoinSafely(eq(playerUser.getId()), eq(85000L));
    }

    @Test
    @DisplayName("5. Phí nền tảng động: Tính đúng phí theo VIP Tier của Player (Gold = 10%)")
    void testDynamicCommissionRateVipGold() {
        playerUser.setVipTier("GOLD");
        double rate = commissionService.getCommissionRateForPlayer(gamePlayer);
        assertEquals(0.10, rate, 0.001);

        long totalCoin = 100000L;
        long fee = commissionService.calculatePlatformFee(totalCoin, rate);
        long received = commissionService.calculatePlayerReceived(totalCoin, rate);

        assertEquals(10000L, fee);
        assertEquals(90000L, received);
    }

    @Test
    @DisplayName("6. Chính sách phạt hủy sát giờ & Miễn phạt cho Admin (gọi trực tiếp GamePlayerController.cancelOrder)")
    void testCancelOrderLatePenaltyAndAdminExemptionCallingController() {
        GamePlayerController controller = new GamePlayerController(
                gamePlayerService, gameRepository, userService, paymentRepository,
                notificationService, revenueRepository, reviewRepository, orderRepository,
                playerReviewRepository, orderService
        );
        ReflectionTestUtils.setField(controller, "cancellationFreeHours", 2);
        ReflectionTestUtils.setField(controller, "lateCancellationFeeRate", 0.30);

        Authentication authRenter = mock(Authentication.class);
        when(authRenter.getName()).thenReturn("customer1");
        when(userService.findByUsername("customer1")).thenReturn(renter);

        // Kịch bản A: Người thuê hủy muộn sát giờ (< 2 giờ trước giờ bắt đầu) -> phạt 30%, bồi thường cho Idol
        Order orderLate = new Order();
        orderLate.setId(601L);
        orderLate.setRenter(renter);
        orderLate.setPlayer(gamePlayer);
        orderLate.setPrice(100000L);
        orderLate.setStatus("CONFIRMED");
        orderLate.setStartTime(LocalDateTime.now().plusHours(1)); // 1h nữa bắt đầu (< 2h)
        orderLate.setEndTime(LocalDateTime.now().plusHours(3));

        when(orderRepository.findById(601L)).thenReturn(Optional.of(orderLate));

        ResponseEntity<ApiResponse<?>> responseA = controller.cancelOrder(601L, authRenter);
        assertEquals(HttpStatus.OK, responseA.getStatusCode());
        verify(userService, times(1)).addCoin(eq(renter.getId()), eq(70000L)); // Hoàn 70%
        verify(userService, times(1)).addCoin(eq(playerUser.getId()), eq(30000L)); // Bồi thường 30%
        assertEquals("CANCELED", orderLate.getStatus());

        // Kịch bản B: Người thuê hủy sớm (>= 2 giờ trước giờ bắt đầu) -> Hoàn 100%, không phạt
        Order orderEarly = new Order();
        orderEarly.setId(602L);
        orderEarly.setRenter(renter);
        orderEarly.setPlayer(gamePlayer);
        orderEarly.setPrice(100000L);
        orderEarly.setStatus("CONFIRMED");
        orderEarly.setStartTime(LocalDateTime.now().plusHours(5)); // 5h nữa bắt đầu (>= 2h)
        orderEarly.setEndTime(LocalDateTime.now().plusHours(7));

        when(orderRepository.findById(602L)).thenReturn(Optional.of(orderEarly));

        ResponseEntity<ApiResponse<?>> responseB = controller.cancelOrder(602L, authRenter);
        assertEquals(HttpStatus.OK, responseB.getStatusCode());
        verify(userService, times(1)).addCoin(eq(renter.getId()), eq(100000L)); // Hoàn 100%
        // Không gọi bồi thường thêm cho player ở orderEarly
        verify(userService, times(1)).addCoin(eq(playerUser.getId()), eq(30000L));

        // Kịch bản C: Admin can thiệp hủy đơn của người khác -> Hoàn 100% cho renter, miễn phạt hoàn toàn
        User adminUser = new User();
        adminUser.setId(999L);
        adminUser.setUsername("admin1");
        adminUser.setRoles(Set.of("ROLE_ADMIN"));

        Authentication authAdmin = mock(Authentication.class);
        when(authAdmin.getName()).thenReturn("admin1");
        when(userService.findByUsername("admin1")).thenReturn(adminUser);

        Order orderAdminCancel = new Order();
        orderAdminCancel.setId(603L);
        orderAdminCancel.setRenter(renter);
        orderAdminCancel.setPlayer(gamePlayer);
        orderAdminCancel.setPrice(100000L);
        orderAdminCancel.setStatus("CONFIRMED");
        orderAdminCancel.setStartTime(LocalDateTime.now().plusMinutes(30)); // Sát giờ 30 phút
        orderAdminCancel.setEndTime(LocalDateTime.now().plusHours(2));

        when(orderRepository.findById(603L)).thenReturn(Optional.of(orderAdminCancel));

        ResponseEntity<ApiResponse<?>> responseC = controller.cancelOrder(603L, authAdmin);
        assertEquals(HttpStatus.OK, responseC.getStatusCode());
        verify(userService, times(2)).addCoin(eq(renter.getId()), eq(100000L)); // Hoàn đủ 100% cho renter
    }

    @Test
    @DisplayName("7. Job quét giải ngân tự động sau 24h: Tự động mở khóa khi hết 24h và không có khiếu nại")
    void testScheduledPayoutScannerAfter24Hours() {
        Order orderToRelease = new Order();
        orderToRelease.setId(301L);
        orderToRelease.setPrice(100000L);
        orderToRelease.setRenter(renter);
        orderToRelease.setPlayer(gamePlayer);
        orderToRelease.setStatus("COMPLETED");
        orderToRelease.setPayoutStatus("PENDING");
        orderToRelease.setEndTime(LocalDateTime.now().minusHours(25)); // Đã kết thúc 25h trước

        Order orderWithDispute = new Order();
        orderWithDispute.setId(302L);
        orderWithDispute.setPrice(100000L);
        orderWithDispute.setRenter(renter);
        orderWithDispute.setPlayer(gamePlayer);
        orderWithDispute.setStatus("COMPLETED");
        orderWithDispute.setPayoutStatus("PENDING");
        orderWithDispute.setEndTime(LocalDateTime.now().minusHours(25));

        Report activeReport = new Report();
        activeReport.setOrder(orderWithDispute);
        activeReport.setStatus("PENDING");

        when(orderRepository.findByStatusIgnoreCaseAndPayoutStatusIgnoreCase("COMPLETED", "PENDING"))
                .thenReturn(List.of(orderToRelease, orderWithDispute));
        when(playerReviewRepository.findByOrderIdIn(anyList()))
                .thenReturn(List.of());
        when(reportRepository.findByOrderIdIn(anyList()))
                .thenReturn(List.of(activeReport));

        orderPayoutService.checkAndReleasePendingPayouts();

        assertEquals("RELEASED", orderToRelease.getPayoutStatus());
        verify(userRepository, times(1)).addCoinSafely(eq(playerUser.getId()), eq(85000L));

        assertEquals("PENDING", orderWithDispute.getPayoutStatus());
    }

    @Test
    @DisplayName("8. Hạn mức rút tiền & Kiểm tra KYC (gọi trực tiếp PaymentController.withdraw)")
    void testWithdrawalLimitsAndKycRequirementCallingController() {
        PaymentService paymentService = mock(PaymentService.class);
        QRCodeService qrCodeService = mock(QRCodeService.class);
        VnPayService vnPayService = mock(VnPayService.class);
        AdminNotificationService adminNotificationService = mock(AdminNotificationService.class);

        PaymentController controller = new PaymentController(
                paymentService, userService, paymentRepository, qrCodeService,
                playerReviewRepository, notificationService, vnPayService,
                orderRepository, gamePlayerRepository, adminNotificationService, revenueRepository
        );

        ReflectionTestUtils.setField(controller, "minWithdrawAmount", 50000L);
        ReflectionTestUtils.setField(controller, "maxWithdrawPerRequest", 20000000L);
        ReflectionTestUtils.setField(controller, "maxWithdrawPerDay", 50000000L);
        ReflectionTestUtils.setField(controller, "requireKyc", true);

        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("idol1");
        when(userService.findByUsername("idol1")).thenReturn(playerUser);

        // A. Rút dưới mức tối thiểu (< 50k)
        WithdrawRequest reqMin = new WithdrawRequest();
        reqMin.setCoin(30000L);
        reqMin.setBankAccountNumber("123456");
        reqMin.setBankAccountName("NGUYEN VAN A");
        reqMin.setBankName("MBBANK");

        ResponseEntity<?> resA = controller.withdraw(reqMin, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resA.getStatusCode());
        assertTrue(resA.getBody().toString().contains("Số tiền rút tối thiểu là") && resA.getBody().toString().contains("50"));

        // B. Chưa hoàn tất xác minh danh tính (KYC)
        User unverifiedUser = new User();
        unverifiedUser.setId(30L);
        unverifiedUser.setUsername("unverifiedUser");
        unverifiedUser.setCoin(500000L);
        unverifiedUser.setKycStatus("UNVERIFIED");

        when(auth.getName()).thenReturn("unverifiedUser");
        when(userService.findByUsername("unverifiedUser")).thenReturn(unverifiedUser);

        WithdrawRequest reqKyc = new WithdrawRequest();
        reqKyc.setCoin(100000L);
        reqKyc.setBankAccountNumber("123456");
        reqKyc.setBankAccountName("NGUYEN VAN A");
        reqKyc.setBankName("MBBANK");

        ResponseEntity<?> resB = controller.withdraw(reqKyc, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resB.getStatusCode());
        assertTrue(resB.getBody().toString().contains("Tài khoản chưa hoàn tất xác minh danh tính (KYC)"));

        // C. Vượt quá hạn mức rút trong ngày (> 50tr)
        when(auth.getName()).thenReturn("idol1");
        when(userService.findByUsername("idol1")).thenReturn(playerUser);
        playerUser.setCoin(100000000L);
        when(paymentRepository.sumTodayWithdrawalsByUserId(eq(playerUser.getId()), any(), any()))
                .thenReturn(45000000L); // Đã rút 45tr hôm nay

        WithdrawRequest reqMaxDay = new WithdrawRequest();
        reqMaxDay.setCoin(10000000L); // Rút thêm 10tr -> tổng 55tr > 50tr
        reqMaxDay.setBankAccountNumber("123456");
        reqMaxDay.setBankAccountName("NGUYEN VAN A");
        reqMaxDay.setBankName("MBBANK");

        ResponseEntity<?> resC = controller.withdraw(reqMaxDay, auth);
        assertEquals(HttpStatus.BAD_REQUEST, resC.getStatusCode());
        assertTrue(resC.getBody().toString().contains("Vượt quá hạn mức rút tiền trong ngày"));
    }

    @Test
    @DisplayName("9. Giờ làm việc của Player: Từ chối thuê khi ngoài giờ làm việc (gọi trực tiếp GamePlayerController.hireGamePlayer)")
    void testPlayerWorkingHoursValidationCallingController() {
        GamePlayerController controller = new GamePlayerController(
                gamePlayerService, gameRepository, userService, paymentRepository,
                notificationService, revenueRepository, reviewRepository, orderRepository,
                playerReviewRepository, orderService
        );

        Authentication authRenter = mock(Authentication.class);
        when(authRenter.getName()).thenReturn("customer1");
        when(userService.findByUsername("customer1")).thenReturn(renter);
        when(gamePlayerService.findById(100L)).thenReturn(gamePlayer);

        // Thuê ngoài giờ làm việc: Player làm từ 08:00 - 22:00, khách đặt lúc 01:00 - 03:00 (nửa đêm)
        HireRequest requestOutOfHours = new HireRequest();
        requestOutOfHours.setUserId(100L);
        requestOutOfHours.setHours(2);
        requestOutOfHours.setStartTime(LocalDate.now().plusDays(1).atTime(1, 0));
        requestOutOfHours.setEndTime(LocalDate.now().plusDays(1).atTime(3, 0));

        ResponseEntity<ApiResponse<?>> response = controller.hireGamePlayer(100L, requestOutOfHours, authRenter);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertTrue(response.getBody().getMessage().contains("Thời gian thuê nằm ngoài khung giờ làm việc của Player (08:00 - 22:00)"));
    }

    @Test
    @DisplayName("10. Đối soát ví đối chiếu chính xác theo Order.payment_id: Không dựa vào chuỗi mô tả, không tính trùng")
    void testWalletReconciliationNoDuplicateByOrderPaymentId() {
        walletReconciliationService = new WalletReconciliationService(paymentRepository, orderRepository);

        User testRenter = new User();
        testRenter.setId(10L);
        testRenter.setUsername("renter");
        testRenter.setCoin(100000L); // Nạp 200k, thuê 1 đơn 100k -> còn 100k

        User testPlayer = new User();
        testPlayer.setId(20L);
        testPlayer.setUsername("player");
        testPlayer.setCoin(85000L); // Nhận 85k từ giải ngân đơn 100k

        // 1. Payment nạp coin của Renter
        Payment topup = new Payment();
        topup.setId(1L);
        topup.setUser(testRenter);
        topup.setType(Payment.PaymentType.TOPUP);
        topup.setStatus(Payment.PaymentStatus.COMPLETED);
        topup.setCoin(200000L);

        // 2. Payment thuê gốc (Được tạo từ GamePlayerController: KHÔNG CÓ "đơn #id" trong description)
        Payment hirePayment = new Payment();
        hirePayment.setId(2L);
        hirePayment.setUser(testRenter);
        hirePayment.setPlayer(testPlayer);
        hirePayment.setType(Payment.PaymentType.HIRE);
        hirePayment.setStatus(Payment.PaymentStatus.COMPLETED);
        hirePayment.setCoin(100000L);
        hirePayment.setPlayerReceived(85000L);
        hirePayment.setPlatformFee(15000L);
        hirePayment.setDescription("Thuê player idol1 từ 29/10/2026 10:00 đến 29/10/2026 12:00");

        // 3. Payment phí sàn hệ thống (Revenue)
        Payment platformFeePayment = new Payment();
        platformFeePayment.setId(3L);
        platformFeePayment.setUser(testRenter);
        platformFeePayment.setPlayer(testPlayer);
        platformFeePayment.setType(Payment.PaymentType.HIRE);
        platformFeePayment.setStatus(Payment.PaymentStatus.COMPLETED);
        platformFeePayment.setCoin(15000L);
        platformFeePayment.setPlatformFee(15000L);
        platformFeePayment.setPlayerReceived(85000L);
        platformFeePayment.setDescription("Phí chiết khấu hệ thống (15%) từ đơn hoàn thành tự động #999");

        // 4. Payment giải ngân cho Player (Payout)
        Payment payoutPayment = new Payment();
        payoutPayment.setId(4L);
        payoutPayment.setUser(testRenter);
        payoutPayment.setPlayer(testPlayer);
        payoutPayment.setType(Payment.PaymentType.HIRE);
        payoutPayment.setStatus(Payment.PaymentStatus.COMPLETED);
        payoutPayment.setCoin(85000L);
        payoutPayment.setPlayerReceived(85000L);
        payoutPayment.setDescription("Nhận tiền thuê đơn #999 vào số dư khả dụng");

        // Order liên kết trực tiếp với Payment gốc thông qua payment_id = 2L
        when(orderRepository.findOrderPaymentIdsIn(anyCollection()))
                .thenReturn(Set.of(2L)); // Payment id 2 là Payment gốc của Order

        // Đối soát cho Renter
        when(paymentRepository.findByUserIdOrPlayerIdOrderByCreatedAtDesc(eq(10L)))
                .thenReturn(List.of(topup, hirePayment, platformFeePayment, payoutPayment));

        WalletReconciliationDTO renterReconcile = walletReconciliationService.reconcile(testRenter);
        assertNotNull(renterReconcile);
        assertEquals(100000L, renterReconcile.getTotalHireSpent(), "Renter chỉ tính payment gốc 100k, không tính trùng payoutPayment");
        assertEquals(100000L, renterReconcile.getExpectedBalance(), "Số dư kỳ vọng phải đúng 100k");
        assertEquals(0L, renterReconcile.getDiscrepancy(), "Không có độ lệch số dư cho renter");
        assertTrue(renterReconcile.getIsConsistent(), "Ví của renter khớp 100%");
        assertFalse(renterReconcile.getIsAnomalous());

        // Đối soát cho Player
        when(paymentRepository.findByUserIdOrPlayerIdOrderByCreatedAtDesc(eq(20L)))
                .thenReturn(List.of(hirePayment, platformFeePayment, payoutPayment));

        WalletReconciliationDTO playerReconcile = walletReconciliationService.reconcile(testPlayer);
        assertNotNull(playerReconcile);
        assertEquals(85000L, playerReconcile.getTotalHireEarned(), "Player chỉ tính nhận 85k từ giải ngân, payment gốc (id=2) bị loại trừ vì là Order.payment_id");
        assertEquals(85000L, playerReconcile.getExpectedBalance(), "Số dư kỳ vọng của player là 85k");
        assertEquals(0L, playerReconcile.getDiscrepancy(), "Không có độ lệch số dư cho player");
        assertTrue(playerReconcile.getIsConsistent(), "Ví của player khớp 100%");
        assertFalse(playerReconcile.getIsAnomalous());
    }
}
