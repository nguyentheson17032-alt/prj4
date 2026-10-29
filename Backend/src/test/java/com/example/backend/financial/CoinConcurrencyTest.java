package com.example.backend.financial;

import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class CoinConcurrencyTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Test
    @DisplayName("Chống Race Condition: 10 luồng đồng thời trừ coin, chỉ 1 luồng thành công khi số dư chỉ đủ 1 lần")
    void testConcurrentDeductCoin_PreventsDoubleSpending() throws InterruptedException {
        // Tạo user mẫu với số dư 100 xu
        User testUser = new User();
        testUser.setUsername("concurrency_user_" + System.currentTimeMillis());
        testUser.setEmail("concurrency_" + System.currentTimeMillis() + "@test.com");
        testUser.setPassword("password123");
        testUser.setCoin(100L);
        testUser = userRepository.saveAndFlush(testUser);
        Long userId = testUser.getId();

        int numberOfThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // Đảm bảo tất cả 10 luồng bắt đầu tại cùng 1 thời điểm
                    boolean deducted = userService.deductCoin(userId, 100L);
                    if (deducted) {
                        successCount.incrementAndGet();
                    } else {
                        failCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    System.err.println("Thread error: " + e.getMessage());
                    e.printStackTrace();
                    failCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Bắn pháo lệnh cho cả 10 luồng chạy đồng thời
        doneLatch.await();
        executor.shutdown();

        assertEquals(1, successCount.get(), "Chỉ duy nhất 1 giao dịch được phép thành công khi số dư là 100 xu");
        assertEquals(9, failCount.get(), "9 giao dịch đồng thời còn lại phải bị từ chối");

        entityManager.clear();
        User updatedUser = userRepository.findById(userId).orElseThrow();
        assertEquals(0L, updatedUser.getCoin(), "Số dư cuối cùng phải là 0 xu (không được âm hay sai lệch)");
    }

    @Test
    @DisplayName("Cộng coin an toàn đồng thời: 20 luồng nạp 50 xu, số dư tích lũy chính xác 1000 xu không bị mất cập nhật")
    void testConcurrentAddCoin_AccurateAccumulation() throws InterruptedException {
        User testUser = new User();
        testUser.setUsername("accumulator_user_" + System.currentTimeMillis());
        testUser.setEmail("accumulator_" + System.currentTimeMillis() + "@test.com");
        testUser.setPassword("password123");
        testUser.setCoin(0L);
        testUser = userRepository.saveAndFlush(testUser);
        Long userId = testUser.getId();

        int numberOfThreads = 20;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    userService.addCoin(userId, 50L);
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        entityManager.clear();
        User updatedUser = userRepository.findById(userId).orElseThrow();
        assertEquals(1000L, updatedUser.getCoin(), "Số dư sau 20 lần nạp 50 xu đồng thời phải chính xác là 1000 xu");
    }
}

