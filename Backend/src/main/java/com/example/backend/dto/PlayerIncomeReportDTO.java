package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PlayerIncomeReportDTO {
    private Long todayIncome;
    private Long thisWeekIncome;
    private Long thisMonthIncome;
    private Long totalIncome;
    private Long frozenIncome;
    private Long totalOrders;
    private Long totalDonations;
    private Integer completedOrdersCount;
    private List<DailyIncomeDTO> dailyBreakdown;
    private List<WeeklyIncomeDTO> weeklyBreakdown;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DailyIncomeDTO {
        private String date; // YYYY-MM-DD
        private Long orderIncome;
        private Long donationIncome;
        private Long totalIncome;
        private Integer orderCount;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WeeklyIncomeDTO {
        private String weekLabel; // "Tuần X (dd/MM - dd/MM)"
        private String startDate;
        private String endDate;
        private Long orderIncome;
        private Long donationIncome;
        private Long totalIncome;
        private Integer orderCount;
    }
}

