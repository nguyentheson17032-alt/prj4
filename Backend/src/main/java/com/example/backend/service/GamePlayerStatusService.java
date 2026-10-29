package com.example.backend.service;

import org.springframework.stereotype.Service;

/**
 * @deprecated Logic cập nhật đơn thuê hết hạn đã được hợp nhất vào PaymentService.completeExpiredHires
 * theo yêu cầu chuẩn hóa một scheduler duy nhất trong hệ thống để tránh xung đột dữ liệu.
 */
@Service
public class GamePlayerStatusService {
    private final PaymentService paymentService;

    public GamePlayerStatusService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Đã gỡ bỏ @Scheduled để tránh chạy trùng lặp với PaymentService
    public void updateExpiredHires() {
        paymentService.completeExpiredHires();
    }
}

