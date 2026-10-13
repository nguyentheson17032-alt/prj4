package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CommissionStatsDTO {
    // Tổng hoa hồng nền tảng thu (15%) từ cả Thuê + Donate
    private Long totalCommissionRevenue;

    // Hoa hồng nền tảng từ dịch vụ thuê player
    private Long hireCommissionRevenue;

    // Hoa hồng nền tảng từ donate quà tặng
    private Long donateCommissionRevenue;

    // Tổng giá trị giao dịch gốc (GMV - Tổng tiền người dùng chi trả)
    private Long totalTransactionVolume;

    // Tổng số tiền Game thủ thực nhận (85%)
    private Long totalPlayerEarnings;

    // Tổng số giao dịch có chiết khấu
    private Long totalTransactions;

    // Số đơn thuê hoàn thành
    private Long hireTransactions;

    // Số lượt donate hoàn thành
    private Long donateTransactions;

    // Tỷ lệ chiết khấu cố định (%)
    @Builder.Default
    private Double discountRatePercent = 15.0;
}
