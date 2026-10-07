package com.example.backend.repository;

import com.example.backend.entity.GameCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GameCategoryRepository extends JpaRepository<GameCategory, Long> {
    List<GameCategory> findByActiveTrue();
    GameCategory findByName(String name);
} 