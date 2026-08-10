package io.github.qifan777.server.payment.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "vnpay")
public class VNPayProperties {
    private String tmnCode = "";
    private String hashSecret = "";
    private String returnUrl = "";
    private String ipnUrl = "";
    private boolean sandbox = true;
    private String payUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private String queryUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
    private String refundUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
}
