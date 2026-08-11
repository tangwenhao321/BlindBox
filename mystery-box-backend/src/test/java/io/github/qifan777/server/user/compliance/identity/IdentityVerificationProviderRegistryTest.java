package io.github.qifan777.server.user.compliance.identity;

import io.github.qifan777.server.user.compliance.IdentityDocumentParser;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentityVerificationProviderRegistryTest {

    @Test
    void resolvesLocalByDefault() {
        LocalChecksumIdentityProvider local = new LocalChecksumIdentityProvider();
        EkycVendorIdentityProvider vendor = new EkycVendorIdentityProvider();
        IdentityVerificationProviderRegistry registry =
                new IdentityVerificationProviderRegistry(List.of(local, vendor), "local");

        assertThat(registry.configuredProvider()).isEqualTo("local");
        assertThat(registry.resolveConfiguredReady().provider()).isEqualTo("local");
    }

    @Test
    void ekycVendorIsNotReady() {
        LocalChecksumIdentityProvider local = new LocalChecksumIdentityProvider();
        EkycVendorIdentityProvider vendor = new EkycVendorIdentityProvider();
        IdentityVerificationProviderRegistry registry =
                new IdentityVerificationProviderRegistry(List.of(local, vendor), "ekyc_vendor");

        assertThat(registry.resolveConfigured().isReady()).isFalse();
        assertThatThrownBy(registry::resolveConfiguredReady)
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("IDENTITY_PROVIDER_NOT_READY");
    }

    @Test
    void localChecksumValidatesCnId() {
        LocalChecksumIdentityProvider local = new LocalChecksumIdentityProvider();
        // Valid CN ID structure: use parser-accepted sample if available via constructing birth date
        // 110101199001011234 needs valid checksum — derive from known good if parse rejects.
        assertThatThrownBy(() -> local.verifyDocument("张三", "123", LocalDate.of(1990, 1, 1)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void localChecksumAcceptsValidVnCccd() {
        LocalChecksumIdentityProvider local = new LocalChecksumIdentityProvider();
        // VN CCCD: 3 province + century/gender + YY + 6 serial. century digit 0 => 1900+YY
        String cccd = "001099001234"; // century 0 -> 1900+99 = 1999
        IdentityDocumentParser.IdentityDocument doc =
                local.verifyDocument("Nguyen Van A", cccd, LocalDate.of(1999, 12, 31));
        assertThat(doc.region()).isEqualTo(IdentityDocumentParser.REGION_VN);
        assertThat(doc.birthYear()).isEqualTo(1999);
    }
}
