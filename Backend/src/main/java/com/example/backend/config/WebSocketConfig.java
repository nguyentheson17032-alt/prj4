package com.example.backend.config;

import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtTokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    @Value("${spring.web.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000}")
    private String allowedOrigins;

    @Autowired
    @Lazy
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    @Lazy
    private UserDetailsService userDetailsService;

    @Autowired
    @Lazy
    private UserRepository userRepository;

    public WebSocketConfig() {
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable destination prefixes: /topic for broadcasts, /queue for private messages, /user for user-specific destinations
        config.enableSimpleBroker("/topic", "/queue", "/user");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        // Endpoint for pure WebSocket connections restricted to allowed origins
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins);

        // Endpoint with SockJS fallback restricted to allowed origins
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    return message;
                }
                boolean createdNewAccessor = false;
                if (!accessor.isMutable()) {
                    accessor = StompHeaderAccessor.wrap(message);
                    createdNewAccessor = true;
                }

                // 1. CONNECT Security: Reject any connection without a valid JWT token
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    String token = null;

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        token = authHeader.substring(7);
                    } else if (authHeader != null && !authHeader.trim().isEmpty()) {
                        token = authHeader.trim();
                    } else {
                        List<String> tokenHeaders = accessor.getNativeHeader("token");
                        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
                            token = tokenHeaders.get(0);
                        }
                    }

                    if (token == null || token.trim().isEmpty()) {
                        log.warn("WebSocket CONNECT rejected: Missing authentication token");
                        throw new AccessDeniedException("Missing authentication token for WebSocket connection");
                    }

                    try {
                        String username = jwtTokenUtil.getUsernameFromToken(token);
                        if (username == null) {
                            log.warn("WebSocket CONNECT rejected: Username could not be extracted from token");
                            throw new AccessDeniedException("Invalid WebSocket authentication token");
                        }

                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        if (!jwtTokenUtil.validateToken(token, userDetails)) {
                            log.warn("WebSocket CONNECT rejected: Token validation failed for user {}", username);
                            throw new AccessDeniedException("Expired or invalid WebSocket authentication token");
                        }

                        User user = userRepository.findByUsername(username).orElse(null);
                        if (user == null) {
                            log.warn("WebSocket CONNECT rejected: User {} not found in database", username);
                            throw new AccessDeniedException("User not found for WebSocket connection");
                        }

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        accessor.setUser(authentication);

                        Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
                        if (sessionAttrs != null) {
                            sessionAttrs.put("userId", user.getId());
                            sessionAttrs.put("username", user.getUsername());
                        }
                        log.info("WebSocket STOMP connected user: {} (id: {})", username, user.getId());
                    } catch (AccessDeniedException ade) {
                        throw ade;
                    } catch (Exception e) {
                        log.warn("WebSocket CONNECT rejected: Authentication failed: {}", e.getMessage());
                        throw new AccessDeniedException("WebSocket authentication failed: " + e.getMessage());
                    }
                }

                // 2. SUBSCRIBE Security: Verify that user can only subscribe to their own channels
                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
                    Long userId = sessionAttrs != null ? (Long) sessionAttrs.get("userId") : null;

                    if (userId == null && accessor.getUser() != null) {
                        String username = accessor.getUser().getName();
                        if (username != null && userRepository != null) {
                            User u = userRepository.findByUsername(username).orElse(null);
                            if (u != null) {
                                userId = u.getId();
                                if (sessionAttrs != null) {
                                    sessionAttrs.put("userId", userId);
                                }
                            }
                        }
                    }

                    if (userId == null) {
                        log.warn("WebSocket SUBSCRIBE rejected: Unauthenticated client attempted to subscribe");
                        throw new AccessDeniedException("Authentication required to subscribe to topics");
                    }

                    String destination = accessor.getDestination();
                    if (destination == null || destination.trim().isEmpty()) {
                        throw new AccessDeniedException("Destination cannot be empty");
                    }

                    // /topic/messages/user/{id}, /topic/notifications/user/{id}, /topic/counts/user/{id}
                    if (destination.startsWith("/topic/messages/user/") ||
                        destination.startsWith("/topic/notifications/user/") ||
                        destination.startsWith("/topic/counts/user/")) {

                        String targetIdStr = destination.substring(destination.lastIndexOf('/') + 1);
                        if (!targetIdStr.equals(userId.toString())) {
                            log.warn("WebSocket SUBSCRIBE rejected: User {} attempted to access private topic {}", userId, destination);
                            throw new AccessDeniedException("Access denied to private user destination: " + destination);
                        }
                    } else if (destination.startsWith("/topic/conversations/")) {
                        String pairStr = destination.substring("/topic/conversations/".length());
                        String[] parts = pairStr.split("_");
                        if (parts.length != 2) {
                            throw new AccessDeniedException("Invalid conversation destination format");
                        }
                        String userA = parts[0];
                        String userB = parts[1];
                        String currentIdStr = userId.toString();
                        if (!currentIdStr.equals(userA) && !currentIdStr.equals(userB)) {
                            log.warn("WebSocket SUBSCRIBE rejected: User {} attempted to eavesdrop conversation {}", userId, destination);
                            throw new AccessDeniedException("Access denied: You are not a participant of conversation " + pairStr);
                        }
                    } else if (destination.startsWith("/user/")) {
                        // Standard Spring user queue routing
                    } else {
                        log.warn("WebSocket SUBSCRIBE rejected: User {} attempted to subscribe to unauthorized destination {}", userId, destination);
                        throw new AccessDeniedException("Access denied to unauthorized destination: " + destination);
                    }
                }

                // 3. SEND Security: Block client SEND to any destination outside /app/**
                if (StompCommand.SEND.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    if (destination == null || !destination.startsWith("/app/")) {
                        log.warn("WebSocket SEND rejected: Client attempted to send message directly to destination outside /app/**: {}", destination);
                        throw new AccessDeniedException("Client can only send to /app/** destinations");
                    }
                }

                if (createdNewAccessor) {
                    return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
                }
                return message;
            }
        });
    }
}
