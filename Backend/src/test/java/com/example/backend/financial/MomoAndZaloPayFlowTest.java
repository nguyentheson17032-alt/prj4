package com.example.backend.financial;

import com.example.backend.service.MomoService;
import com.example.backend.service.ZaloPayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MomoAndZaloPayFlowTest {

    private MomoService momoService;
    private ZaloPayService zaloPayService;

    private static final String MOMO_PARTNER_CODE = "MOMO_TEST";
    private static final String MOMO_ACCESS_KEY = "MOMO_AK_TEST";
    private static final String MOMO_SECRET_KEY = "MOMO_SECRET_KEY_1234567890";
    private static final String MOMO_RETURN_URL = "http://localhost:8080/api/payments/momo-return";

    private static final String ZP_APP_ID = "2553";
    private static final String ZP_KEY1 = "KEY1_TEST_123456";
    private static final String ZP_KEY2 = "KEY2_TEST_654321";
    private static final String ZP_RETURN_URL = "http://localhost:8080/api/payments/zalopay-return";

    @BeforeEach
    void setUp() {
        momoService = new MomoService();
        ReflectionTestUtils.setField(momoService, "partnerCode", MOMO_PARTNER_CODE);
        ReflectionTestUtils.setField(momoService, "accessKey", MOMO_ACCESS_KEY);
        ReflectionTestUtils.setField(momoService, "secretKey", MOMO_SECRET_KEY);
        ReflectionTestUtils.setField(momoService, "returnUrl", MOMO_RETURN_URL);
        ReflectionTestUtils.setField(momoService, "notifyUrl", "http://localhost:8080/api/payments/momo-ipn");

        zaloPayService = new ZaloPayService();
        ReflectionTestUtils.setField(zaloPayService, "appId", ZP_APP_ID);
        ReflectionTestUtils.setField(zaloPayService, "key1", ZP_KEY1);
        ReflectionTestUtils.setField(zaloPayService, "key2", ZP_KEY2);
        ReflectionTestUtils.setField(zaloPayService, "returnUrl", ZP_RETURN_URL);
    }

    @Test
    @DisplayName("1. MoMo: Tạo URL thanh toán với chữ ký HMAC-SHA256 hợp lệ")
    void testMomoCreatePaymentSuccess() {
        Long amount = 100000L;
        String orderInfo = "Nap tien PlayZone qua MoMo";
        String txnRef = "MOMO_TXN_001";

        Map<String, Object> result = momoService.createPayment(amount, orderInfo, txnRef);

        assertNotNull(result);
        assertNotNull(result.get("payUrl"));
        assertNotNull(result.get("signature"));
        assertEquals(txnRef, result.get("orderId"));
        assertEquals(amount, result.get("amount"));

        String payUrl = (String) result.get("payUrl");
        assertTrue(payUrl.contains("partnerCode=" + MOMO_PARTNER_CODE));
        assertTrue(payUrl.contains("orderId=" + txnRef));
        assertTrue(payUrl.contains("signature=" + result.get("signature")));
    }

    @Test
    @DisplayName("2. MoMo Callback: Xác minh chữ ký số HMAC-SHA256 thành công")
    void testMomoVerifyValidCallback() {
        Long amount = 100000L;
        String orderInfo = "Nap tien PlayZone qua MoMo";
        String txnRef = "MOMO_TXN_002";

        // Tạo giao dịch thực tế
        Map<String, Object> payment = momoService.createPayment(amount, orderInfo, txnRef);
        String payUrl = (String) payment.get("payUrl");

        // Parse query params từ payUrl giả lập MoMo redirect callback
        Map<String, String> callbackParams = new HashMap<>();
        String queryString = payUrl.substring(payUrl.indexOf('?') + 1);
        for (String param : queryString.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length == 2) {
                callbackParams.put(pair[0], java.net.URLDecoder.decode(pair[1], java.nio.charset.StandardCharsets.UTF_8));
            }
        }

        boolean isValid = momoService.verifyCallback(callbackParams);
        assertTrue(isValid, "MoMo callback với chữ ký HMAC hợp lệ phải được verify thành công");
    }

    @Test
    @DisplayName("3. MoMo Callback: Từ chối khi chữ ký bị giả mạo / thay đổi số tiền")
    void testMomoVerifyTamperedCallbackFails() {
        Map<String, String> callbackParams = new HashMap<>();
        callbackParams.put("partnerCode", MOMO_PARTNER_CODE);
        callbackParams.put("orderId", "MOMO_TXN_003");
        callbackParams.put("amount", "100000");
        callbackParams.put("resultCode", "0");
        callbackParams.put("signature", "FAKE_OR_TAMPERED_HMAC_SIGNATURE");

        boolean isValid = momoService.verifyCallback(callbackParams);
        assertFalse(isValid, "Chữ ký MoMo giả mạo phải bị từ chối triệt để");
    }

    @Test
    @DisplayName("4. ZaloPay: Tạo link thanh toán kèm checksum MAC bảo mật bằng key2")
    void testZaloPayCreatePaymentSuccess() {
        Long amount = 200000L;
        String orderInfo = "Nap tien PlayZone qua ZaloPay";
        String txnRef = "ZP_TXN_001";

        Map<String, Object> result = zaloPayService.createPayment(amount, orderInfo, txnRef);

        assertNotNull(result);
        assertNotNull(result.get("payUrl"));
        assertNotNull(result.get("checksum"));
        assertEquals(txnRef, result.get("txnRef"));

        String payUrl = (String) result.get("payUrl");
        assertTrue(payUrl.contains("appid=" + ZP_APP_ID));
        assertTrue(payUrl.contains("checksum=" + result.get("checksum")));
    }

    @Test
    @DisplayName("5. ZaloPay Callback: Xác minh MAC checksum hợp lệ")
    void testZaloPayVerifyValidCallback() {
        Long amount = 200000L;
        String orderInfo = "Nap tien PlayZone qua ZaloPay";
        String txnRef = "ZP_TXN_002";

        Map<String, Object> payment = zaloPayService.createPayment(amount, orderInfo, txnRef);
        String payUrl = (String) payment.get("payUrl");

        Map<String, String> callbackParams = new HashMap<>();
        String queryString = payUrl.substring(payUrl.indexOf('?') + 1);
        for (String param : queryString.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length == 2) {
                callbackParams.put(pair[0], java.net.URLDecoder.decode(pair[1], java.nio.charset.StandardCharsets.UTF_8));
            }
        }

        boolean isValid = zaloPayService.verifyCallback(callbackParams);
        assertTrue(isValid, "ZaloPay callback với checksum MAC hợp lệ phải được verify thành công");
    }

    @Test
    @DisplayName("6. ZaloPay Callback: Từ chối khi checksum MAC bị giả mạo")
    void testZaloPayVerifyTamperedCallbackFails() {
        Map<String, String> callbackParams = new HashMap<>();
        callbackParams.put("appid", ZP_APP_ID);
        callbackParams.put("apptransid", "261030_ZP_TXN_003");
        callbackParams.put("amount", "200000");
        callbackParams.put("status", "1");
        callbackParams.put("checksum", "FAKE_OR_TAMPERED_CHECKSUM");

        boolean isValid = zaloPayService.verifyCallback(callbackParams);
        assertFalse(isValid, "ZaloPay callback với checksum giả mạo phải bị từ chối triệt để");
    }
}

