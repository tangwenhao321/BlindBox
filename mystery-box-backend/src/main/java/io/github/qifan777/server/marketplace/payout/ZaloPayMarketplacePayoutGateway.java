package io.github.qifan777.server.marketplace.payout;

import io.github.qifan777.server.payment.config.ZaloPayProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * ZaloPay marketplace payout — <b>unwired stub</b>.
 *
 * <p>Reserved for VN marketplace seller settle. Partner disbursement HTTP is not implemented;
 * {@link #isReady()} is always {@code false} (credentials alone are insufficient). Keep
 * {@code app.marketplace.payout-gateway=wallet} until wired. Do not delete.
 * There is no ZaloPay checkout gateway; config under {@code zalopay.*} is for future payout only.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ZaloPayMarketplacePayoutGateway implements MarketplacePayoutGateway {
    @SuppressWarnings("unused") // retained for future Partner disbursement wiring
    private final ZaloPayProperties zaloPayProperties;

    @Override
    public String provider() {
        return "zalopay";
    }

    @Override
    public boolean isReady() {
        // Partner disbursement must be implemented first — credentials alone are insufficient.
        return false;
    }

    @Override
    public String notReadyReason() {
        return "MARKETPLACE_GATEWAY_NOT_READY: Marketplace ZaloPay Partner disbursement is not implemented yet. "
                + "Credentials alone are insufficient — keep app.marketplace.payout-gateway=wallet until payout API is wired.";
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
        if (!isReady()) {
            throw new IllegalStateException(notReadyReason());
        }
        log.info(
                "ZaloPay marketplace payout pending external: tradeId={}, sellerId={}, proceeds={}, fee={}",
                tradeId,
                sellerUserId,
                sellerProceeds,
                fee
        );
        return MarketplacePayoutOutcome.PENDING_EXTERNAL;
    }
}
