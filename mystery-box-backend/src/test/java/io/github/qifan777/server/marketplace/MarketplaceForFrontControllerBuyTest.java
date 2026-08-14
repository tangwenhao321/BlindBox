package io.github.qifan777.server.marketplace;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.compliance.IosDigitalGoodsGuard;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;

import java.util.concurrent.ScheduledExecutorService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketplaceForFrontControllerBuyTest {

    @Mock MarketplaceService marketplaceService;
    @Mock MarketplaceChatService marketplaceChatService;
    @Mock MarketplaceChatSseHub marketplaceChatSseHub;
    @Mock JsonMapper objectMapper;
    @Mock IosDigitalGoodsGuard iosDigitalGoodsGuard;
    @Mock UserComplianceService userComplianceService;
    @Mock ScheduledExecutorService sseScheduledExecutor;

    @InjectMocks
    private MarketplaceForFrontController controller;

    @Test
    void buy_runsGuardsThenDelegates() {
        when(marketplaceService.buyListing("user-9", "listing-1")).thenReturn("trade-1");
        try (MockedStatic<StpUtil> stp = mockStatic(StpUtil.class)) {
            stp.when(StpUtil::getLoginIdAsString).thenReturn("user-9");
            String tradeId = controller.buy("listing-1");
            assertThat(tradeId).isEqualTo("trade-1");
        }
        verify(iosDigitalGoodsGuard).rejectIfIosAppStoreClient();
        verify(userComplianceService).assertAgeConfirmed("user-9");
        verify(marketplaceService).buyListing("user-9", "listing-1");
    }
}
