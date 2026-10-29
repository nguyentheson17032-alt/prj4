package com.example.backend.scheduler;

import com.example.backend.entity.GamePlayer;
import com.example.backend.entity.Order;
import com.example.backend.entity.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.service.NotificationService;
import com.example.backend.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderReminderSchedulerTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private OrderService orderService;

    private User renter;
    private User playerUser;
    private GamePlayer gamePlayer;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        renter = new User();
        renter.setId(101L);
        renter.setUsername("renter_01");

        playerUser = new User();
        playerUser.setId(202L);
        playerUser.setUsername("player_01");

        gamePlayer = new GamePlayer();
        gamePlayer.setId(10L);
        gamePlayer.setUser(playerUser);
        gamePlayer.setUsername("ProIdol");

        testOrder = new Order();
        testOrder.setId(500L);
        testOrder.setRenter(renter);
        testOrder.setPlayer(gamePlayer);
        testOrder.setStatus("CONFIRMED");
        testOrder.setStartTime(LocalDateTime.now().plusMinutes(10));
        testOrder.setEndTime(LocalDateTime.now().plusHours(1));
        testOrder.setUpcomingReminderSent(false);
        testOrder.setEndingReminderSent(false);
    }

    @Test
    @DisplayName("1. Thông báo nhắc giờ sắp bắt đầu chỉ được gửi 1 lần duy nhất và bật cờ upcomingReminderSent")
    void testUpcomingReminderSendsOnlyOnce() {
        // Lần chạy 1: findUpcomingOrdersToNotify trả về đơn cần nhắc
        when(orderRepository.findUpcomingOrdersToNotify(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(testOrder));
        when(orderRepository.findEndingOrdersToNotify(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // Act - Chạy scheduler lần 1
        orderService.notifyUpcomingOrders();

        // Assert: Đã gửi thông báo cho cả 2 bên
        verify(notificationService, times(1)).createNotification(
                eq(renter.getId()),
                contains("Sắp đến giờ"),
                anyString(),
                eq("order_upcoming"),
                isNull(),
                eq("500")
        );
        verify(notificationService, times(1)).createNotification(
                eq(playerUser.getId()),
                contains("Sắp đến giờ"),
                anyString(),
                eq("order_upcoming"),
                isNull(),
                eq("500")
        );

        // Assert: Cờ upcomingReminderSent đã được cập nhật thành true
        assertTrue(testOrder.getUpcomingReminderSent(), "upcomingReminderSent phải là true sau khi gửi");
        verify(orderRepository, times(1)).save(testOrder);

        // Lần chạy 2 (sau 5 phút): DB query lọc điều kiện upcomingReminderSent=false nên không trả về đơn này nữa
        when(orderRepository.findUpcomingOrdersToNotify(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // Act - Chạy scheduler lần 2
        orderService.notifyUpcomingOrders();

        // Assert: Số lần gọi createNotification vẫn chỉ là 1 cho renter và 1 cho player, KHÔNG bị nhân đôi
        verify(notificationService, times(1)).createNotification(eq(renter.getId()), anyString(), anyString(), anyString(), any(), any());
        verify(notificationService, times(1)).createNotification(eq(playerUser.getId()), anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("2. Thông báo nhắc đơn sắp kết thúc cũng chỉ gửi 1 lần duy nhất và bật cờ endingReminderSent")
    void testEndingReminderSendsOnlyOnce() {
        testOrder.setEndTime(LocalDateTime.now().plusMinutes(10));

        when(orderRepository.findUpcomingOrdersToNotify(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findEndingOrdersToNotify(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(testOrder));

        // Act
        orderService.notifyUpcomingOrders();

        // Assert
        verify(notificationService, times(1)).createNotification(
                eq(renter.getId()),
                contains("sắp kết thúc"),
                anyString(),
                eq("order_ending"),
                isNull(),
                eq("500")
        );
        assertTrue(testOrder.getEndingReminderSent(), "endingReminderSent phải là true sau khi gửi");
        verify(orderRepository, times(1)).save(testOrder);
    }
}

