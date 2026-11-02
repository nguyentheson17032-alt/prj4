package com.example.backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.exception.PaymentException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.UserRepository;

@Service
@Transactional
public class PaymentService {
    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);
    private final PaymentRepository paymentRepository;
    private final GamePlayerRepository gamePlayerRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public PaymentService(PaymentRepository paymentRepository,
            GamePlayerRepository gamePlayerRepository,
            UserRepository userRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) NotificationService notificationService) {
        this.paymentRepository = paymentRepository;
        this.gamePlayerRepository = gamePlayerRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Payment createPayment(Long gamePlayerId, Long userId, BigDecimal amount,
            String currency, String paymentMethod) {
        logger.info("Creating payment for user {} with amount {}", userId, amount);
        try {
            GamePlayer gamePlayer = gamePlayerRepository.findById(gamePlayerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Game player not found"));
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            validateAmount(amount);
            Payment.PaymentMethod method = validateAndConvertPaymentMethod(paymentMethod);

            Payment payment = new Payment();
            payment.setGamePlayer(gamePlayer);
            payment.setUser(user);
            payment.setCoin(amount.longValue());
            payment.setCurrency(currency);
            payment.setPaymentMethod(method);
            payment.setStatus(Payment.PaymentStatus.PENDING);
            payment.setCreatedAt(LocalDateTime.now());

            Payment savedPayment = paymentRepository.save(payment);
            logger.info("Payment created successfully with ID: {}", savedPayment.getId());
            return savedPayment;
        } catch (Exception e) {
            logger.error("Error creating payment: {}", e.getMessage());
            throw e;
        }
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Payment processPayment(Long paymentId, String transactionId) {
        logger.info("Processing payment {} with transaction ID {}", paymentId, transactionId);
        try {
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

            if (!Payment.PaymentStatus.PENDING.equals(payment.getStatus())) {
                logger.warn("Payment {} is not in pending status", paymentId);
                throw new PaymentException("Payment is not in pending status");
            }

            LocalDateTime now = LocalDateTime.now();
            int updated = paymentRepository.updatePaymentStatusAndTransactionIdIfExpected(
                    paymentId,
                    Payment.PaymentStatus.COMPLETED,
                    transactionId,
                    now,
                    Payment.PaymentStatus.PENDING
            );

            if (updated == 0) {
                logger.warn("Payment {} status changed concurrently or already processed", paymentId);
                throw new PaymentException("Giao dịch này không ở trạng thái chờ duyệt hoặc đã được xử lý bởi tác vụ khác");
            }

            payment.setTransactionId(transactionId);
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setCompletedAt(now);

            logger.info("Payment {} processed successfully", paymentId);
            return payment;
        } catch (Exception e) {
            logger.error("Error processing payment: {}", e.getMessage());
            throw e;
        }
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Payment refundPayment(Long paymentId, String reason) {
        logger.info("Refunding payment {} with reason: {}", paymentId, reason);
        try {
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

            if (!Payment.PaymentStatus.COMPLETED.equals(payment.getStatus()) && !Payment.PaymentStatus.PENDING.equals(payment.getStatus())) {
                logger.warn("Payment {} is neither completed nor pending, current status: {}", paymentId, payment.getStatus());
                throw new PaymentException("Payment cannot be refunded or rejected in current status");
            }

            // Bảo vệ chặt chẽ: Tuyệt đối không cho phép hoàn tiền giao dịch nạp tiền (TOPUP)
            if (Payment.PaymentType.TOPUP.equals(payment.getType())) {
                logger.warn("Cannot refund TOPUP payment {}", paymentId);
                throw new PaymentException("Cannot refund TOPUP payment");
            }

            // Với giao dịch rút tiền (WITHDRAW), chỉ cho phép từ chối/hoàn coin khi đang ở trạng thái PENDING
            if (Payment.PaymentType.WITHDRAW.equals(payment.getType()) && !Payment.PaymentStatus.PENDING.equals(payment.getStatus())) {
                logger.warn("Cannot refund non-pending WITHDRAW payment {}, current status: {}", paymentId, payment.getStatus());
                throw new PaymentException("Cannot refund already completed or non-pending withdrawal");
            }

            LocalDateTime now = LocalDateTime.now();
            int updated;
            if (Payment.PaymentType.WITHDRAW.equals(payment.getType())) {
                updated = paymentRepository.updatePaymentStatusAndDescriptionIfExpected(
                        paymentId,
                        Payment.PaymentStatus.REFUNDED,
                        reason,
                        now,
                        Payment.PaymentStatus.PENDING
                );
            } else {
                updated = paymentRepository.updatePaymentStatusAndDescriptionIfExpectedIn(
                        paymentId,
                        Payment.PaymentStatus.REFUNDED,
                        reason,
                        now,
                        List.of(Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.PENDING)
                );
            }

            if (updated == 0) {
                logger.warn("Payment {} could not be refunded: state changed concurrently", paymentId);
                throw new PaymentException("Yêu cầu rút tiền này đã được xử lý hoặc đã bị hủy bởi một tác vụ khác");
            }

            // Nếu là giao dịch thuê player, trừ xu của player trước bằng lệnh trừ nguyên tử deductCoinSafely
            if (Payment.PaymentType.HIRE.equals(payment.getType()) && payment.getPlayer() != null) {
                User player = payment.getPlayer();
                int deducted = userRepository.deductCoinSafely(player.getId(), payment.getCoin());
                if (deducted == 0) {
                    logger.warn("Cannot refund HIRE payment {}: Player #{} has insufficient balance to deduct {} coins",
                            paymentId, player.getId(), payment.getCoin());
                    throw new PaymentException("Không thể hoàn tiền: Số dư ví của Idol không đủ để thu hồi (Yêu cầu: " + 
                            payment.getCoin() + " đ, hiện có: " + (player.getCoin() != null ? player.getCoin() : 0) + " đ)");
                }
                player.setCoin((player.getCoin() != null ? player.getCoin() : 0L) - payment.getCoin());
                logger.info("Deducted {} coins atomically from player {}", payment.getCoin(), player.getId());
            }

            // Hoàn xu cho người dùng bằng lệnh cộng nguyên tử addCoinSafely (chỉ sau khi đã khấu trừ thành công từ player nếu là HIRE)
            User user = payment.getUser();
            if (payment.getCoin() != null && user != null) {
                userRepository.addCoinSafely(user.getId(), payment.getCoin());
                user.setCoin((user.getCoin() != null ? user.getCoin() : 0L) + payment.getCoin());
                logger.info("Refunded {} coins atomically to user {}", payment.getCoin(), user.getId());
            }

            payment.setStatus(Payment.PaymentStatus.REFUNDED);
            payment.setDescription(reason);
            payment.setCompletedAt(now);

            logger.info("Payment {} refunded successfully", paymentId);
            return payment;
        } catch (Exception e) {
            logger.error("Error refunding payment: {}", e.getMessage());
            throw e;
        }
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Payment cancelWithdraw(Long paymentId, Long userId, boolean isAdmin) {
        logger.info("Canceling withdrawal payment {} by user {} (isAdmin={})", paymentId, userId, isAdmin);
        try {
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

            boolean isOwner = payment.getUser() != null && payment.getUser().getId().equals(userId);
            if (!isAdmin && !isOwner) {
                logger.warn("User {} is not allowed to cancel withdrawal payment {}", userId, paymentId);
                throw new PaymentException("Bạn không có quyền hủy yêu cầu rút tiền này");
            }

            if (!Payment.PaymentType.WITHDRAW.equals(payment.getType())) {
                logger.warn("Payment {} is not a withdrawal (type: {})", paymentId, payment.getType());
                throw new PaymentException("Chỉ có thể hủy yêu cầu rút tiền (WITHDRAW)");
            }

            if (!Payment.PaymentStatus.PENDING.equals(payment.getStatus())) {
                logger.warn("Payment {} is not pending (status: {})", paymentId, payment.getStatus());
                throw new PaymentException("Chỉ có thể hủy yêu cầu rút tiền đang chờ duyệt (PENDING)");
            }

            LocalDateTime now = LocalDateTime.now();
            String cancelDesc = "Người dùng đã tự hủy yêu cầu rút tiền";
            int updated = paymentRepository.updatePaymentStatusAndDescriptionIfExpected(
                    paymentId,
                    Payment.PaymentStatus.CANCELED,
                    cancelDesc,
                    now,
                    Payment.PaymentStatus.PENDING
            );

            if (updated == 0) {
                logger.warn("Concurrent cancel or state changed for payment {}", paymentId);
                throw new PaymentException("Yêu cầu rút tiền này đã được xử lý hoặc đã bị hủy bởi một tác vụ khác");
            }

            // Hoàn lại coin cho user bằng lệnh cộng nguyên tử addCoinSafely
            User user = payment.getUser();
            if (payment.getCoin() != null && user != null) {
                userRepository.addCoinSafely(user.getId(), payment.getCoin());
                user.setCoin((user.getCoin() != null ? user.getCoin() : 0L) + payment.getCoin());
                logger.info("Refunded {} coins atomically to user #{} for canceled withdrawal #{}",
                        payment.getCoin(), user.getId(), paymentId);
            }

            payment.setStatus(Payment.PaymentStatus.CANCELED);
            payment.setDescription(cancelDesc);
            payment.setCompletedAt(now);

            if (notificationService != null && user != null) {
                try {
                    notificationService.createNotification(
                        user.getId(),
                        "Đã hủy yêu cầu rút tiền",
                        "Bạn đã hủy yêu cầu rút " + (payment.getCoin() != null ? payment.getCoin() : 0) + " đ. Số tiền đã được hoàn lại vào ví.",
                        "withdraw_canceled",
                        "/wallet",
                        payment.getId().toString()
                    );
                } catch (Exception ignored) {}
            }

            logger.info("Withdrawal payment {} canceled successfully", paymentId);
            return payment;
        } catch (Exception e) {
            logger.error("Error canceling withdrawal {}: {}", paymentId, e.getMessage());
            throw e;
        }
    }

    public List<Payment> getUserPayments(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    public List<Payment> getGamePlayerPayments(Long gamePlayerId) {
        return paymentRepository.findByGamePlayerId(gamePlayerId);
    }

    public List<Payment> getPaymentsByStatus(String status) {
        validateStatus(status);
        return paymentRepository.findByStatus(Payment.PaymentStatus.valueOf(status));
    }

    public List<Payment> getPaymentsByDateRange(LocalDateTime start, LocalDateTime end) {
        return paymentRepository.findByCreatedAtBetween(start, end);
    }

    public List<Payment> getAllTopupPayments() {
        return paymentRepository.findByTypeOrderByCreatedAtDesc(Payment.PaymentType.TOPUP);
    }

    public List<Payment> getAllWithdrawPayments() {
        return paymentRepository.findByTypeOrderByCreatedAtDesc(Payment.PaymentType.WITHDRAW);
    }

    private Payment.PaymentMethod validateAndConvertPaymentMethod(String method) {
        try {
            return Payment.PaymentMethod.valueOf(method.toUpperCase());
        } catch (IllegalArgumentException e) {
            logger.error("Invalid payment method: {}", method);
            throw new IllegalArgumentException("Invalid payment method: " + method);
        }
    }

    private void validateAmount(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            logger.error("Invalid amount: {}", amount);
            throw new PaymentException("Amount must be greater than 0");
        }
    }

    private void validateStatus(String status) {
        try {
            Payment.PaymentStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid payment status: {}", status);
            throw new IllegalArgumentException("Invalid payment status: " + status);
        }
    }

    // Scheduled task duy nhất trong hệ thống: Chuyển đơn thuê CONFIRMED sang COMPLETED khi hết hạn,
    // và giải phóng trạng thái GamePlayer. Nhắc đánh giá do OrderService đảm nhiệm.
    @Scheduled(fixedRate = 60000) // Chạy mỗi phút
    public void completeExpiredHires() {
        LocalDateTime now = LocalDateTime.now();
        List<Payment> expiredHires = paymentRepository.findByStatusAndEndTimeBefore(Payment.PaymentStatus.CONFIRMED, now);
        for (Payment payment : expiredHires) {
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setCompletedAt(now);
            paymentRepository.save(payment);

            // Cập nhật trạng thái game player về AVAILABLE
            GamePlayer gamePlayer = payment.getGamePlayer();
            if (gamePlayer != null) {
                gamePlayer.setStatus("AVAILABLE");
                gamePlayer.setHiredBy(null);
                gamePlayer.setHireDate(null);
                gamePlayer.setReturnDate(null);
                gamePlayer.setHoursHired(null);
                gamePlayerRepository.save(gamePlayer);
            }
        }
    }

    public long countAllPayments() {
        return paymentRepository.count();
    }

    public double getOrderGrowthPercentComparedToYesterday() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDateTime startToday = today.atStartOfDay();
        LocalDateTime endToday = today.atTime(23, 59, 59);
        LocalDateTime startYesterday = yesterday.atStartOfDay();
        LocalDateTime endYesterday = yesterday.atTime(23, 59, 59);
        long todayCount = paymentRepository.countByCreatedAtBetween(startToday, endToday);
        long yesterdayCount = paymentRepository.countByCreatedAtBetween(startYesterday, endYesterday);
        if (yesterdayCount == 0) {
            return todayCount > 0 ? 100.0 : 0.0;
        }
        return ((double) (todayCount - yesterdayCount) / yesterdayCount) * 100.0;
    }
}
