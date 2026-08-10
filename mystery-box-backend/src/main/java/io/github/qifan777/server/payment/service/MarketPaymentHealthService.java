package io.github.qifan777.server.payment.service;

import io.github.qifan777.server.payment.config.MarketPaymentHealthView;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.config.MoMoProperties;
import io.github.qifan777.server.payment.config.VNPayProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class MarketPaymentHealthService {
    private final MarketProperties marketProperties;
    private final VNPayProperties vnpayProperties;
    private final MoMoProperties momoProperties;

    @Value("${payment.mock-enabled:false}")
    private boolean mockPaymentEnabled;

    public MarketPaymentHealthView overview() {
        boolean configured = StringUtils.hasText(vnpayProperties.getTmnCode())
                && StringUtils.hasText(vnpayProperties.getHashSecret());
        String ipn = vnpayProperties.getIpnUrl();
        boolean ipnConfigured = StringUtils.hasText(ipn)
                && !ipn.toLowerCase().contains("example.com");
        return new MarketPaymentHealthView(
                marketProperties.getPaymentProvider(),
                marketProperties.getCurrency(),
                configured,
                vnpayProperties.isSandbox(),
                ipnConfigured,
                momoProperties.isEnabled(),
                momoProperties.isConfigured(),
                mockPaymentEnabled
        );
    }
}
