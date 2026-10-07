package com.example.backend.service;

import com.example.backend.entity.User;
import com.example.backend.entity.UserBan;
import com.example.backend.repository.UserBanRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserBanService {

    @Autowired
    private UserBanRepository userBanRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Ban user vĩnh viễn
     */
    @Transactional
    public UserBan banUserPermanently(Long userId, Long bannedByUserId, String reason, String description) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        User bannedBy = userRepository.findById(bannedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with id: " + bannedByUserId));

        // Kiểm tra xem user đã bị ban chưa
        Optional<UserBan> existingBan = userBanRepository.findActiveBanByUserId(userId);
        if (existingBan.isPresent()) {
            throw new RuntimeException("User is already banned");
        }

        // Tạo ban record
        UserBan userBan = new UserBan();
        userBan.setUser(user);
        userBan.setBannedBy(bannedBy);
        userBan.setReason(reason);
        userBan.setDescription(description);
        userBan.setBanType("PERMANENT");
        userBan.setStatus("ACTIVE");

        // Lưu ban record
        UserBan savedBan = userBanRepository.save(userBan);

        // Disable user account
        user.setEnabled(false);
        user.setAccountNonLocked(false);
        userRepository.save(user);

        // Gửi email thông báo
        try {
            emailService.sendBanNotification(user, reason, bannedBy.getUsername(), savedBan.getBannedAt());
            savedBan.setEmailSent(true);
            userBanRepository.save(savedBan);
        } catch (Exception e) {
            System.err.println("Lỗi gửi email thông báo ban: " + e.getMessage());
        }

        return savedBan;
    }

    /**
     * Ban user tạm thời
     */
    @Transactional
    public UserBan banUserTemporarily(Long userId, Long bannedByUserId, String reason, String description, LocalDateTime banExpiresAt) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        User bannedBy = userRepository.findById(bannedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with id: " + bannedByUserId));

        // Kiểm tra xem user đã bị ban chưa
        Optional<UserBan> existingBan = userBanRepository.findActiveBanByUserId(userId);
        if (existingBan.isPresent()) {
            throw new RuntimeException("User is already banned");
        }

        // Tạo ban record
        UserBan userBan = new UserBan();
        userBan.setUser(user);
        userBan.setBannedBy(bannedBy);
        userBan.setReason(reason);
        userBan.setDescription(description);
        userBan.setBanType("TEMPORARY");
        userBan.setBanExpiresAt(banExpiresAt);
        userBan.setStatus("ACTIVE");

        // Lưu ban record
        UserBan savedBan = userBanRepository.save(userBan);

        // Disable user account
        user.setEnabled(false);
        user.setAccountNonLocked(false);
        userRepository.save(user);

        // Gửi email thông báo
        try {
            emailService.sendTemporaryBanNotification(user, reason, bannedBy.getUsername(), savedBan.getBannedAt(), banExpiresAt);
            savedBan.setEmailSent(true);
            userBanRepository.save(savedBan);
        } catch (Exception e) {
            System.err.println("Lỗi gửi email thông báo ban tạm thời: " + e.getMessage());
        }

        return savedBan;
    }

    /**
     * Unban user
     */
    @Transactional
    public UserBan unbanUser(Long userId, Long unbannedByUserId, String unbanReason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        User unbannedBy = userRepository.findById(unbannedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with id: " + unbannedByUserId));

        // Tìm ban record hiện tại
        UserBan activeBan = userBanRepository.findActiveBanByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No active ban found for user: " + userId));

        // Cập nhật ban record
        activeBan.setStatus("UNBANNED");
        activeBan.setUnbannedAt(LocalDateTime.now());
        activeBan.setUnbannedBy(unbannedBy);
        activeBan.setUnbanReason(unbanReason);

        // Lưu ban record
        UserBan savedBan = userBanRepository.save(activeBan);

        // Enable user account
        user.setEnabled(true);
        user.setAccountNonLocked(true);
        userRepository.save(user);

        // Gửi email thông báo
        try {
            emailService.sendUnbanNotification(user, unbannedBy.getUsername(), savedBan.getUnbannedAt());
            savedBan.setUnbanEmailSent(true);
            userBanRepository.save(savedBan);
        } catch (Exception e) {
            System.err.println("Lỗi gửi email thông báo unban: " + e.getMessage());
        }

        return savedBan;
    }

    /**
     * Kiểm tra user có bị ban không
     */
    public boolean isUserBanned(Long userId) {
        return userBanRepository.isUserBanned(userId);
    }

    /**
     * Lấy thông tin ban hiện tại của user
     */
    public Optional<UserBan> getActiveBan(Long userId) {
        return userBanRepository.findActiveBanByUserId(userId);
    }

    /**
     * Lấy tất cả ban records của user
     */
    public List<UserBan> getAllBansByUserId(Long userId) {
        return userBanRepository.findAllBansByUserId(userId);
    }

    /**
     * Lấy tất cả ban records đang active
     */
    public List<UserBan> getAllActiveBans() {
        return userBanRepository.findAllActiveBans();
    }

    /**
     * Lấy ban records theo status
     */
    public List<UserBan> getBansByStatus(String status) {
        return userBanRepository.findBansByStatus(status);
    }

    /**
     * Lấy ban records theo ban type
     */
    public List<UserBan> getBansByType(String banType) {
        return userBanRepository.findBansByType(banType);
    }

    /**
     * Xử lý ban records đã hết hạn (temporary ban)
     */
    @Transactional
    public void processExpiredBans() {
        List<UserBan> expiredBans = userBanRepository.findExpiredTemporaryBans(LocalDateTime.now());
        
        for (UserBan ban : expiredBans) {
            // Cập nhật status thành EXPIRED
            ban.setStatus("EXPIRED");
            userBanRepository.save(ban);

            // Enable user account
            User user = ban.getUser();
            user.setEnabled(true);
            user.setAccountNonLocked(true);
            userRepository.save(user);

            // Gửi email thông báo unban tự động
            try {
                emailService.sendUnbanNotification(user, "System", LocalDateTime.now());
            } catch (Exception e) {
                System.err.println("Lỗi gửi email thông báo unban tự động: " + e.getMessage());
            }
        }
    }

    /**
     * Gửi lại email thông báo ban cho các records chưa gửi
     */
    public void resendBanEmails() {
        List<UserBan> bansWithoutEmail = userBanRepository.findBansWithoutEmailSent();
        
        for (UserBan ban : bansWithoutEmail) {
            try {
                if ("PERMANENT".equals(ban.getBanType())) {
                    emailService.sendBanNotification(ban.getUser(), ban.getReason(), ban.getBannedBy().getUsername(), ban.getBannedAt());
                } else if ("TEMPORARY".equals(ban.getBanType())) {
                    emailService.sendTemporaryBanNotification(ban.getUser(), ban.getReason(), ban.getBannedBy().getUsername(), ban.getBannedAt(), ban.getBanExpiresAt());
                }
                ban.setEmailSent(true);
                userBanRepository.save(ban);
            } catch (Exception e) {
                System.err.println("Lỗi gửi lại email ban: " + e.getMessage());
            }
        }
    }

    /**
     * Gửi lại email thông báo unban cho các records chưa gửi
     */
    public void resendUnbanEmails() {
        List<UserBan> unbansWithoutEmail = userBanRepository.findUnbansWithoutEmailSent();
        
        for (UserBan ban : unbansWithoutEmail) {
            try {
                emailService.sendUnbanNotification(ban.getUser(), ban.getUnbannedBy().getUsername(), ban.getUnbannedAt());
                ban.setUnbanEmailSent(true);
                userBanRepository.save(ban);
            } catch (Exception e) {
                System.err.println("Lỗi gửi lại email unban: " + e.getMessage());
            }
        }
    }

    /**
     * Lấy thống kê ban
     */
    public BanStatistics getBanStatistics() {
        long totalActiveBans = userBanRepository.countActiveBans();
        long totalPermanentBans = userBanRepository.findBansByType("PERMANENT").size();
        long totalTemporaryBans = userBanRepository.findBansByType("TEMPORARY").size();
        long totalUnbanned = userBanRepository.findBansByStatus("UNBANNED").size();

        return new BanStatistics(totalActiveBans, totalPermanentBans, totalTemporaryBans, totalUnbanned);
    }

    /**
     * Inner class cho thống kê ban
     */
    public static class BanStatistics {
        private final long totalActiveBans;
        private final long totalPermanentBans;
        private final long totalTemporaryBans;
        private final long totalUnbanned;

        public BanStatistics(long totalActiveBans, long totalPermanentBans, long totalTemporaryBans, long totalUnbanned) {
            this.totalActiveBans = totalActiveBans;
            this.totalPermanentBans = totalPermanentBans;
            this.totalTemporaryBans = totalTemporaryBans;
            this.totalUnbanned = totalUnbanned;
        }

        // Getters
        public long getTotalActiveBans() { return totalActiveBans; }
        public long getTotalPermanentBans() { return totalPermanentBans; }
        public long getTotalTemporaryBans() { return totalTemporaryBans; }
        public long getTotalUnbanned() { return totalUnbanned; }
    }
} 