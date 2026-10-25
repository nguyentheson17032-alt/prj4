package com.example.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDeniedException(AccessDeniedException e, HttpServletRequest request) {
        log.warn("Access denied for URI: {}, method: {}, message: {}", 
            request.getRequestURI(), request.getMethod(), e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
            "error", "Forbidden",
            "message", "Bạn không có quyền truy cập hoặc thực hiện thao tác này",
            "path", request.getRequestURI(),
            "timestamp", LocalDateTime.now()
        ));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<?> handleBadCredentialsException(BadCredentialsException e) {
        return ResponseEntity.badRequest().body("Invalid username or password");
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getAllErrors().stream()
                .map(org.springframework.context.support.DefaultMessageSourceResolvable::getDefaultMessage)
                .findFirst()
                .orElse("Dữ liệu không hợp lệ");
        return ResponseEntity.badRequest().body(Map.of(
            "error", "Bad Request",
            "message", errorMessage
        ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleAllExceptions(Exception ex, HttpServletRequest request) {
        log.error("=== LỖI TOÀN CỤC ===");
        log.error("Request URI: {}", request.getRequestURI());
        log.error("Request method: {}", request.getMethod());
        log.error("Exception type: {}", ex.getClass().getSimpleName());
        log.error("Exception message: {}", ex.getMessage());
        log.error("Stack trace:", ex);
        
        return ResponseEntity.status(500).body(Map.of(
            "error", "Internal Server Error",
            "message", "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau",
            "timestamp", LocalDateTime.now()
        ));
    }
}
