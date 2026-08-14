package io.github.qifan777.server.payment.gateway;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class VNPaySignatureUtilTest {

    @Test
    void verifyAcceptsValidSignature() {
        String secret = "TESTSECRETKEY123456789012345678901234567890";
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Amount", "1000000");
        params.put("vnp_Command", "pay");
        params.put("vnp_CreateDate", "20250101120000");
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_IpnUrl", "https://example.com/ipn");
        params.put("vnp_Locale", "vn");
        params.put("vnp_OrderInfo", "test");
        params.put("vnp_OrderType", "other");
        params.put("vnp_ReturnUrl", "mysterybox://return");
        params.put("vnp_TmnCode", "TESTTMN");
        params.put("vnp_TxnRef", "order-1");
        params.put("vnp_Version", "2.1.0");
        String query = VNPaySignatureUtil.buildSignedQuery(params, secret);
        String hash = query.substring(query.lastIndexOf('=') + 1);
        params.put("vnp_SecureHash", hash);
        assertThat(VNPaySignatureUtil.verify(params, secret)).isTrue();
    }

    @Test
    void verifyRejectsTamperedAmount() {
        String secret = "TESTSECRETKEY123456789012345678901234567890";
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Amount", "1000000");
        params.put("vnp_TxnRef", "order-1");
        String query = VNPaySignatureUtil.buildSignedQuery(params, secret);
        String hash = query.substring(query.lastIndexOf('=') + 1);
        params.put("vnp_SecureHash", hash);
        params.put("vnp_Amount", "2000000");
        assertThat(VNPaySignatureUtil.verify(params, secret)).isFalse();
    }

    @Test
    void verifyRejectsWrongSecretAndBlankHash() {
        String secret = "TESTSECRETKEY123456789012345678901234567890";
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Amount", "1000000");
        params.put("vnp_TxnRef", "order-1");
        String query = VNPaySignatureUtil.buildSignedQuery(params, secret);
        String hash = query.substring(query.lastIndexOf('=') + 1);
        params.put("vnp_SecureHash", hash);
        assertThat(VNPaySignatureUtil.verify(params, "WRONGSECRET")).isFalse();
        params.put("vnp_SecureHash", "");
        assertThat(VNPaySignatureUtil.verify(params, secret)).isFalse();
    }
}
