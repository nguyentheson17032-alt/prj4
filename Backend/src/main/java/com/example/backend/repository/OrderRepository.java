package com.example.backend.repository;

import com.example.backend.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Order findByPaymentId(Long paymentId);

    List<Order> findByPlayer_IdAndStatus(Long playerId, String status);

    List<Order> findByRenter_Id(Long renterId);

    List<Order> findByRenter_IdAndStatus(Long renterId, String status);

    List<Order> findByPlayer_Id(Long playerId);

    List<Order> findByStatus(String status);

    List<Order> findByStatusIgnoreCase(String status);

    List<Order> findByStatusIgnoreCaseAndPayoutStatusIgnoreCase(String status, String payoutStatus);

    @Query("SELECT o FROM Order o WHERE o.renter.id = :userId OR (o.player.user.id = :userId)")
    List<Order> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT o FROM Order o WHERE o.renter.id = :userId OR (o.player.user.id = :userId)")
    Page<Order> findAllByUserId(@Param("userId") Long userId, Pageable pageable);

    Page<Order> findByRenter_Id(Long renterId, Pageable pageable);

    Page<Order> findByPlayer_Id(Long playerId, Pageable pageable);

    Page<Order> findByStatus(String status, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE UPPER(o.status) = 'CONFIRMED' AND o.endTime < :now")
    List<Order> findExpiredConfirmedOrders(@Param("now") LocalDateTime now);

    @Query("SELECT o FROM Order o WHERE UPPER(o.status) = 'CONFIRMED' AND (o.upcomingReminderSent IS NULL OR o.upcomingReminderSent = false) AND o.startTime > :now AND o.startTime <= :soon")
    List<Order> findUpcomingOrdersToNotify(@Param("now") LocalDateTime now, @Param("soon") LocalDateTime soon);

    @Query("SELECT o FROM Order o WHERE UPPER(o.status) = 'CONFIRMED' AND (o.endingReminderSent IS NULL OR o.endingReminderSent = false) AND o.endTime > :now AND o.endTime <= :soon")
    List<Order> findEndingOrdersToNotify(@Param("now") LocalDateTime now, @Param("soon") LocalDateTime soon);

    @Query("SELECT o FROM Order o WHERE o.player.user.id = :userId AND UPPER(o.status) = 'COMPLETED' AND UPPER(o.payoutStatus) = 'PENDING'")
    List<Order> findPendingPayoutOrdersByPlayerUserId(@Param("userId") Long userId);

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

    @Query("SELECT o FROM Order o WHERE o.status IS NOT NULL AND UPPER(o.status) NOT IN ('CANCELLED', 'CANCELED', 'REJECTED')")
    List<Order> findValidOrdersForCommission();

    @Query("SELECT o.renter.id, COUNT(o) FROM Order o WHERE o.renter.id IN :userIds GROUP BY o.renter.id")
    List<Object[]> countOrdersByUserIds(@Param("userIds") Collection<Long> userIds);

    @Query("SELECT o.renter.id, SUM(o.price) FROM Order o WHERE o.renter IS NOT NULL AND o.price > 0 AND UPPER(o.status) NOT IN ('CANCELED', 'CANCELLED', 'REJECTED') GROUP BY o.renter.id")
    List<Object[]> sumHireSpentByRenters();

    @Query("SELECT COUNT(o), " +
           "SUM(CASE WHEN UPPER(o.status) = 'COMPLETED' THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN UPPER(o.status) IN ('CANCELED', 'CANCELLED') THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN UPPER(o.status) = 'CONFIRMED' THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN UPPER(o.status) = 'PENDING' THEN 1 ELSE 0 END), " +
           "COALESCE(SUM(CASE WHEN UPPER(o.status) = 'COMPLETED' THEN o.price ELSE 0 END), 0) " +
           "FROM Order o")
    List<Object[]> getGlobalAggregatedOrderStats();
}
