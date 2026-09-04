package com.example.backend.config;

import com.example.backend.entity.User;
import com.example.backend.entity.GameCategory;
import com.example.backend.entity.GamePlatform;
import com.example.backend.entity.GameStatus;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.GameCategoryRepository;
import com.example.backend.repository.GamePlatformRepository;
import com.example.backend.repository.GameStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private GameCategoryRepository gameCategoryRepository;
    
    @Autowired
    private GamePlatformRepository gamePlatformRepository;
    
    @Autowired
    private GameStatusRepository gameStatusRepository;

    @Override
    public void run(String... args) {
        // Kiểm tra user admin đã tồn tại chưa
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(new BCryptPasswordEncoder().encode("Hoangpro1234@"));
            admin.setEmail("admin@example.com");
            admin.setFullName("Admin");
            admin.setPhoneNumber("0123456789");
            admin.setAddress("");
            admin.setWalletBalance(java.math.BigDecimal.ZERO);
            Set<String> roles = new HashSet<>();
            roles.add("ROLE_ADMIN");
            roles.add("ROLE_PLAYER");
            admin.setRoles(roles);
            userRepository.save(admin);
            System.out.println("Tạo tài khoản admin thành công!");
        }
        
        // Khởi tạo dữ liệu game categories, platforms và statuses
        initializeGameCategories();
        initializeGamePlatforms();
        initializeGameStatuses();
    }
    
    private void initializeGameCategories() {
        String[] categories = {
            "Action", "Adventure", "RPG", "Strategy", "Sports", "Horror"
        };
        
        for (String categoryName : categories) {
            if (gameCategoryRepository.findByName(categoryName) == null) {
                GameCategory category = new GameCategory();
                category.setName(categoryName);
                category.setDescription("Game category: " + categoryName);
                category.setActive(true);
                gameCategoryRepository.save(category);
                System.out.println("Tạo category: " + categoryName);
            }
        }
    }
    
    private void initializeGamePlatforms() {
        String[] platforms = {
            "PC", "MOBILE", "CONSOLE"
        };
        
        for (String platformName : platforms) {
            if (gamePlatformRepository.findByName(platformName) == null) {
                GamePlatform platform = new GamePlatform();
                platform.setName(platformName);
                platform.setDescription("Game platform: " + platformName);
                platform.setActive(true);
                gamePlatformRepository.save(platform);
                System.out.println("Tạo platform: " + platformName);
            }
        }
    }
    
    private void initializeGameStatuses() {
        String[] statuses = {
            "ACTIVE", "INACTIVE", "MAINTENANCE"
        };
        
        for (String statusName : statuses) {
            if (gameStatusRepository.findByName(statusName) == null) {
                GameStatus status = new GameStatus();
                status.setName(statusName);
                status.setDescription("Game status: " + statusName);
                status.setActive(true);
                gameStatusRepository.save(status);
                System.out.println("Tạo status: " + statusName);
            }
        }
    }
} 