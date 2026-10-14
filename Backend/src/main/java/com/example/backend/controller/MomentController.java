package com.example.backend.controller;

import com.example.backend.dto.MomentDTO;
import com.example.backend.dto.CreateMomentRequest;
import com.example.backend.service.MomentService;
import com.example.backend.service.UserService;
import com.example.backend.service.FileStorageService;
import com.example.backend.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;

import com.example.backend.entity.Game;
import com.example.backend.entity.GamePlayer;
import com.example.backend.repository.GamePlayerRepository;
import com.example.backend.repository.GameRepository;
import java.util.Optional;

@RestController
@RequestMapping("/api/moments")
@Tag(name = "Moment", description = "Moment management APIs")
public class MomentController {

    @Autowired
    private MomentService momentService;

    @Autowired
    private UserService userService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private GamePlayerRepository gamePlayerRepository;

    @Autowired
    private GameRepository gameRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @PostMapping(value = "/upload-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload image files for moments")
    public ResponseEntity<List<String>> uploadMomentFiles(
            @RequestParam("files") List<MultipartFile> files) throws IOException {
        List<String> resultUrls = new ArrayList<>();
        if (files != null) {
            for (MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    String subPath = fileStorageService.storeFile(file, "moment-images");
                    String filename = subPath.substring(subPath.lastIndexOf("/") + 1);
                    resultUrls.add("/api/moments/moment-images/" + filename);
                }
            }
        }
        return ResponseEntity.ok(resultUrls);
    }

    @PostMapping(value = "/create", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a moment by authenticated player")
    public ResponseEntity<?> createMomentByAuthPlayer(
            @RequestBody CreateMomentRequest request,
            Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body("Chưa đăng nhập");
        }

        List<GamePlayer> userGamePlayers = gamePlayerRepository.findByUserId(user.getId());
        boolean hasPlayerRole = user.getRoles() != null && user.getRoles().stream()
                .anyMatch(r -> r.toUpperCase().contains("PLAYER"));
        
        if (userGamePlayers.isEmpty() && !hasPlayerRole) {
            return ResponseEntity.status(403).body("Chỉ Player/Idol mới có quyền đăng khoảnh khắc");
        }

        // Find or assign GamePlayer
        GamePlayer targetGp = null;
        if (request.getGameName() != null && !request.getGameName().trim().isEmpty()) {
            for (GamePlayer gp : userGamePlayers) {
                if (gp.getGame() != null && gp.getGame().getName().equalsIgnoreCase(request.getGameName().trim())) {
                    targetGp = gp;
                    break;
                }
            }
        }

        if (targetGp == null && !userGamePlayers.isEmpty()) {
            targetGp = userGamePlayers.get(0);
        }

        if (targetGp == null) {
            // Player has role but no GamePlayer entity yet, create default for selected game
            Game game = null;
            if (request.getGameName() != null && !request.getGameName().trim().isEmpty()) {
                game = gameRepository.findByName(request.getGameName().trim()).orElse(null);
            }
            if (game == null) {
                List<Game> allGames = gameRepository.findAll();
                game = allGames.isEmpty() ? null : allGames.get(0);
            }
            if (game != null) {
                targetGp = new GamePlayer();
                targetGp.setUser(user);
                targetGp.setUsername(user.getFullName() != null && !user.getFullName().trim().isEmpty() ? user.getFullName() : user.getUsername());
                targetGp.setGame(game);
                targetGp.setRank("Cao Thủ");
                targetGp.setRole("ALL");
                targetGp.setServer("VN");
                targetGp.setPricePerHour(new java.math.BigDecimal("50000"));
                targetGp.setStatus("AVAILABLE");
                targetGp = gamePlayerRepository.save(targetGp);
            }
        }

        if (targetGp == null) {
            return ResponseEntity.badRequest().body("Không tìm thấy thông tin Game Player");
        }

        MomentDTO moment = momentService.createMoment(targetGp.getId(), request);
        return ResponseEntity.ok(moment);
    }

    @PostMapping(value = "/{gamePlayerId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new moment with JSON data")
    public ResponseEntity<MomentDTO> createMoment(
            @PathVariable Long gamePlayerId,
            @RequestBody CreateMomentRequest request,
            Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        
        // Kiểm tra xem user có phải là owner của game player không
        if (!momentService.isGamePlayerOwner(gamePlayerId, user.getId())) {
            return ResponseEntity.status(403).body(null);
        }
        
        MomentDTO moment = momentService.createMoment(gamePlayerId, request);
        return ResponseEntity.ok(moment);
    }

    @PostMapping("/{gamePlayerId}/upload")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new moment with file upload")
    public ResponseEntity<MomentDTO> createMomentWithFile(
            @PathVariable Long gamePlayerId,
            @RequestParam("content") String content,
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile,
            Authentication authentication) throws IOException {
        
        try {
            User user = userService.findByUsername(authentication.getName());

            boolean isOwner = momentService.isGamePlayerOwner(gamePlayerId, user.getId());
            if (!isOwner) {
                return ResponseEntity.status(403).body(null);
            }

            if (content.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }

            CreateMomentRequest request = new CreateMomentRequest();
            request.setContent(content.trim());

            List<String> imageUrls = new ArrayList<>();

            if (imageFile != null && !imageFile.isEmpty()) {
                String contentType = imageFile.getContentType();
                String originalFilename = imageFile.getOriginalFilename();

                boolean isValidImage = (contentType != null && contentType.startsWith("image/"));
                if (!isValidImage && originalFilename != null) {
                    String ext = originalFilename.toLowerCase();
                    isValidImage = ext.endsWith(".jpg") || ext.endsWith(".jpeg") ||
                            ext.endsWith(".png") || ext.endsWith(".gif") ||
                            ext.endsWith(".bmp") || ext.endsWith(".webp");
                }

                if (!isValidImage) {
                    return ResponseEntity.badRequest().body(null);
                }
                if (imageFile.getSize() > 5 * 1024 * 1024) {
                    return ResponseEntity.badRequest().body(null);
                }

                String fileName = fileStorageService.storeFile(imageFile, "moment-images");
                imageUrls.add(fileName);
            }

            request.setImageUrls(imageUrls);
            MomentDTO moment = momentService.createMoment(gamePlayerId, request);
            return ResponseEntity.ok(moment);

        } catch (Exception e) {
            throw e;
        }
    }

    @GetMapping("/{momentId}")
    @Operation(summary = "Get moment by ID")
    public ResponseEntity<MomentDTO> getMomentById(@PathVariable Long momentId) {
        MomentDTO moment = momentService.getMomentById(momentId);
        return ResponseEntity.ok(moment);
    }

    @GetMapping("/player/{gamePlayerId}")
    @Operation(summary = "Get moments by game player ID")
    public ResponseEntity<Page<MomentDTO>> getMomentsByGamePlayerId(
            @PathVariable Long gamePlayerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<MomentDTO> moments = momentService.getMomentsByGamePlayerId(gamePlayerId, pageable);
        return ResponseEntity.ok(moments);
    }

    @GetMapping("/my-moments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current user's moments")
    public ResponseEntity<Page<MomentDTO>> getMyMoments(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        User user = userService.findByUsername(authentication.getName());
        Pageable pageable = PageRequest.of(page, size);
        Page<MomentDTO> moments = momentService.getMyMoments(user.getId(), pageable);
        return ResponseEntity.ok(moments);
    }

    @GetMapping("/feed")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get moment feed (moments from followed players)")
    public ResponseEntity<Page<MomentDTO>> getMomentFeed(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        User user = userService.findByUsername(authentication.getName());
        Pageable pageable = PageRequest.of(page, size);
        Page<MomentDTO> moments = momentService.getMomentFeed(user.getId(), pageable);
        return ResponseEntity.ok(moments);
    }

    @GetMapping("/all")
    @Operation(summary = "Get all moments (public, paginated)")
    public ResponseEntity<Page<MomentDTO>> getAllMoments(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<MomentDTO> moments = momentService.getAllMoments(pageable);
        
        Long currentUserId = null;
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            try {
                User user = userService.findByUsername(authentication.getName());
                if (user != null) currentUserId = user.getId();
            } catch (Exception ignored) {}
        }
        
        final Long finalUserId = currentUserId;
        moments.forEach(m -> {
            boolean liked = finalUserId != null && m.getLikedByUserIds() != null && m.getLikedByUserIds().contains(finalUserId);
            m.setIsLiked(liked);
        });
        
        return ResponseEntity.ok(moments);
    }

    @PutMapping("/{momentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update moment")
    public ResponseEntity<MomentDTO> updateMoment(
            @PathVariable Long momentId,
            @RequestBody CreateMomentRequest request,
            Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        MomentDTO moment = momentService.updateMoment(momentId, user.getId(), request);
        return ResponseEntity.ok(moment);
    }

    @DeleteMapping("/{momentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete moment")
    public ResponseEntity<?> deleteMoment(
            @PathVariable Long momentId,
            Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        momentService.deleteMoment(momentId, user.getId());
        return ResponseEntity.ok("Moment deleted successfully");
    }

    @PatchMapping("/{momentId}/toggle-visibility")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Toggle moment visibility")
    public ResponseEntity<?> toggleMomentVisibility(
            @PathVariable Long momentId,
            Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        momentService.toggleMomentVisibility(momentId, user.getId());
        return ResponseEntity.ok("Moment visibility toggled successfully");
    }

    @PostMapping("/{momentId}/view")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark moment as viewed")
    public ResponseEntity<?> markMomentAsViewed(
            @PathVariable Long momentId,
            Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        momentService.markMomentAsViewed(momentId, user.getId());
        return ResponseEntity.ok("Moment marked as viewed");
    }

    @PostMapping("/mark-all-viewed")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark all moments as viewed")
    public ResponseEntity<?> markAllMomentsAsViewed(Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        momentService.markAllMomentsAsViewed(user.getId());
        return ResponseEntity.ok("All moments marked as viewed");
    }

    @GetMapping("/unviewed/count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get unviewed moment count")
    public ResponseEntity<?> getUnviewedMomentCount(Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        Long count = momentService.getUnviewedMomentCount(user.getId());
        return ResponseEntity.ok(Map.of("unviewedCount", count));
    }

    @GetMapping("/unviewed")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get unviewed moments")
    public ResponseEntity<?> getUnviewedMoments(Authentication authentication) {
        
        User user = userService.findByUsername(authentication.getName());
        List<MomentDTO> unviewedMoments = momentService.getUnviewedMoments(user.getId());
        return ResponseEntity.ok(unviewedMoments);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get moments by user ID")
    public ResponseEntity<Page<MomentDTO>> getMomentsByUserId(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<MomentDTO> moments = momentService.getMyMoments(userId, pageable);
        return ResponseEntity.ok(moments);
    }

    @PostMapping("/{momentId}/like")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Toggle like on a moment")
    public ResponseEntity<?> toggleLikeMoment(
            @PathVariable Long momentId,
            Authentication authentication) {
        User user = userService.findByUsername(authentication.getName());
        boolean isLiked = momentService.toggleLike(momentId, user.getId());
        MomentDTO updated = momentService.getMomentById(momentId);
        return ResponseEntity.ok(Map.of(
            "momentId", momentId,
            "isLiked", isLiked,
            "likeCount", updated.getLikeCount(),
            "likedByUsers", updated.getLikedByUsers() != null ? updated.getLikedByUsers() : List.of(),
            "likedByUserIds", updated.getLikedByUserIds() != null ? updated.getLikedByUserIds() : List.of()
        ));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all moments for admin management")
    public ResponseEntity<Page<MomentDTO>> getAllMomentsForAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<MomentDTO> moments = momentService.getAllMomentsForAdmin(pageable);
        return ResponseEntity.ok(moments);
    }

    @PatchMapping("/admin/{momentId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin update moment status")
    public ResponseEntity<?> adminUpdateMomentStatus(
            @PathVariable Long momentId,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "ACTIVE");
        momentService.adminUpdateStatus(momentId, status);
        return ResponseEntity.ok(Map.of("success", true, "momentId", momentId, "status", status));
    }

    @DeleteMapping("/admin/{momentId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin delete moment")
    public ResponseEntity<?> adminDeleteMoment(@PathVariable Long momentId) {
        momentService.adminDeleteMoment(momentId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Moment deleted by admin"));
    }

    @GetMapping("/moment-images/{filename:.+}")
    @Operation(summary = "Get moment image by filename")
    public ResponseEntity<Resource> getMomentImage(@PathVariable String filename) {
        try {
            if (filename.contains("/")) {
                filename = filename.substring(filename.lastIndexOf("/") + 1);
            }
            Path filePath = Paths.get(uploadDir).resolve("moment-images").resolve(filename);
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                // Determine content type based on file extension
                String contentType = "image/jpeg"; // default
                if (filename.toLowerCase().endsWith(".png")) {
                    contentType = "image/png";
                } else if (filename.toLowerCase().endsWith(".gif")) {
                    contentType = "image/gif";
                } else if (filename.toLowerCase().endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (filename.toLowerCase().endsWith(".bmp")) {
                    contentType = "image/bmp";
                }
                
                return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 