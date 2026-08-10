package io.github.qifan777.server.payment.gateway;

/** Stub prepay payload for MoMo wallet integration. */
public record MoMoPrepayView(
        String orderId,
        String deeplink,
        boolean stub
) {
}
