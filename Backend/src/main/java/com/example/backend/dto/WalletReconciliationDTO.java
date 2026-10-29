package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletReconciliationDTO {
    private Long userId;
    private String username;
    private Long currentWalletCoin;

    // Tổng luồng tiền vào (Inflow)
    private Long totalTopup;
    private Long totalHireEarned;
    private Long totalDonateReceived;
    private Long totalRefundReceived;
    private Long totalInflow;

    // Tổng luồng tiền ra (Outflow)
    private Long totalHireSpent;
    private Long totalDonateSent;
    private Long totalWithdrawnOrPending;
    private Long totalOutflow;

    // Đối soát
    private Long expectedBalance; // totalInflow - totalOutflow
    private Long discrepancy;     // currentWalletCoin - expectedBalance
    private Boolean isConsistent;
    private Boolean isAnomalous;  // discrepancy > 0 (số dư vượt quá luồng giao dịch)
    private String reconciliationNote;
    private LocalDateTime checkedAt;
}

