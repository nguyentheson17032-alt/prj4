package com.example.backend.config;

import com.example.backend.entity.Game;
import com.example.backend.entity.User;
import com.example.backend.entity.GameCategory;
import com.example.backend.entity.GamePlatform;
import com.example.backend.entity.GameStatus;
import com.example.backend.repository.GameRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.GameCategoryRepository;
import com.example.backend.repository.GamePlatformRepository;
import com.example.backend.repository.GameStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private GameRepository gameRepository;

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
            admin.setCoin(99999999L);
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
            normalUser.setCoin(500000L);
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
        initializeGames();
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

    private void addGame(String name, String description, String category, String platform,
                         String imageUrl, String websiteUrl,
                         boolean hasRoles, List<String> roles, List<String> ranks) {
        java.util.Optional<Game> existing = gameRepository.findByName(name);
        if (existing.isPresent()) {
            Game g = existing.get();
            boolean needsUpdate = (g.getAvailableRanks() == null || g.getAvailableRanks().isEmpty())
                    && !ranks.isEmpty();
            if (needsUpdate) {
                g.setCategory(category);
                g.setPlatform(platform);
                g.setImageUrl(imageUrl);
                g.setWebsiteUrl(websiteUrl);
                g.setHasRoles(hasRoles);
                g.setAvailableRoles(roles);
                g.setAvailableRanks(ranks);
                gameRepository.save(g);
                System.out.println("Cập nhật rank/role cho game: " + name);
            }
            return;
        }
        Game g = new Game();
        g.setName(name);
        g.setDescription(description);
        g.setCategory(category);
        g.setPlatform(platform);
        g.setStatus("ACTIVE");
        g.setImageUrl(imageUrl);
        g.setWebsiteUrl(websiteUrl);
        g.setHasRoles(hasRoles);
        g.setAvailableRoles(roles);
        g.setAvailableRanks(ranks);
        gameRepository.save(g);
        System.out.println("Tạo game: " + name);
    }

    private void initializeGames() {
        // ── MOBA ──────────────────────────────────────────────────────────────
        addGame("League of Legends",
                "Game MOBA 5v5 huyền thoại của Riot Games",
                "MOBA", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/10110/header.jpg",
                "https://www.leagueoflegends.com",
                true,
                Arrays.asList("Top", "Rừng", "Mid", "Xạ Thủ", "Hỗ Trợ"),
                Arrays.asList("Sắt", "Đồng", "Bạc", "Vàng", "Bạch Kim", "Ngọc Lục Bảo", "Kim Cương", "Thạc Sĩ", "Đại Thạc Sĩ", "Thách Đấu"));

        addGame("VALORANT",
                "Game FPS chiến thuật 5v5 của Riot Games",
                "FPS", "PC",
                "https://cdn1.epicgames.com/offer/a13a8d53b0104b309f01fd2abf4996e4/EGS_VALORANT_RiotGames_S1_2560x1440-5b56b3def7f2a30a62ce3d9c95b2b7c0.jpg",
                "https://playvalorant.com",
                true,
                Arrays.asList("Duelist", "Controller", "Initiator", "Sentinel"),
                Arrays.asList("Sắt", "Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Thăng Hoa", "Bất Tử", "Radiant"));

        addGame("Liên Quân Mobile",
                "Game MOBA 5v5 mobile phổ biến nhất Việt Nam",
                "MOBA", "MOBILE",
                "https://lienquan.garena.vn/img/share-image.jpg",
                "https://lienquan.garena.vn",
                true,
                Arrays.asList("Đỡ Đòn", "Đi Rừng", "Mid", "Xạ Thủ", "Hỗ Trợ", "Đi Trên"),
                Arrays.asList("Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Tinh Anh", "Cao Thủ", "Huyền Thoại", "Thách Đấu"));

        addGame("Mobile Legends: Bang Bang",
                "Game MOBA 5v5 mobile toàn cầu của Moonton",
                "MOBA", "MOBILE",
                "https://akamai.bymobile.vn/cdn-cgi/image/width=800/https://cdn.bymobile.vn/uploads/mlbb-cover.jpg",
                "https://www.mobilelegends.com",
                true,
                Arrays.asList("Gold Laner", "EXP Laner", "Mid Laner", "Jungler", "Roamer"),
                Arrays.asList("Warrior", "Elite", "Master", "Grandmaster", "Epic", "Legend", "Mythic", "Mythical Glory"));

        addGame("Dota 2",
                "Game MOBA 5v5 cạnh tranh cao của Valve",
                "MOBA", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
                "https://www.dota2.com",
                true,
                Arrays.asList("Carry", "Midlaner", "Offlane", "Soft Support", "Hard Support"),
                Arrays.asList("Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"));

        addGame("Wild Rift",
                "Phiên bản mobile của League of Legends",
                "MOBA", "MOBILE",
                "https://wildrift.leagueoflegends.com/static/open-graph-b41b3cb9b9e0ebb8e0c3de0a87bb2f44.jpg",
                "https://wildrift.leagueoflegends.com",
                true,
                Arrays.asList("Baron Laner", "Jungler", "Mid Laner", "Dragon Laner", "Support"),
                Arrays.asList("Sắt", "Đồng", "Bạc", "Vàng", "Bạch Kim", "Ngọc Lục Bảo", "Kim Cương", "Thạc Sĩ", "Đại Thạc Sĩ", "Thách Đấu"));

        // ── FPS ───────────────────────────────────────────────────────────────
        addGame("Counter-Strike 2",
                "Game bắn súng chiến thuật kinh điển của Valve",
                "FPS", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
                "https://www.counter-strike.net",
                false,
                Arrays.asList(),
                Arrays.asList("Silver I", "Silver II", "Silver III", "Silver IV", "Silver Elite", "Silver Elite Master",
                        "Gold Nova I", "Gold Nova II", "Gold Nova III", "Gold Nova Master",
                        "Master Guardian I", "Master Guardian II", "Master Guardian Elite",
                        "Distinguished Master Guardian", "Legendary Eagle", "Legendary Eagle Master",
                        "Supreme Master First Class", "Global Elite"));

        addGame("Overwatch 2",
                "Game bắn súng hero của Blizzard Entertainment",
                "FPS", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg",
                "https://overwatch.blizzard.com",
                true,
                Arrays.asList("Tank", "Damage", "Support"),
                Arrays.asList("Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Thạc Sĩ", "Đại Thạc Sĩ", "Top 500"));

        addGame("Call of Duty: Mobile",
                "Game bắn súng mobile nổi tiếng thế giới",
                "FPS", "MOBILE",
                "https://www.callofduty.com/content/dam/atvi/callofduty/cod-touchui/cod-franchise/games/codm/overview/CODM_HeaderBanner_16x9.jpg",
                "https://www.callofduty.com/mobile",
                false,
                Arrays.asList(),
                Arrays.asList("Rookie", "Veteran", "Elite", "Pro", "Master", "Legendary", "Grandmaster", "Undisputed"));

        // ── BATTLE ROYALE ──────────────────────────────────────────────────────
        addGame("PUBG Mobile",
                "Game battle royale mobile 100 người chơi",
                "BATTLE_ROYALE", "MOBILE",
                "https://cdn2.unrealengine.com/pubgm-2560x1440-2a8fdfce93e15b8a0f8db3a2cd9da7d5.jpg",
                "https://www.pubgmobile.com",
                false,
                Arrays.asList(),
                Arrays.asList("Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Vương Miện", "Ace", "Ace Master", "Conqueror"));

        addGame("Free Fire",
                "Game battle royale mobile của Garena",
                "BATTLE_ROYALE", "MOBILE",
                "https://ff.garena.vn/wp-content/themes/freefire-vn/images/freefire-og.jpg",
                "https://ff.garena.vn",
                false,
                Arrays.asList(),
                Arrays.asList("Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Anh Hùng", "Grandmaster"));

        addGame("Apex Legends",
                "Game battle royale hero shooter của EA",
                "BATTLE_ROYALE", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg",
                "https://www.ea.com/games/apex-legends",
                false,
                Arrays.asList(),
                Arrays.asList("Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Thạc Sĩ", "Predator"));

        // ── RPG ───────────────────────────────────────────────────────────────
        addGame("Genshin Impact",
                "Game nhập vai thế giới mở của HoYoverse",
                "RPG", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/1971870/header.jpg",
                "https://genshin.hoyoverse.com",
                true,
                Arrays.asList("DPS", "Sub-DPS", "Hỗ Trợ", "Healer"),
                Arrays.asList("AR 1-20 (Mới Bắt Đầu)", "AR 21-35 (Trung Cấp)", "AR 36-45 (Cao Cấp)", "AR 46-55 (Chuyên Gia)", "AR 56-60 (World Level Max)", "Spiral Abyss 36★"));

        addGame("Honkai: Star Rail",
                "Game nhập vai thẻ bài chiến thuật của HoYoverse",
                "RPG", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/1534380/header.jpg",
                "https://hsr.hoyoverse.com",
                true,
                Arrays.asList("DPS", "Phá Giáp", "Hỗ Trợ", "Bảo Vệ"),
                Arrays.asList("Equilibrium 0", "Equilibrium 1", "Equilibrium 2", "Equilibrium 3", "Equilibrium 4", "Equilibrium 5", "Equilibrium 6", "Memory of Chaos 10★", "Apocalyptic Shadow"));

        // ── STRATEGY ──────────────────────────────────────────────────────────
        addGame("Teamfight Tactics",
                "Game auto-battler chiến thuật của Riot Games",
                "STRATEGY", "PC",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/1097150/header.jpg",
                "https://teamfighttactics.leagueoflegends.com",
                false,
                Arrays.asList(),
                Arrays.asList("Sắt", "Đồng", "Bạc", "Vàng", "Bạch Kim", "Ngọc Lục Bảo", "Kim Cương", "Thạc Sĩ", "Đại Thạc Sĩ", "Thách Đấu"));

        addGame("Clash Royale",
                "Game thẻ bài chiến thuật real-time của Supercell",
                "STRATEGY", "MOBILE",
                "https://cdn.supercell.com/clashroyale/2024/cr-meta-social-image.jpg",
                "https://clashroyale.com",
                false,
                Arrays.asList(),
                Arrays.asList("Arena 1", "Arena 2", "Arena 3", "Arena 4", "Arena 5", "Arena 6", "Arena 7",
                        "Arena 8", "Arena 9", "Arena 10", "Arena 11", "Arena 12", "Arena 13", "Arena 14", "Arena 15",
                        "Legendary Arena", "Ultimate Champion", "Legend League"));

        addGame("Clash of Clans",
                "Game chiến lược xây dựng làng của Supercell",
                "STRATEGY", "MOBILE",
                "https://cdn.supercell.com/clashofclans/2024/coc-meta-image.jpg",
                "https://clashofclans.com",
                false,
                Arrays.asList(),
                Arrays.asList("Bronze I-III", "Silver I-III", "Gold I-III", "Crystal I-III", "Master I-III", "Champion I-III", "Titan I-III", "Legend League"));

        // ── SPORT ─────────────────────────────────────────────────────────────
        addGame("FIFA Online 4",
                "Game bóng đá online phổ biến nhất tại Việt Nam",
                "SPORT", "PC",
                "https://www.ea.com/content/dam/eacom/FIFA/FO4/2024/fo4-cover-art.jpg",
                "https://fifaonline4.nexon.com",
                true,
                Arrays.asList("Thủ Môn", "Hậu Vệ Trung Tâm", "Hậu Vệ Cánh", "Tiền Vệ Phòng Thủ", "Tiền Vệ Trung Tâm", "Tiền Vệ Tấn Công", "Tiền Đạo Cánh", "Tiền Đạo"),
                Arrays.asList("Division 10", "Division 9", "Division 8", "Division 7", "Division 6",
                        "Division 5", "Division 4", "Division 3", "Division 2", "Division 1", "Elite Division"));

        // ── OTHER ─────────────────────────────────────────────────────────────
        addGame("Brawl Stars",
                "Game battle arena mobile của Supercell",
                "OTHER", "MOBILE",
                "https://cdn.brawlstars.com/brawl-stars-page-social.jpg",
                "https://brawlstars.com",
                false,
                Arrays.asList(),
                Arrays.asList("Bronze", "Silver", "Gold", "Diamond", "Mythic", "Legendary", "Masters", "Pro League"));

        addGame("Minecraft",
                "Game sandbox xây dựng và sinh tồn nổi tiếng thế giới",
                "OTHER", "PC",
                "https://www.minecraft.net/content/dam/games/minecraft/key-art/mc-website-header.jpg",
                "https://www.minecraft.net",
                true,
                Arrays.asList("Builder", "Redstone Engineer", "PVP Fighter", "Farmer", "Explorer"),
                Arrays.asList());
    }
}