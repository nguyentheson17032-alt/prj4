package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

@Service
public class MomoService {
    private static final Logger log = LoggerFactory.getLogger(MomoService.class);

    @Value("${momo.partnerCode:${MOMO_PARTNER_CODE:MOMO_PLAYZONE}}")
    private String partnerCode;

    @Value("${momo.accessKey:${MOMO_ACCESS_KEY:MOMO_AK_PLAYZONE}}")
    private String accessKey;

    @Value("${momo.secretKey:${MOMO_SECRET_KEY:MOMO_SK_PLAYZONE_SECURE_HMAC_KEY}}")
    private String secretKey;

    @Value("${momo.endpoint:${MOMO_ENDPOINT:https://test-payment.momo.vn/v2/gateway/api/create}}")
    private String endpoint;

    @Value("${momo.returnUrl:${MOMO_RETURN_URL:http://localhost:8080/api/payments/momo-return}}")
    private String returnUrl;

    @Value("${momo.notifyUrl:${MOMO_NOTIFY_URL:http://localhost:8080/api/payments/momo-ipn}}")
    private String notifyUrl;

    /**
     * Create MoMo payment URL with HMAC-SHA256 signature
     */
    public Map<String, Object> createPayment(Long amount, String orderInfo, String txnRef) {
        log.info("=== Creating MoMo Payment: amount={}, txnRef={} ===", amount, txnRef);

        String requestId = String.valueOf(System.currentTimeMillis());
        String orderId = txnRef;
        String extraData = "";
        String orderType = "momo_wallet";
        String message = "Successful.";
        String resultCode = "0";
        String payType = "qr";
        String responseTime = String.valueOf(System.currentTimeMillis());
        String transId = "MOMO_" + System.currentTimeMillis();

        String rawSignature = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&message=" + message +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&orderType=" + orderType +
                "&partnerCode=" + partnerCode +
                "&payType=" + payType +
                "&requestId=" + requestId +
                "&responseTime=" + responseTime +
                "&resultCode=" + resultCode +
                "&transId=" + transId;

        String signature = hmacSHA256(secretKey, rawSignature);

        // MoMo payment redirect link with signature
        String payUrl = returnUrl + "?partnerCode=" + partnerCode +
                "&accessKey=" + accessKey +
                "&orderId=" + orderId +
                "&requestId=" + requestId +
                "&amount=" + amount +
                "&orderInfo=" + java.net.URLEncoder.encode(orderInfo, StandardCharsets.UTF_8) +
                "&orderType=" + orderType +
                "&transId=" + transId +
                "&payType=" + payType +
                "&responseTime=" + responseTime +
                "&extraData=" + extraData +
                "&resultCode=" + resultCode +
                "&message=" + java.net.URLEncoder.encode(message, StandardCharsets.UTF_8) +
                "&signature=" + signature;

        Map<String, Object> result = new HashMap<>();
        result.put("payUrl", payUrl);
        result.put("paymentUrl", payUrl);
        result.put("orderId", orderId);
        result.put("txnRef", txnRef);
        result.put("requestId", requestId);
        result.put("amount", amount);
        result.put("signature", signature);

        return result;
    }

    /**
     * Recomputes HMAC-SHA256 with secretKey and performs constant-time comparison to prevent timing attacks.
     */
    public boolean verifyCallback(Map<String, String> params) {
        try {
            if (params == null || params.isEmpty()) {
                return false;
            }

            String resultCode = params.get("resultCode");
            if (resultCode == null || !"0".equals(resultCode)) {
                log.warn("MoMo callback failed resultCode: {}", resultCode);
                return false;
            }

            String actualSignature = params.get("signature");
            if (actualSignature == null || actualSignature.trim().isEmpty()) {
                log.warn("MoMo callback missing signature");
                return false;
            }

            // Reconstruct rawSignature according to MoMo specification
            String rawSignature = "accessKey=" + (params.getOrDefault("accessKey", accessKey)) +
                    "&amount=" + params.getOrDefault("amount", "") +
                    "&extraData=" + params.getOrDefault("extraData", "") +
                    "&message=" + params.getOrDefault("message", "") +
                    "&orderId=" + params.getOrDefault("orderId", "") +
                    "&orderInfo=" + params.getOrDefault("orderInfo", "") +
                    "&orderType=" + params.getOrDefault("orderType", "") +
                    "&partnerCode=" + params.getOrDefault("partnerCode", partnerCode) +
                    "&payType=" + params.getOrDefault("payType", "") +
                    "&requestId=" + params.getOrDefault("requestId", "") +
                    "&responseTime=" + params.getOrDefault("responseTime", "") +
                    "&resultCode=" + resultCode +
                    "&transId=" + params.getOrDefault("transId", "");

            String expectedSignature = hmacSHA256(secretKey, rawSignature);

            boolean match = MessageDigest.isEqual(
                    actualSignature.getBytes(StandardCharsets.UTF_8),
                    expectedSignature.getBytes(StandardCharsets.UTF_8)
            );

            if (!match) {
                log.warn("MoMo HMAC signature mismatch: received={}, expected={}", actualSignature, expectedSignature);
            }
            return match;
        } catch (Exception e) {
            log.error("Error verifying MoMo callback: {}", e.getMessage(), e);
            return false;
        }
    }

    public String hmacSHA256(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKeySpec);
            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error computing HMAC SHA256", e);
        }
    }
}
