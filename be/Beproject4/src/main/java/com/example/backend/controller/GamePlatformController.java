package com.example.backend.controller;

import com.example.backend.entity.GamePlatform;
import com.example.backend.repository.GamePlatformRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/game-platforms")
@CrossOrigin(origins = "http://localhost:3000")
public class GamePlatformController {

    @Autowired
    private GamePlatformRepository gamePlatformRepository;

    @GetMapping
    public ResponseEntity<List<GamePlatform>> getAllPlatforms() {
        List<GamePlatform> platforms = gamePlatformRepository.findByActiveTrue();
        return ResponseEntity.ok(platforms);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GamePlatform> createPlatform(@RequestBody GamePlatform platform) {
        if (gamePlatformRepository.findByName(platform.getName()) != null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gamePlatformRepository.save(platform));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GamePlatform> updatePlatform(@PathVariable Long id, @RequestBody GamePlatform platform) {
        return gamePlatformRepository.findById(id)
            .map(existingPlatform -> {
                existingPlatform.setName(platform.getName());
                existingPlatform.setDescription(platform.getDescription());
                existingPlatform.setActive(platform.getActive());
                return ResponseEntity.ok(gamePlatformRepository.save(existingPlatform));
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePlatform(@PathVariable Long id) {
        return gamePlatformRepository.findById(id)
            .map(platform -> {
                platform.setActive(false);
                gamePlatformRepository.save(platform);
                return ResponseEntity.ok().build();
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
} 