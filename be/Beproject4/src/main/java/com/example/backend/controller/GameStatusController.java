package com.example.backend.controller;

import com.example.backend.entity.GameStatus;
import com.example.backend.repository.GameStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/game-statuses")
@CrossOrigin(origins = "http://localhost:3000")
public class GameStatusController {

    @Autowired
    private GameStatusRepository gameStatusRepository;

    @GetMapping
    public ResponseEntity<List<GameStatus>> getAllStatuses() {
        List<GameStatus> statuses = gameStatusRepository.findByActiveTrue();
        return ResponseEntity.ok(statuses);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameStatus> createStatus(@RequestBody GameStatus status) {
        if (gameStatusRepository.findByName(status.getName()) != null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gameStatusRepository.save(status));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameStatus> updateStatus(@PathVariable Long id, @RequestBody GameStatus status) {
        return gameStatusRepository.findById(id)
            .map(existingStatus -> {
                existingStatus.setName(status.getName());
                existingStatus.setDescription(status.getDescription());
                existingStatus.setActive(status.getActive());
                return ResponseEntity.ok(gameStatusRepository.save(existingStatus));
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStatus(@PathVariable Long id) {
        return gameStatusRepository.findById(id)
            .map(status -> {
                status.setActive(false);
                gameStatusRepository.save(status);
                return ResponseEntity.ok().build();
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
} 