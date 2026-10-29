package com.example.backend.repository;

import com.example.backend.entity.GamePlayer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface GamePlayerRepository extends JpaRepository<GamePlayer, Long> {
    List<GamePlayer> findByGameId(Long gameId);
    Page<GamePlayer> findByGameId(Long gameId, Pageable pageable);

    List<GamePlayer> findByUserId(Long userId);
    Page<GamePlayer> findByUserId(Long userId, Pageable pageable);

    boolean existsByUserIdAndGameId(Long userId, Long gameId);

    // Giải phóng trạng thái thuê bằng bulk update: không đi qua @PreUpdate validate của entity
    // và không ghi đè các trường khác bằng bản sao cũ của entity
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE GamePlayer gp SET gp.status = 'AVAILABLE', gp.hiredBy = null, gp.hireDate = null, gp.returnDate = null, gp.hoursHired = null WHERE gp.id = :id")
    int releaseHire(@Param("id") Long id);

    List<GamePlayer> findByStatus(String status);
    Page<GamePlayer> findByStatus(String status, Pageable pageable);

    List<GamePlayer> findByRank(String rank);
    List<GamePlayer> findByRole(String role);
    List<GamePlayer> findByServer(String server);
    List<GamePlayer> findByHiredById(Long userId);
    long countByGameId(Long gameId);
    
    // Đếm số game player theo status và thời gian tạo
    @Query("SELECT COUNT(gp) FROM GamePlayer gp WHERE gp.status IN :statuses AND gp.createdAt BETWEEN :startDate AND :endDate")
    long countByStatusInAndCreatedAtBetween(@Param("statuses") List<String> statuses, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Đếm số game player được tạo trong khoảng thời gian
    @Query("SELECT COUNT(gp) FROM GamePlayer gp WHERE gp.createdAt BETWEEN :startDate AND :endDate")
    long countByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
