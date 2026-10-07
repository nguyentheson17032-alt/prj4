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
        // Khởi tạo hoặc cập nhật tài khoản admin
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            admin = new User();
            admin.setUsername("admin");
            admin.setPassword(new BCryptPasswordEncoder().encode("Admin@123456"));
            admin.setEmail("admin@playzone.vn");
            admin.setFullName("Quản Trị Viên");
            admin.setPhoneNumber("0987654321");
            admin.setAddress("Hà Nội, Việt Nam");
            admin.setWalletBalance(new java.math.BigDecimal("99999999"));
            Set<String> roles = new HashSet<>();
            roles.add("ROLE_ADMIN");
            roles.add("ROLE_PLAYER");
            admin.setRoles(roles);
            userRepository.save(admin);
            System.out.println("Tạo tài khoản admin thành công (Username: admin / Pass: Admin@123456)!");
        } else {
            // Cập nhật lại mật khẩu mới cho admin nếu đã tồn tại
            admin.setPassword(new BCryptPasswordEncoder().encode("Admin@123456"));
            if (admin.getRoles() == null) {
                admin.setRoles(new HashSet<>());
            }
            admin.getRoles().add("ROLE_ADMIN");
            userRepository.save(admin);
            System.out.println("Cập nhật mật khẩu tài khoản admin thành công (Pass: Admin@123456)!");
        }

        // Khởi tạo hoặc cập nhật tài khoản user thường
        User normalUser = userRepository.findByUsername("user123").orElse(null);
        if (normalUser == null) {
            normalUser = new User();
            normalUser.setUsername("user123");
            normalUser.setPassword(new BCryptPasswordEncoder().encode("User@123456"));
            normalUser.setEmail("user123@playzone.vn");
            normalUser.setFullName("Nguyễn Thành Nam");
            normalUser.setPhoneNumber("0912345678");
            normalUser.setAddress("Hồ Chí Minh, Việt Nam");
            normalUser.setWalletBalance(new java.math.BigDecimal("500000"));
            Set<String> roles = new HashSet<>();
            roles.add("ROLE_USER");
            normalUser.setRoles(roles);
            userRepository.save(normalUser);
            System.out.println("Tạo tài khoản user mẫu thành công (Username: user123 / Pass: User@123456)!");
        } else {
            normalUser.setPassword(new BCryptPasswordEncoder().encode("User@123456"));
            userRepository.save(normalUser);
            System.out.println("Cập nhật tài khoản user mẫu thành công (Pass: User@123456)!");
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