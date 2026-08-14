package io.github.qifan777.server.payment.gateway;

import io.github.qifan777.server.payment.config.VNPayProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VNPayPaymentGatewayParseTest {

    private static final String SECRET = "TESTSECRETKEY123456789012345678901234567890";

    @Mock VNPayProperties props;
    @Mock StringRedisTemplate redisTemplate;
    @Mock JsonMapper objectMapper;

    private VNPayPaymentGateway gateway;

    @BeforeEach
    void setUp() {
        when(props.getHashSecret()).thenReturn(SECRET);
        gateway = new VNPayPaymentGateway(props, redisTemplate, objectMapper);
        ReflectionTestUtils.setField(gateway, "mockPaymentEnabled", false);
    }

    private Map<String, String> signedNotify(String responseCode, String txnStatus, String amount) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Amount", amount);
        params.put("vnp_ResponseCode", responseCode);
        params.put("vnp_TransactionStatus", txnStatus);
        params.put("vnp_TxnRef", "order-vnp-1");
        params.put("vnp_TransactionNo", "tx-99");
        params.put("vnp_PayDate", "20250101120000");
        String query = VNPaySignatureUtil.buildSignedQuery(params, SECRET);
        String hash = query.substring(query.lastIndexOf('=') + 1);
        params.put("vnp_SecureHash", hash);
        return params;
    }

    @Test
    void parsePaymentNotify_validSuccess() {
        Optional<PaymentNotifyResult> r = gateway.parsePaymentNotify(null, signedNotify("00", "00", "1000000"));
        assertThat(r).isPresent();
        assertThat(r.get().orderId()).isEqualTo("order-vnp-1");
        assertThat(r.get().transactionId()).isEqualTo("tx-99");
        assertThat(r.get().amountMinor()).isEqualTo(1000000L);
    }

    @ParameterizedTest(name = "reject code={0} txn={1}")
    @CsvSource({
            "24,00",
            "00,02",
            "99,00"
    })
    void parsePaymentNotify_rejectsNonSuccess(String code, String txn) {
        assertThat(gateway.parsePaymentNotify(null, signedNotify(code, txn, "1000000"))).isEmpty();
    }

    @Test
    void parsePaymentNotify_rejectsBadSignature() {
        Map<String, String> params = signedNotify("00", "00", "1000000");
        params.put("vnp_SecureHash", "deadbeef");
        assertThat(gateway.parsePaymentNotify(null, params)).isEmpty();
    }

    @Test
    void parsePaymentNotify_rejectsEmptyParams() {
        assertThat(gateway.parsePaymentNotify(null, Map.of())).isEmpty();
        assertThat(gateway.parsePaymentNotify(null, null)).isEmpty();
    }

    @Test
    void matchesPayAmount_matrix() {
        assertThat(gateway.matchesPayAmount(1000000L, new BigDecimal("10000"))).isTrue();
        assertThat(gateway.matchesPayAmount(1000000L, new BigDecimal("9999"))).isFalse();
        assertThat(gateway.matchesPayAmount(null, new BigDecimal("10000"))).isFalse();
    }
}
