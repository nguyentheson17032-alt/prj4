package com.example.backend.dto;

import lombok.Data;

@Data
public class GamePlayerSummaryDTO {
    private Long id;
    private String name;
    private String email;
    private String playerName; // Tên player khi đăng ký làm player
    private int totalOrders;
    private int totalReviews;
    private long totalRevenue;
    private String status;
    private String rankLabel;
    private double rating;
    private String gameName;
    private String avatarUrl;
} 