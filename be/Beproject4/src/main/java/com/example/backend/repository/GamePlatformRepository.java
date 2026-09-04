package com.example.backend.repository;

import com.example.backend.entity.GamePlatform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GamePlatformRepository extends JpaRepository<GamePlatform, Long> {
    List<GamePlatform> findByActiveTrue();
    GamePlatform findByName(String name);
} 