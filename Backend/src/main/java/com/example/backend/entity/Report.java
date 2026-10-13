package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "reports")
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne
    @JoinColumn(name = "reported_player_id", nullable = false)
    private GamePlayer reportedPlayer;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(nullable = false)
    private String reason;

    @Column(length = 1000)
    private String description;

    @Column(length = 1000)
    private String videoUrl; // URL video bằng chứng (có thể null)

    @Column(length = 2000)
    private String imageUrls; // Danh sách URL ảnh bằng chứng, cách nhau bởi dấu phẩy

    @Column(nullable = false)
    private String status; // PENDING, INVESTIGATING, RESOLVED, REJECTED

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime resolvedAt;

    @Column
    private String resolution;

    @Column
    private Integer refundPercentage; // % hoàn tiền (1 - 100)

    @Column
    private Long refundAmount; // Số Coin hoàn lại cho người thuê
} 