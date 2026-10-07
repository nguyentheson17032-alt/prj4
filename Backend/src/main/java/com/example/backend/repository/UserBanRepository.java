package com.example.backend.repository;

import com.example.backend.entity.UserBan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserBanRepository extends JpaRepository<UserBan, Long> {

    /**
     * Tìm ban record hiện tại của user
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.user.id = :userId AND ub.status = 'ACTIVE' ORDER BY ub.bannedAt DESC")
    Optional<UserBan> findActiveBanByUserId(@Param("userId") Long userId);

    /**
     * Tìm tất cả ban records của user
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.user.id = :userId ORDER BY ub.bannedAt DESC")
    List<UserBan> findAllBansByUserId(@Param("userId") Long userId);

    /**
     * Tìm tất cả ban records đang active
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.status = 'ACTIVE' ORDER BY ub.bannedAt DESC")
    List<UserBan> findAllActiveBans();

    /**
     * Tìm tất cả ban records đã hết hạn (temporary ban)
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.status = 'ACTIVE' AND ub.banType = 'TEMPORARY' AND ub.banExpiresAt <= :now")
    List<UserBan> findExpiredTemporaryBans(@Param("now") LocalDateTime now);

    /**
     * Tìm ban records theo status
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.status = :status ORDER BY ub.bannedAt DESC")
    List<UserBan> findBansByStatus(@Param("status") String status);

    /**
     * Tìm ban records theo ban type
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.banType = :banType ORDER BY ub.bannedAt DESC")
    List<UserBan> findBansByType(@Param("banType") String banType);

    /**
     * Đếm số ban records của user
     */
    @Query("SELECT COUNT(ub) FROM UserBan ub WHERE ub.user.id = :userId")
    long countBansByUserId(@Param("userId") Long userId);

    /**
     * Đếm số ban records đang active
     */
    @Query("SELECT COUNT(ub) FROM UserBan ub WHERE ub.status = 'ACTIVE'")
    long countActiveBans();

    /**
     * Tìm ban records chưa gửi email
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.emailSent = false AND ub.status = 'ACTIVE'")
    List<UserBan> findBansWithoutEmailSent();

    /**
     * Tìm unban records chưa gửi email
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.unbanEmailSent = false AND ub.status = 'UNBANNED'")
    List<UserBan> findUnbansWithoutEmailSent();

    /**
     * Kiểm tra user có bị ban không
     */
    @Query("SELECT CASE WHEN COUNT(ub) > 0 THEN true ELSE false END FROM UserBan ub WHERE ub.user.id = :userId AND ub.status = 'ACTIVE'")
    boolean isUserBanned(@Param("userId") Long userId);

    /**
     * Tìm ban records theo khoảng thời gian
     */
    @Query("SELECT ub FROM UserBan ub WHERE ub.bannedAt BETWEEN :startDate AND :endDate ORDER BY ub.bannedAt DESC")
    List<UserBan> findBansByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
} 