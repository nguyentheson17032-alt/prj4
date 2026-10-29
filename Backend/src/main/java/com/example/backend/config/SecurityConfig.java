package com.example.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.example.backend.security.JwtAuthenticationFilter;
import com.example.backend.security.JwtTokenUtil;
import org.springframework.security.core.userdetails.UserDetailsService;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/game-players/available").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/game-players").permitAll()
                .requestMatchers("/api/games").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/players/*/followers/count").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/count").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/growth-percent").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/{userId}").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/{userId}/online-status").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/{userId}/cover-image").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/{userId}/cover-image-bytes").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/game-players/*").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/game-players/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/order-reviews/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews/**").permitAll()
                .requestMatchers("/api/payments/vnpay-return").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/payments/leaderboard").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/uploads/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/avatars/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/player-images/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/cover-images/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/moments/moment-images/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/moments/all").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/moments/player/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/moments/user/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/files/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self'; img-src 'self' data: https://api.dicebear.com https://images.unsplash.com"))
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(Customizer.withDefaults())
                .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
} 