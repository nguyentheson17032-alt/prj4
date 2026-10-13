package com.example.backend.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.CommissionStatsDTO;
import com.example.backend.dto.CommissionTransactionDTO;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.PlayerImageRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/admin/commissions")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Commission", description = "Quản lý chiết khấu 15% và doanh thu sàn")
@RequiredArgsConstructor
public class AdminCommissionController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PlayerImageRepository playerImageRepository;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    @GetMapping("/stats")
    @Operation(summary = "Lấy thống kê tổng quan chiết khấu 15% nền tảng")
    public ResponseEntity<CommissionStatsDTO> getCommissionStats() {
        try {
            List<Order> orders = orderRepository.findAll();
            List<Payment> donates = paymentRepository.findByTypeOrderByCreatedAtDesc(Payment.PaymentType.DONATE);

            // 1. Thống kê từ đơn thuê (Order): các đơn hợp lệ (hoàn thành hoặc đang xử lý)
            List<Order> validOrders = orders.stream()
                    .filter(o -> o.getStatus() != null && 
                            !"CANCELLED".equalsIgnoreCase(o.getStatus()) && 
                            !"CANCELED".equalsIgnoreCase(o.getStatus()) && 
                            !"REJECTED".equalsIgnoreCase(o.getStatus()))
                    .toList();

            long hireGmv = 0L;
            long hireCommission = 0L;
            for (Order o : validOrders) {
                long price = o.getPrice() != null ? o.getPrice() : 0L;
                long fee = o.getPlatformFee() != null ? o.getPlatformFee() : Math.round(price * 0.15);
                hireGmv += price;
                hireCommission += fee;
            }

            // 2. Thống kê từ Donate quà tặng (lọc payment người gửi để không tính trùng)
            List<Payment> completedDonates = donates.stream()
                    .filter(p -> p.getStatus() == null || Payment.PaymentStatus.COMPLETED.equals(p.getStatus()))
                    .filter(p -> {
                        String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                        boolean isReceive = desc.startsWith("nhận") || desc.contains("nhận quà") || desc.contains("nhận donate");
                        return !isReceive;
                    })
                    .toList();

            long donateGmv = 0L;
            long donateCommission = 0L;
            for (Payment p : completedDonates) {
                long coin = p.getOriginalAmount() != null ? p.getOriginalAmount() : (p.getCoin() != null ? p.getCoin() : 0L);
                long fee = p.getPlatformFee() != null ? p.getPlatformFee() : Math.round(coin * 0.15);
                donateGmv += coin;
                donateCommission += fee;
            }

            long totalGmv = hireGmv + donateGmv;
            long totalCommission = hireCommission + donateCommission;
            long totalPlayerEarnings = totalGmv - totalCommission;

            CommissionStatsDTO stats = CommissionStatsDTO.builder()
                    .totalCommissionRevenue(totalCommission)
                    .hireCommissionRevenue(hireCommission)
                    .donateCommissionRevenue(donateCommission)
                    .totalTransactionVolume(totalGmv)
                    .totalPlayerEarnings(totalPlayerEarnings)
                    .totalTransactions((long) (validOrders.size() + completedDonates.size()))
                    .hireTransactions((long) validOrders.size())
                    .donateTransactions((long) completedDonates.size())
                    .discountRatePercent(15.0)
                    .build();

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Lỗi khi tính thống kê chiết khấu: {}", e.getMessage(), e);
            return ResponseEntity.ok(CommissionStatsDTO.builder()
                    .totalCommissionRevenue(0L)
                    .hireCommissionRevenue(0L)
                    .donateCommissionRevenue(0L)
                    .totalTransactionVolume(0L)
                    .totalPlayerEarnings(0L)
                    .totalTransactions(0L)
                    .hireTransactions(0L)
                    .donateTransactions(0L)
                    .discountRatePercent(15.0)
                    .build());
        }
    }

    @GetMapping("/transactions")
    @Operation(summary = "Lấy danh sách chi tiết các giao dịch chiết khấu (Thuê & Donate)")
    public ResponseEntity<List<CommissionTransactionDTO>> getCommissionTransactions(
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @RequestParam(required = false) String search) {

        List<CommissionTransactionDTO> result = new ArrayList<>();

        try {
            // 1. Thêm giao dịch từ Orders (Thuê Player)
            if ("ALL".equalsIgnoreCase(type) || "HIRE".equalsIgnoreCase(type)) {
                List<Order> orders = orderRepository.findAll();
                for (Order o : orders) {
                    try {
                        long price = o.getPrice() != null ? o.getPrice() : 0L;
                        long fee = o.getPlatformFee() != null ? o.getPlatformFee() : Math.round(price * 0.15);
                        long recv = o.getPlayerReceived() != null ? o.getPlayerReceived() : (price - fee);

                        String dateStr = "";
                        if (o.getStartTime() != null) {
                            dateStr = o.getStartTime().format(FORMATTER);
                        } else if (o.getEndTime() != null) {
                            dateStr = o.getEndTime().format(FORMATTER);
                        } else if (o.getPayment() != null && o.getPayment().getCreatedAt() != null) {
                            dateStr = o.getPayment().getCreatedAt().format(FORMATTER);
                        }

                        String renterName = "Khách";
                        String renterUsername = "";
                        String renterAvatar = null;
                        Long renterId = null;
                        if (o.getRenter() != null) {
                            renterId = o.getRenter().getId();
                            renterUsername = o.getRenter().getUsername() != null ? o.getRenter().getUsername() : "";
                            renterName = o.getRenter().getFullName() != null ? o.getRenter().getFullName() : renterUsername;
                            renterAvatar = o.getRenter().getAvatarUrl();
                        }

                        String playerName = "Player";
                        String playerUsername = "";
                        String playerAvatar = null;
                        Long receiverId = null;

                        if (o.getPlayer() != null) {
                            playerName = o.getPlayer().getUsername() != null ? o.getPlayer().getUsername() : "Player";
                            playerUsername = playerName;
                            if (o.getPlayer().getUser() != null) {
                                receiverId = o.getPlayer().getUser().getId();
                                playerUsername = o.getPlayer().getUser().getUsername();
                                playerAvatar = o.getPlayer().getUser().getAvatarUrl();
                            }
                            if (playerAvatar == null && o.getPlayer().getId() != null) {
                                try {
                                    var images = playerImageRepository.findByGamePlayerId(o.getPlayer().getId());
                                    if (images != null && !images.isEmpty()) {
                                        playerAvatar = images.get(0).getImageUrl();
                                    }
                                } catch (Exception ignored) {}
                            }
                        }

                        String gameName = (o.getPlayer() != null && o.getPlayer().getGame() != null && o.getPlayer().getGame().getName() != null)
                                ? o.getPlayer().getGame().getName() : "Game";

                        CommissionTransactionDTO dto = CommissionTransactionDTO.builder()
                                .id(o.getId())
                                .transactionCode("HIRE-" + o.getId())
                                .type("HIRE")
                                .typeLabel("Thuê Player")
                                .createdAt(dateStr)
                                .senderId(renterId)
                                .senderUsername(renterUsername)
                                .senderFullName(renterName)
                                .senderAvatar(renterAvatar)
                                .receiverId(receiverId)
                                .receiverUsername(playerUsername)
                                .receiverFullName(playerName)
                                .receiverAvatar(playerAvatar)
                                .gameName(gameName)
                                .originalAmount(price)
                                .discountRate(0.15)
                                .platformFee(fee)
                                .playerReceived(recv)
                                .status(o.getStatus() != null ? o.getStatus() : "PENDING")
                                .description("Thuê " + playerName + " (" + gameName + ")")
                                .build();

                        result.add(dto);
                    } catch (Exception itemEx) {
                        log.warn("Lỗi xử lý order transaction #{}: {}", o.getId(), itemEx.getMessage());
                    }
                }
            }

            // 2. Thêm giao dịch từ Donate
            if ("ALL".equalsIgnoreCase(type) || "DONATE".equalsIgnoreCase(type)) {
                List<Payment> donates = paymentRepository.findByTypeOrderByCreatedAtDesc(Payment.PaymentType.DONATE);
                for (Payment p : donates) {
                    try {
                        // Bỏ qua bản ghi nhận quà của idol (đã trừ 15%), chỉ lấy bản ghi gốc của người gửi
                        String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                        boolean isReceive = desc.startsWith("nhận") || desc.contains("nhận quà") || desc.contains("nhận donate");
                        if (isReceive) {
                            continue;
                        }

                        long originalCoin = p.getOriginalAmount() != null ? p.getOriginalAmount() : (p.getCoin() != null ? p.getCoin() : 0L);
                        long fee = p.getPlatformFee() != null ? p.getPlatformFee() : Math.round(originalCoin * 0.15);
                        long recv = p.getPlayerReceived() != null ? p.getPlayerReceived() : (originalCoin - fee);

                        String dateStr = p.getCreatedAt() != null ? p.getCreatedAt().format(FORMATTER) : "";

                        User sender = p.getUser();
                        User receiver = p.getPlayer();
                        if (receiver == null && p.getGamePlayer() != null) {
                            receiver = p.getGamePlayer().getUser();
                        }

                        String senderName = "Khách";
                        String senderUsername = "";
                        String senderAvatar = null;
                        Long senderId = null;
                        if (sender != null) {
                            senderId = sender.getId();
                            senderUsername = sender.getUsername() != null ? sender.getUsername() : "";
                            senderName = sender.getFullName() != null ? sender.getFullName() : senderUsername;
                            senderAvatar = sender.getAvatarUrl();
                        }

                        String receiverName = (p.getGamePlayer() != null && p.getGamePlayer().getUsername() != null) ? p.getGamePlayer().getUsername() : "Idol";
                        String receiverUsername = "";
                        String receiverAvatar = null;
                        Long receiverId = null;
                        if (receiver != null) {
                            receiverId = receiver.getId();
                            receiverUsername = receiver.getUsername() != null ? receiver.getUsername() : "";
                            if (receiver.getFullName() != null && !receiver.getFullName().isBlank()) {
                                receiverName = receiver.getFullName();
                            }
                            receiverAvatar = receiver.getAvatarUrl();
                        }

                        CommissionTransactionDTO dto = CommissionTransactionDTO.builder()
                                .id(p.getId())
                                .transactionCode("DONATE-" + p.getId())
                                .type("DONATE")
                                .typeLabel("Donate Tặng Quà")
                                .createdAt(dateStr)
                                .senderId(senderId)
                                .senderUsername(senderUsername)
                                .senderFullName(senderName)
                                .senderAvatar(senderAvatar)
                                .receiverId(receiverId)
                                .receiverUsername(receiverUsername)
                                .receiverFullName(receiverName)
                                .receiverAvatar(receiverAvatar)
                                .gameName("Donate")
                                .originalAmount(originalCoin)
                                .discountRate(0.15)
                                .platformFee(fee)
                                .playerReceived(recv)
                                .status(p.getStatus() != null ? p.getStatus().name() : "COMPLETED")
                                .description(p.getDescription() != null ? p.getDescription() : ("Tặng quà cho " + receiverName))
                                .build();

                        result.add(dto);
                    } catch (Exception itemEx) {
                        log.warn("Lỗi xử lý donate payment #{}: {}", p.getId(), itemEx.getMessage());
                    }
                }
            }

            // Sắp xếp theo ID giảm dần
            result.sort(Comparator.comparing(CommissionTransactionDTO::getId, Comparator.nullsLast(Comparator.reverseOrder())));

            // Lọc theo search (nếu có)
            if (search != null && !search.trim().isEmpty()) {
                String q = search.trim().toLowerCase();
                result = result.stream().filter(tx ->
                        (tx.getTransactionCode() != null && tx.getTransactionCode().toLowerCase().contains(q)) ||
                        (tx.getSenderFullName() != null && tx.getSenderFullName().toLowerCase().contains(q)) ||
                        (tx.getSenderUsername() != null && tx.getSenderUsername().toLowerCase().contains(q)) ||
                        (tx.getReceiverFullName() != null && tx.getReceiverFullName().toLowerCase().contains(q)) ||
                        (tx.getReceiverUsername() != null && tx.getReceiverUsername().toLowerCase().contains(q)) ||
                        (tx.getDescription() != null && tx.getDescription().toLowerCase().contains(q))
                ).collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Lỗi khi lấy danh sách giao dịch chiết khấu: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok(result);
    }
}
