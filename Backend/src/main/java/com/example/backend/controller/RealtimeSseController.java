package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.security.JwtTokenUtil;
import com.example.backend.service.UserService;
import com.example.backend.service.WebSocketRealtimeService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/realtime")
public class RealtimeSseController {

    private final WebSocketRealtimeService realtimeService;
    private final UserService userService;
    private final JwtTokenUtil jwtTokenUtil;
    private final UserDetailsService userDetailsService;

    public RealtimeSseController(WebSocketRealtimeService realtimeService,
                                 UserService userService,
                                 JwtTokenUtil jwtTokenUtil,
                                 UserDetailsService userDetailsService) {
        this.realtimeService = realtimeService;
        this.userService = userService;
        this.jwtTokenUtil = jwtTokenUtil;
        this.userDetailsService = userDetailsService;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(
            @RequestParam(required = false) String token,
            HttpServletRequest request,
            Authentication authentication) {

        String jwt = null;
        // 1. Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        } else if (authHeader != null && !authHeader.isBlank()) {
            jwt = authHeader.trim();
        }

        // 2. Custom header
        if (jwt == null || jwt.isBlank()) {
            jwt = request.getHeader("token");
        }

        // 3. Cookies
        if ((jwt == null || jwt.isBlank()) && request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("token".equalsIgnoreCase(cookie.getName()) ||
                    "jwt_token".equalsIgnoreCase(cookie.getName()) ||
                    "access_token".equalsIgnoreCase(cookie.getName())) {
                    jwt = cookie.getValue();
                    break;
                }
            }
        }

        // 4. Query parameter fallback (only if not found in headers or cookies)
        if ((jwt == null || jwt.isBlank()) && token != null && !token.isBlank()) {
            jwt = token;
        }

        String username = null;
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
            username = authentication.getName();
        } else if (jwt != null && !jwt.trim().isEmpty()) {
            try {
                String extracted = jwtTokenUtil.getUsernameFromToken(jwt);
                if (extracted != null) {
                    UserDetails details = userDetailsService.loadUserByUsername(extracted);
                    if (jwtTokenUtil.validateToken(jwt, details)) {
                        username = extracted;
                    }
                }
            } catch (Exception ignored) {}
        }

        if (username == null) {
            SseEmitter emitter = new SseEmitter(1000L);
            try {
                emitter.send(SseEmitter.event().name("error").data("Unauthorized SSE access"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        User user = userService.findByUsername(username);
        if (user == null) {
            SseEmitter emitter = new SseEmitter(1000L);
            emitter.complete();
            return emitter;
        }

        return realtimeService.registerSseEmitter(user.getId());
    }
}
