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

            payment.setTransactionId(transactionId);
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setCompletedAt(LocalDateTime.now());

            Payment savedPayment = paymentRepository.save(payment);
            logger.info("Payment {} processed successfully", paymentId);
            return savedPayment;
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

            // Hoàn xu cho người dùng
            User user = payment.getUser();
            if (payment.getCoin() != null && user != null) {
                user.setCoin((user.getCoin() != null ? user.getCoin() : 0L) + payment.getCoin());
                userRepository.save(user);
                logger.info("Refunded {} coins to user {}", payment.getCoin(), user.getId());
            }

            // Nếu là giao dịch thuê player, trừ xu của player
            if (Payment.PaymentType.HIRE.equals(payment.getType()) && payment.getPlayer() != null) {
                User player = payment.getPlayer();
                player.setCoin(player.getCoin() - payment.getCoin());
                userRepository.save(player);
                logger.info("Deducted {} coins from player {}", payment.getCoin(), player.getId());
            }

            payment.setStatus(Payment.PaymentStatus.REFUNDED);
            payment.setDescription(reason);
            payment.setCompletedAt(LocalDateTime.now());

            Payment savedPayment = paymentRepository.save(payment);
            logger.info("Payment {} refunded successfully", paymentId);
            return savedPayment;
        } catch (Exception e) {
            logger.error("Error refunding payment: {}", e.getMessage());
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
