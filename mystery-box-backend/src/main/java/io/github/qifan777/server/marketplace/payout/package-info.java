/**
 * Marketplace seller payout adapters after a trade settles.
 *
 * <p><b>MoMo</b> ({@link io.github.qifan777.server.marketplace.payout.MoMoMarketplacePayoutGateway})
 * and <b>ZaloPay</b>
 * ({@link io.github.qifan777.server.marketplace.payout.ZaloPayMarketplacePayoutGateway}) are
 * <em>unwired stubs</em>: {@code isReady()} is hard-{@code false} until Partner disbursement HTTP
 * exists. Keep {@code app.marketplace.payout-gateway=wallet} in production. Credentials alone must
 * never enable live payout. Do not delete — reserved for future Partner wiring.
 */
package io.github.qifan777.server.marketplace.payout;
