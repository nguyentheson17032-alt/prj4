package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CommissionTransactionDTO {
    private Long id;
    private String transactionCode; // Ví dụ: "HIRE-10" hoặc "DONATE-25"
    private String type;            // "HIRE" hoặc "DONATE"
    private String typeLabel;       // "Thuê Player" hoặc "Donate Tặng Quà"
    private String createdAt;       // Thời gian giao dịch

    // Người thanh toán (Renter hoặc Donor)
    private Long senderId;
    private String senderUsername;
    private String senderFullName;
    private String senderAvatar;

    // Người nhận (Player / Idol)
    private Long receiverId;
    private String receiverUsername;
    private String receiverFullName;
    private String receiverAvatar;

    private String gameName;

    // Chi tiết chiết khấu
    private Long originalAmount;   // Tổng số tiền giao dịch gốc (100%)
    private Double discountRate;   // Tỷ lệ chiết khấu (0.15 = 15%)
    private Long platformFee;      // Phí nền tảng thu (15%)
    private Long playerReceived;   // Game thủ thực nhận (85%)

    private String status;         // COMPLETED, CONFIRMED, etc.
    private String description;
}
