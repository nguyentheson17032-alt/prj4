package com.example.backend.repository;

import com.example.backend.entity.PlayerReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface PlayerReviewRepository extends JpaRepository<PlayerReview, Long> {
    @Query("SELECT AVG(r.rating) FROM PlayerReview r WHERE r.gamePlayer.user.id = ?1")
    Double getAverageRatingByPlayerId(Long playerId);
    
    boolean existsByOrderId(Long orderId);
    
    PlayerReview findByOrderId(Long orderId);

    List<PlayerReview> findByOrderIdIn(Collection<Long> orderIds);
    
    // Đánh giá mà player nhận được (player là người được đánh giá)
    List<PlayerReview> findByGamePlayerUserId(Long playerUserId);
    
    // Đánh giá mà user đã viết (user là người đánh giá)
    List<PlayerReview> findByUserId(Long reviewerUserId);
    
    // Đánh giá theo gamePlayer ID (không phải user ID)
    List<PlayerReview> findByGamePlayerId(Long gamePlayerId);
    
    @Query("SELECT AVG(r.rating) FROM PlayerReview r WHERE r.gamePlayer.id = ?1")
    Double getAverageRatingByGamePlayerId(Long gamePlayerId);

    @Query("SELECT r.gamePlayer.id, COUNT(r), AVG(r.rating) FROM PlayerReview r GROUP BY r.gamePlayer.id")
    List<Object[]> getAllGamePlayerReviewStats();

    @Query("SELECT r.gamePlayer.user.id, COUNT(r), AVG(r.rating) FROM PlayerReview r WHERE r.gamePlayer.user IS NOT NULL GROUP BY r.gamePlayer.user.id")
    List<Object[]> getAllUserReviewStats();

    @Query("SELECT r.gamePlayer.user.id, COUNT(r), AVG(r.rating) FROM PlayerReview r WHERE r.gamePlayer.user.id IN :userIds GROUP BY r.gamePlayer.user.id")
    List<Object[]> getUserReviewStatsByUserIds(@Param("userIds") Collection<Long> userIds);
}
