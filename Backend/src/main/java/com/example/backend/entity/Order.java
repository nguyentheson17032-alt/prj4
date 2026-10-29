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

    @Column(name = "upcoming_reminder_sent")
    private Boolean upcomingReminderSent = false;

    @Column(name = "ending_reminder_sent")
    private Boolean endingReminderSent = false;

    @OneToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "cancellation_fee")
    private Long cancellationFee = 0L;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @ManyToOne
    @JoinColumn(name = "cancelled_by_id")
    private User cancelledBy;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.cancellationFee == null) {
            this.cancellationFee = 0L;
        }
    }
}
