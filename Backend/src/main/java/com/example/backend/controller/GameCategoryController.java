package com.example.backend.controller;

import com.example.backend.entity.GameCategory;
import com.example.backend.repository.GameCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/game-categories")
@CrossOrigin(origins = "http://localhost:3000")
public class GameCategoryController {

    @Autowired
    private GameCategoryRepository gameCategoryRepository;

    @GetMapping
    public ResponseEntity<List<GameCategory>> getAllCategories() {
        List<GameCategory> categories = gameCategoryRepository.findByActiveTrue();
        return ResponseEntity.ok(categories);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameCategory> createCategory(@RequestBody GameCategory category) {
        if (gameCategoryRepository.findByName(category.getName()) != null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gameCategoryRepository.save(category));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameCategory> updateCategory(@PathVariable Long id, @RequestBody GameCategory category) {
        return gameCategoryRepository.findById(id)
            .map(existingCategory -> {
                existingCategory.setName(category.getName());
                existingCategory.setDescription(category.getDescription());
                existingCategory.setActive(category.getActive());
                return ResponseEntity.ok(gameCategoryRepository.save(existingCategory));
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        return gameCategoryRepository.findById(id)
            .map(category -> {
                category.setActive(false);
                gameCategoryRepository.save(category);
                return ResponseEntity.ok().build();
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
} 