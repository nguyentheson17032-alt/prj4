package com.example.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import com.example.backend.entity.User;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:Game Platform}")
    private String appName;

    /**
     * Gửi email thông báo khi player bị ban
     */
    public void sendBanNotification(User user, String reason, String bannedBy, LocalDateTime bannedAt) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("[" + appName + "] Tài khoản của bạn đã bị khóa");

            String content = buildBanEmailContent(user, reason, bannedBy, bannedAt);
            message.setText(content);

            mailSender.send(message);
            System.out.println("Đã gửi email thông báo ban cho user: " + user.getEmail());
        } catch (Exception e) {
            System.err.println("Lỗi gửi email thông báo ban: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Gửi email thông báo khi player được unban
     */
    public void sendUnbanNotification(User user, String unbannedBy, LocalDateTime unbannedAt) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("[" + appName + "] Tài khoản của bạn đã được mở khóa");

            String content = buildUnbanEmailContent(user, unbannedBy, unbannedAt);
            message.setText(content);

            mailSender.send(message);
            System.out.println("Đã gửi email thông báo unban cho user: " + user.getEmail());
        } catch (Exception e) {
            System.err.println("Lỗi gửi email thông báo unban: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Gửi email thông báo khi player bị ban tạm thời
     */
    public void sendTemporaryBanNotification(User user, String reason, String bannedBy, LocalDateTime bannedAt, LocalDateTime banExpiresAt) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("[" + appName + "] Tài khoản của bạn đã bị khóa tạm thời");

            String content = buildTemporaryBanEmailContent(user, reason, bannedBy, bannedAt, banExpiresAt);
            message.setText(content);

            mailSender.send(message);
            System.out.println("Đã gửi email thông báo ban tạm thời cho user: " + user.getEmail());
        } catch (Exception e) {
            System.err.println("Lỗi gửi email thông báo ban tạm thời: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Xây dựng nội dung email ban
     */
    private String buildBanEmailContent(User user, String reason, String bannedBy, LocalDateTime bannedAt) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        String bannedAtStr = bannedAt.format(formatter);

        return String.format(
            "Xin chào %s,\n\n" +
            "Chúng tôi rất tiếc phải thông báo rằng tài khoản của bạn đã bị khóa vĩnh viễn.\n\n" +
            "Thông tin chi tiết:\n" +
            "- Tên đăng nhập: %s\n" +
            "- Email: %s\n" +
            "- Lý do: %s\n" +
            "- Người thực hiện: %s\n" +
            "- Thời gian: %s\n\n" +
            "Lý do khóa tài khoản:\n" +
            "%s\n\n" +
            "Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ với chúng tôi qua:\n" +
            "- Email: support@gameplatform.com\n" +
            "- Hotline: 1900-xxxx\n\n" +
            "Trân trọng,\n" +
            "Đội ngũ %s",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            user.getEmail(),
            reason,
            bannedBy,
            bannedAtStr,
            reason,
            appName
        );
    }

    /**
     * Xây dựng nội dung email unban
     */
    private String buildUnbanEmailContent(User user, String unbannedBy, LocalDateTime unbannedAt) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        String unbannedAtStr = unbannedAt.format(formatter);

        return String.format(
            "Xin chào %s,\n\n" +
            "Chúng tôi vui mừng thông báo rằng tài khoản của bạn đã được mở khóa.\n\n" +
            "Thông tin chi tiết:\n" +
            "- Tên đăng nhập: %s\n" +
            "- Email: %s\n" +
            "- Người thực hiện: %s\n" +
            "- Thời gian: %s\n\n" +
            "Bạn có thể đăng nhập lại vào tài khoản của mình ngay bây giờ.\n\n" +
            "Lưu ý: Vui lòng tuân thủ các quy tắc của nền tảng để tránh bị khóa tài khoản trong tương lai.\n\n" +
            "Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua:\n" +
            "- Email: support@gameplatform.com\n" +
            "- Hotline: 1900-xxxx\n\n" +
            "Trân trọng,\n" +
            "Đội ngũ %s",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            user.getEmail(),
            unbannedBy,
            unbannedAtStr,
            appName
        );
    }

    /**
     * Xây dựng nội dung email ban tạm thời
     */
    private String buildTemporaryBanEmailContent(User user, String reason, String bannedBy, LocalDateTime bannedAt, LocalDateTime banExpiresAt) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        String bannedAtStr = bannedAt.format(formatter);
        String banExpiresAtStr = banExpiresAt.format(formatter);

        return String.format(
            "Xin chào %s,\n\n" +
            "Chúng tôi thông báo rằng tài khoản của bạn đã bị khóa tạm thời.\n\n" +
            "Thông tin chi tiết:\n" +
            "- Tên đăng nhập: %s\n" +
            "- Email: %s\n" +
            "- Lý do: %s\n" +
            "- Người thực hiện: %s\n" +
            "- Thời gian bắt đầu: %s\n" +
            "- Thời gian kết thúc: %s\n\n" +
            "Lý do khóa tài khoản:\n" +
            "%s\n\n" +
            "Tài khoản của bạn sẽ được mở khóa tự động vào lúc %s.\n\n" +
            "Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ với chúng tôi qua:\n" +
            "- Email: support@gameplatform.com\n" +
            "- Hotline: 1900-xxxx\n\n" +
            "Trân trọng,\n" +
            "Đội ngũ %s",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            user.getEmail(),
            reason,
            bannedBy,
            bannedAtStr,
            banExpiresAtStr,
            reason,
            banExpiresAtStr,
            appName
        );
    }

    /**
     * Gửi email thông báo chung
     */
    public void sendGeneralNotification(User user, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("[" + appName + "] " + subject);
            message.setText(content);

            mailSender.send(message);
            System.out.println("Đã gửi email thông báo chung cho user: " + user.getEmail());
        } catch (Exception e) {
            System.err.println("Lỗi gửi email thông báo chung: " + e.getMessage());
            e.printStackTrace();
        }
    }
} 