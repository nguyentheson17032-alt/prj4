package com.example.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Interceptor giới hạn tần suất yêu cầu (Rate Limiting) theo IP cho các endpoint xác thực nhạy cảm:
 * - Login (chống brute force)
 * - Register (chống spam tạo tài khoản ảo)
 * - Forgot-password (chống spam gửi email)
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static class RequestCounter {
        final long windowStart;
        final AtomicInteger count;

        RequestCounter(long windowStart) {
            this.windowStart = windowStart;
            this.count = new AtomicInteger(1);
        }
    }

    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();
    private static final long WINDOW_MS = 60_000L; // Cửa sổ 1 phút
    private static final int MAX_REQUESTS_PER_MINUTE = 10; // Tối đa 10 requests / phút / IP

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Bỏ qua preflight OPTIONS request của CORS
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String clientIp = getClientIp(request);
        String uri = request.getRequestURI();
        long now = System.currentTimeMillis();

        String key = clientIp + ":" + uri;

        RequestCounter counter = requestCounts.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RequestCounter(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > MAX_REQUESTS_PER_MINUTE) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.setHeader("Retry-After", "60");
            response.getWriter().write("{\"error\":\"Too Many Requests\",\"message\":\"Quá nhiều yêu cầu từ địa chỉ IP của bạn. Vui lòng thử lại sau ít phút.\"}");
            return false;
        }

        // Tự động dọn dẹp các IP đã hết hạn để tránh phình bộ nhớ
        if (requestCounts.size() > 5000) {
            requestCounts.entrySet().removeIf(entry -> now - entry.getValue().windowStart > WINDOW_MS);
        }

        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        // Ưu tiên getRemoteAddr() từ TCP socket để ngăn chặn tấn công giả mạo header X-Forwarded-For
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "unknown";
    }
}

