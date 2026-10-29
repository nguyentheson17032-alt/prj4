package com.example.backend.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.ApiResponse;
import com.example.backend.dto.CommissionStatsDTO;
import com.example.backend.dto.CommissionTransactionDTO;
import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.PlayerImageRepository;
import com.example.backend.repository.UserRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
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
    private final com.example.backend.repository.ReportRepository reportRepository;
    private final com.example.backend.service.CommissionService commissionService;
    private final UserRepository userRepository;
    private final GamePlayerRepository gamePlayerRepository;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    @GetMapping("/stats")
    @Operation(summary = "Lấy thống kê tổng quan chiết khấu 15% nền tảng")
    public ResponseEntity<CommissionStatsDTO> getCommissionStats() {
        try {
            List<Order> validOrders = orderRepository.findValidOrdersForCommission();
            List<Payment> donates = paymentRepository.findByTypeOrderByCreatedAtDesc(Payment.PaymentType.DONATE);

            // Batch fetch reports for refunded orders (Zero N+1)
            List<Long> refundedOrderIds = validOrders.stream()
                    .filter(o -> "REFUNDED".equalsIgnoreCase(o.getStatus()))
                    .map(Order::getId)
                    .toList();
            Map<Long, com.example.backend.entity.Report> reportMap = new HashMap<>();
            if (!refundedOrderIds.isEmpty() && reportRepository != null) {
                for (com.example.backend.entity.Report rep : reportRepository.findByOrderIdIn(refundedOrderIds)) {
                    if (rep.getOrder() != null && rep.getOrder().getId() != null) {
                        reportMap.putIfAbsent(rep.getOrder().getId(), rep);
                    }
                }
            }

            long hireGmv = 0L;
            long hireCommission = 0L;
            long activeHireCount = 0L;

            for (Order o : validOrders) {
                long price = o.getPrice() != null ? o.getPrice() : 0L;
                double rate = o.getDiscountRate() != null 
                        ? o.getDiscountRate() 
                        : (commissionService != null ? commissionService.getCommissionRateForPlayer(o.getPlayer()) : 0.15);
                long fee = o.getPlatformFee() != null ? o.getPlatformFee() : Math.round(price * rate);

                if ("REFUNDED".equalsIgnoreCase(o.getStatus())) {
                    int refundPercent = 100;
                    com.example.backend.entity.Report rep = reportMap.get(o.getId());
                    if (rep != null && rep.getRefundPercentage() != null && rep.getRefundPercentage() > 0) {
                        refundPercent = rep.getRefundPercentage();
                    }
                    long refundedPrice = Math.round(price * (refundPercent / 100.0));
                    long refundedFee = Math.round(fee * (refundPercent / 100.0));
                    price = Math.max(0L, price - refundedPrice);
                    fee = Math.max(0L, fee - refundedFee);
                }

                if (price > 0 || !"REFUNDED".equalsIgnoreCase(o.getStatus())) {
                    activeHireCount++;
                }

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
                double rate = p.getDiscountRate() != null 
                        ? p.getDiscountRate() 
                        : (commissionService != null ? commissionService.getDefaultCommissionRate() : 0.15);
                long fee = p.getPlatformFee() != null ? p.getPlatformFee() : Math.round(coin * rate);
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
                    .totalTransactions((long) (activeHireCount + completedDonates.size()))
                    .hireTransactions(activeHireCount)
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
                List<Order> orders = orderRepository.findValidOrdersForCommission();
                List<Long> refundedOrderIds = orders.stream()
                        .filter(o -> "REFUNDED".equalsIgnoreCase(o.getStatus()))
                        .map(Order::getId)
                        .toList();
                Map<Long, com.example.backend.entity.Report> reportMap = new HashMap<>();
                if (!refundedOrderIds.isEmpty() && reportRepository != null) {
                    for (com.example.backend.entity.Report rep : reportRepository.findByOrderIdIn(refundedOrderIds)) {
                        if (rep.getOrder() != null && rep.getOrder().getId() != null) {
                            reportMap.putIfAbsent(rep.getOrder().getId(), rep);
                        }
                    }
                }
                for (Order o : orders) {
                    try {
                        long price = o.getPrice() != null ? o.getPrice() : 0L;
                        double rate = o.getDiscountRate() != null 
                                ? o.getDiscountRate() 
                                : (commissionService != null ? commissionService.getCommissionRateForPlayer(o.getPlayer()) : 0.15);
                        long fee = o.getPlatformFee() != null ? o.getPlatformFee() : Math.round(price * rate);
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

                        String status = o.getStatus() != null ? o.getStatus() : "PENDING";
                        String desc = "Thuê " + playerName + " (" + gameName + ")";

                        if ("REFUNDED".equalsIgnoreCase(o.getStatus())) {
                            int refundPercent = 100;
                            com.example.backend.entity.Report rep = reportMap.get(o.getId());
                            if (rep != null && rep.getRefundPercentage() != null && rep.getRefundPercentage() > 0) {
                                refundPercent = rep.getRefundPercentage();
                            }
                            long refundedFee = Math.round(fee * (refundPercent / 100.0));
                            long refundedRecv = Math.round(recv * (refundPercent / 100.0));
                            fee = Math.max(0L, fee - refundedFee);
                            recv = Math.max(0L, recv - refundedRecv);
                            desc = "Thuê " + playerName + " (" + gameName + ") [Đã hoàn " + refundPercent + "%]";
                        }

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
                                .discountRate(rate)
                                .platformFee(fee)
                                .playerReceived(recv)
                                .status(status)
                                .description(desc)
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
                        double donateRate = p.getDiscountRate() != null 
                                ? p.getDiscountRate() 
                                : (commissionService != null ? commissionService.getDefaultCommissionRate() : 0.15);
                        long fee = p.getPlatformFee() != null ? p.getPlatformFee() : Math.round(originalCoin * donateRate);
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
                                .discountRate(donateRate)
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

    @Data
    public static class UpdateUserCommissionRequest {
        private String vipTier; // STANDARD, SILVER, GOLD, DIAMOND
        private Double customCommissionRate; // ví dụ 0.10 cho 10%
    }

    @Data
    public static class UpdatePlayerCommissionRequest {
        private Double commissionRate; // ví dụ 0.08 cho 8%
    }

    @PutMapping("/users/{userId}")
    @Operation(summary = "Admin cấu hình hạng VIP (vipTier) và tỷ lệ hoa hồng tùy chỉnh (customCommissionRate) cho User")
    public ResponseEntity<ApiResponse<?>> updateUserCommission(
            @PathVariable Long userId,
            @RequestBody UpdateUserCommissionRequest request) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Người dùng không tồn tại", null));
        }

        if (request.getVipTier() != null) {
            String tier = request.getVipTier().trim().toUpperCase();
            if (!List.of("STANDARD", "SILVER", "GOLD", "DIAMOND").contains(tier)) {
                return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Hạng VIP không hợp lệ (hỗ trợ: STANDARD, SILVER, GOLD, DIAMOND)", null));
            }
            user.setVipTier(tier);
        }

        if (request.getCustomCommissionRate() != null) {
            if (request.getCustomCommissionRate() < 0.0 || request.getCustomCommissionRate() > 1.0) {
                return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Tỷ lệ hoa hồng phải từ 0.0 đến 1.0 (ví dụ 0.10 cho 10%)", null));
            }
            user.setCustomCommissionRate(request.getCustomCommissionRate());
        }

        userRepository.save(user);

        double effectiveRate = commissionService.getCommissionRateForUser(user);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("vipTier", user.getVipTier());
        data.put("customCommissionRate", user.getCustomCommissionRate());
        data.put("effectiveCommissionRate", effectiveRate);
        data.put("effectiveCommissionPercent", (int) Math.round(effectiveRate * 100) + "%");

        log.info("[AdminCommissionController] Admin updated commission for User #{}: vipTier={}, customRate={}, effectiveRate={}",
                user.getId(), user.getVipTier(), user.getCustomCommissionRate(), effectiveRate);

        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật hoa hồng người dùng thành công", data));
    }

    @PutMapping("/players/{playerId}")
    @Operation(summary = "Admin cấu hình tỷ lệ hoa hồng riêng (commissionRate) cho GamePlayer")
    public ResponseEntity<ApiResponse<?>> updatePlayerCommission(
            @PathVariable Long playerId,
            @RequestBody UpdatePlayerCommissionRequest request) {
        GamePlayer player = gamePlayerRepository.findById(playerId).orElse(null);
        if (player == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "GamePlayer không tồn tại", null));
        }

        if (request.getCommissionRate() != null) {
            if (request.getCommissionRate() < 0.0 || request.getCommissionRate() > 1.0) {
                return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Tỷ lệ hoa hồng phải từ 0.0 đến 1.0 (ví dụ 0.08 cho 8%)", null));
            }
            player.setCommissionRate(request.getCommissionRate());
        }

        gamePlayerRepository.save(player);

        double effectiveRate = commissionService.getCommissionRateForPlayer(player);
        Map<String, Object> data = new HashMap<>();
        data.put("playerId", player.getId());
        data.put("playerUsername", player.getUsername());
        data.put("playerCommissionRate", player.getCommissionRate());
        data.put("effectiveCommissionRate", effectiveRate);
        data.put("effectiveCommissionPercent", (int) Math.round(effectiveRate * 100) + "%");

        log.info("[AdminCommissionController] Admin updated commission for GamePlayer #{}: commissionRate={}, effectiveRate={}",
                player.getId(), player.getCommissionRate(), effectiveRate);

        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật hoa hồng GamePlayer thành công", data));
    }

    @GetMapping("/configs/users/{userId}")
    @Operation(summary = "Lấy thông tin cấu hình hoa hồng hiệu lực của User")
    public ResponseEntity<ApiResponse<?>> getUserCommissionConfig(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Người dùng không tồn tại", null));
        }

        double effectiveRate = commissionService.getCommissionRateForUser(user);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("vipTier", user.getVipTier());
        data.put("customCommissionRate", user.getCustomCommissionRate());
        data.put("effectiveCommissionRate", effectiveRate);
        data.put("effectiveCommissionPercent", (int) Math.round(effectiveRate * 100) + "%");

        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thông tin hoa hồng thành công", data));
    }

    @GetMapping("/configs/players/{playerId}")
    @Operation(summary = "Lấy thông tin cấu hình hoa hồng hiệu lực của GamePlayer")
    public ResponseEntity<ApiResponse<?>> getPlayerCommissionConfig(@PathVariable Long playerId) {
        GamePlayer player = gamePlayerRepository.findById(playerId).orElse(null);
        if (player == null) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "GamePlayer không tồn tại", null));
        }

        double effectiveRate = commissionService.getCommissionRateForPlayer(player);
        Map<String, Object> data = new HashMap<>();
        data.put("playerId", player.getId());
        data.put("playerUsername", player.getUsername());
        data.put("playerCommissionRate", player.getCommissionRate());
        data.put("effectiveCommissionRate", effectiveRate);
        data.put("effectiveCommissionPercent", (int) Math.round(effectiveRate * 100) + "%");

        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy thông tin hoa hồng thành công", data));
    }
}
