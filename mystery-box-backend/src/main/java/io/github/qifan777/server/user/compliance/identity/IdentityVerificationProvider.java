package io.github.qifan777.server.user.compliance.identity;

import io.github.qifan777.server.user.compliance.IdentityDocumentParser;

import java.time.LocalDate;

/**
 * Identity / eKYC SPI. Config key: {@code app.identity.provider}
 * ({@code local} | {@code ekyc_vendor}).
 *
 * <p>Providers validate documents only; persistence and hashing stay in
 * {@link io.github.qifan777.server.user.compliance.UserIdentityVerificationService}.
 */
public interface IdentityVerificationProvider {

    /** Config / registry key for this implementation. */
    String provider();

    /**
     * Whether this provider has credentials and may be used for live verification.
     * Local checksum validation is always ready; vendor stubs are not.
     */
    default boolean isReady() {
        return true;
    }

    default String notReadyReason() {
        return "IDENTITY_PROVIDER_NOT_READY: " + provider() + " is not configured";
    }

    /**
     * Validates name + document number + declared birth date consistency.
     * Throws {@link io.qifan.infrastructure.common.exception.BusinessException} on rejection.
     */
    IdentityDocumentParser.IdentityDocument verifyDocument(
            String realName,
            String documentNumber,
            LocalDate declaredBirthDate
    );
}
