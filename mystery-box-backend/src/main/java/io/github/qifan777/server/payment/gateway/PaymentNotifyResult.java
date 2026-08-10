package io.github.qifan777.server.payment.gateway;

public record PaymentNotifyResult(String orderId, String transactionId) {
}
