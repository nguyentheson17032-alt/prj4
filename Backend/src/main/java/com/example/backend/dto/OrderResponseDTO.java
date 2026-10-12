package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderResponseDTO {
    private Long id;
    private String renterName;
    private String playerName;
    private String hireTime;
    private String status;
    private Long price;

    private Long renterId;
    private Long playerId;
    private Long playerUserId;
    private String game;
    private String playerRank;
    private String playerAvatarUrl;
    private String renterAvatarUrl;
    private Long hours;
    private String statusLabel;
    private String createdAt;
    private java.time.LocalDateTime startTime;
    private java.time.LocalDateTime endTime;

    public OrderResponseDTO(Long id, String renterName, String playerName, String hireTime, String status, Long price) {
        this.id = id;
        this.renterName = renterName;
        this.playerName = playerName;
        this.hireTime = hireTime;
        this.status = status;
        this.price = price;
    }
} 