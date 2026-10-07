package com.example.backend.repository;

import com.example.backend.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByReporterId(Long reporterId);
    List<Report> findByReportedPlayerId(Long reportedPlayerId);
    List<Report> findByStatus(String status);
    List<Report> findByReporterIdAndStatus(Long reporterId, String status);
    List<Report> findByReportedPlayerIdAndStatus(Long reportedPlayerId, String status);
    List<Report> findByReporterIdAndReportedPlayerId(Long reporterId, Long reportedPlayerId);
    long countByStatus(String status);
    
    // Tìm báo cáo của một user về một player trong ngày cụ thể
    @Query("SELECT r FROM Report r WHERE r.reporter.id = :reporterId AND r.reportedPlayer.id = :reportedPlayerId AND DATE(r.createdAt) = DATE(:date)")
    List<Report> findByReporterIdAndReportedPlayerIdAndDate(
        @Param("reporterId") Long reporterId, 
        @Param("reportedPlayerId") Long reportedPlayerId, 
        @Param("date") LocalDateTime date
    );

    // Tìm tất cả báo cáo mà một user bị tố cáo (thông qua GamePlayer)
    @Query("SELECT r FROM Report r WHERE r.reportedPlayer.user.id = :reportedUserId")
    List<Report> findByReportedPlayerUserId(@Param("reportedUserId") Long reportedUserId);
} 