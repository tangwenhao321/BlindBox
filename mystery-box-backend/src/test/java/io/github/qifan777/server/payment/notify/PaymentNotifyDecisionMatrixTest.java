package io.github.qifan777.server.payment.notify;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec automation for HV-支付回调 idempotency / amount / signature scenes.
 * Pure decision helpers keep catalog cases executable without live gateways.
 */
class PaymentNotifyDecisionMatrixTest {

    enum NotifyDecision { ACCEPT, REJECT, IDEMPOTENT_OK }

    static NotifyDecision decide(boolean signatureOk, boolean orderExists, boolean amountMatch,
                                 boolean alreadyPaid, boolean duplicateNotify) {
        if (!signatureOk) return NotifyDecision.REJECT;
        if (!orderExists) return NotifyDecision.REJECT;
        if (duplicateNotify && alreadyPaid) return NotifyDecision.IDEMPOTENT_OK;
        if (alreadyPaid) return NotifyDecision.IDEMPOTENT_OK;
        if (!amountMatch) return NotifyDecision.REJECT;
        return NotifyDecision.ACCEPT;
    }

    @ParameterizedTest(name = "sig={0} exists={1} amt={2} paid={3} dup={4} => {5}")
    @CsvSource({
            "true,true,true,false,false,ACCEPT",
            "false,true,true,false,false,REJECT",
            "true,false,true,false,false,REJECT",
            "true,true,false,false,false,REJECT",
            "true,true,true,true,true,IDEMPOTENT_OK",
            "true,true,true,true,false,IDEMPOTENT_OK",
            "true,true,true,false,true,ACCEPT"
    })
    void notifyMatrix(boolean sig, boolean exists, boolean amt, boolean paid, boolean dup, NotifyDecision expected) {
        assertThat(decide(sig, exists, amt, paid, dup)).isEqualTo(expected);
    }
}
