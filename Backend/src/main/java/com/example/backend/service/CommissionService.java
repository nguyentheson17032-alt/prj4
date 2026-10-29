package com.example.backend.service;

import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.User;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@Getter
public class CommissionService {

    @Value("${app.platform.default-commission-rate:0.15}")
    private double defaultCommissionRate = 0.15;

    @Value("${app.platform.vip-commission.standard:0.15}")
    private double vipCommissionStandard = 0.15;

    @Value("${app.platform.vip-commission.silver:0.12}")
    private double vipCommissionSilver = 0.12;

    @Value("${app.platform.vip-commission.gold:0.10}")
    private double vipCommissionGold = 0.10;

    @Value("${app.platform.vip-commission.diamond:0.08}")
    private double vipCommissionDiamond = 0.08;

    /**
     * Xác định tỷ lệ chiết khấu (hoa hồng sàn) cho người chơi cụ thể.
     * Thứ tự ưu tiên:
     * 1. Cấu hình trực tiếp trên GamePlayer (commissionRate)
     * 2. Cấu hình tùy chỉnh trên User (customCommissionRate)
     * 3. Hạng VIP của User (STANDARD, SILVER, GOLD, DIAMOND)
     * 4. Tỷ lệ mặc định của hệ thống
     */
    public double getCommissionRateForPlayer(GamePlayer gamePlayer) {
        if (gamePlayer == null) {
            return defaultCommissionRate;
        }

        if (gamePlayer.getCommissionRate() != null && gamePlayer.getCommissionRate() >= 0) {
            return gamePlayer.getCommissionRate();
        }

        if (gamePlayer.getUser() != null) {
            return getCommissionRateForUser(gamePlayer.getUser());
        }

        return defaultCommissionRate;
    }

    /**
     * Xác định tỷ lệ chiết khấu theo User
     */
    public double getCommissionRateForUser(User user) {
        if (user == null) {
            return defaultCommissionRate;
        }

        if (user.getCustomCommissionRate() != null && user.getCustomCommissionRate() >= 0) {
            return user.getCustomCommissionRate();
        }

        String vipTier = user.getVipTier();
        if (vipTier != null) {
            switch (vipTier.trim().toUpperCase()) {
                case "DIAMOND":
                    return vipCommissionDiamond;
                case "GOLD":
                    return vipCommissionGold;
                case "SILVER":
                    return vipCommissionSilver;
                case "STANDARD":
                default:
                    return vipCommissionStandard;
            }
        }

        return defaultCommissionRate;
    }

    /**
     * Tính phí nền tảng
     */
    public long calculatePlatformFee(long totalAmount, double rate) {
        if (totalAmount <= 0 || rate <= 0) {
            return 0L;
        }
        return Math.round(totalAmount * rate);
    }

    /**
     * Tính số tiền người chơi nhận được
     */
    public long calculatePlayerReceived(long totalAmount, double rate) {
        if (totalAmount <= 0) {
            return 0L;
        }
        long fee = calculatePlatformFee(totalAmount, rate);
        return Math.max(0L, totalAmount - fee);
    }
}
