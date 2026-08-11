package io.github.qifan777.server.user.compliance;

import io.qifan.infrastructure.common.exception.BusinessException;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Structural validation of the identity documents this platform accepts.
 *
 * <p>This is a format and self-consistency check, not proof that the document exists — that needs a
 * government or KYC-provider lookup, which slots in behind
 * {@link io.github.qifan777.server.user.compliance.identity.IdentityVerificationProvider}.
 * What it does buy us is an age we can defend: both accepted document types encode the holder's birth
 * date, so a user cannot claim to be 20 while presenting a document issued to a 13 year old.
 */
public final class IdentityDocumentParser {
    public static final String REGION_VN = "VN";
    public static final String REGION_CN = "CN";

    private static final int[] CN_WEIGHTS = {7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2};
    private static final char[] CN_CHECK_CODES = {'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'};

    private IdentityDocumentParser() {
    }

    /**
     * @param region     {@link #REGION_VN} or {@link #REGION_CN}
     * @param birthDate  exact date when the document encodes it (CN), otherwise empty
     * @param birthYear  always known
     * @param normalized digits only, upper-cased; used for hashing, never stored
     * @param masked     safe-to-store rendering for support
     */
    public record IdentityDocument(
            String region,
            Optional<LocalDate> birthDate,
            int birthYear,
            String normalized,
            String masked
    ) {
    }

    public static IdentityDocument parse(String rawIdNumber) {
        String normalized = normalize(rawIdNumber);
        if (normalized.length() == 12) {
            return parseVietnamCitizenId(normalized);
        }
        if (normalized.length() == 18) {
            return parseChinaResidentId(normalized);
        }
        if (normalized.length() == 9) {
            // The 9-digit CMND carries no birth date, so it cannot support an age check at all.
            throw new BusinessException("旧版 CMND 无法核验年龄，请改用 12 位 CCCD 身份证号");
        }
        throw new BusinessException("证件号格式不正确，请输入 12 位越南 CCCD 或 18 位中国身份证号");
    }

    /**
     * Vietnamese CCCD: 3 digits province, 1 digit century-and-gender, 2 digits birth year, 6 random.
     * The century digit only narrows the year, so the caller must supply the full date separately.
     */
    private static IdentityDocument parseVietnamCitizenId(String normalized) {
        if (!normalized.chars().allMatch(Character::isDigit)) {
            throw new BusinessException("越南 CCCD 身份证号只能包含数字");
        }
        int centuryDigit = normalized.charAt(3) - '0';
        int century = 1900 + (centuryDigit / 2) * 100;
        int birthYear = century + Integer.parseInt(normalized.substring(4, 6));
        if (birthYear > LocalDate.now().getYear()) {
            throw new BusinessException("证件号中的出生年份不合法");
        }
        return new IdentityDocument(REGION_VN, Optional.empty(), birthYear, normalized, mask(normalized));
    }

    /** Chinese resident ID: 17 digits plus a check character, with YYYYMMDD at offset 6. */
    private static IdentityDocument parseChinaResidentId(String normalized) {
        for (int i = 0; i < 17; i++) {
            if (!Character.isDigit(normalized.charAt(i))) {
                throw new BusinessException("中国身份证号前 17 位只能包含数字");
            }
        }
        if (normalized.charAt(17) != checkCodeOf(normalized)) {
            throw new BusinessException("身份证号校验位不正确，请核对后重试");
        }
        LocalDate birthDate;
        try {
            birthDate = LocalDate.of(
                    Integer.parseInt(normalized.substring(6, 10)),
                    Integer.parseInt(normalized.substring(10, 12)),
                    Integer.parseInt(normalized.substring(12, 14))
            );
        } catch (DateTimeException | NumberFormatException ex) {
            throw new BusinessException("证件号中的出生日期不合法");
        }
        if (birthDate.isAfter(LocalDate.now())) {
            throw new BusinessException("证件号中的出生日期不合法");
        }
        return new IdentityDocument(
                REGION_CN, Optional.of(birthDate), birthDate.getYear(), normalized, mask(normalized));
    }

    private static char checkCodeOf(String normalized) {
        int sum = 0;
        for (int i = 0; i < 17; i++) {
            sum += (normalized.charAt(i) - '0') * CN_WEIGHTS[i];
        }
        return CN_CHECK_CODES[sum % 11];
    }

    private static String normalize(String rawIdNumber) {
        if (rawIdNumber == null) {
            throw new BusinessException("请填写证件号");
        }
        String normalized = rawIdNumber.replaceAll("[\\s-]", "").toUpperCase();
        if (normalized.isEmpty()) {
            throw new BusinessException("请填写证件号");
        }
        return normalized;
    }

    private static String mask(String normalized) {
        if (normalized.length() <= 6) {
            return "*".repeat(normalized.length());
        }
        String head = normalized.substring(0, 3);
        String tail = normalized.substring(normalized.length() - 3);
        return head + "*".repeat(normalized.length() - 6) + tail;
    }
}
