package com.example.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MomentDTO {
    private Long id;
    private Long gamePlayerId;
    private String gamePlayerUsername;
    private String gameName;
    private String content;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String status;
    private Long followerCount;
    private Long playerUserId;
    private String authorName;
    private String authorAvatar;
    private Boolean isVip;
    private Long likeCount;
    private Long commentCount;
    private Boolean isLiked;
    private List<String> likedByUsers;
    private List<Long> likedByUserIds;
} 