package com.example.backend.service;

import com.example.backend.entity.PasswordResetToken;
import com.example.backend.entity.User;
import com.example.backend.repository.PasswordResetTokenRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordResetService {
    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public PasswordResetService(PasswordResetTokenRepository tokenRepository,
                                UserRepository userRepository,
                                JavaMailSender mailSender,
                                PasswordEncoder passwordEncoder) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void createAndSendResetToken(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Không tiết lộ thông tin email có tồn tại hay không
            return;
        }

        // Xóa token cũ của người dùng này nếu có
        try {
            tokenRepository.deleteByUser(user);
        } catch (Exception ignored) {}

        // Tạo token ngẫu nhiên bảo mật
        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(token);
        // Thời hạn 15 phút theo chuẩn OWASP
        resetToken.setExpiryDate(LocalDateTime.now().plusMinutes(15));
        tokenRepository.save(resetToken);

        // Tạo link đặt lại mật khẩu
        String resetUrl = frontendUrl + "/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Yêu cầu đặt lại mật khẩu cho tài khoản PlayZone");
        message.setText("Xin chào " + (user.getFullName() != null ? user.getFullName() : user.getUsername()) + ",\n\n"
                + "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n"
                + "Vui lòng truy cập liên kết dưới đây để thiết lập mật khẩu mới (liên kết có hiệu lực trong 15 phút):\n\n"
                + resetUrl + "\n\n"
                + "Mã xác thực của bạn (nếu dùng trên ứng dụng di động): " + token + "\n\n"
                + "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn được giữ nguyên an toàn.");

        mailSender.send(message);
    }

    @Transactional
    public boolean resetPassword(String token, String newPassword) {
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);
        if (tokenOpt.isEmpty()) {
            return false;
        }

        PasswordResetToken resetToken = tokenOpt.get();
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(resetToken);
            return false;
        }

        User user = resetToken.getUser();
        if (user == null) {
            return false;
        }

        // Mã hóa mật khẩu mới bằng BCrypt trước khi lưu
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Xóa token đã sử dụng để chống replay attack
        tokenRepository.delete(resetToken);
        return true;
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 */30 * * * *") // Chạy định kỳ mỗi 30 phút xóa token reset hết hạn
    @Transactional
    public void cleanupExpiredResetTokens() {
        tokenRepository.deleteByExpiryDateBefore(LocalDateTime.now());
    }
}
