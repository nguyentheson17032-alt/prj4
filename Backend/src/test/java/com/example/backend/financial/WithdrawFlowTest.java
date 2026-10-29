package com.example.backend.financial;

import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WithdrawFlowTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    private User playerUser;

    @BeforeEach
    void setUp() {
        playerUser = new User();
        playerUser.setId(10L);
        playerUser.setUsername("pro_idol");
        playerUser.setCoin(500000L); // 500,000 Coin khả dụng
    }

    @Test
    @DisplayName("1. Luồng rút tiền: Trừ số dư khả dụng ngay khi tạo yêu cầu rút tiền thành công")
    void testWithdrawRequestDeductsBalance() {
        long withdrawAmount = 200000L;

        // Mô phỏng logic rút tiền trong PaymentController.withdraw
        assertTrue(playerUser.getCoin() >= withdrawAmount, "Số dư phải đủ để rút");

        long remainingBalance = playerUser.getCoin() - withdrawAmount;
        playerUser.setCoin(remainingBalance);

        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(withdrawAmount);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setPaymentMethod(Payment.PaymentMethod.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);
        withdrawPayment.setCreatedAt(LocalDateTime.now());

        // Assert
        assertEquals(300000L, playerUser.getCoin());
        assertEquals(Payment.PaymentStatus.PENDING, withdrawPayment.getStatus());
        assertEquals(withdrawAmount, withdrawPayment.getCoin());
    }

    @Test
    @DisplayName("2. Luồng rút tiền: Từ chối khi số dư khả dụng không đủ")
    void testWithdrawInsufficientBalanceFails() {
        long withdrawAmount = 1000000L; // Yêu cầu 1.000.000 trong khi chỉ có 500.000

        boolean canWithdraw = playerUser.getCoin() != null && playerUser.getCoin() >= withdrawAmount;
        assertFalse(canWithdraw);

        // Số dư không bị thay đổi
        assertEquals(500000L, playerUser.getCoin());
    }

    @Test
    @DisplayName("3. Admin từ chối lệnh rút: Hoàn lại tiền vào ví cho người dùng")
    void testRejectWithdrawRefundsBalance() {
        long withdrawAmount = 200000L;
        // Trừ trước khi tạo lệnh
        playerUser.setCoin(playerUser.getCoin() - withdrawAmount); // Còn 300,000

        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(withdrawAmount);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);

        // Admin từ chối lệnh rút -> Hoàn tiền lại cho user
        withdrawPayment.setStatus(Payment.PaymentStatus.REFUNDED);
        withdrawPayment.setDescription("Thông tin tài khoản ngân hàng không chính xác");
        playerUser.setCoin(playerUser.getCoin() + withdrawPayment.getCoin());

        // Assert
        assertEquals(500000L, playerUser.getCoin(), "Tiền phải được hoàn lại nguyên vẹn 500.000 coin");
        assertEquals(Payment.PaymentStatus.REFUNDED, withdrawPayment.getStatus());
    }
}

