package com.example.backend.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.Arrays;
import java.util.List;

/**
 * Quản lý chiến lược migrate database với Flyway.
 * 
 * An toàn cho Production (Opt-in strictly):
 * - Mặc định KHÔNG BAO GIỜ tự động repair checksums nếu không được chỉ định rõ ràng.
 * - Chỉ cho phép chạy repair() khi:
 *     1. Active profile là 'dev' hoặc 'local', HOẶC
 *     2. Thuộc tính spring.flyway.repair-on-migrate=true (qua biến FLYWAY_REPAIR_ON_MIGRATE=true trong .env)
 * - Nếu deploy production hoặc không đặt profile, repair() sẽ bị tắt, bảo toàn tính bất biến của migration.
 */
@Configuration
public class FlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    @Value("${spring.flyway.repair-on-migrate:false}")
    private boolean repairOnMigrate;

    @Autowired
    private Environment environment;

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            boolean shouldRepair = isRepairAllowed();
            if (shouldRepair) {
                log.info("Flyway repair is enabled (profile 'dev'/'local' or spring.flyway.repair-on-migrate=true). Executing repair to align schema history checksums...");
                flyway.repair();
            } else {
                log.info("Flyway repair is disabled. Strict checksum validation is enforced.");
            }

            log.info("Executing Flyway migrate...");
            flyway.migrate();
            log.info("Flyway migration completed successfully.");
        };
    }

    private boolean isRepairAllowed() {
        if (repairOnMigrate) {
            return true;
        }

        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        // Chỉ opt-in tự động khi profile được thiết lập rõ là dev hoặc local
        return activeProfiles.contains("dev") || activeProfiles.contains("local");
    }
}
