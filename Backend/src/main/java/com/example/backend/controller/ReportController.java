package com.example.backend.controller;

import com.example.backend.entity.Report;
import com.example.backend.service.ReportService;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.ReportException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.example.backend.dto.PagedResponse;


import java.util.List;
import com.example.backend.service.UserService;
import com.example.backend.service.FileStorageService;
import com.example.backend.service.AdminNotificationService;
import com.example.backend.entity.User;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Report", description = "Report management APIs")
public class ReportController {
    private final ReportService reportService;
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final AdminNotificationService adminNotificationService;

    public ReportController(ReportService reportService, UserService userService, FileStorageService fileStorageService, AdminNotificationService adminNotificationService) {
        this.reportService = reportService;
        this.userService = userService;
        this.fileStorageService = fileStorageService;
        this.adminNotificationService = adminNotificationService;
    }

    @Operation(summary = "Create a new report")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createReport(
            @Valid @RequestBody ReportRequest request,
            Authentication authentication) {
        try {
            User reporter = userService.findByUsername(authentication.getName());
            
            String proofLink = request.getEvidenceUrl() != null && !request.getEvidenceUrl().trim().isEmpty()
                    ? request.getEvidenceUrl().trim()
                    : (request.getVideo() != null && !request.getVideo().trim().isEmpty()
                            ? request.getVideo().trim()
                            : request.getImageUrls());

            Report report = reportService.createReport(
                    request.getReportedPlayerId(),
                    reporter.getId(),
                    request.getOrderId(),
                    request.getReason(),
                    request.getDescription(),
                    proofLink,
                    proofLink
            );
            
            // Gửi thông báo cho admin về tố cáo mới (lấy đúng User sở hữu GamePlayer)
            try {
                User reportedUser = report.getReportedPlayer() != null ? report.getReportedPlayer().getUser() : null;
                if (reportedUser != null) {
                    adminNotificationService.notifyAdminsAboutReport(reporter, reportedUser, request.getReason());
                }
            } catch (Exception e) {
                System.err.println("[ReportController] Error calling adminNotificationService.notifyAdminsAboutReport: " + e.getMessage());
                e.printStackTrace();
            }
            
            return ResponseEntity.ok(report);
        } catch (ReportException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Report failed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Error creating report"));
        }
    }

    @Operation(summary = "Create a new report with video file")
    @PostMapping("/with-video")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createReportWithVideo(
            @RequestParam("reportedPlayerId") Long reportedPlayerId,
            @RequestParam("reason") String reason,
            @RequestParam("description") String description,
            @RequestParam(value = "videoFile", required = false) MultipartFile videoFile,
            Authentication authentication) {
        try {
            User reporter = userService.findByUsername(authentication.getName());
            
            String videoUrl = null;
            if (videoFile != null && !videoFile.isEmpty()) {
                // Validate video file
                String contentType = videoFile.getContentType();
                String originalFilename = videoFile.getOriginalFilename();
                
                // Check if it's a video file
                boolean isValidVideo = false;
                if (contentType != null && contentType.startsWith("video/")) {
                    isValidVideo = true;
                } else if (originalFilename != null) {
                    String extension = originalFilename.toLowerCase();
                    if (extension.endsWith(".mp4") || extension.endsWith(".avi") || 
                        extension.endsWith(".mov") || extension.endsWith(".wmv") || 
                        extension.endsWith(".flv") || extension.endsWith(".webm") ||
                        extension.endsWith(".mkv") || extension.endsWith(".3gp")) {
                        isValidVideo = true;
                    }
                }
                
                if (!isValidVideo) {
                    return ResponseEntity.badRequest().body(java.util.Map.of("message", "Định dạng video không hợp lệ"));
                }
                
                // Validate file size (max 50MB for video)
                long fileSize = videoFile.getSize();
                if (fileSize > 50 * 1024 * 1024) {
                    return ResponseEntity.badRequest().body(java.util.Map.of("message", "Dung lượng video không được vượt quá 50MB"));
                }
                
                // Store video file
                videoUrl = fileStorageService.storeFile(videoFile, "report-videos");
            }
            
            Report report = reportService.createReport(
                    reportedPlayerId,
                    reporter.getId(),
                    reason,
                    description,
                    videoUrl,
                    null
            );
            
            // Gửi thông báo cho admin về tố cáo mới (lấy đúng User sở hữu GamePlayer)
            try {
                User reportedUser = report.getReportedPlayer() != null ? report.getReportedPlayer().getUser() : null;
                if (reportedUser != null) {
                    adminNotificationService.notifyAdminsAboutReport(reporter, reportedUser, reason);
                }
            } catch (Exception e) {
                System.err.println("[ReportController] Error calling adminNotificationService.notifyAdminsAboutReport: " + e.getMessage());
                e.printStackTrace();
            }
            
            return ResponseEntity.ok(report);
        } catch (ReportException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Report failed"));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Lỗi tải lên tệp tin: " + e.getMessage()));
        }
    }

    @Operation(summary = "Update report status")
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Report> updateReportStatus(
            @Parameter(description = "Report ID") @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request) {
        try {
            Report report = reportService.updateReportStatus(
                    id,
                    request.getStatus(),
                    request.getResolution(),
                    request.getRefundPercentage()
            );
            return ResponseEntity.ok(report);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get reports by reporter")
    @GetMapping("/reporter")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Report>> getReportsByReporter(Authentication authentication) {
        Long reporterId = userService.findByUsername(authentication.getName()).getId();
        return ResponseEntity.ok(reportService.getReportsByReporter(reporterId));
    }

    @Operation(summary = "Get reports by reported player")
    @GetMapping("/reported-player/{reportedPlayerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Report>> getReportsByReportedPlayer(
            @Parameter(description = "Reported player ID") @PathVariable Long reportedPlayerId) {
        return ResponseEntity.ok(reportService.getReportsByReportedPlayer(reportedPlayerId));
    }

    @Operation(summary = "Get reports by status")
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Report>> getReportsByStatus(
            @Parameter(description = "Report status") @PathVariable String status) {
        return ResponseEntity.ok(reportService.getReportsByStatus(status));
    }

    @Operation(summary = "Get active reports")
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Report>> getActiveReports() {
        return ResponseEntity.ok(reportService.getActiveReports());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllReports(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "id"));
            Page<Report> reportPage = reportService.getAllReports(pageable);
            return ResponseEntity.ok(PagedResponse.from(reportPage));
        }
        return ResponseEntity.ok(reportService.getAllReports());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteReport(@PathVariable Long id) {
        reportService.deleteReport(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getReportSummary() {
        long total = reportService.getTotalReportCount();
        long unprocessed = reportService.getUnprocessedReportCount();
        return ResponseEntity.ok(new ReportSummaryResponse(total, unprocessed));
    }
}

@Data
class ReportRequest {
    @NotNull(message = "Reported player ID is required")
    private Long reportedPlayerId;

    // ID đơn hàng liên quan đến khiếu nại (có thể null nếu tố cáo ngoài đơn)
    private Long orderId;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotBlank(message = "Description is required")
    private String description;

    // URL video bằng chứng (có thể null)
    private String video;

    // Danh sách URL ảnh bằng chứng, cách nhau bởi dấu phẩy (có thể null)
    private String imageUrls;

    // Link bằng chứng tổng hợp (Google Drive, ảnh, video...)
    private String evidenceUrl;
}

@Data
class UpdateStatusRequest {
    @NotBlank(message = "Status is required")
    private String status;

    private String resolution;

    // % hoàn tiền (1 đến 100), áp dụng khi status là RESOLVED
    private Integer refundPercentage;
}

@Data
class ReportSummaryResponse {
    private final long total;
    private final long unprocessed;
} 
