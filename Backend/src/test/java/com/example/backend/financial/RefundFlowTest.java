package com.example.backend.financial;

import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.Report;
import com.example.backend.entity.User;
import com.example.backend.exception.PaymentException;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.ReportRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.NotificationService;
import com.example.backend.service.OrderPayoutService;
import com.example.backend.service.PaymentService;
import com.example.backend.service.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefundFlowTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GamePlayerRepository gamePlayerRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PaymentService paymentService;

    private User renter;
    private User playerUser;
    private GamePlayer gamePlayer;
    private Payment hirePayment;

    @BeforeEach
    void setUp() {
        renter = new User();
        renter.setId(1L);
        renter.setUsername("renter_01");
        renter.setCoin(100000L);

        playerUser = new User();
        playerUser.setId(2L);
        playerUser.setUsername("player_idol");
        playerUser.setCoin(300000L);

        gamePlayer = new GamePlayer();
        gamePlayer.setId(10L);
        gamePlayer.setUser(playerUser);

        hirePayment = new Payment();
        hirePayment.setId(500L);
        hirePayment.setUser(renter);
        hirePayment.setPlayer(playerUser);
        hirePayment.setGamePlayer(gamePlayer);
        hirePayment.setCoin(50000L);
        hirePayment.setStatus(Payment.PaymentStatus.COMPLETED);
        hirePayment.setType(Payment.PaymentType.HIRE);
    }

    @Test
    @DisplayName("1. Luồng hoàn tiền PaymentService: Hoàn 100% coin cho người thuê và trừ coin player bằng lệnh nguyên tử")
    void testRefundPaymentSuccess() {
        when(paymentRepository.findById(500L)).thenReturn(Optional.of(hirePayment));
        when(paymentRepository.updatePaymentStatusAndDescriptionIfExpectedIn(
                eq(500L), eq(Payment.PaymentStatus.REFUNDED), anyString(), any(java.time.LocalDateTime.class), any()
        )).thenReturn(1);
        when(userRepository.deductCoinSafely(playerUser.getId(), 50000L)).thenReturn(1);

        // Act
        Payment refunded = paymentService.refundPayment(500L, "Idol không xuất hiện theo giờ hẹn");

        // Assert
        assertEquals(Payment.PaymentStatus.REFUNDED, refunded.getStatus());
        assertEquals("Idol không xuất hiện theo giờ hẹn", refunded.getDescription());

        // Renter được cộng lại 50.000 coin (100k + 50k = 150k)
        assertEquals(150000L, renter.getCoin());
        // Player bị trừ lại 50.000 coin (300k - 50k = 250k)
        assertEquals(250000L, playerUser.getCoin());

        verify(userRepository, times(1)).addCoinSafely(renter.getId(), 50000L);
        verify(userRepository, times(1)).deductCoinSafely(playerUser.getId(), 50000L);
    }

    @Test
    @DisplayName("2. Không thể hoàn tiền cho giao dịch đã bị REFUNDED trước đó")
    void testRefundPaymentAlreadyRefundedThrowsException() {
        hirePayment.setStatus(Payment.PaymentStatus.REFUNDED);
        when(paymentRepository.findById(500L)).thenReturn(Optional.of(hirePayment));

        assertThrows(PaymentException.class, () -> {
            paymentService.refundPayment(500L, "Thử hoàn lần 2");
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("3. Order payout: Đơn hàng đã REFUNDED không bao giờ được phép mở khóa vào ví idol")
    void testReleasedBlockedForRefundedOrders() {
        OrderPayoutService payoutService = new OrderPayoutService(
                mock(OrderRepository.class),
                userRepository,
                paymentRepository,
                null,
                null,
                notificationService
        );

        Order order = new Order();
        order.setId(88L);
        order.setPayoutStatus("REFUNDED");
        order.setPlayer(gamePlayer);

        boolean released = payoutService.releaseOrderPayout(order, "Cố gắng giải ngân đơn đã hoàn tiền");
        assertFalse(released);
        verify(userRepository, never()).save(any(User.class));
    }
    @Test
    @DisplayName("4. Bảo mật: Không được phép hoàn tiền giao dịch nạp tiền TOPUP")
    void testRefundPaymentTopupBlocked() {
        Payment topupPayment = new Payment();
        topupPayment.setId(600L);
        topupPayment.setUser(renter);
        topupPayment.setCoin(100000L);
        topupPayment.setStatus(Payment.PaymentStatus.COMPLETED);
        topupPayment.setType(Payment.PaymentType.TOPUP);

        when(paymentRepository.findById(600L)).thenReturn(Optional.of(topupPayment));

        assertThrows(PaymentException.class, () -> {
            paymentService.refundPayment(600L, "Thử hack hoàn tiền nạp");
        });

        verify(userRepository, never()).save(renter);
    }

    @Test
    @DisplayName("5. Bảo mật: Không được phép hoàn tiền giao dịch rút tiền WITHDRAW đã COMPLETED")
    void testRefundPaymentCompletedWithdrawBlocked() {
        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(700L);
        withdrawPayment.setUser(renter);
        withdrawPayment.setCoin(100000L);
        withdrawPayment.setStatus(Payment.PaymentStatus.COMPLETED);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);

        when(paymentRepository.findById(700L)).thenReturn(Optional.of(withdrawPayment));

        assertThrows(PaymentException.class, () -> {
            paymentService.refundPayment(700L, "Thử hoàn tiền rút đã xong");
        });

        verify(userRepository, never()).save(renter);
    }

    @Test
    @DisplayName("6. Hợp lệ: Từ chối yêu cầu rút tiền PENDING sẽ hoàn coin lại vào ví user bằng câu lệnh SQL nguyên tử")
    void testRefundPendingWithdrawSuccess() {
        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(800L);
        withdrawPayment.setUser(renter);
        withdrawPayment.setCoin(50000L);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);

        when(paymentRepository.findById(800L)).thenReturn(Optional.of(withdrawPayment));
        when(paymentRepository.updatePaymentStatusAndDescriptionIfExpected(
                eq(800L), eq(Payment.PaymentStatus.REFUNDED), anyString(), any(java.time.LocalDateTime.class), eq(Payment.PaymentStatus.PENDING)
        )).thenReturn(1);

        Payment result = paymentService.refundPayment(800L, "Thông tin ngân hàng không hợp lệ");

        assertEquals(Payment.PaymentStatus.REFUNDED, result.getStatus());
        assertEquals(150000L, renter.getCoin()); // 100k + 50k hoàn lại
        verify(userRepository, times(1)).addCoinSafely(renter.getId(), 50000L);
    }


    @Test
    @DisplayName("7. Bảo mật tài chính: Không thể hoàn tiền đơn HIRE nếu Idol không đủ số dư để khấu trừ (chống sinh xu từ không khí)")
    void testRefundPaymentPlayerInsufficientBalanceBlocked() {
        when(paymentRepository.findById(500L)).thenReturn(Optional.of(hirePayment));
        when(paymentRepository.updatePaymentStatusAndDescriptionIfExpectedIn(
                eq(500L), eq(Payment.PaymentStatus.REFUNDED), anyString(), any(java.time.LocalDateTime.class), any()
        )).thenReturn(1);
        // Mô phỏng idol đã tẩu tán hoặc rút hết xu -> deductCoinSafely trả về 0
        when(userRepository.deductCoinSafely(playerUser.getId(), 50000L)).thenReturn(0);

        PaymentException exception = assertThrows(PaymentException.class, () -> {
            paymentService.refundPayment(500L, "Idol vi phạm");
        });

        assertTrue(exception.getMessage().contains("Số dư ví của Idol không đủ để thu hồi"));
        // Renter tuyệt đối không được cộng xu từ không khí
        verify(userRepository, never()).addCoinSafely(any(), any());
    }
}