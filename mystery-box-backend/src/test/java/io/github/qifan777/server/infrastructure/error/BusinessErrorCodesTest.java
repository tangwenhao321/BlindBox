package io.github.qifan777.server.infrastructure.error;

import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BusinessErrorCodesTest {

    @Test
    void resolvesEnumNameForMoneyPathCodes() {
        BusinessException ex = new BusinessException(
                MoneyPathErrorCode.REFUND_IN_PROGRESS,
                MoneyPathErrorCode.REFUND_IN_PROGRESS.tokenMessage());
        assertThat(BusinessErrorCodes.resolve(ex)).isEqualTo("REFUND_IN_PROGRESS");
    }

    @Test
    void resolvesTokenPrefixFromMessageWhenResultCodeIsGeneric() {
        BusinessException ex = new BusinessException(
                ResultCode.BusinessError,
                "PITY_STOCK_EXHAUSTED:保底触发但高阶库存不足");
        assertThat(BusinessErrorCodes.resolve(ex)).isEqualTo("PITY_STOCK_EXHAUSTED");
    }

    @Test
    void ignoresPascalCaseResultCodeNames() {
        BusinessException ex = new BusinessException(ResultCode.NotFindError, "订单不存在");
        assertThat(BusinessErrorCodes.resolve(ex)).isNull();
    }
}
