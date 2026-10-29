package com.example.backend.repository;

import com.example.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    
    // Đếm số user được tạo trong khoảng thời gian
    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt BETWEEN :startDate AND :endDate")
    long countByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Lấy 10 user mới nhất
    @Query("SELECT u FROM User u ORDER BY u.createdAt DESC LIMIT 10")
    List<User> findTop10ByOrderByCreatedAtDesc();
    
    // Tìm tất cả admin
    @Query("SELECT u FROM User u WHERE 'ADMIN' MEMBER OF u.roles")
    List<User> findAdmins();
    
    // Tìm tất cả admin (cách khác)
    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r WHERE r = 'ADMIN'")
    List<User> findAllAdmins();
    
    // Tìm tất cả admin (thử với ROLE_ADMIN)
    @Query("SELECT u FROM User u WHERE 'ROLE_ADMIN' MEMBER OF u.roles")
    List<User> findAdminsWithRole();
    
    // Tìm tất cả admin (cách khác với ROLE_ADMIN)
    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r WHERE r = 'ROLE_ADMIN'")
    List<User> findAllAdminsWithRole();

    // Khấu trừ coin an toàn chống race condition / double-spending
    @Modifying
    @Query("UPDATE User u SET u.coin = u.coin - :amount WHERE u.id = :userId AND u.coin >= :amount")
    int deductCoinSafely(@Param("userId") Long userId, @Param("amount") Long amount);

    // Cộng coin an toàn chống ghi đè số dư đồng thời
    @Modifying
    @Query("UPDATE User u SET u.coin = COALESCE(u.coin, 0) + :amount WHERE u.id = :userId")
    int addCoinSafely(@Param("userId") Long userId, @Param("amount") Long amount);

    long countByCreatedAtAfter(LocalDateTime date);

    @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE r IN ('ADMIN', 'ROLE_ADMIN')")
    long countAdmins();

    @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE r IN ('GAMER', 'ROLE_GAMER', 'PLAYER', 'ROLE_PLAYER')")
    long countGamers();

    List<User> findByKycStatusIgnoreCase(String kycStatus);
}
