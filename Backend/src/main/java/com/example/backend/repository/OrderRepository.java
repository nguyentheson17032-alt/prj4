package com.example.backend.repository;

import com.example.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Order findByPaymentId(Long paymentId);

    List<Order> findByPlayer_IdAndStatus(Long playerId, String status);

    List<Order> findByRenter_Id(Long renterId);

    List<Order> findByRenter_IdAndStatus(Long renterId, String status);

    List<Order> findByPlayer_Id(Long playerId);

    List<Order> findByStatus(String status);

    @Query("SELECT o FROM Order o WHERE o.renter.id = :userId OR (o.player.user.id = :userId)")
    List<Order> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT o FROM Order o WHERE o.status = 'CONFIRMED' AND o.endTime < :now")
    List<Order> findExpiredConfirmedOrders(@Param("now") LocalDateTime now);

    @Query("SELECT o FROM Order o WHERE o.startTime >= :start AND o.startTime <= :end")
    List<Order> findByStartTimeBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countByRenter_Id(Long renterId);

    long countByPlayer_Id(Long playerId);

    @Query("SELECT COALESCE(SUM(o.price), 0) FROM Order o WHERE o.player.id = :playerId AND o.status = 'COMPLETED'")
    long sumCompletedRevenueByPlayerId(@Param("playerId") Long playerId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.player.id = :playerId AND o.status = 'COMPLETED'")
    long countCompletedOrdersByPlayerId(@Param("playerId") Long playerId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.player.id = :playerId AND (o.status = 'CANCELED' OR o.status = 'REJECTED')")
    long countCanceledOrdersByPlayerId(@Param("playerId") Long playerId);

    @Query("SELECT o FROM Order o WHERE o.player.id = :playerId AND (o.status = 'PENDING' OR o.status = 'CONFIRMED')")
    List<Order> findActiveOrdersByPlayerId(@Param("playerId") Long playerId);
} 