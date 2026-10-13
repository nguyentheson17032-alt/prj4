package com.example.backend.service;

import com.example.backend.entity.Order;
import com.example.backend.entity.PlayerReview;
import com.example.backend.entity.Report;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PlayerReviewRepository;
import com.example.backend.repository.ReportRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderPayoutService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PlayerReviewRepository playerReviewRepository;
    private final ReportRepository reportRepository;
    private final NotificationService notificationService;

    /**
     * Mở khóa tiền đóng băng và chuyển vào số dư khả dụng (coin) của Player
     */
    @Transactional
    public boolean releaseOrderPayout(Order order, String reason) {
        if (order == null || !"PENDING".equalsIgnoreCase(order.getPayoutStatus())) {
            return false;
        }
        if (order.getPlayer() == null || order.getPlayer().getUser() == null) {
            return false;
        }

        long amount = order.getPlayerReceived() != null 
                ? order.getPlayerReceived() 
                : Math.round((order.getPrice() != null ? order.getPrice() : 0L) * 0.85);

        User playerUser = order.getPlayer().getUser();
        if (amount > 0) {
            long oldCoin = playerUser.getCoin() != null ? playerUser.getCoin() : 0L;
            playerUser.setCoin(oldCoin + amount);
            userRepository.save(playerUser);
        }

        order.setPayoutStatus("RELEASED");
        order.setPayoutReleasedAt(LocalDateTime.now());
        orderRepository.save(order);

        log.info("[OrderPayoutService] Released {} coins for order #{} to player user #{} (reason: {})",
                amount, order.getId(), playerUser.getId(), reason);

        try {
            notificationService.createNotification(
                    playerUser.getId(),
                    "Tiền thuê đã vào số dư khả dụng!",
                    "Đơn thuê #" + order.getId() + " (" + reason + "). Số tiền " +
                            String.format("%,d", amount) + " đ đã được chuyển vào số dư khả dụng của bạn.",
                    "wallet",
                    "/wallet",
                    String.valueOf(order.getId())
            );
        } catch (Exception e) {
            log.error("[OrderPayoutService] Failed to send notification: {}", e.getMessage());
        }

        return true;
    }

    /**
     * Quét và tự động mở khóa các đơn đã quá 24h hoặc đã đánh giá >= 4 sao
     */
    @Scheduled(fixedRate = 60000) // chạy mỗi phút
    @Transactional
    public void checkAndReleasePendingPayouts() {
        try {
            List<Order> orders = orderRepository.findAll();
            LocalDateTime now = LocalDateTime.now();

            for (Order order : orders) {
                if (!"COMPLETED".equalsIgnoreCase(order.getStatus())) {
                    continue;
                }
                if (!"PENDING".equalsIgnoreCase(order.getPayoutStatus())) {
                    continue;
                }

                // Điều kiện 1: Đã được đánh giá từ 4 sao trở lên
                PlayerReview review = playerReviewRepository.findByOrderId(order.getId());
                if (review != null && review.getRating() != null && review.getRating() >= 4.0) {
                    releaseOrderPayout(order, "Được đánh giá " + review.getRating() + " sao");
                    continue;
                }

                // Điều kiện 2: Đã quá 24h sau khi đơn kết thúc và không có tố cáo nào đang PENDING/INVESTIGATING
                LocalDateTime endTime = order.getEndTime() != null ? order.getEndTime() : order.getStartTime();
                if (endTime != null && now.isAfter(endTime.plusHours(24))) {
                    Report report = reportRepository.findByOrderId(order.getId());
                    if (report == null || "REJECTED".equalsIgnoreCase(report.getStatus())) {
                        releaseOrderPayout(order, "Đã qua 24h sau khi đơn thuê kết thúc");
                    }
                }
            }
        } catch (Exception e) {
            log.error("[OrderPayoutService] Error during payout check: {}", e.getMessage());
        }
    }
}
