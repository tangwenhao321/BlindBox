package io.github.qifan777.server.marketplace.payout;

/**
 * Result of attempting to settle seller proceeds for a marketplace trade.
 */
public enum MarketplacePayoutOutcome {
    /** Seller credited immediately (e.g. wallet). */
    SETTLED,
    /** External disbursement queued / pending (e.g. MoMo, ZaloPay). */
    PENDING_EXTERNAL
}
