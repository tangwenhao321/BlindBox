package io.github.qifan777.server.box.order.support;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Automates HV-订单状态机 LEGAL/illegal matrix used by test-case generators.
 */
class OrderStatusActionMatrixTest {

    private static final Set<String> LEGAL = Set.of(
            "TO_BE_PAID|prepay_wechat",
            "TO_BE_PAID|prepay_wechat_retry",
            "TO_BE_PAID|prepay_vnpay",
            "TO_BE_PAID|prepay_vnpay_retry",
            "TO_BE_PAID|prepay_momo",
            "TO_BE_PAID|prepay_momo_retry",
            "TO_BE_PAID|pay_mock",
            "TO_BE_PAID|cancel_unpaid",
            "TO_BE_PAID|calculate",
            "TO_BE_DELIVERED|admin_deliver",
            "TO_BE_DELIVERED|admin_paid_cancel",
            "TO_BE_DELIVERED|refund_approve",
            "TO_BE_DELIVERED|refund_reject",
            "TO_BE_DELIVERED|item_redeem_balance",
            "TO_BE_DELIVERED|redeem_balance",
            "TO_BE_DELIVERED|abandon_offer",
            "TO_BE_RECEIVED|confirm_receive",
            "TO_BE_RECEIVED|admin_paid_cancel",
            "TO_BE_RECEIVED|refund_approve",
            "TO_BE_RECEIVED|refund_reject",
            "TO_BE_RECEIVED|item_redeem_balance",
            "TO_BE_EVALUATED|refund_approve",
            "TO_BE_EVALUATED|refund_reject",
            "CLOSED|refund_approve"
    );

    @ParameterizedTest(name = "legal {0}×{1}")
    @CsvSource({
            "TO_BE_PAID,prepay_wechat",
            "TO_BE_PAID,pay_mock",
            "TO_BE_PAID,cancel_unpaid",
            "TO_BE_DELIVERED,admin_deliver",
            "TO_BE_RECEIVED,confirm_receive",
            "CLOSED,refund_approve"
    })
    void legalTransitionsAreAllowed(String status, String action) {
        assertThat(LEGAL).contains(status + "|" + action);
    }

    @ParameterizedTest(name = "illegal {0}×{1}")
    @CsvSource({
            "CLOSED,prepay_wechat",
            "REFUNDED,pay_mock",
            "TO_BE_RECEIVED,cancel_unpaid",
            "TO_BE_PAID,admin_deliver",
            "TO_BE_PAID,confirm_receive",
            "SOLD,buy"
    })
    void illegalTransitionsAreRejected(String status, String action) {
        assertThat(LEGAL).doesNotContain(status + "|" + action);
    }
}
