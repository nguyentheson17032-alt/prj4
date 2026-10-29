package com.example.backend.service;

import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderExpirationProcessor {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final GamePlayerService gamePlayerService;
    private final NotificationService notificationService;

    /**
     * Xử lý tự hủy và hoàn tiền cho một đơn PENDING quá hạn trong transaction riêng biệt (REQUIRES_NEW).
     * Sử dụng atomic update `markOrderExpiredIfPending`:
     * - Chỉ khi UPDATE thành công (1 dòng ảnh hưởng) thì mới hoàn tiền.
     * - Tránh race condition hoàn tiền 2 lần khi renter bấm hủy hoặc player accept cùng lúc.
     * - Một đơn lỗi không làm rollback-only các đơn khác trong batch.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean processSingleExpiredPendingOrder(Order order, int pendingTimeoutMinutes) {
        if (order == null || order.getId() == null) {
            return false;
        }

        String cancelReason = "Hết thời gian chờ player xác nhận (" + pendingTimeoutMinutes + " phút)";

        // Atomic check-and-update: Chỉ cập nhật nếu đơn vẫn đang ở trạng thái PENDING
        int updated = orderRepository.markOrderExpiredIfPending(order.getId(), cancelReason);
        if (updated == 0) {
            log.info("[OrderExpirationProcessor] Đơn #{} không còn ở trạng thái PENDING (đã được xử lý hoặc thay đổi trạng thái bởi luồng khác). Bỏ qua hoàn tiền.",
                    order.getId());
            return false;
        }

        order.setStatus("EXPIRED");
        order.setCancellationReason(cancelReason);
        order.setPayoutStatus("REFUNDED");

        // Hoàn lại coin an toàn cho người thuê (chỉ dùng addCoinSafely, không setCoin/save ghi đè)
        User renter = order.getRenter();
        long refundCoin = order.getPrice() != null ? order.getPrice() : 0L;
        if (renter != null && refundCoin > 0) {
            userRepository.addCoinSafely(renter.getId(), refundCoin);
        }

        // Cập nhật payment record nếu có
        if (order.getPayment() != null) {
            try {
                Payment p = order.getPayment();
                p.setStatus(Payment.PaymentStatus.CANCELED);
                p.setDescription("Tự động hủy đơn do player không xác nhận sau " + pendingTimeoutMinutes + " phút");
                paymentRepository.save(p);
            } catch (Exception ex) {
                log.warn("[OrderExpirationProcessor] Lỗi cập nhật payment đơn #{}: {}", order.getId(), ex.getMessage());
            }
        }

        // Reset trạng thái GamePlayer
        if (order.getPlayer() != null) {
            try {
                gamePlayerService.releaseHire(order.getPlayer().getId());
            } catch (Exception ex) {
                log.warn("[OrderExpirationProcessor] Lỗi reset trạng thái player đơn #{}: {}", order.getId(), ex.getMessage());
            }
        }

        // Gửi thông báo hoàn tiền cho renter
        if (renter != null) {
            try {
                notificationService.createNotification(
                    renter.getId(),
                    "Đơn thuê đã tự động hủy & Hoàn xu",
                    "Đơn thuê #" + order.getId() + " với player " + (order.getPlayer() != null ? order.getPlayer().getUsername() : "") +
                    " đã tự động hủy do player không xác nhận trong vòng " + pendingTimeoutMinutes + " phút. " +
                    String.format("%,d", refundCoin) + " xu đã được hoàn lại vào ví của bạn.",
                    "order_expired_refund",
                    "/orders",
                    order.getId().toString()
                );
            } catch (Exception ex) {
                log.warn("[OrderExpirationProcessor] Lỗi gửi thông báo renter đơn #{}: {}", order.getId(), ex.getMessage());
            }
        }

        // Gửi thông báo cho player
        if (order.getPlayer() != null && order.getPlayer().getUser() != null) {
            try {
                notificationService.createNotification(
                    order.getPlayer().getUser().getId(),
                    "Đơn thuê đã hết hạn",
                    "Đơn thuê #" + order.getId() + " từ khách hàng " + (renter != null ? renter.getUsername() : "") +
                    " đã tự động hủy do bạn không xác nhận trong vòng " + pendingTimeoutMinutes + " phút.",
                    "order_expired",
                    "/orders",
                    order.getId().toString()
                );
            } catch (Exception ex) {
                log.warn("[OrderExpirationProcessor] Lỗi gửi thông báo player đơn #{}: {}", order.getId(), ex.getMessage());
            }
        }

        log.info("[OrderExpirationProcessor] Tự động hủy đơn #{} quá hạn và hoàn {} coin cho user #{} thành công",
                order.getId(), refundCoin, renter != null ? renter.getId() : null);

        return true;
    }
}

