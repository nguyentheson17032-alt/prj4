package com.example.backend.controller;

import com.example.backend.dto.PlayerIncomeReportDTO;
import com.example.backend.entity.User;
import com.example.backend.service.PlayerIncomeReportService;
import com.example.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/statistics/player")
@Tag(name = "Player Statistics & Reporting", description = "Income dashboards and statement export for players")
public class PlayerReportController {

    private final PlayerIncomeReportService reportService;
    private final UserService userService;

    public PlayerReportController(PlayerIncomeReportService reportService, UserService userService) {
        this.reportService = reportService;
        this.userService = userService;
    }

    @GetMapping("/income")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get player income report by day and week")
    public ResponseEntity<PlayerIncomeReportDTO> getIncomeReport(Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        PlayerIncomeReportDTO report = reportService.getPlayerIncomeReport(user);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/statement")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Export transaction statement as CSV")
    public ResponseEntity<byte[]> exportStatement(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate to,
            Authentication authentication) {

        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        byte[] csvBytes = reportService.generateStatementCsv(user, from, to);
        String filename = "sao_ke_thu_nhap_" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvBytes);
    }
}

