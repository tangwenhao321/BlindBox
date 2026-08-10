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
        return new MoMoStatusView(
                momoProperties.isEnabled(),
                momoProperties.isConfigured(),
                momoProperties.isEnabled() && momoProperties.isConfigured()
                        ? "MoMo stub gateway ready"
                        : "Configure momo.* and set MOMO_ENABLED=true to enable stub checkout"
        );
    }

    public record MoMoStatusView(boolean enabled, boolean configured, String message) {
    }
}
