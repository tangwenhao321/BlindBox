package io.github.qifan777.server.marketplace.payout;

import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.user.root.service.UserWalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Default settle path: credit seller wallet (buyer already held full price on buy).
 */
@Component
@RequiredArgsConstructor
public class WalletMarketplacePayoutGateway implements MarketplacePayoutGateway {
    private final UserWalletService userWalletService;
    private final MarketProperties marketProperties;

    @Override
    public String provider() {
        return "wallet";
    }

    @Override
    public MarketplacePayoutOutcome settleTrade(
            String buyerUserId,
            String sellerUserId,
            BigDecimal sellerProceeds,
            BigDecimal fee,
            String productName,
            String tradeId
    ) {
        if (sellerProceeds != null && sellerProceeds.compareTo(BigDecimal.ZERO) > 0) {
            String feeText = marketProperties.formatAmount(fee == null ? BigDecimal.ZERO : fee);
            userWalletService.credit(
                    sellerUserId,
                    sellerProceeds,
                    "MARKETPLACE_IN",
                    "集市交易：" + productName + "（平台服务费 " + feeText + "）",
                    tradeId
            );
        }
        return MarketplacePayoutOutcome.SETTLED;
    }
}
