package io.github.qifan777.server.user.compliance.identity;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Resolves {@code app.identity.provider} ({@code local} | {@code ekyc_vendor}).
 */
@Component
public class IdentityVerificationProviderRegistry {
    private final Map<String, IdentityVerificationProvider> byProvider;
    private final String configuredProvider;

    public IdentityVerificationProviderRegistry(
            List<IdentityVerificationProvider> providers,
            @Value("${app.identity.provider:local}") String configuredProvider
    ) {
        this.byProvider = providers.stream()
                .collect(Collectors.toMap(
                        p -> normalize(p.provider()),
                        Function.identity(),
                        (a, b) -> a
                ));
        this.configuredProvider = configuredProvider;
    }

    public String configuredProvider() {
        return normalize(configuredProvider == null || configuredProvider.isBlank() ? "local" : configuredProvider);
    }

    public IdentityVerificationProvider resolveConfigured() {
        return resolveByProvider(configuredProvider);
    }

    /**
     * Resolves the configured provider and refuses vendor stubs without credentials.
     */
    public IdentityVerificationProvider resolveConfiguredReady() {
        IdentityVerificationProvider provider = resolveConfigured();
        if (!provider.isReady()) {
            throw new BusinessException(provider.notReadyReason());
        }
        return provider;
    }

    public IdentityVerificationProvider resolveByProvider(String provider) {
        String key = normalize(provider == null || provider.isBlank() ? "local" : provider);
        IdentityVerificationProvider resolved = byProvider.get(key);
        if (resolved == null) {
            throw new BusinessException("Unsupported identity provider: " + provider);
        }
        return resolved;
    }

    private static String normalize(String provider) {
        return provider.trim().toLowerCase(Locale.ROOT);
    }
}
