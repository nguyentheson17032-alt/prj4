package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "invalidated_tokens")
public class InvalidatedToken {

    @Id
    @Column(length = 1000)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    protected InvalidatedToken() {}

    public InvalidatedToken(String token, LocalDateTime expiresAt) {
        this.token = token;
        this.expiresAt = expiresAt;
    }

    public String getToken() { return token; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
}
