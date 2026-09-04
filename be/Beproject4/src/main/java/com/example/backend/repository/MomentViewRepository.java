package com.example.backend.repository;

import com.example.backend.entity.MomentView;
import com.example.backend.entity.Moment;
import com.example.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MomentViewRepository extends JpaRepository<MomentView, Long> {
    
    // Kiểm tra user đã xem moment chưa
    boolean existsByMomentAndUser(Moment moment, User user);
    
    // Lấy record view của user cho moment
    Optional<MomentView> findByMomentAndUser(Moment moment, User user);
    
    // Đếm số lượt xem của moment
    Long countByMoment(Moment moment);
    
    // Lấy danh sách moment chưa xem của user
    @Query("SELECT DISTINCT m FROM Moment m " +
           "WHERE m.status = 'ACTIVE' " +
           "AND m.gamePlayer.id IN " +
           "(SELECT pf.gamePlayer.id FROM PlayerFollow pf WHERE pf.follower.id = :userId) " +
           "AND m.id NOT IN " +
           "(SELECT mv.moment.id FROM MomentView mv WHERE mv.user.id = :userId) " +
           "ORDER BY m.createdAt DESC")
    List<Moment> findUnviewedMomentsByUserId(@Param("userId") Long userId);
    
    // Đếm số moment chưa xem của user
    @Query("SELECT COUNT(DISTINCT m) FROM Moment m " +
           "WHERE m.status = 'ACTIVE' " +
           "AND m.gamePlayer.id IN " +
           "(SELECT pf.gamePlayer.id FROM PlayerFollow pf WHERE pf.follower.id = :userId) " +
           "AND m.id NOT IN " +
           "(SELECT mv.moment.id FROM MomentView mv WHERE mv.user.id = :userId)")
    Long countUnviewedMomentsByUserId(@Param("userId") Long userId);
} 