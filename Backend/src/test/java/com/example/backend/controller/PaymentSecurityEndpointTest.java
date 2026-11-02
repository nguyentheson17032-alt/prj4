package com.example.backend.controller;

import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.exception.PaymentException;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.service.AdminNotificationService;
import com.example.backend.service.NotificationService;
import com.example.backend.service.PaymentService;
import com.example.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentSecurityEndpointTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private UserService userService;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AdminNotificationService adminNotificationService;

    @Mock
    private Authentication authentication;

    private PaymentController paymentController;

    private User normalUser;
    private User adminUser;
    private Payment withdrawPayment;

    @BeforeEach
    void setUp() {
        paymentController = new PaymentController(
                paymentService,
                userService,
                paymentRepository,
                null,
                null,
                notificationService,
                null,
                null,
                null,
                adminNotificationService,
                null
        );

        normalUser = new User();
        normalUser.setId(10L);
        normalUser.setUsername("regular_user");
        normalUser.setRoles(Set.of("ROLE_USER"));

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setUsername("super_admin");
        adminUser.setRoles(Set.of("ROLE_ADMIN", "ADMIN"));

        withdrawPayment = new Payment();
        withdrawPayment.setId(777L);
        withdrawPayment.setUser(normalUser);
        withdrawPayment.setCoin(100000L);
        withdrawPayment.setType(Payment.PaymentType.WITHDRAW);
        withdrawPayment.setStatus(Payment.PaymentStatus.PENDING);
    }

    @Test
    @DisplayName("1. Endpoint cancel-withdraw: Chủ tài khoản tự hủy lệnh rút tiền PENDING -> Trả về 200 OK")
    void testCancelWithdrawEndpoint_Success() {
        when(authentication.getName()).thenReturn("regular_user");
        when(userService.findByUsername("regular_user")).thenReturn(normalUser);

        Payment canceledPayment = new Payment();
        canceledPayment.setId(777L);
        canceledPayment.setStatus(Payment.PaymentStatus.CANCELED);
        when(paymentService.cancelWithdraw(777L, normalUser.getId(), false)).thenReturn(canceledPayment);

        ResponseEntity<?> response = paymentController.cancelWithdraw(777L, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof Payment);
        assertEquals(Payment.PaymentStatus.CANCELED, ((Payment) response.getBody()).getStatus());
    }

    @Test
    @DisplayName("2. Endpoint cancel-withdraw: Người dùng không phải chủ tài khoản -> Trả về 403 Forbidden")
    void testCancelWithdrawEndpoint_UnauthorizedNonOwner_Returns403() {
        User attacker = new User();
        attacker.setId(99L);
        attacker.setUsername("attacker");
        attacker.setRoles(Set.of("ROLE_USER"));

        when(authentication.getName()).thenReturn("attacker");
        when(userService.findByUsername("attacker")).thenReturn(attacker);
        when(paymentService.cancelWithdraw(777L, attacker.getId(), false))
                .thenThrow(new PaymentException("Bạn không có quyền hủy yêu cầu rút tiền này"));

        ResponseEntity<?> response = paymentController.cancelWithdraw(777L, authentication);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Bạn không có quyền hủy yêu cầu rút tiền này", response.getBody());
    }

    @Test
    @DisplayName("3. Endpoint cancel-withdraw: Race condition hoặc đã xử lý -> Trả về 400 Bad Request")
    void testCancelWithdrawEndpoint_RaceCondition_Returns400() {
        when(authentication.getName()).thenReturn("regular_user");
        when(userService.findByUsername("regular_user")).thenReturn(normalUser);
        when(paymentService.cancelWithdraw(777L, normalUser.getId(), false))
                .thenThrow(new PaymentException("Yêu cầu rút tiền này đã được xử lý hoặc đã bị hủy bởi một tác vụ khác"));

        ResponseEntity<?> response = paymentController.cancelWithdraw(777L, authentication);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Yêu cầu rút tiền này đã được xử lý hoặc đã bị hủy bởi một tác vụ khác", response.getBody());
    }

    @Test
    @DisplayName("4. Endpoint refund: Người dùng thường cố gọi hoàn tiền -> Trả về 403 Forbidden")
    void testRefundPaymentEndpoint_NonAdmin_Returns403() {
        when(authentication.getName()).thenReturn("regular_user");
        when(userService.findByUsername("regular_user")).thenReturn(normalUser);
        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));

        RefundRequest request = new RefundRequest();
        request.setReason("Hủy hoàn");

        ResponseEntity<?> response = paymentController.refundPayment(777L, request, authentication);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Chỉ quản trị viên (Admin)"));
        verify(paymentService, never()).refundPayment(anyLong(), anyString());
    }

    @Test
    @DisplayName("5. Endpoint refund: Admin cố hoàn tiền giao dịch TOPUP -> Trả về 400 Bad Request")
    void testRefundPaymentEndpoint_TopupPayment_Returns400() {
        Payment topupPayment = new Payment();
        topupPayment.setId(666L);
        topupPayment.setType(Payment.PaymentType.TOPUP);
        topupPayment.setStatus(Payment.PaymentStatus.COMPLETED);

        when(authentication.getName()).thenReturn("super_admin");
        when(userService.findByUsername("super_admin")).thenReturn(adminUser);
        when(paymentRepository.findById(666L)).thenReturn(Optional.of(topupPayment));

        RefundRequest request = new RefundRequest();
        request.setReason("Thử hoàn nạp");

        ResponseEntity<?> response = paymentController.refundPayment(666L, request, authentication);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Không thể hoàn tiền cho giao dịch nạp tiền (TOPUP)", response.getBody());
        verify(paymentService, never()).refundPayment(anyLong(), anyString());
    }

    @Test
    @DisplayName("6. Endpoint refund: Admin cố hoàn tiền giao dịch WITHDRAW đã COMPLETED -> Trả về 400 Bad Request")
    void testRefundPaymentEndpoint_CompletedWithdraw_Returns400() {
        Payment completedWithdraw = new Payment();
        completedWithdraw.setId(777L);
        completedWithdraw.setType(Payment.PaymentType.WITHDRAW);
        completedWithdraw.setStatus(Payment.PaymentStatus.COMPLETED);

        when(authentication.getName()).thenReturn("super_admin");
        when(userService.findByUsername("super_admin")).thenReturn(adminUser);
        when(paymentRepository.findById(777L)).thenReturn(Optional.of(completedWithdraw));

        RefundRequest request = new RefundRequest();
        request.setReason("Đã chuyển khoản rồi");

        ResponseEntity<?> response = paymentController.refundPayment(777L, request, authentication);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Chỉ có thể từ chối và hoàn tiền cho yêu cầu rút tiền đang chờ duyệt (PENDING)", response.getBody());
        verify(paymentService, never()).refundPayment(anyLong(), anyString());
    }

    @Test
    @DisplayName("7. Endpoint refund: Admin từ chối yêu cầu WITHDRAW đang PENDING -> Trả về 200 OK và gửi thông báo")
    void testRefundPaymentEndpoint_PendingWithdraw_Success() {
        when(authentication.getName()).thenReturn("super_admin");
        when(userService.findByUsername("super_admin")).thenReturn(adminUser);
        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));

        Payment refundedPayment = new Payment();
        refundedPayment.setId(777L);
        refundedPayment.setUser(normalUser);
        refundedPayment.setType(Payment.PaymentType.WITHDRAW);
        refundedPayment.setStatus(Payment.PaymentStatus.REFUNDED);
        refundedPayment.setCoin(100000L);

        when(paymentService.refundPayment(777L, "Số tài khoản không đúng")).thenReturn(refundedPayment);

        RefundRequest request = new RefundRequest();
        request.setReason("Số tài khoản không đúng");

        ResponseEntity<?> response = paymentController.refundPayment(777L, request, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Payment.PaymentStatus.REFUNDED, ((Payment) response.getBody()).getStatus());
        verify(paymentService, times(1)).refundPayment(777L, "Số tài khoản không đúng");
        verify(notificationService, times(1)).createNotification(
                eq(normalUser.getId()),
                contains("từ chối"),
                contains("100000"),
                eq("withdraw_rejected"),
                eq("/wallet"),
                eq("777")
        );
    }
    @Test
    @DisplayName("8. Endpoint processPayment: Xung đột Concurrency / Serialization trên Postgres -> Trả về 400 Bad Request thay vì 500")
    void testProcessPaymentEndpoint_ConcurrencyConflict_Returns400() {
        when(authentication.getName()).thenReturn("super_admin");
        when(userService.findByUsername("super_admin")).thenReturn(adminUser);
        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));
        when(paymentService.processPayment(eq(777L), anyString()))
                .thenThrow(new org.springframework.dao.CannotAcquireLockException("could not serialize access due to concurrent update"));

        ProcessPaymentRequest request = new ProcessPaymentRequest();
        request.setTransactionId("TX_123");

        ResponseEntity<?> response = paymentController.processPayment(777L, request, authentication);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Giao dịch đang được xử lý đồng thời"));
    }

    @Test
    @DisplayName("9. Endpoint refundPayment: Xung đột Concurrency / Serialization trên Postgres -> Trả về 400 Bad Request thay vì 500")
    void testRefundPaymentEndpoint_ConcurrencyConflict_Returns400() {
        when(authentication.getName()).thenReturn("super_admin");
        when(userService.findByUsername("super_admin")).thenReturn(adminUser);
        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));
        when(paymentService.refundPayment(eq(777L), anyString()))
                .thenThrow(new org.springframework.dao.PessimisticLockingFailureException("could not serialize access due to read/write dependencies"));

        RefundRequest request = new RefundRequest();
        request.setReason("Lỗi đua lệnh");

        ResponseEntity<?> response = paymentController.refundPayment(777L, request, authentication);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Giao dịch đang được xử lý đồng thời"));
    }

    @Test
    @DisplayName("10. Endpoint cancelWithdraw: Xung đột Concurrency / Serialization trên Postgres -> Trả về 400 Bad Request thay vì 500")
    void testCancelWithdrawEndpoint_ConcurrencyConflict_Returns400() {
        when(authentication.getName()).thenReturn("regular_user");
        when(userService.findByUsername("regular_user")).thenReturn(normalUser);
        when(paymentService.cancelWithdraw(eq(777L), eq(normalUser.getId()), eq(false)))
                .thenThrow(new org.springframework.dao.CannotAcquireLockException("Lock wait timeout exceeded"));

        ResponseEntity<?> response = paymentController.cancelWithdraw(777L, authentication);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Yêu cầu rút tiền đang được xử lý đồng thời"));
    }


    @Test
    @DisplayName("11. Endpoint processPayment: Người dùng thường (kể cả chủ giao dịch isOwner) cố duyệt thanh toán -> Trả về 403 Forbidden")
    void testProcessPaymentEndpoint_NonAdminOwner_Returns403() {
        // withdrawPayment.getUser() == normalUser (isOwner = true)
        when(authentication.getName()).thenReturn("regular_user");
        when(userService.findByUsername("regular_user")).thenReturn(normalUser);
        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));

        ProcessPaymentRequest request = new ProcessPaymentRequest();
        request.setTransactionId("FAKE_TX_999");

        ResponseEntity<?> response = paymentController.processPayment(777L, request, authentication);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Chỉ quản trị viên (Admin) mới có quyền xử lý duyệt thanh toán này", response.getBody());
        verify(paymentService, never()).processPayment(anyLong(), anyString());
    }

    @Test
    @DisplayName("12. Endpoint processPayment: Admin duyệt thanh toán rút tiền PENDING -> Trả về 200 OK và gửi thông báo")
    void testProcessPaymentEndpoint_Admin_Success() {
        when(authentication.getName()).thenReturn("super_admin");
        when(userService.findByUsername("super_admin")).thenReturn(adminUser);
        when(paymentRepository.findById(777L)).thenReturn(Optional.of(withdrawPayment));

        Payment completedPayment = new Payment();
        completedPayment.setId(777L);
        completedPayment.setUser(normalUser);
        completedPayment.setType(Payment.PaymentType.WITHDRAW);
        completedPayment.setStatus(Payment.PaymentStatus.COMPLETED);
        completedPayment.setCoin(100000L);
        completedPayment.setBankAccountNumber("0987654321");
        completedPayment.setBankName("MB Bank");

        when(paymentService.processPayment(777L, "TX_BANK_REAL_888")).thenReturn(completedPayment);

        ProcessPaymentRequest request = new ProcessPaymentRequest();
        request.setTransactionId("TX_BANK_REAL_888");

        ResponseEntity<?> response = paymentController.processPayment(777L, request, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Payment.PaymentStatus.COMPLETED, ((Payment) response.getBody()).getStatus());
        verify(paymentService, times(1)).processPayment(777L, "TX_BANK_REAL_888");
        verify(notificationService, times(1)).createNotification(
                eq(normalUser.getId()),
                contains("Rút tiền thành công"),
                contains("100000"),
                eq("withdraw_success"),
                eq("/wallet"),
                eq("777")
        );
    }
}