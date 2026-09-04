package com.example.backend.controller;

import com.example.backend.entity.Game;
import com.example.backend.repository.GameRepository;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.dto.GameResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.Arrays;

@RestController
@RequestMapping("/api/games")
@CrossOrigin(origins = "http://localhost:3000")
public class GameController {

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GamePlayerRepository gamePlayerRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createGame(@RequestBody Game game) {
        if (gameRepository.findByName(game.getName()).isPresent()) {
            return ResponseEntity.badRequest().body("Game name already exists");
        }
        return ResponseEntity.ok(gameRepository.save(game));
    }

    @GetMapping
    public ResponseEntity<?> getAllGames() {
        List<Game> games = gameRepository.findAll();
        List<GameResponseDTO> result = games.stream().map(game -> new GameResponseDTO(
                game.getId(),
                game.getName(),
                game.getImageUrl(),
                game.getCategory(),
                game.getPlatform(),
                game.getStatus(),
                gamePlayerRepository.countByGameId(game.getId()),
                game.getAvailableRoles(),
                game.getAvailableRanks()
        )).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardData(@RequestParam(defaultValue = "7") int days) {
        try {
            List<Game> games = gameRepository.findAll();
            
            // 1. Thống kê tổng quan
            long totalGames = games.size();
            long activeGames = games.stream()
                .filter(game -> "ACTIVE".equalsIgnoreCase(game.getStatus()))
                .count();
            long uniqueCategories = games.stream()
                .map(Game::getCategory)
                .filter(Objects::nonNull)
                .distinct()
                .count();
            long totalPlayers = gamePlayerRepository.count();
            
            // 2. Phân bổ loại game
            Map<String, Long> categoryCount = games.stream()
                .filter(game -> game.getCategory() != null && !game.getCategory().isEmpty())
                .collect(Collectors.groupingBy(
                    Game::getCategory,
                    Collectors.counting()
                ));
            
            List<Map<String, Object>> chartData = categoryCount.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("name", entry.getKey());
                    data.put("value", entry.getValue());
                    return data;
                })
                .collect(Collectors.toList());
            
            // 3. Thống kê người chơi theo ngày - lấy dữ liệu thực từ database
            List<Map<String, Object>> statsData = new ArrayList<>();
            LocalDate endDate = LocalDate.now();
            
            for (int i = days - 1; i >= 0; i--) {
                LocalDate date = endDate.minusDays(i);
                LocalDateTime startOfDay = date.atStartOfDay();
                LocalDateTime endOfDay = date.atTime(23, 59, 59);
                
                Map<String, Object> dayData = new HashMap<>();
                dayData.put("date", date.format(DateTimeFormatter.ofPattern("dd/MM")));
                
                // Đếm số user mới được tạo trong ngày này
                long newPlayers = userRepository.countByCreatedAtBetween(startOfDay, endOfDay);
                
                // Đếm số game player được tạo trong ngày này
                long activePlayers = gamePlayerRepository.countByCreatedAtBetween(startOfDay, endOfDay);
                
                dayData.put("newPlayers", newPlayers);
                dayData.put("activePlayers", activePlayers);
                statsData.add(dayData);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("overview", Map.of(
                "totalGames", totalGames,
                "activeGames", activeGames,
                "uniqueCategories", uniqueCategories,
                "totalPlayers", totalPlayers
            ));
            response.put("gameDistribution", chartData);
            response.put("playerStats", statsData);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error getting dashboard data: " + e.getMessage());
        }
    }

    @GetMapping("/chart-data")
    public ResponseEntity<?> getGameChartData() {
        try {
            List<Game> games = gameRepository.findAll();
            
            // Tính toán phân bổ loại game
            Map<String, Long> categoryCount = games.stream()
                .filter(game -> game.getCategory() != null && !game.getCategory().isEmpty())
                .collect(Collectors.groupingBy(
                    Game::getCategory,
                    Collectors.counting()
                ));
            
            // Chuyển đổi thành format cho biểu đồ
            List<Map<String, Object>> chartData = categoryCount.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("name", entry.getKey());
                    data.put("value", entry.getValue());
                    return data;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("categories", chartData);
            response.put("totalGames", games.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error getting chart data: " + e.getMessage());
        }
    }

    @GetMapping("/player-stats")
    public ResponseEntity<?> getPlayerStats(@RequestParam(defaultValue = "7") int days) {
        try {
            List<Map<String, Object>> statsData = new ArrayList<>();
            LocalDate endDate = LocalDate.now();
            
            for (int i = days - 1; i >= 0; i--) {
                LocalDate date = endDate.minusDays(i);
                LocalDateTime startOfDay = date.atStartOfDay();
                LocalDateTime endOfDay = date.atTime(23, 59, 59);
                
                Map<String, Object> dayData = new HashMap<>();
                dayData.put("date", date.format(DateTimeFormatter.ofPattern("dd/MM")));
                
                // Đếm số user mới được tạo trong ngày này
                long newPlayers = userRepository.countByCreatedAtBetween(startOfDay, endOfDay);
                
                // Đếm số game player được tạo trong ngày này
                long activePlayers = gamePlayerRepository.countByCreatedAtBetween(startOfDay, endOfDay);
                
                dayData.put("newPlayers", newPlayers);
                dayData.put("activePlayers", activePlayers);
                statsData.add(dayData);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("stats", statsData);
            response.put("totalDays", days);
            response.put("totalGamePlayers", gamePlayerRepository.count());
            response.put("totalUsers", userRepository.count());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error getting player stats: " + e.getMessage());
        }
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats() {
        try {
            List<Game> games = gameRepository.findAll();
            
            // Tính toán các thống kê
            long totalGames = games.size();
            long activeGames = games.stream()
                .filter(game -> "ACTIVE".equalsIgnoreCase(game.getStatus()))
                .count();
            long uniqueCategories = games.stream()
                .map(Game::getCategory)
                .filter(Objects::nonNull)
                .distinct()
                .count();
            
            // Đếm số game player và user
            long totalPlayers = gamePlayerRepository.count();
            long totalUsers = userRepository.count();
            
            // Phân bổ loại game
            Map<String, Long> categoryCount = games.stream()
                .filter(game -> game.getCategory() != null && !game.getCategory().isEmpty())
                .collect(Collectors.groupingBy(
                    Game::getCategory,
                    Collectors.counting()
                ));
            
            Map<String, Object> response = new HashMap<>();
            response.put("totalGames", totalGames);
            response.put("activeGames", activeGames);
            response.put("uniqueCategories", uniqueCategories);
            response.put("totalPlayers", totalPlayers);
            response.put("totalUsers", totalUsers);
            response.put("categoryDistribution", categoryCount);
            response.put("games", games.stream().map(game -> Map.of(
                "id", game.getId(),
                "name", game.getName(),
                "category", game.getCategory(),
                "status", game.getStatus()
            )).collect(Collectors.toList()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error getting dashboard stats: " + e.getMessage());
        }
    }

    @GetMapping("/detail")
    public ResponseEntity<?> getAllGamesDetail() {
        List<Game> games = gameRepository.findAll();
        List<GameResponseDTO> result = games.stream().map(game -> new GameResponseDTO(
                game.getId(),
                game.getName(),
                game.getImageUrl(),
                game.getCategory(),
                game.getPlatform(),
                game.getStatus(),
                gamePlayerRepository.countByGameId(game.getId()),
                game.getAvailableRoles(),
                game.getAvailableRanks()
        )).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/real-data")
    public ResponseEntity<?> getRealData() {
        try {
            // Lấy dữ liệu thực từ database
            List<Game> games = gameRepository.findAll();
            long totalGamePlayers = gamePlayerRepository.count();
            long totalUsers = userRepository.count();
            
            // Thống kê game theo category
            Map<String, Long> categoryStats = games.stream()
                .filter(game -> game.getCategory() != null && !game.getCategory().isEmpty())
                .collect(Collectors.groupingBy(
                    Game::getCategory,
                    Collectors.counting()
                ));
            
            // Thống kê game theo status
            Map<String, Long> statusStats = games.stream()
                .filter(game -> game.getStatus() != null && !game.getStatus().isEmpty())
                .collect(Collectors.groupingBy(
                    Game::getStatus,
                    Collectors.counting()
                ));
            
            Map<String, Object> response = new HashMap<>();
            response.put("summary", Map.of(
                "totalGames", games.size(),
                "totalGamePlayers", totalGamePlayers,
                "totalUsers", totalUsers
            ));
            response.put("categoryStats", categoryStats);
            response.put("statusStats", statusStats);
            response.put("games", games.stream().map(game -> Map.of(
                "id", game.getId(),
                "name", game.getName(),
                "category", game.getCategory(),
                "status", game.getStatus(),
                "platform", game.getPlatform(),
                "playerCount", gamePlayerRepository.countByGameId(game.getId())
            )).collect(Collectors.toList()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error getting real data: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateGame(@PathVariable Long id, @RequestBody Game updatedGame) {
        return gameRepository.findById(id)
            .map(game -> {
                game.setName(updatedGame.getName());
                game.setDescription(updatedGame.getDescription());
                game.setCategory(updatedGame.getCategory());
                game.setPlatform(updatedGame.getPlatform());
                game.setStatus(updatedGame.getStatus());
                game.setImageUrl(updatedGame.getImageUrl());
                game.setWebsiteUrl(updatedGame.getWebsiteUrl());
                game.setRequirements(updatedGame.getRequirements());
                game.setHasRoles(updatedGame.getHasRoles());
                game.setAvailableRoles(updatedGame.getAvailableRoles());
                game.setAvailableRanks(updatedGame.getAvailableRanks());
                return ResponseEntity.ok(gameRepository.save(game));
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteGame(@PathVariable Long id) {
        if (!gameRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        long playerCount = gamePlayerRepository.countByGameId(id);
        if (playerCount > 0) {
            return ResponseEntity.badRequest().body("Không thể xóa game vì còn " + playerCount + " player đang đăng ký game này.");
        }
        gameRepository.deleteById(id);
        return ResponseEntity.ok("Game deleted successfully");
    }
} 