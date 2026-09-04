package com.example.backend.service;

import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class AdminNotificationService {
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public AdminNotificationService(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        // Đã bỏ log debug
    }

    /**
     * Gửi thông báo cho tất cả admin khi có người dùng nạp tiền
     */
    public void notifyAdminsAboutTopup(User user, Long coinAmount) {
        List<User> admins = userRepository.findAdminsWithRole();
        for (User admin : admins) {
            notificationService.createNotification(
                admin.getId(),
                "Nạp tiền mới",
                String.format("Người dùng %s đã nạp %d coin vào tài khoản", 
                    user.getUsername(), coinAmount),
                "TOPUP",
                "/admin/payments/topup",
                null
            );
        }
    }

    /**
     * Gửi thông báo cho tất cả admin khi có người dùng rút tiền
     */
    public void notifyAdminsAboutWithdraw(User user, Long coinAmount, String bankAccountNumber, String bankAccountName, String bankName) {
        List<User> admins = userRepository.findAdminsWithRole();
        for (User admin : admins) {
            notificationService.createNotification(
                admin.getId(),
                "Yêu cầu rút tiền",
                String.format("Người dùng %s đã  rút %d coin vào tài khoản %s - %s (%s)",
                    user.getUsername(), coinAmount, bankAccountNumber, bankAccountName, bankName),
                "WITHDRAW",
                "/admin/payments/withdraw",
                null
            );
        }
    }

    /**
     * Gửi thông báo cho tất cả admin khi có người dùng tố cáo
     */
    public void notifyAdminsAboutReport(User reporter, User reportedUser, String reason) {
        List<User> admins = userRepository.findAdminsWithRole();
        for (User admin : admins) {
            notificationService.createNotification(
                admin.getId(),
                "Tố cáo mới",
                String.format("Người dùng %s đã tố cáo %s với lý do: %s", 
                    reporter.getUsername(), reportedUser.getUsername(), reason),
                "REPORT",
                "/admin/reports",
                null
            );
        }
    }

    /**
     * Gửi thông báo cho tất cả admin khi có giao dịch VNPay
     */
    public void notifyAdminsAboutVnPayTransaction(User user, Long amount, String status) {
        List<User> admins = userRepository.findAdminsWithRole();
        for (User admin : admins) {
            notificationService.createNotification(
                admin.getId(),
                "Giao dịch VNPay",
                String.format("Người dùng %s đã thực hiện giao dịch VNPay %d VND - Trạng thái: %s", 
                    user.getUsername(), amount, status),
                "VNPAY",
                "/admin/payments/vnpay",
                null
            );
        }
    }

    /**
     * Gửi thông báo cho tất cả admin khi có giao dịch donate
     */
    public void notifyAdminsAboutDonate(User donor, User recipient, Long coinAmount, String playerName) {
        List<User> admins = userRepository.findAdminsWithRole();
        for (User admin : admins) {
            notificationService.createNotification(
                admin.getId(),
                "Giao dịch donate",
                String.format("Người dùng %s đã donate %d coin cho %s", 
                    donor.getUsername(), coinAmount, playerName),
                "DONATE",
                "/admin/payments/donate",
                null
            );
        }
    }
} 