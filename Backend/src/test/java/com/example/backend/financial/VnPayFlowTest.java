package com.example.backend.financial;

import com.example.backend.service.VnPayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class VnPayFlowTest {

    private VnPayService vnPayService;

    private static final String TMN_CODE = "TEST_TMN";
    private static final String HASH_SECRET = "TEST_HASH_SECRET_1234567890ABCDEF";
    private static final String PAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private static final String RETURN_URL = "http://localhost:8080/api/payments/vnpay-return";

    @BeforeEach
    void setUp() {
        vnPayService = new VnPayService();
        ReflectionTestUtils.setField(vnPayService, "vnp_TmnCode", TMN_CODE);
        ReflectionTestUtils.setField(vnPayService, "vnp_HashSecret", HASH_SECRET);
        ReflectionTestUtils.setField(vnPayService, "vnp_Url", PAY_URL);
        ReflectionTestUtils.setField(vnPayService, "vnp_ReturnUrl", RETURN_URL);
    }

    @Test
    @DisplayName("1. VNPay: Tạo URL thanh toán hợp lệ với amount x100 và chữ ký bảo mật SHA512")
    void testCreatePaymentUrlSuccess() throws UnsupportedEncodingException {
        Long amount = 50000L; // 50.000 VND
        String orderInfo = "Nap tien tai khoan user_01";
        String ipAddr = "127.0.0.1";
        String txnRef = "TXN_123456";

        String url = vnPayService.createPaymentUrl(amount, orderInfo, ipAddr, txnRef);

        assertNotNull(url);
        assertTrue(url.startsWith(PAY_URL));
        // VNPay yêu cầu nhân 100 lần số tiền VND (50000 * 100 = 5000000)
        assertTrue(url.contains("vnp_Amount=5000000"));
        assertTrue(url.contains("vnp_TmnCode=" + TMN_CODE));
        assertTrue(url.contains("vnp_TxnRef=" + txnRef));
        assertTrue(url.contains("vnp_SecureHash="));
    }

    @Test
    @DisplayName("2. VNPay Callback: Xác minh chữ ký số hợp lệ khi giao dịch thành công (ResponseCode 00)")
    void testVerifyValidCallback() {
        Map<String, String> callbackParams = new HashMap<>();
        callbackParams.put("vnp_Amount", "5000000");
        callbackParams.put("vnp_BankCode", "NCB");
        callbackParams.put("vnp_Command", "pay");
        callbackParams.put("vnp_OrderInfo", "Nap tien");
        callbackParams.put("vnp_ResponseCode", "00");
        callbackParams.put("vnp_TmnCode", TMN_CODE);
        callbackParams.put("vnp_TxnRef", "TXN_9999");

        // Tạo chữ ký hợp lệ cho callbackParams
        String expectedHash = vnPayService.hashAllFields(callbackParams);
        callbackParams.put("vnp_SecureHash", expectedHash);

        // Act & Assert
        boolean isValid = vnPayService.verifyVnpayCallback(callbackParams);
        assertTrue(isValid, "Callback chữ ký hợp lệ phải được verify thành công");
    }

    @Test
    @DisplayName("3. VNPay Callback: Bị từ chối khi chữ ký số bị giả mạo / thay đổi tham số tiền")
    void testVerifyTamperedCallbackFails() {
        Map<String, String> callbackParams = new HashMap<>();
        callbackParams.put("vnp_Amount", "5000000");
        callbackParams.put("vnp_ResponseCode", "00");
        callbackParams.put("vnp_TxnRef", "TXN_9999");
        callbackParams.put("vnp_SecureHash", "FAKE_OR_TAMPERED_HASH_VALUE");

        boolean isValid = vnPayService.verifyVnpayCallback(callbackParams);
        assertFalse(isValid, "Chữ ký sai lệch phải bị từ chối để chống gian lận nạp tiền");
    }
}

