package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RealtimeNotificationDTO {
    private Long id;
    private Long userId;
    private String title;
    private String message;
    private String type;
    private boolean read;
    private String actionUrl;
    private Long orderId;
    private String status;
    private LocalDateTime createdAt;
}

