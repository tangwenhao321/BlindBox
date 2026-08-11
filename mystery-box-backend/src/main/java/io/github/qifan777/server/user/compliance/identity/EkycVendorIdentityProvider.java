package io.github.qifan777.server.user.compliance.identity;

import io.github.qifan777.server.user.compliance.IdentityDocumentParser;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Stub for a future government / commercial eKYC vendor integration.
 * Always reports not ready until credentials and API wiring are added.
 */
@Component
public class EkycVendorIdentityProvider implements IdentityVerificationProvider {

    @Override
    public String provider() {
        return "ekyc_vendor";
    }

    @Override
    public boolean isReady() {
        return false;
    }

    @Override
    public String notReadyReason() {
        return "IDENTITY_PROVIDER_NOT_READY: ekyc_vendor is not configured "
                + "(wire vendor credentials and replace this stub)";
    }

    @Override
    public IdentityDocumentParser.IdentityDocument verifyDocument(
            String realName,
            String documentNumber,
            LocalDate declaredBirthDate
    ) {
        throw new BusinessException(notReadyReason());
    }
}
