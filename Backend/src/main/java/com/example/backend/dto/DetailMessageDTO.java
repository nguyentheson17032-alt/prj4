package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DetailMessageDTO {
    private Long id;
    private String content;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String receiverName;
    private LocalDateTime timestamp;
    private boolean read;
}

