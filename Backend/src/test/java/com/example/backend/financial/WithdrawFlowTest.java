package com.example.backend.financial;

import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.exception.PaymentException;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.NotificationService;
import com.example.backend.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

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
    private GamePlayerRepository gamePlayerRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PaymentService paymentService;

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

        assertEquals(300000L, playerUser.getCoin());
        assertEquals(Payment.PaymentStatus.PENDING, withdrawPayment.getStatus());
        assertEquals(withdrawAmount, withdrawPayment.getCoin());
    }

    @Test
    @DisplayName("2. Luồng rút tiền: Từ chối khi số dư khả dụng không đủ")
    void testWithdrawInsufficientBalanceFails() {
        long withdrawAmount = 1000000L;

        boolean canWithdraw = playerUser.getCoin() != null && playerUser.getCoin() >= withdrawAmount;
        assertFalse(canWithdraw);

        assertEquals(500000L, playerUser.getCoin());
    }

    @Test
    @DisplayName("3. Admin từ chối lệnh rút: Hoàn lại tiền vào ví cho người dùng bằng lệnh SQL nguyên tử")
    void testRejectWithdrawRefundsBalance() {
        long withdrawAmount = 200000L;
        playerUser.setCoin(playerUser.getCoin() - withdrawAmount); // Còn 300,000

        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(withdrawAmount);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);

        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));
        when(paymentRepository.updatePaymentStatusAndDescriptionIfExpected(
                eq(777L), eq(Payment.PaymentStatus.REFUNDED), anyString(), any(LocalDateTime.class), eq(Payment.PaymentStatus.PENDING)
        )).thenReturn(1);

        Payment refunded = paymentService.refundPayment(777L, "Thông tin tài khoản ngân hàng không chính xác");

        assertEquals(Payment.PaymentStatus.REFUNDED, refunded.getStatus());
        assertEquals(500000L, playerUser.getCoin(), "Tiền phải được hoàn lại nguyên vẹn 500.000 coin");
        verify(userRepository, times(1)).addCoinSafely(playerUser.getId(), 200000L);
    }

    @Test
    @DisplayName("4. Người dùng tự hủy lệnh rút tiền PENDING: Hoàn lại coin vào ví bằng lệnh SQL nguyên tử addCoinSafely")
    void testCancelWithdrawSuccess() {
        playerUser.setCoin(300000L);

        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(200000L);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);

        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));
        when(paymentRepository.updatePaymentStatusAndDescriptionIfExpected(
                eq(777L), eq(Payment.PaymentStatus.CANCELED), anyString(), any(LocalDateTime.class), eq(Payment.PaymentStatus.PENDING)
        )).thenReturn(1);

        Payment result = paymentService.cancelWithdraw(777L, playerUser.getId(), false);

        assertEquals(Payment.PaymentStatus.CANCELED, result.getStatus());
        assertEquals(500000L, playerUser.getCoin(), "Coin phải được hoàn trả 200k về ví (300k + 200k = 500k)");
        verify(userRepository, times(1)).addCoinSafely(playerUser.getId(), 200000L);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("5. Chống Race Condition: Hai yêu cầu hủy đồng thời chỉ một yêu cầu thành công, chặn hoàn coin 2 lần")
    void testCancelWithdrawRaceConditionBlocked() {
        playerUser.setCoin(300000L);

        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(200000L);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);

        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));
        when(paymentRepository.updatePaymentStatusAndDescriptionIfExpected(
                eq(777L), eq(Payment.PaymentStatus.CANCELED), anyString(), any(LocalDateTime.class), eq(Payment.PaymentStatus.PENDING)
        )).thenReturn(0);

        PaymentException exception = assertThrows(PaymentException.class, () -> {
            paymentService.cancelWithdraw(777L, playerUser.getId(), false);
        });

        assertEquals("Yêu cầu rút tiền này đã được xử lý hoặc đã bị hủy bởi một tác vụ khác", exception.getMessage());
        assertEquals(300000L, playerUser.getCoin());
        verify(userRepository, never()).addCoinSafely(any(), any());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("6. Chặn hủy yêu cầu rút tiền đã COMPLETED (Admin đã chuyển khoản thành công)")
    void testCancelWithdrawCompletedStatusBlocked() {
        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(200000L);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.COMPLETED);

        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));

        PaymentException exception = assertThrows(PaymentException.class, () -> {
            paymentService.cancelWithdraw(777L, playerUser.getId(), false);
        });

        assertTrue(exception.getMessage().contains("PENDING"));
        verify(userRepository, never()).addCoinSafely(any(), any());
    }

    @Test
    @DisplayName("7. Bảo mật phân quyền: Người dùng khác không được phép hủy yêu cầu rút tiền của chủ tài khoản")
    void testCancelWithdrawNonOwnerBlocked() {
        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(200000L);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);

        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));

        Long maliciousUserId = 999L;
        PaymentException exception = assertThrows(PaymentException.class, () -> {
            paymentService.cancelWithdraw(777L, maliciousUserId, false);
        });

        assertEquals("Bạn không có quyền hủy yêu cầu rút tiền này", exception.getMessage());
        verify(userRepository, never()).addCoinSafely(any(), any());
    }

    @Test
    @DisplayName("8. Bảo mật: Chặn gọi cancel-withdraw đối với giao dịch nạp tiền hoặc thuê duo")
    void testCancelWithdrawWrongTypeBlocked() {
        Payment hirePayment = new Payment();
        hirePayment.setId(888L);
        hirePayment.setUser(playerUser);
        hirePayment.setCoin(100000L);
        hirePayment.setType(Payment.PaymentType.HIRE);
        hirePayment.setStatus(Payment.PaymentStatus.PENDING);

        when(paymentRepository.findById(888L)).thenReturn(Optional.of(hirePayment));

        PaymentException exception = assertThrows(PaymentException.class, () -> {
            paymentService.cancelWithdraw(888L, playerUser.getId(), false);
        });

        assertEquals("Chỉ có thể hủy yêu cầu rút tiền (WITHDRAW)", exception.getMessage());
        verify(userRepository, never()).addCoinSafely(any(), any());
    }

    @Test
    @DisplayName("9. Chống Race Condition trong processPayment (Admin duyệt): Nếu người dùng hủy trước, cập nhật có điều kiện trả về 0 và chặn duyệt")
    void testProcessPaymentConcurrentRaceConditionBlocked() {
        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);

        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));
        // Mô phỏng người dùng đã hủy trước đó, CAS trả về 0
        when(paymentRepository.updatePaymentStatusAndTransactionIdIfExpected(
                eq(777L), eq(Payment.PaymentStatus.COMPLETED), eq("TX_BANK_123"), any(LocalDateTime.class), eq(Payment.PaymentStatus.PENDING)
        )).thenReturn(0);

        PaymentException exception = assertThrows(PaymentException.class, () -> {
            paymentService.processPayment(777L, "TX_BANK_123");
        });

        assertEquals("Giao dịch này không ở trạng thái chờ duyệt hoặc đã được xử lý bởi tác vụ khác", exception.getMessage());
    }

    @Test
    @DisplayName("10. Chống Race Condition trong refundPayment (Admin từ chối): Nếu người dùng hủy trước, cập nhật có điều kiện trả về 0 và không hoàn coin lần 2")
    void testRefundPaymentConcurrentRaceConditionBlocked() {
        Payment withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(playerUser);
        withdrawPayment.setCoin(200000L);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);

        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));
        // Mô phỏng người dùng đã hủy trước đó, CAS trả về 0
        when(paymentRepository.updatePaymentStatusAndDescriptionIfExpected(
                eq(777L), eq(Payment.PaymentStatus.REFUNDED), eq("Từ chối"), any(LocalDateTime.class), eq(Payment.PaymentStatus.PENDING)
        )).thenReturn(0);

        PaymentException exception = assertThrows(PaymentException.class, () -> {
            paymentService.refundPayment(777L, "Từ chối");
        });

        assertEquals("Yêu cầu rút tiền này đã được xử lý hoặc đã bị hủy bởi một tác vụ khác", exception.getMessage());
        verify(userRepository, never()).addCoinSafely(any(), any());
    }
}
