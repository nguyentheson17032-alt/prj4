package com.example.backend.financial;

import com.example.backend.config.WebSocketConfig;
import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtTokenUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

class WebSocketSecurityTest {

    private WebSocketConfig webSocketConfig;
    private JwtTokenUtil jwtTokenUtil;
    private UserDetailsService userDetailsService;
    private UserRepository userRepository;
    private ChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        webSocketConfig = new WebSocketConfig();
        jwtTokenUtil = Mockito.mock(JwtTokenUtil.class);
        userDetailsService = Mockito.mock(UserDetailsService.class);
        userRepository = Mockito.mock(UserRepository.class);

        ReflectionTestUtils.setField(webSocketConfig, "jwtTokenUtil", jwtTokenUtil);
        ReflectionTestUtils.setField(webSocketConfig, "userDetailsService", userDetailsService);
        ReflectionTestUtils.setField(webSocketConfig, "userRepository", userRepository);
        ReflectionTestUtils.setField(webSocketConfig, "allowedOrigins", "http://localhost:5173,http://localhost:3000");

        ChannelRegistration registration = new ChannelRegistration();
        webSocketConfig.configureClientInboundChannel(registration);
        
        // Extract the interceptor configured by WebSocketConfig
        @SuppressWarnings("unchecked")
        java.util.List<ChannelInterceptor> interceptors = 
                (java.util.List<ChannelInterceptor>) ReflectionTestUtils.getField(registration, "interceptors");
        assertNotNull(interceptors);
        assertFalse(interceptors.isEmpty());
        interceptor = interceptors.get(0);
    }

    @Test
    @DisplayName("1. WebSocket CONNECT: Từ chối kết nối khi không có token (AccessDeniedException)")
    void testConnectWithoutTokenRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, Mockito.mock(MessageChannel.class));
        }, "Kết nối không có token phải bị ném AccessDeniedException");
    }

    @Test
    @DisplayName("2. WebSocket CONNECT: Thành công khi token hợp lệ và lưu userId vào sessionAttributes")
    void testConnectWithValidTokenSuccess() {
        String token = "VALID_TEST_TOKEN";
        String username = "player42";
        User user = new User();
        user.setId(42L);
        user.setUsername(username);

        UserDetails userDetails = Mockito.mock(UserDetails.class);
        when(userDetails.getAuthorities()).thenReturn(java.util.Collections.emptyList());

        when(jwtTokenUtil.getUsernameFromToken(token)).thenReturn(username);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(userDetails);
        when(jwtTokenUtil.validateToken(token, userDetails)).thenReturn(true);
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        accessor.setSessionAttributes(new HashMap<>());
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        Message<?> result = interceptor.preSend(message, Mockito.mock(MessageChannel.class));

        assertNotNull(result);
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertNotNull(resultAccessor.getUser());
        assertEquals(42L, resultAccessor.getSessionAttributes().get("userId"));
    }

    @Test
    @DisplayName("3. WebSocket SUBSCRIBE: Từ chối khi client nghe trộm topic của user khác (/topic/counts/user/42)")
    void testSubscribeOtherUserTopicRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/counts/user/42");
        Map<String, Object> sessionAttrs = new HashMap<>();
        sessionAttrs.put("userId", 99L); // Client hiện tại là user 99
        accessor.setSessionAttributes(sessionAttrs);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, Mockito.mock(MessageChannel.class));
        }, "Đăng ký kênh người khác phải bị chặn AccessDeniedException");
    }

    @Test
    @DisplayName("4. WebSocket SUBSCRIBE: Cho phép khi client đăng ký topic chính chủ (/topic/notifications/user/42)")
    void testSubscribeOwnTopicAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications/user/42");
        Map<String, Object> sessionAttrs = new HashMap<>();
        sessionAttrs.put("userId", 42L); // Client chính chủ là user 42
        accessor.setSessionAttributes(sessionAttrs);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        Message<?> result = interceptor.preSend(message, Mockito.mock(MessageChannel.class));

        assertNotNull(result, "Đăng ký kênh chính chủ phải được thông qua");
    }

    @Test
    @DisplayName("5. WebSocket SUBSCRIBE: Cho phép khi client là người tham gia conversation (/topic/conversations/10_20)")
    void testSubscribeConversationParticipantAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/conversations/10_20");
        Map<String, Object> sessionAttrs = new HashMap<>();
        sessionAttrs.put("userId", 10L); // Client là user 10 (trong cặp 10_20)
        accessor.setSessionAttributes(sessionAttrs);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        Message<?> result = interceptor.preSend(message, Mockito.mock(MessageChannel.class));

        assertNotNull(result, "Người tham gia hội thoại phải được phép lắng nghe");
    }

    @Test
    @DisplayName("6. WebSocket SUBSCRIBE: Từ chối khi người ngoài nghe trộm conversation (/topic/conversations/10_20)")
    void testSubscribeConversationNonParticipantRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/conversations/10_20");
        Map<String, Object> sessionAttrs = new HashMap<>();
        sessionAttrs.put("userId", 99L); // Client là user 99 (không phải 10 hay 20)
        accessor.setSessionAttributes(sessionAttrs);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, Mockito.mock(MessageChannel.class));
        }, "Người ngoài không được phép nghe trộm hội thoại người khác");
    }

    @Test
    @DisplayName("7. WebSocket SEND: Chặn client gửi trực tiếp vào /topic/** (chỉ cho phép /app/**)")
    void testSendDirectToTopicRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination("/topic/notifications/user/43"); // Thử bơm thông báo giả

        Message<byte[]> message = MessageBuilder.createMessage("Fake Notification".getBytes(), accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, Mockito.mock(MessageChannel.class));
        }, "Client gửi trực tiếp ngoài /app/** phải bị chặn ngay lập tức");
    }

    @Test
    @DisplayName("8. WebSocket SEND: Cho phép client gửi đến đích /app/**")
    void testSendToAppDestinationAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination("/app/chat/send");

        Message<byte[]> message = MessageBuilder.createMessage("Hello".getBytes(), accessor.getMessageHeaders());
        Message<?> result = interceptor.preSend(message, Mockito.mock(MessageChannel.class));

        assertNotNull(result, "Client gửi đến /app/** phải được phép để controller xử lý");
    }
}

