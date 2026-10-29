package com.example.backend.financial;

import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.PlayerReview;
import com.example.backend.entity.User;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.PlayerReviewRepository;
import com.example.backend.repository.ReportRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.NotificationService;
import com.example.backend.service.OrderPayoutService;
import com.example.backend.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HirePaymentFlowTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private GamePlayerRepository gamePlayerRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PlayerReviewRepository playerReviewRepository;

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PaymentService paymentService;

    private OrderPayoutService orderPayoutService;

    private User renter;
    private User playerUser;
    private GamePlayer gamePlayer;
    private Payment payment;
    private Order order;

    @BeforeEach
    void setUp() {
        orderPayoutService = new OrderPayoutService(
                orderRepository,
                userRepository,
                paymentRepository,
                playerReviewRepository,
                reportRepository,
                notificationService
        );

        renter = new User();
        renter.setId(1L);
        renter.setUsername("renter_user");
        renter.setCoin(500000L);

        playerUser = new User();
        playerUser.setId(2L);
        playerUser.setUsername("idol_player");
        playerUser.setCoin(100000L);

        gamePlayer = new GamePlayer();
        gamePlayer.setId(10L);
        gamePlayer.setUser(playerUser);
        gamePlayer.setUsername("ProGamer");
        gamePlayer.setStatus("BUSY");
        gamePlayer.setHoursHired(2);
        gamePlayer.setHireDate(LocalDateTime.now().minusHours(3));
        gamePlayer.setReturnDate(LocalDateTime.now().minusHours(1));

        payment = new Payment();
        payment.setId(100L);
        payment.setUser(renter);
        payment.setPlayer(playerUser);
        payment.setGamePlayer(gamePlayer);
        payment.setCoin(200000L);
        payment.setStatus(Payment.PaymentStatus.CONFIRMED);
        payment.setType(Payment.PaymentType.HIRE);
        payment.setEndTime(LocalDateTime.now().minusMinutes(5));

        order = new Order();
        order.setId(1000L);
        order.setRenter(renter);
        order.setPlayer(gamePlayer);
        order.setPrice(200000L);
        order.setPlatformFee(30000L); // 15%
        order.setPlayerReceived(170000L); // 85%
        order.setStatus("COMPLETED");
        order.setPayoutStatus("PENDING");
        order.setStartTime(LocalDateTime.now().minusHours(3));
        order.setEndTime(LocalDateTime.now().minusHours(1));
    }

    @Test
    @DisplayName("1. Luồng thuê: Tự động hoàn tất đơn thuê hết hạn và reset trạng thái idol về AVAILABLE")
    void testCompleteExpiredHires() {
        // Arrange
        when(paymentRepository.findByStatusAndEndTimeBefore(eq(Payment.PaymentStatus.CONFIRMED), any(LocalDateTime.class)))
                .thenReturn(List.of(payment));

        // Act
        paymentService.completeExpiredHires();

        // Assert: Trạng thái payment chuyển sang COMPLETED
        assertEquals(Payment.PaymentStatus.COMPLETED, payment.getStatus());
        assertNotNull(payment.getCompletedAt());
        verify(paymentRepository, times(1)).save(payment);

        // Assert: Idol game player được trả về AVAILABLE và xóa thông tin thuê cũ
        assertEquals("AVAILABLE", gamePlayer.getStatus());
        assertNull(gamePlayer.getHiredBy());
        assertNull(gamePlayer.getHireDate());
        assertNull(gamePlayer.getReturnDate());
        assertNull(gamePlayer.getHoursHired());
        verify(gamePlayerRepository, times(1)).save(gamePlayer);

        // Assert: Gửi thông báo nhắc đánh giá cho renter
        verify(notificationService, times(1)).createNotification(
                eq(renter.getId()),
                contains("Đánh giá"),
                anyString(),
                eq("review_reminder"),
                isNull(),
                eq("100")
        );
    }

    @Test
    @DisplayName("2. Luồng tiền đóng băng: Số tiền 85% bị đóng băng khi đơn hoàn tất chưa được đánh giá 4* hoặc chưa qua 24h")
    void testGetFrozenBalanceForUser() {
        // Arrange: Tìm đơn pending payout của playerUser
        when(orderRepository.findPendingPayoutOrdersByPlayerUserId(playerUser.getId()))
                .thenReturn(List.of(order));
        when(playerReviewRepository.findByOrderIdIn(List.of(1000L)))
                .thenReturn(Collections.emptyList());

        // Act
        long frozen = orderPayoutService.getFrozenBalanceForUser(playerUser.getId());

        // Assert: 170.000 coin nằm ở số dư đóng băng
        assertEquals(170000L, frozen);
    }

    @Test
    @DisplayName("3. Mở khóa tiền: Khi khách đánh giá 5 sao, tiền đóng băng được chuyển ngay vào số dư khả dụng")
    void testReleasePayoutWhenReviewedHighRating() {
        // Arrange
        PlayerReview review = new PlayerReview();
        review.setId(55L);
        review.setOrder(order);
        review.setRating(5);
        review.setComment("Chơi rất vui!");

        when(orderRepository.findByStatusIgnoreCaseAndPayoutStatusIgnoreCase("COMPLETED", "PENDING"))
                .thenReturn(List.of(order));
        when(playerReviewRepository.findByOrderIdIn(List.of(1000L)))
                .thenReturn(List.of(review));
        when(reportRepository.findByOrderIdIn(List.of(1000L)))
                .thenReturn(Collections.emptyList());

        long initialCoin = playerUser.getCoin(); // 100,000

        // Act: Scheduler kiểm tra và mở khóa
        orderPayoutService.checkAndReleasePendingPayouts();

        // Assert: Tiền được cộng vào số dư khả dụng của idol (100k + 170k = 270k)
        assertEquals(initialCoin + 170000L, playerUser.getCoin());
        assertEquals("RELEASED", order.getPayoutStatus());
        assertNotNull(order.getPayoutReleasedAt());

        verify(userRepository, times(1)).save(playerUser);
        verify(orderRepository, times(1)).save(order);
        verify(notificationService, times(1)).createNotification(
                eq(playerUser.getId()),
                contains("khả dụng"),
                anyString(),
                eq("wallet"),
                eq("/wallet"),
                eq("1000")
        );
    }
}

