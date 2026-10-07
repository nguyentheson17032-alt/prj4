package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "user_bans")
public class UserBan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "banned_by", nullable = false)
    private User bannedBy;

    @Column(nullable = false)
    private String reason;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String banType; // PERMANENT, TEMPORARY

    @Column(name = "banned_at", nullable = false)
    private LocalDateTime bannedAt;

    @Column(name = "ban_expires_at")
    private LocalDateTime banExpiresAt;

    @Column(name = "unbanned_at")
    private LocalDateTime unbannedAt;

    @ManyToOne
    @JoinColumn(name = "unbanned_by")
    private User unbannedBy;

    @Column(name = "unban_reason")
    private String unbanReason;

    @Column(nullable = false)
    private String status; // ACTIVE, EXPIRED, UNBANNED

    @Column(name = "email_sent")
    private boolean emailSent = false;

    @Column(name = "unban_email_sent")
    private boolean unbanEmailSent = false;

    @PrePersist
    protected void onCreate() {
        this.bannedAt = LocalDateTime.now();
        this.status = "ACTIVE";
    }
} 