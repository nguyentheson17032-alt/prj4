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

import java.util.List;
import com.example.backend.service.UserService;
import com.example.backend.service.FileStorageService;
import com.example.backend.service.AdminNotificationService;
import com.example.backend.entity.User;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "http://localhost:3000")
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
    public ResponseEntity<Report> createReport(
            @Valid @RequestBody ReportRequest request,
            Authentication authentication) {
        try {
            User reporter = userService.findByUsername(authentication.getName());
            User reportedUser = userService.findById(request.getReportedPlayerId());
            
            Report report = reportService.createReport(
                    request.getReportedPlayerId(),
                    reporter.getId(),
                    request.getReason(),
                    request.getDescription(),
                    request.getVideo()
            );
            
            // Gửi thông báo cho admin về tố cáo mới
            try {
                System.out.println("[ReportController] Calling adminNotificationService.notifyAdminsAboutReport");
                adminNotificationService.notifyAdminsAboutReport(reporter, reportedUser, request.getReason());
                System.out.println("[ReportController] adminNotificationService.notifyAdminsAboutReport completed successfully");
            } catch (Exception e) {
                System.err.println("[ReportController] Error calling adminNotificationService.notifyAdminsAboutReport: " + e.getMessage());
                e.printStackTrace();
            }
            
            return ResponseEntity.ok(report);
        } catch (ReportException e) {
            if (e.getMessage() != null && e.getMessage().contains("already reported")) {
                return ResponseEntity.badRequest().body(null);
            }
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Create a new report with video file")
    @PostMapping("/with-video")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Report> createReportWithVideo(
            @RequestParam("reportedPlayerId") Long reportedPlayerId,
            @RequestParam("reason") String reason,
            @RequestParam("description") String description,
            @RequestParam(value = "videoFile", required = false) MultipartFile videoFile,
            Authentication authentication) {
        try {
            User reporter = userService.findByUsername(authentication.getName());
            User reportedUser = userService.findById(reportedPlayerId);
            
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
                    return ResponseEntity.badRequest().body(null);
                }
                
                // Validate file size (max 50MB for video)
                long fileSize = videoFile.getSize();
                if (fileSize > 50 * 1024 * 1024) {
                    return ResponseEntity.badRequest().body(null);
                }
                
                // Store video file
                videoUrl = fileStorageService.storeFile(videoFile, "report-videos");
            }
            
            Report report = reportService.createReport(
                    reportedPlayerId,
                    reporter.getId(),
                    reason,
                    description,
                    videoUrl
            );
            
            // Gửi thông báo cho admin về tố cáo mới
            try {
                System.out.println("[ReportController] Calling adminNotificationService.notifyAdminsAboutReport");
                adminNotificationService.notifyAdminsAboutReport(reporter, reportedUser, reason);
                System.out.println("[ReportController] adminNotificationService.notifyAdminsAboutReport completed successfully");
            } catch (Exception e) {
                System.err.println("[ReportController] Error calling adminNotificationService.notifyAdminsAboutReport: " + e.getMessage());
                e.printStackTrace();
            }
            
            return ResponseEntity.ok(report);
        } catch (ReportException e) {
            if (e.getMessage() != null && e.getMessage().contains("already reported")) {
                return ResponseEntity.badRequest().body(null);
            }
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
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
                    request.getResolution()
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
    public ResponseEntity<List<Report>> getReportsByReportedPlayer(
            @Parameter(description = "Reported player ID") @PathVariable Long reportedPlayerId) {
        return ResponseEntity.ok(reportService.getReportsByReportedPlayer(reportedPlayerId));
    }

    @Operation(summary = "Get reports by status")
    @GetMapping("/status/{status}")
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
    public ResponseEntity<?> getAllReports() {
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

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotBlank(message = "Description is required")
    private String description;

    // URL video bằng chứng (có thể null)
    private String video;
}

@Data
class UpdateStatusRequest {
    @NotBlank(message = "Status is required")
    private String status;

    private String resolution;
}

@Data
class ReportSummaryResponse {
    private final long total;
    private final long unprocessed;
} 