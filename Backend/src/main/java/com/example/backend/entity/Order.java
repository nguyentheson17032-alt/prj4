package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "renter_id")
    private User renter;

    @ManyToOne
    @JoinColumn(name = "player_id")
    private GamePlayer player;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long price;
    private String status; // PENDING, CONFIRMED, CANCELED, COMPLETED, ...

    @Column(name = "discount_rate")
    private Double discountRate = 0.15;

    @Column(name = "platform_fee")
    private Long platformFee;

    @Column(name = "player_received")
    private Long playerReceived;

    @Column(name = "payout_status")
    private String payoutStatus = "PENDING"; // PENDING, RELEASED, REFUNDED

    @Column(name = "payout_released_at")
    private LocalDateTime payoutReleasedAt;

    @OneToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;
} 