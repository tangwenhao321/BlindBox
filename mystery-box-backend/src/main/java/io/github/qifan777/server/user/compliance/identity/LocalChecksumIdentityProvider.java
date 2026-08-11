package io.github.qifan777.server.user.compliance.identity;

import io.github.qifan777.server.user.compliance.IdentityDocumentParser;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Default identity provider: structural / checksum validation via {@link IdentityDocumentParser}.
 * Does not call an external eKYC vendor.
 */
@Component
public class LocalChecksumIdentityProvider implements IdentityVerificationProvider {

    @Override
    public String provider() {
        return "local";
    }

    @Override
    public IdentityDocumentParser.IdentityDocument verifyDocument(
            String realName,
            String documentNumber,
            LocalDate declaredBirthDate
    ) {
        String trimmedName = realName == null ? "" : realName.trim();
        if (trimmedName.length() < 2) {
            throw new BusinessException("姓名至少 2 个字符");
        }
        if (declaredBirthDate == null) {
            throw new BusinessException("请填写出生日期");
        }
        if (declaredBirthDate.isAfter(LocalDate.now())) {
            throw new BusinessException("出生日期不能晚于今天");
        }

        IdentityDocumentParser.IdentityDocument document = IdentityDocumentParser.parse(documentNumber);

        Optional<LocalDate> documentBirthDate = document.birthDate();
        if (documentBirthDate.isPresent()) {
            if (!documentBirthDate.get().equals(declaredBirthDate)) {
                throw new BusinessException("出生日期与证件号不一致");
            }
        } else if (document.birthYear() != declaredBirthDate.getYear()) {
            throw new BusinessException("出生年份与证件号不一致");
        }
        return document;
    }
}
