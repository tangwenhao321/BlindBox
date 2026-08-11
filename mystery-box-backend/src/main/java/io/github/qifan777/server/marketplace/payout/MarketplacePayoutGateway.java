package io.github.qifan777.server.marketplace.payout;

import java.math.BigDecimal;

/**
 * Settles marketplace trade proceeds from buyer to seller (fee already deducted from seller side).
 */
public interface MarketplacePayoutGateway {

    /** Config key: wallet | momo | zalopay */
    String provider();

    /**
     * Whether this gateway has real credentials/config and may be used for buy/settle.
     * Wallet is always ready; MoMo/ZaloPay require partner credentials.
     */
    default boolean isReady() {
        return true;
    }

    /** Human-readable reason when {@link #isReady()} is false. */
    default String notReadyReason() {
        return "MARKETPLACE_GATEWAY_NOT_READY: Marketplace payout gateway not ready: " + provider();
    }

    MarketplacePayoutOutcome settleTrade(
            String buyerUserId,
            String sellerUserId,
            BigDecimal sellerProceeds,
            BigDecimal fee,
            String productName,
            String tradeId
    );
}
