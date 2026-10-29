package com.example.backend.service;

import com.example.backend.dto.WalletReconciliationDTO;
import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@Slf4j
public class WalletReconciliationService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public WalletReconciliationService(PaymentRepository paymentRepository, OrderRepository orderRepository) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
    }

    public WalletReconciliationService(PaymentRepository paymentRepository) {
        this(paymentRepository, null);
    }

    /**
     * Thực hiện kiểm tra đối soát giữa số dư ví hiện tại và tổng các giao dịch phát sinh.
     * Đối chiếu chính xác theo Order.payment_id:
     * - Payment gốc của đơn thuê (có ID nằm trong Order.payment_id):
     *   + Người thuê (Sender): Là khoản chi tiền thuê duy nhất (totalHireSpent).
     *   + Player (Receiver): Không cộng vào ví khả dụng (vì lúc này tiền đang bị đóng băng).
     * - Payment giải ngân (Payout Payment, không nằm trong Order.payment_id):
     *   + Người thuê (Sender): Bỏ qua, không tính là chi thêm.
     *   + Player (Receiver): Là khoản tiền thực nhận vào ví khả dụng (totalHireEarned).
     * - Phí chiết khấu hệ thống (Revenue): Bỏ qua hoàn toàn.
     */
    @Transactional(readOnly = true)
    public WalletReconciliationDTO reconcile(User user) {
        if (user == null || user.getId() == null) {
            return null;
        }

        Long userId = user.getId();
        long currentCoin = user.getCoin() != null ? user.getCoin() : 0L;

        List<Payment> allPayments = paymentRepository.findByUserIdOrPlayerIdOrderByCreatedAtDesc(userId);

        long totalTopup = 0L;
        long totalHireEarned = 0L;
        long totalDonateReceived = 0L;
        long totalRefundReceived = 0L;

        long totalHireSpent = 0L;
        long totalDonateSent = 0L;
        long totalWithdrawnOrPending = 0L;

        // Trích xuất tập hợp các payment_id là Payment gốc của các đơn thuê (Order.payment_id)
        List<Long> paymentIds = allPayments.stream()
                .map(Payment::getId)
                .filter(Objects::nonNull)
                .toList();

        Set<Long> orderPaymentIds = (orderRepository != null && !paymentIds.isEmpty())
                ? new HashSet<>(orderRepository.findOrderPaymentIdsIn(paymentIds))
                : Collections.emptySet();

        for (Payment p : allPayments) {
            Payment.PaymentType type = p.getType();
            Payment.PaymentStatus status = p.getStatus();
            long coin = p.getCoin() != null ? p.getCoin() : 0L;
            String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";

            // 1. Phí chiết khấu hệ thống: là doanh thu nền tảng (Revenue), không tính vào luồng ví cá nhân của User hay Player
            if (desc.contains("chiết khấu hệ thống") || desc.contains("phí chiết khấu")) {
                continue;
            }

            boolean isSender = p.getUser() != null && userId.equals(p.getUser().getId());
            boolean isReceiver = p.getPlayer() != null && userId.equals(p.getPlayer().getId());

            // Đối chiếu theo Order.payment_id
            boolean isOrderPayment = p.getId() != null && orderPaymentIds.contains(p.getId());

            // 1. Luồng vào (Inflow)
            if (isSender && Payment.PaymentType.TOPUP.equals(type) && Payment.PaymentStatus.COMPLETED.equals(status)) {
                totalTopup += coin;
            }
            if (isReceiver && Payment.PaymentType.HIRE.equals(type) && Payment.PaymentStatus.COMPLETED.equals(status)) {
                // Với Player: KHÔNG tính payment gốc của đơn thuê (isOrderPayment) vì tiền thuê lúc đó bị đóng băng.
                // CHỈ tính khoản tiền giải ngân thực tế (payout) hoặc bồi thường hủy đơn (không phải payment gốc).
                if (!isOrderPayment) {
                    long received = p.getPlayerReceived() != null ? p.getPlayerReceived() : coin;
                    totalHireEarned += received;
                }
            }
            if (isReceiver && Payment.PaymentType.DONATE.equals(type) && Payment.PaymentStatus.COMPLETED.equals(status)) {
                totalDonateReceived += coin;
            }
            if (isSender && Payment.PaymentStatus.REFUNDED.equals(status)) {
                totalRefundReceived += coin;
            }

            // 2. Luồng ra (Outflow)
            if (isSender && Payment.PaymentType.HIRE.equals(type)) {
                // Với Người thuê: CHỈ tính payment gốc của đơn thuê (isOrderPayment)
                // Các bản ghi giải ngân (payout) hay bồi thường không phải người thuê chi thêm
                if (isOrderPayment) {
                    if (Payment.PaymentStatus.COMPLETED.equals(status) || Payment.PaymentStatus.PENDING.equals(status)) {
                        totalHireSpent += coin;
                    }
                }
            }
            if (isSender && Payment.PaymentType.DONATE.equals(type) && Payment.PaymentStatus.COMPLETED.equals(status)) {
                totalDonateSent += coin;
            }
            if (isSender && Payment.PaymentType.WITHDRAW.equals(type)) {
                // Tiền rút thành công hoặc đang chờ xử lý
                if (Payment.PaymentStatus.COMPLETED.equals(status) || Payment.PaymentStatus.PENDING.equals(status)) {
                    totalWithdrawnOrPending += coin;
                }
            }
        }

        long totalInflow = totalTopup + totalHireEarned + totalDonateReceived + totalRefundReceived;
        long totalOutflow = totalHireSpent + totalDonateSent + totalWithdrawnOrPending;
        long expectedBalance = Math.max(0L, totalInflow - totalOutflow);
        long discrepancy = currentCoin - expectedBalance;

        // Nếu discrepancy > 0 (người dùng có số dư lớn hơn tổng dòng tiền vào trừ ra) -> Bất thường
        boolean isAnomalous = discrepancy > 0;
        boolean isConsistent = (discrepancy == 0);

        String note;
        if (isConsistent) {
            note = "Số dư ví khớp hoàn toàn 100% với lịch sử giao dịch.";
        } else if (isAnomalous) {
            note = "CẢNH BÁO: Số dư ví hiện tại (" + currentCoin + ") lớn hơn số dư tính từ lịch sử giao dịch (" + expectedBalance + "), chênh lệch: +" + discrepancy + " xu.";
        } else {
            note = "Số dư ví hiện tại (" + currentCoin + ") nhỏ hơn số dư tính từ lịch sử giao dịch (" + expectedBalance + ").";
        }

        return WalletReconciliationDTO.builder()
                .userId(userId)
                .username(user.getUsername())
                .currentWalletCoin(currentCoin)
                .totalTopup(totalTopup)
                .totalHireEarned(totalHireEarned)
                .totalDonateReceived(totalDonateReceived)
                .totalRefundReceived(totalRefundReceived)
                .totalInflow(totalInflow)
                .totalHireSpent(totalHireSpent)
                .totalDonateSent(totalDonateSent)
                .totalWithdrawnOrPending(totalWithdrawnOrPending)
                .totalOutflow(totalOutflow)
                .expectedBalance(expectedBalance)
                .discrepancy(discrepancy)
                .isConsistent(isConsistent)
                .isAnomalous(isAnomalous)
                .reconciliationNote(note)
                .checkedAt(LocalDateTime.now())
                .build();
    }
}

