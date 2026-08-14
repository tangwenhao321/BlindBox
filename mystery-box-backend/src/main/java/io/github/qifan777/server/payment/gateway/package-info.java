/**
 * Payment gateway adapters (WeChat, VNPay, MoMo, …).
 *
 * <p><b>MoMo</b> ({@link io.github.qifan777.server.payment.gateway.MoMoPaymentGateway}) is an
 * <em>unwired stub</em>: deeplink/UI testing only. Partner create-order, IPN HMAC, query, and
 * refund HTTP clients are not implemented. Production ({@code prod-vn}) keeps
 * {@code momo.enabled=false} / {@code momo.stub=true} / {@code momo.partner-wired=false};
 * {@link io.github.qifan777.server.infrastructure.config.ProductionSafetyValidator} refuses
 * offering stub checkout. Do not delete — wire Partner APIs before flipping flags.
 *
 * <p>There is no ZaloPay <em>checkout</em> gateway yet; ZaloPay exists only as a marketplace
 * payout stub under {@code marketplace.payout}.
 */
package io.github.qifan777.server.payment.gateway;
