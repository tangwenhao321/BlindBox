package io.github.qifan777.server.payment.controller;

import io.github.qifan777.server.payment.config.MoMoProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("front/payment/momo")
@RequiredArgsConstructor
public class MoMoPaymentForFrontController {
    private final MoMoProperties momoProperties;

    @GetMapping("status")
    public MoMoStatusView status() {
        boolean offered = momoProperties.isCheckoutOffered();
        String message;
        if (offered) {
            message = "MoMo checkout ready";
        } else if (momoProperties.isStub()) {
            message = "MoMo Partner API not wired (stub); checkout is not offered";
        } else if (!momoProperties.isEnabled()) {
            message = "MoMo disabled (momo.enabled=false)";
        } else {
            message = "Configure momo.partner-code / access-key / secret-key and set momo.stub=false";
        }
        return new MoMoStatusView(
                offered,
                momoProperties.isConfigured(),
                momoProperties.isStub(),
                message
        );
    }

    public record MoMoStatusView(boolean enabled, boolean configured, boolean stub, String message) {
    }
}
