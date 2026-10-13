package com.example.backend.service;

import com.example.backend.entity.Report;
import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.User;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.repository.ReportRepository;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.ReportException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
@Transactional
public class ReportService {
    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private final ReportRepository reportRepository;
    private final GamePlayerRepository gamePlayerRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;
    private final com.example.backend.repository.PlayerReviewRepository playerReviewRepository;
    private final com.example.backend.repository.RevenueRepository revenueRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private OrderPayoutService orderPayoutService;

    public ReportService(ReportRepository reportRepository,
                         GamePlayerRepository gamePlayerRepository,
                         UserRepository userRepository,
                         OrderRepository orderRepository,
                         PaymentRepository paymentRepository,
                         NotificationService notificationService,
                         com.example.backend.repository.PlayerReviewRepository playerReviewRepository,
                         com.example.backend.repository.RevenueRepository revenueRepository) {
        this.reportRepository = reportRepository;
        this.gamePlayerRepository = gamePlayerRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.notificationService = notificationService;
        this.playerReviewRepository = playerReviewRepository;
        this.revenueRepository = revenueRepository;
    }

    public Report createReport(Long reportedPlayerId, Long reporterId, Long orderId, String reason, String description, String video, String imageUrls) {
        GamePlayer reportedPlayer = gamePlayerRepository.findById(reportedPlayerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reported player not found"));
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResourceNotFoundException("Reporter not found"));

        Order order = null;
        if (orderId != null) {
            order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Đơn thuê không tồn tại"));
            // Chỉ người thuê mới được quyền gửi khiếu nại tố cáo cho đơn hàng này
            if (order.getRenter() == null || !order.getRenter().getId().equals(reporterId)) {
                throw new ReportException("Chỉ người thuê của đơn hàng này mới được quyền khiếu nại tố cáo");
            }

            // Chỉ được tố cáo trong vòng 24h sau khi đơn thuê kết thúc
            LocalDateTime endTime = order.getEndTime() != null ? order.getEndTime() : order.getStartTime();
            if (endTime != null && LocalDateTime.now().isAfter(endTime.plusHours(24))) {
                throw new ReportException("Đã quá thời hạn khiếu nại (chỉ được tố cáo trong vòng 24h sau khi đơn thuê kết thúc)");
            }

            // Nếu đã đánh giá player từ 4 sao trở lên thì không thể tố cáo
            if (playerReviewRepository != null) {
                com.example.backend.entity.PlayerReview review = playerReviewRepository.findByOrderId(orderId);
                if (review != null && review.getRating() != null && review.getRating() >= 4) {
                    throw new ReportException("Đơn hàng này đã được đánh giá từ 4 sao trở lên nên không thể khiếu nại tố cáo");
                }
            }

            // Đơn thuê chỉ được tố cáo 1 lần
            if (reportRepository.existsByOrderId(orderId)) {
                throw new ReportException("Đơn thuê này đã được gửi khiếu nại tố cáo trước đó rồi");
            }
        }

        // 1 người chỉ được tố cáo người chơi này 1 lần duy nhất
        if (reportRepository.existsByReporterIdAndReportedPlayerId(reporterId, reportedPlayerId)) {
            throw new ReportException("Bạn chỉ được tố cáo người chơi này 1 lần duy nhất");
        }

        Report report = new Report();
        report.setReportedPlayer(reportedPlayer);
        report.setReporter(reporter);
        report.setOrder(order);
        report.setReason(reason);
        report.setDescription(description);
        report.setStatus("PENDING");
        report.setCreatedAt(LocalDateTime.now());
        report.setVideoUrl(video);
        report.setImageUrls(imageUrls);

        return reportRepository.save(report);
    }

    public Report createReport(Long reportedPlayerId, Long reporterId, String reason, String description, String video, String imageUrls) {
        return createReport(reportedPlayerId, reporterId, null, reason, description, video, imageUrls);
    }

    public Report updateReportStatus(Long reportId, String status, String resolution, Integer refundPercentage) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));

        validateStatus(status);

        String previousStatus = report.getStatus();
        report.setStatus(status);

        if ("RESOLVED".equals(status) || "REJECTED".equals(status)) {
            report.setResolvedAt(LocalDateTime.now());
            report.setResolution(resolution);
        }

        // Khi đơn tố cáo bị từ chối (REJECTED): Tiền đóng băng của player được giải phóng vào số dư khả dụng
        if ("REJECTED".equals(status) && !"REJECTED".equals(previousStatus)) {
            Order order = report.getOrder();
            if (order != null && "PENDING".equalsIgnoreCase(order.getPayoutStatus()) && orderPayoutService != null) {
                orderPayoutService.releaseOrderPayout(order, "Admin đã từ chối khiếu nại");
            }
        }

        // Khi đơn tố cáo được chấp nhận (RESOLVED): Hoàn tiền cho người thuê & Thu hồi tiền từ người được thuê theo %
        if ("RESOLVED".equals(status) && !"RESOLVED".equals(previousStatus)) {
            int percent = (refundPercentage != null && refundPercentage > 0 && refundPercentage <= 100) 
                    ? refundPercentage 
                    : 100;
            report.setRefundPercentage(percent);
            processRefundAndPenalty(report, percent);
        }

        return reportRepository.save(report);
    }

    public Report updateReportStatus(Long reportId, String status, String resolution) {
        return updateReportStatus(reportId, status, resolution, 100);
    }

    private void processRefundAndPenalty(Report report, int percent) {
        Order order = report.getOrder();
        if (order == null) {
            log.info("[ReportService] Report #{} does not have an associated order. Skipping refund.", report.getId());
            return;
        }

        if ("REFUNDED".equalsIgnoreCase(order.getStatus())) {
            log.warn("[ReportService] Order #{} was already marked as REFUNDED. Skipping duplicate refund.", order.getId());
            return;
        }

        User renter = order.getRenter();
        long totalCoin = order.getPrice() != null ? order.getPrice() : 0L;

        // 1. Hoàn lại số tiền thuê cho người thuê (Renter) theo %
        // Ví dụ: đơn 100k, điền 40% -> hoàn 40k
        long renterRefundCoin = Math.round(totalCoin * (percent / 100.0));
        report.setRefundAmount(renterRefundCoin);

        if (renter != null && renterRefundCoin > 0) {
            long renterOldBalance = renter.getCoin() != null ? renter.getCoin() : 0L;
            renter.setCoin(renterOldBalance + renterRefundCoin);
            userRepository.save(renter);
            log.info("[ReportService] Refunded {} coins ({}%) to renter #{} for order #{}", renterRefundCoin, percent, renter.getId(), order.getId());

            try {
                notificationService.createNotification(
                    renter.getId(),
                    "Khiếu nại được chấp thuận & Hoàn tiền (" + percent + "%)",
                    "Khiếu nại đơn thuê #" + order.getId() + " đã được Admin chấp nhận với mức hoàn tiền " + percent + "%. Bạn đã được hoàn lại " + renterRefundCoin + " Coin.",
                    "REFUND",
                    "/orders",
                    String.valueOf(order.getId())
                );
            } catch (Exception e) {
                log.error("[ReportService] Failed to notify renter: {}", e.getMessage());
            }
        }

        // 2. Thu hồi số tiền mà idol/người được thuê đã nhận được từ đơn hàng đó theo tỷ lệ %
        User playerUser = order.getPlayer() != null ? order.getPlayer().getUser() : null;
        long playerReceivedCoin = order.getPlayerReceived() != null 
                ? order.getPlayerReceived() 
                : Math.round(totalCoin * 0.85);
        long playerDeductedCoin = Math.round(playerReceivedCoin * (percent / 100.0));
        long playerRemainingCoin = Math.max(0L, playerReceivedCoin - playerDeductedCoin);

        if (playerUser != null) {
            if ("RELEASED".equalsIgnoreCase(order.getPayoutStatus())) {
                // Tiền đã giải phóng trước đó -> thu hồi phần phạt
                if (playerDeductedCoin > 0) {
                    long playerOldBalance = playerUser.getCoin() != null ? playerUser.getCoin() : 0L;
                    playerUser.setCoin(Math.max(0L, playerOldBalance - playerDeductedCoin));
                    userRepository.save(playerUser);
                }
            } else {
                // Tiền đang ở trạng thái đóng băng (PENDING) -> chỉ giải phóng phần còn lại sau phạt (nếu có)
                if (playerRemainingCoin > 0) {
                    long playerOldBalance = playerUser.getCoin() != null ? playerUser.getCoin() : 0L;
                    playerUser.setCoin(playerOldBalance + playerRemainingCoin);
                    userRepository.save(playerUser);
                }
            }
            order.setPayoutStatus("REFUNDED");
            order.setPayoutReleasedAt(LocalDateTime.now());
            orderRepository.save(order);

            log.info("[ReportService] Handled player penalty for order #{}: deducted={}, remainingReleased={}",
                    order.getId(), playerDeductedCoin, playerRemainingCoin);

            try {
                notificationService.createNotification(
                    playerUser.getId(),
                    "Đơn hàng bị xử lý khiếu nại (" + percent + "%)",
                    "Đơn thuê #" + order.getId() + " bị khiếu nại và chấp nhận tố cáo (" + percent + "%). " +
                    (playerRemainingCoin > 0 ? "Phần tiền còn lại " + playerRemainingCoin + " Coin đã được giải phóng vào số dư khả dụng." : "Đơn hàng bị khấu trừ toàn bộ."),
                    "PENALTY",
                    "/orders",
                    String.valueOf(order.getId())
                );
            } catch (Exception e) {
                log.error("[ReportService] Failed to notify player: {}", e.getMessage());
            }
        }

        // 3. Đánh dấu trạng thái đơn hàng là REFUNDED
        order.setStatus("REFUNDED");
        orderRepository.save(order);

        // 4. Lưu lịch sử giao dịch hoàn tiền Payment
        try {
            Payment refundPayment = new Payment();
            refundPayment.setUser(renter);
            if (playerUser != null) refundPayment.setPlayer(playerUser);
            if (order.getPlayer() != null) refundPayment.setGamePlayer(order.getPlayer());
            refundPayment.setCoin(renterRefundCoin);
            refundPayment.setOriginalAmount(totalCoin);
            refundPayment.setStatus(Payment.PaymentStatus.REFUNDED);
            refundPayment.setType(Payment.PaymentType.HIRE);
            refundPayment.setPaymentMethod(Payment.PaymentMethod.HIRE);
            refundPayment.setCurrency("COIN");
            refundPayment.setDescription("Hoàn tiền " + percent + "% (" + renterRefundCoin + " Coin) đơn #" + order.getId() + " do chấp nhận khiếu nại tố cáo");
            refundPayment.setCreatedAt(LocalDateTime.now());
            refundPayment.setCompletedAt(LocalDateTime.now());
            paymentRepository.save(refundPayment);
        } catch (Exception ex) {
            log.error("[ReportService] Failed to save refund payment: {}", ex.getMessage());
        }

        // 5. Khấu trừ doanh thu sàn (Platform Fee) tương ứng với % hoàn tiền
        long totalFee = order.getPlatformFee() != null 
                ? order.getPlatformFee() 
                : Math.round(totalCoin * 0.15);
        long platformFeeDeduct = Math.round(totalFee * (percent / 100.0));

        if (revenueRepository != null && platformFeeDeduct > 0) {
            try {
                List<com.example.backend.entity.Revenue> allRevenues = revenueRepository.findAll();
                for (com.example.backend.entity.Revenue rev : allRevenues) {
                    if (rev.getPayment() != null && rev.getPayment().getDescription() != null
                            && rev.getPayment().getDescription().contains("#" + order.getId())) {
                        long oldAmount = rev.getAmount() != null ? rev.getAmount() : 0L;
                        long newAmount = Math.max(0L, oldAmount - platformFeeDeduct);
                        if (newAmount == 0) {
                            revenueRepository.delete(rev);
                        } else {
                            rev.setAmount(newAmount);
                            revenueRepository.save(rev);
                        }
                        log.info("[ReportService] Deducted {} from Revenue #{} for order #{}", platformFeeDeduct, rev.getId(), order.getId());
                        break;
                    }
                }
            } catch (Exception ex) {
                log.error("[ReportService] Failed to deduct revenue: {}", ex.getMessage());
            }
        }
    }

    public List<Report> getReportsByReporter(Long reporterId) {
        return reportRepository.findByReporterId(reporterId);
    }

    public List<Report> getReportsByReportedPlayer(Long reportedPlayerId) {
        return reportRepository.findByReportedPlayerId(reportedPlayerId);
    }

    public List<Report> getReportsByReportedUserId(Long reportedUserId) {
        return reportRepository.findByReportedPlayerUserId(reportedUserId);
    }

    public List<Report> getReportsByStatus(String status) {
        validateStatus(status);
        return reportRepository.findByStatus(status);
    }

    public List<Report> getActiveReports() {
        return reportRepository.findByStatus("PENDING");
    }

    public List<Report> getAllReports() {
        return reportRepository.findAll();
    }

    public void deleteReport(Long id) {
        Report report = reportRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
        reportRepository.delete(report);
    }

    public long getTotalReportCount() {
        return reportRepository.count();
    }

    public long getUnprocessedReportCount() {
        return reportRepository.countByStatus("PENDING");
    }

    private void validateStatus(String status) {
        if (!Arrays.asList("PENDING", "INVESTIGATING", "RESOLVED", "REJECTED").contains(status)) {
            throw new IllegalArgumentException("Invalid report status");
        }
    }
}