package com.example.backend.service;

import com.example.backend.entity.InvalidatedToken;
import com.example.backend.repository.InvalidatedTokenRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class TokenBlacklistService {

    private final InvalidatedTokenRepository repository;

    public TokenBlacklistService(InvalidatedTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void invalidate(String token, LocalDateTime expiresAt) {
        if (!repository.existsById(token)) {
            repository.save(new InvalidatedToken(token, expiresAt));
        }
    }

    public boolean isInvalidated(String token) {
        return repository.existsById(token);
    }

    @Scheduled(cron = "0 */30 * * * *") // Chạy định kỳ mỗi 30 phút xóa token hết hạn
    @Transactional
    public void cleanupExpiredTokens() {
        repository.deleteExpiredTokens(LocalDateTime.now());
    }
}
