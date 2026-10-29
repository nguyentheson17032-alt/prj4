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
    @DisplayName("1. Luồng hoàn tiền PaymentService: Hoàn 100% coin cho người thuê và trừ coin player")
    void testRefundPaymentSuccess() {
        when(paymentRepository.findById(500L)).thenReturn(Optional.of(hirePayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Payment refunded = paymentService.refundPayment(500L, "Idol không xuất hiện theo giờ hẹn");

        // Assert
        assertEquals(Payment.PaymentStatus.REFUNDED, refunded.getStatus());
        assertEquals("Idol không xuất hiện theo giờ hẹn", refunded.getDescription());

        // Renter được cộng lại 50.000 coin (100k + 50k = 150k)
        assertEquals(150000L, renter.getCoin());
        // Player bị trừ lại 50.000 coin (300k - 50k = 250k)
        assertEquals(250000L, playerUser.getCoin());

        verify(userRepository, times(1)).save(renter);
        verify(userRepository, times(1)).save(playerUser);
        verify(paymentRepository, times(1)).save(hirePayment);
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
}

