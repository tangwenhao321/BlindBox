package io.github.qifan777.server.marketplace.payout;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class MarketplacePayoutGatewayRegistry {
    private final Map<String, MarketplacePayoutGateway> byProvider;
    private final String configuredProvider;

    public MarketplacePayoutGatewayRegistry(
            List<MarketplacePayoutGateway> gateways,
            @Value("${app.marketplace.payout-gateway:wallet}") String configuredProvider
    ) {
        this.byProvider = gateways.stream()
                .collect(Collectors.toMap(
                        g -> normalize(g.provider()),
                        Function.identity(),
                        (a, b) -> a
                ));
        this.configuredProvider = configuredProvider;
    }

    public String configuredProvider() {
        return normalize(configuredProvider == null || configuredProvider.isBlank() ? "wallet" : configuredProvider);
    }

    public MarketplacePayoutGateway resolveConfigured() {
        return resolveByProvider(configuredProvider);
    }

    /**
     * Resolves the configured gateway and refuses momo/zalopay without real credentials.
     * Call before buyListing / settleTrade so trades never enter PENDING_EXTERNAL forever.
     */
    public MarketplacePayoutGateway resolveConfiguredReady() {
        MarketplacePayoutGateway gateway = resolveConfigured();
        if (!gateway.isReady()) {
            throw new BusinessException(gateway.notReadyReason());
        }
        return gateway;
    }

    public MarketplacePayoutGateway resolveByProvider(String provider) {
        String key = normalize(provider == null || provider.isBlank() ? "wallet" : provider);
        MarketplacePayoutGateway gateway = byProvider.get(key);
        if (gateway == null) {
            throw new BusinessException("Unsupported marketplace payout gateway: " + provider);
        }
        return gateway;
    }

    private static String normalize(String provider) {
        return provider.trim().toLowerCase(Locale.ROOT);
    }
}
