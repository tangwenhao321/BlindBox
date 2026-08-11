package io.github.qifan777.server.infrastructure.error;

import com.fasterxml.jackson.annotation.JsonValue;
import io.qifan.infrastructure.common.constants.BaseEnum;

/**
 * Stable money-path business codes for mobile / ops (enum name → JSON {@code errorCode}).
 * Numeric codes use 1002xxx so they never collide with {@code ResultCode} (10xxx) or {@code AuthErrorCode} (1001xxx).
 * Does not modify infrastructure {@code ResultCode} (external jar; code-based, not ordinal-based).
 */
public enum MoneyPathErrorCode implements BaseEnum {
    PITY_STOCK_EXHAUSTED(1002001, "保底触发但高阶库存不足，请选择补偿方案"),
    REFUND_DENIED(1002002, "当前订单状态不可申请退款"),
    REFUND_IN_PROGRESS(1002003, "该订单已有退款申请处理中"),
    PAYMENT_AMOUNT_MISMATCH(1002004, "支付或退款金额不匹配"),
    ORDER_OWNERSHIP_DENIED(1002005, "非本人操作"),
    STOCK_CONFLICT(1002006, "赏品库存不足或并发冲突，请重试");

    private final Integer code;
    private final String name;

    MoneyPathErrorCode(Integer code, String name) {
        this.code = code;
        this.name = name;
    }

    /** Message with stable token prefix for clients that only read {@code msg}. */
    public String tokenMessage() {
        return name() + ":" + name;
    }

    public String tokenMessage(String detail) {
        if (detail == null || detail.isBlank()) {
            return tokenMessage();
        }
        return name() + ":" + detail;
    }

    @JsonValue
    @Override
    public Integer getCode() {
        return code;
    }

    @Override
    public String getName() {
        return name;
    }
}
