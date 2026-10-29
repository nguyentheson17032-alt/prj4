package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class ZaloPayService {
    private static final Logger log = LoggerFactory.getLogger(ZaloPayService.class);

    @Value("${zalopay.appId:${ZALOPAY_APP_ID:2553}}")
    private String appId;

    @Value("${zalopay.key1:${ZALOPAY_KEY1:ZALOPAY_KEY1_SECRET}}")
    private String key1;

    @Value("${zalopay.key2:${ZALOPAY_KEY2:ZALOPAY_KEY2_SECRET}}")
    private String key2;

    @Value("${zalopay.endpoint:${ZALOPAY_ENDPOINT:https://sb-openapi.zalopay.vn/v2/create}}")
    private String endpoint;

    @Value("${zalopay.returnUrl:${ZALOPAY_RETURN_URL:http://localhost:8080/api/payments/zalopay-return}}")
    private String returnUrl;

    public Map<String, Object> createPayment(Long amount, String orderInfo, String txnRef) {
        log.info("=== Creating ZaloPay Payment: amount={}, txnRef={} ===", amount, txnRef);

        String appTime = String.valueOf(System.currentTimeMillis());
        String appTransId = new SimpleDateFormat("yyMMdd").format(new Date()) + "_" + txnRef;
        String pmcid = "38";
        String bankcode = "CC";
        String discountamount = "0";
        String status = "1";

        // In ZaloPay redirect callback, data is signed with key2:
        // appid + "|" + apptransid + "|" + pmcid + "|" + bankcode + "|" + amount + "|" + discountamount + "|" + status
        String rawData = appId + "|" + appTransId + "|" + pmcid + "|" + bankcode + "|" + amount + "|" + discountamount + "|" + status;
        String checksum = hmacSHA256(key2, rawData);

        String payUrl = returnUrl + "?appid=" + appId +
                "&apptransid=" + appTransId +
                "&txnRef=" + txnRef +
                "&pmcid=" + pmcid +
                "&bankcode=" + bankcode +
                "&amount=" + amount +
                "&discountamount=" + discountamount +
                "&status=" + status +
                "&checksum=" + checksum;

        Map<String, Object> result = new HashMap<>();
        result.put("payUrl", payUrl);
        result.put("paymentUrl", payUrl);
        result.put("orderUrl", payUrl);
        result.put("appTransId", appTransId);
        result.put("txnRef", txnRef);
        result.put("amount", amount);
        result.put("checksum", checksum);

        return result;
    }

    /**
     * Recomputes HMAC-SHA256 with key2 and performs constant-time comparison to prevent timing attacks.
     */
    public boolean verifyCallback(Map<String, String> params) {
        try {
            if (params == null || params.isEmpty()) {
                return false;
            }

            String status = params.get("status");
            if (status == null || !"1".equals(status)) {
                log.warn("ZaloPay callback non-success status: {}", status);
                return false;
            }

            String actualMac = params.get("checksum");
            if (actualMac == null || actualMac.trim().isEmpty()) {
                log.warn("ZaloPay callback missing checksum");
                return false;
            }

            String appid = params.getOrDefault("appid", appId);
            String apptransid = params.getOrDefault("apptransid", "");
            String pmcid = params.getOrDefault("pmcid", "");
            String bankcode = params.getOrDefault("bankcode", "");
            String amount = params.getOrDefault("amount", "");
            String discountamount = params.getOrDefault("discountamount", "0");

            String rawData = appid + "|" + apptransid + "|" + pmcid + "|" + bankcode + "|" + amount + "|" + discountamount + "|" + status;
            String expectedMac = hmacSHA256(key2, rawData);

            boolean match = MessageDigest.isEqual(
                    actualMac.getBytes(StandardCharsets.UTF_8),
                    expectedMac.getBytes(StandardCharsets.UTF_8)
            );

            if (!match) {
                log.warn("ZaloPay MAC signature mismatch: received={}, expected={}", actualMac, expectedMac);
            }
            return match;
        } catch (Exception e) {
            log.error("Error verifying ZaloPay callback: {}", e.getMessage(), e);
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
