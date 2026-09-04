package com.example.backend.repository;

import com.example.backend.entity.GameStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GameStatusRepository extends JpaRepository<GameStatus, Long> {
    List<GameStatus> findByActiveTrue();
    GameStatus findByName(String name);
} 