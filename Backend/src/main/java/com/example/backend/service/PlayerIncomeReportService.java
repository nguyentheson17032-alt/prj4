package com.example.backend.service;

import com.example.backend.dto.PlayerIncomeReportDTO;
import com.example.backend.dto.PlayerIncomeReportDTO.DailyIncomeDTO;
import com.example.backend.dto.PlayerIncomeReportDTO.WeeklyIncomeDTO;
import com.example.backend.entity.Order;
import com.example.backend.entity.Payment;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class PlayerIncomeReportService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;

    public PlayerIncomeReportService(OrderRepository orderRepository, PaymentRepository paymentRepository) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }

    public PlayerIncomeReportDTO getPlayerIncomeReport(User user) {
        Long userId = user.getId();
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate startOfMonth = today.withDayOfMonth(1);

        // 1. Fetch player's orders
        List<Order> allOrders = orderRepository.findAllByUserId(userId);
        List<Order> playerOrders = allOrders.stream()
                .filter(o -> o.getPlayer() != null && o.getPlayer().getUser() != null &&
                        o.getPlayer().getUser().getId().equals(userId))
                .toList();

        // 2. Fetch donations received by player
        List<Payment> allDonates = paymentRepository.findByPlayerIdAndTypeOrderByCreatedAtDesc(userId, Payment.PaymentType.DONATE);
        List<Payment> completedDonates = allDonates.stream()
                .filter(p -> Payment.PaymentStatus.COMPLETED.equals(p.getStatus()))
                .toList();

        long todayIncome = 0L;
        long thisWeekIncome = 0L;
        long thisMonthIncome = 0L;
        long totalOrderIncome = 0L;
        long frozenIncome = 0L;
        int completedOrdersCount = 0;

        // Map for daily breakdown: last 14 days
        Map<LocalDate, Long> dailyOrderIncomeMap = new HashMap<>();
        Map<LocalDate, Integer> dailyOrderCountMap = new HashMap<>();
        Map<LocalDate, Long> dailyDonateIncomeMap = new HashMap<>();

        for (Order o : playerOrders) {
            String status = o.getStatus() != null ? o.getStatus().toUpperCase() : "";
            if ("COMPLETED".equals(status) || "FINISH".equals(status)) {
                completedOrdersCount++;

                double rate = o.getDiscountRate() != null ? o.getDiscountRate() : 0.15;
                long origPrice = o.getPrice() != null ? o.getPrice() : 0L;
                long fee = o.getPlatformFee() != null ? o.getPlatformFee() : Math.round(origPrice * rate);
                long net = o.getPlayerReceived() != null ? o.getPlayerReceived() : (origPrice - fee);

                // Check if payout is still frozen/pending in escrow
                boolean isReleased = "RELEASED".equalsIgnoreCase(o.getPayoutStatus());
                if (!isReleased) {
                    frozenIncome += net;
                    // Do NOT include frozen orders in available/realized income
                    continue;
                }

                totalOrderIncome += net;

                // Consistent settlement time: payoutReleasedAt -> endTime -> createdAt
                LocalDateTime orderTime = o.getPayoutReleasedAt() != null ? o.getPayoutReleasedAt() :
                        (o.getEndTime() != null ? o.getEndTime() :
                        (o.getCreatedAt() != null ? o.getCreatedAt() : LocalDateTime.now()));
                LocalDate orderDate = orderTime.toLocalDate();

                if (orderDate.isEqual(today)) {
                    todayIncome += net;
                }
                if (!orderDate.isBefore(startOfWeek)) {
                    thisWeekIncome += net;
                }
                if (!orderDate.isBefore(startOfMonth)) {
                    thisMonthIncome += net;
                }

                dailyOrderIncomeMap.put(orderDate, dailyOrderIncomeMap.getOrDefault(orderDate, 0L) + net);
                dailyOrderCountMap.put(orderDate, dailyOrderCountMap.getOrDefault(orderDate, 0) + 1);
            }
        }

        long totalDonationIncome = 0L;
        for (Payment d : completedDonates) {
            long origCoin = d.getOriginalAmount() != null ? d.getOriginalAmount() :
                    (d.getCoin() != null ? d.getCoin() : 0L);
            double rate = d.getDiscountRate() != null ? d.getDiscountRate() : 0.15;
            long fee = d.getPlatformFee() != null ? d.getPlatformFee() : Math.round(origCoin * rate);
            long net = d.getPlayerReceived() != null ? d.getPlayerReceived() :
                    (d.getCoin() != null ? d.getCoin() : (origCoin - fee));

            totalDonationIncome += net;

            LocalDateTime donateTime = d.getCompletedAt() != null ? d.getCompletedAt() :
                    (d.getCreatedAt() != null ? d.getCreatedAt() : LocalDateTime.now());
            LocalDate donateDate = donateTime.toLocalDate();

            if (donateDate.isEqual(today)) {
                todayIncome += net;
            }
            if (!donateDate.isBefore(startOfWeek)) {
                thisWeekIncome += net;
            }
            if (!donateDate.isBefore(startOfMonth)) {
                thisMonthIncome += net;
            }

            dailyDonateIncomeMap.put(donateDate, dailyDonateIncomeMap.getOrDefault(donateDate, 0L) + net);
        }

        // Generate 14-day daily breakdown
        List<DailyIncomeDTO> dailyList = new ArrayList<>();
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (int i = 13; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            long oInc = dailyOrderIncomeMap.getOrDefault(d, 0L);
            long dInc = dailyDonateIncomeMap.getOrDefault(d, 0L);
            int oCnt = dailyOrderCountMap.getOrDefault(d, 0);
            dailyList.add(new DailyIncomeDTO(d.format(df), oInc, dInc, oInc + dInc, oCnt));
        }

        // Generate 8-week breakdown
        List<WeeklyIncomeDTO> weeklyList = new ArrayList<>();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM");
        for (int w = 7; w >= 0; w--) {
            LocalDate wStart = startOfWeek.minusWeeks(w);
            LocalDate wEnd = wStart.plusDays(6);
            long wOrderInc = 0L;
            long wDonateInc = 0L;
            int wOrderCnt = 0;

            for (LocalDate d = wStart; !d.isAfter(wEnd); d = d.plusDays(1)) {
                wOrderInc += dailyOrderIncomeMap.getOrDefault(d, 0L);
                wDonateInc += dailyDonateIncomeMap.getOrDefault(d, 0L);
                wOrderCnt += dailyOrderCountMap.getOrDefault(d, 0);
            }

            String label = "Tuần (" + wStart.format(dtf) + " - " + wEnd.format(dtf) + ")";
            weeklyList.add(new WeeklyIncomeDTO(label, wStart.format(df), wEnd.format(df),
                    wOrderInc, wDonateInc, wOrderInc + wDonateInc, wOrderCnt));
        }

        return PlayerIncomeReportDTO.builder()
                .todayIncome(todayIncome)
                .thisWeekIncome(thisWeekIncome)
                .thisMonthIncome(thisMonthIncome)
                .totalIncome(totalOrderIncome + totalDonationIncome)
                .frozenIncome(frozenIncome)
                .totalOrders((long) playerOrders.size())
                .totalDonations(totalDonationIncome)
                .completedOrdersCount(completedOrdersCount)
                .dailyBreakdown(dailyList)
                .weeklyBreakdown(weeklyList)
                .build();
    }

    public byte[] generateStatementCsv(User user, LocalDate from, LocalDate to) {
        Long userId = user.getId();
        LocalDate startDate = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate endDate = to != null ? to : LocalDate.now();

        List<Order> allOrders = orderRepository.findAllByUserId(userId);
        List<Order> playerOrders = allOrders.stream()
                .filter(o -> o.getPlayer() != null && o.getPlayer().getUser() != null &&
                        o.getPlayer().getUser().getId().equals(userId))
                .toList();

        List<Payment> allDonates = paymentRepository.findByPlayerIdAndTypeOrderByCreatedAtDesc(userId, Payment.PaymentType.DONATE);

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM for Excel compatibility
        csv.append('\uFEFF');

        // Dynamic header without fixed 15% rate
        csv.append("Mã giao dịch,Thời gian hoàn thành,Loại giao dịch,Người thuê / Người gửi,Doanh thu gốc (VNĐ),Tỷ lệ phí,Phí sàn (VNĐ),Thực nhận (VNĐ),Trạng thái\n");

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        // Order rows - Only include COMPLETED/FINISH orders whose payout has been RELEASED
        for (Order o : playerOrders) {
            String status = o.getStatus() != null ? o.getStatus().toUpperCase() : "";
            if (!"COMPLETED".equals(status) && !"FINISH".equals(status)) {
                continue;
            }
            if (!"RELEASED".equalsIgnoreCase(o.getPayoutStatus())) {
                continue;
            }

            LocalDateTime time = o.getPayoutReleasedAt() != null ? o.getPayoutReleasedAt() :
                    (o.getEndTime() != null ? o.getEndTime() :
                    (o.getCreatedAt() != null ? o.getCreatedAt() : LocalDateTime.now()));
            LocalDate date = time.toLocalDate();
            if (date.isBefore(startDate) || date.isAfter(endDate)) {
                continue;
            }

            long origPrice = o.getPrice() != null ? o.getPrice() : 0L;
            double rate = o.getDiscountRate() != null ? o.getDiscountRate() : 0.15;
            long fee = o.getPlatformFee() != null ? o.getPlatformFee() : Math.round(origPrice * rate);
            long net = o.getPlayerReceived() != null ? o.getPlayerReceived() : (origPrice - fee);
            String ratePercent = String.format("%.0f%%", rate * 100);

            String rawRenter = o.getRenter() != null ?
                    (o.getRenter().getFullName() != null && !o.getRenter().getFullName().isBlank() ?
                            o.getRenter().getFullName() : o.getRenter().getUsername()) : "Khách";

            csv.append(String.format("%s,%s,%s,%s,%d,%s,%d,%d,%s\n",
                    escapeCsvField("ORD-" + o.getId()),
                    escapeCsvField(time.format(dtf)),
                    escapeCsvField("Đơn thuê Duo Game"),
                    escapeCsvField(rawRenter),
                    origPrice,
                    escapeCsvField(ratePercent),
                    -fee,
                    net,
                    escapeCsvField("Hoàn thành")
            ));
        }

        // Donate rows - Only include COMPLETED donates
        for (Payment d : allDonates) {
            if (!Payment.PaymentStatus.COMPLETED.equals(d.getStatus())) {
                continue;
            }

            LocalDateTime time = d.getCompletedAt() != null ? d.getCompletedAt() :
                    (d.getCreatedAt() != null ? d.getCreatedAt() : LocalDateTime.now());
            LocalDate date = time.toLocalDate();
            if (date.isBefore(startDate) || date.isAfter(endDate)) {
                continue;
            }

            long origCoin = d.getOriginalAmount() != null ? d.getOriginalAmount() :
                    (d.getCoin() != null ? d.getCoin() : 0L);
            double rate = d.getDiscountRate() != null ? d.getDiscountRate() : 0.15;
            long fee = d.getPlatformFee() != null ? d.getPlatformFee() : Math.round(origCoin * rate);
            long net = d.getPlayerReceived() != null ? d.getPlayerReceived() :
                    (d.getCoin() != null ? d.getCoin() : (origCoin - fee));
            String ratePercent = String.format("%.0f%%", rate * 100);

            String rawSender = d.getUser() != null ?
                    (d.getUser().getFullName() != null && !d.getUser().getFullName().isBlank() ?
                            d.getUser().getFullName() : d.getUser().getUsername()) : "Người dùng";

            csv.append(String.format("%s,%s,%s,%s,%d,%s,%d,%d,%s\n",
                    escapeCsvField("GIFT-" + d.getId()),
                    escapeCsvField(time.format(dtf)),
                    escapeCsvField("Quà tặng / Donate"),
                    escapeCsvField(rawSender),
                    origCoin,
                    escapeCsvField(ratePercent),
                    -fee,
                    net,
                    escapeCsvField("Hoàn thành")
            ));
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Sanitizes CSV field against formula injection and escapes quotes.
     * Prevents Excel DDE/Macro execution when opening CSV files.
     */
    public String escapeCsvField(String text) {
        if (text == null) {
            return "\"\"";
        }
        String cleaned = text.trim();
        // Prevent formula injection: prefix leading =, +, -, @, \t, \r with single quote
        if (!cleaned.isEmpty()) {
            char firstChar = cleaned.charAt(0);
            if (firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@' || firstChar == '\t' || firstChar == '\r') {
                cleaned = "'" + cleaned;
            }
        }
        // Escape quotes
        cleaned = cleaned.replace("\"", "\"\"");
        return "\"" + cleaned + "\"";
    }
}
