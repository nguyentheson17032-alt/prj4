package com.example.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PushNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(PushNotificationService.class);

    private static final String SERVICE_ACCOUNT_FILE = "notifigation-d7a54-firebase-adminsdk-fbsvc-e812eeeadd.json";
    private static final String PROJECT_ID = "notifigation-d7a54";
    private static final String FCM_URL = "https://fcm.googleapis.com/v1/projects/" + PROJECT_ID + "/messages:send";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate;
    private GoogleCredentials googleCredentials;

    public PushNotificationService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Lấy hoặc làm mới GoogleCredentials từ service account trong bộ nhớ
     */
    private synchronized GoogleCredentials getGoogleCredentials() throws Exception {
        if (this.googleCredentials == null) {
            ClassPathResource resource = new ClassPathResource(SERVICE_ACCOUNT_FILE);
            if (!resource.exists()) {
                throw new FileNotFoundException("Firebase service account file not found in resources: " + SERVICE_ACCOUNT_FILE);
            }
            try (InputStream is = resource.getInputStream()) {
                this.googleCredentials = GoogleCredentials
                        .fromStream(is)
                        .createScoped(Collections.singleton("https://www.googleapis.com/auth/firebase.messaging"));
                logger.info("[PushNotificationService] Firebase credentials initialized successfully for project: {}", PROJECT_ID);
            }
        }
        this.googleCredentials.refreshIfExpired();
        return this.googleCredentials;
    }

    /**
     * Gửi push notification bất đồng bộ, không làm nghẽn luồng xử lý chính
     */
    @Async
    public void sendPushNotificationAsync(String deviceToken, String title, String body, String imageUrl, Map<String, String> data) {
        if (deviceToken == null || deviceToken.trim().isEmpty()) {
            return;
        }

        try {
            GoogleCredentials credentials = getGoogleCredentials();
            String accessToken = credentials.getAccessToken().getTokenValue();

            // Build payload JSON chuẩn bằng Map & ObjectMapper để tránh lỗi cú pháp ký tự đặc biệt
            Map<String, Object> notificationPayload = new HashMap<>();
            notificationPayload.put("title", title != null ? title : "");
            notificationPayload.put("body", body != null ? body : "");
            if (imageUrl != null && !imageUrl.trim().isEmpty()) {
                notificationPayload.put("image", imageUrl);
            }

            Map<String, Object> messagePayload = new HashMap<>();
            messagePayload.put("token", deviceToken.trim());
            messagePayload.put("notification", notificationPayload);

            // Bổ sung khối data metadata cho client điều hướng
            Map<String, String> dataPayload = new HashMap<>();
            if (data != null) {
                dataPayload.putAll(data);
            }
            if (!dataPayload.containsKey("timestamp")) {
                dataPayload.put("timestamp", LocalDateTime.now().toString());
            }
            messagePayload.put("data", dataPayload);

            Map<String, Object> rootPayload = Collections.singletonMap("message", messagePayload);
            String jsonBody = objectMapper.writeValueAsString(rootPayload);

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(FCM_URL, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                logger.debug("[PushNotificationService] FCM push sent successfully to token prefix: {}...", 
                        deviceToken.substring(0, Math.min(10, deviceToken.length())));
            } else {
                logger.warn("[PushNotificationService] FCM responded with non-2xx status: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            logger.warn("[PushNotificationService] Failed to send FCM push to token prefix: {}... Error: {}",
                    deviceToken.substring(0, Math.min(10, deviceToken.length())), e.getMessage());
        }
    }
}
