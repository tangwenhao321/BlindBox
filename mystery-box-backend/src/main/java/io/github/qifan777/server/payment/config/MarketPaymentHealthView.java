package io.github.qifan777.server.payment.config;

public record MarketPaymentHealthView(
        String paymentProvider,
        String currency,
        boolean vnpayConfigured,
        boolean vnpaySandbox,
        boolean vnpayIpnConfigured,
        boolean momoEnabled,
        boolean momoConfigured,
        boolean mockPaymentEnabled
) {
}
