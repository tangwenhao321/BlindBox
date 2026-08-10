package io.github.qifan777.server.payment.gateway;

public record PaymentRefundResult(String refundId, String gatewayRefundId, boolean success, String message) {
}
