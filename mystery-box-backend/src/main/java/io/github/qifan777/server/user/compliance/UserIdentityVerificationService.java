package io.github.qifan777.server.user.compliance;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.user.compliance.identity.IdentityVerificationProvider;
import io.github.qifan777.server.user.compliance.identity.IdentityVerificationProviderRegistry;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Binds a real identity to an account so age-based limits have something trustworthy behind them.
 *
 * <p>Document validation is delegated to {@link IdentityVerificationProvider} (local checksum or
 * future eKYC vendor). The submitted document number is hashed with a server-side key and then
 * discarded. That keeps the database useless to an attacker while still letting us answer whether
 * this document is already bound to another account.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserIdentityVerificationService {
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final JdbcTemplate jdbcTemplate;
    private final IdentityVerificationProviderRegistry identityProviderRegistry;

    @Value("${security.compliance.identity.hash-secret:CHANGE_ME_IDENTITY_HASH_SECRET}")
    private String hashSecret;

    /**
     * Front-facing verify that derives birth date from the document when possible.
     * VN CCCD only encodes the year — Dec 31 is used so age errs younger (stricter for minors).
     */
    @Transactional
    public VerificationResult verifyFromDocument(String userId, String realName, String documentNumber) {
        IdentityVerificationProvider provider = identityProviderRegistry.resolveConfiguredReady();
        // Parse once to derive birth date when the document encodes it; full verify still goes through provider.
        IdentityDocumentParser.IdentityDocument preview = IdentityDocumentParser.parse(documentNumber);
        LocalDate birthDate = preview.birthDate()
                .orElseGet(() -> LocalDate.of(preview.birthYear(), 12, 31));
        String name = realName == null || realName.isBlank() ? "实名用户" : realName;
        return verifyWithProvider(userId, name, documentNumber, birthDate, provider);
    }

    /**
     * @param declaredBirthDate the date the user typed; cross-checked against the document so a
     *                          Vietnamese CCCD (which encodes only the birth year) still yields an exact age
     */
    @Transactional
    public VerificationResult verify(String userId, String realName, String idNumber, LocalDate declaredBirthDate) {
        return verifyWithProvider(
                userId,
                realName,
                idNumber,
                declaredBirthDate,
                identityProviderRegistry.resolveConfiguredReady()
        );
    }

    private VerificationResult verifyWithProvider(
            String userId,
            String realName,
            String idNumber,
            LocalDate declaredBirthDate,
            IdentityVerificationProvider provider
    ) {
        String trimmedName = realName == null ? "" : realName.trim();
        IdentityDocumentParser.IdentityDocument document;
        try {
            document = provider.verifyDocument(trimmedName, idNumber, declaredBirthDate);
        } catch (BusinessException ex) {
            throw reject(userId, null, ex.getMessage());
        }

        AgeTier tier = AgeTier.ofBirthDate(declaredBirthDate, LocalDate.now());
        String hash = hash(document.normalized());
        assertNotBoundToAnotherUser(userId, hash, document.region());

        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO user_compliance (
                                user_id, age_confirmed_at, created_time, real_name,
                                id_number_hash, id_number_masked, id_region, birth_date, age_tier, verified_at
                            )
                            VALUES (?,?,?,?,?,?,?,?,?,?)
                            ON DUPLICATE KEY UPDATE
                                age_confirmed_at = VALUES(age_confirmed_at),
                                real_name = VALUES(real_name),
                                id_number_hash = VALUES(id_number_hash),
                                id_number_masked = VALUES(id_number_masked),
                                id_region = VALUES(id_region),
                                birth_date = VALUES(birth_date),
                                age_tier = VALUES(age_tier),
                                verified_at = VALUES(verified_at)
                            """,
                    userId,
                    LocalDateTime.now(),
                    LocalDateTime.now(),
                    trimmedName,
                    hash,
                    document.masked(),
                    document.region(),
                    declaredBirthDate,
                    tier.name(),
                    LocalDateTime.now()
            );
        } catch (DuplicateKeyException ex) {
            throw reject(userId, document.region(), "该证件已绑定其他账号");
        }

        log(userId, document.region(), "PASSED", null, tier);
        return new VerificationResult(tier, declaredBirthDate, document.region(), document.masked());
    }

    /** Support action: unbinds the document so a user who verified with the wrong one can retry. */
    @Transactional
    public void revoke(String userId, String reason) {
        jdbcTemplate.update(
                """
                        UPDATE user_compliance
                        SET real_name = NULL, id_number_hash = NULL, id_number_masked = NULL,
                            id_region = NULL, birth_date = NULL, age_tier = NULL, verified_at = NULL
                        WHERE user_id = ?
                        """,
                userId
        );
        log(userId, null, "REVOKED", reason, null);
    }

    public Optional<VerifiedIdentity> find(String userId) {
        if (userId == null || userId.isBlank()) {
            return Optional.empty();
        }
        return jdbcTemplate.query(
                        """
                                SELECT real_name, id_number_masked, id_region, birth_date, age_tier, verified_at, guardian_contact
                                FROM user_compliance
                                WHERE user_id = ?
                                """,
                        (rs, rowNum) -> new VerifiedIdentity(
                                rs.getString("real_name"),
                                rs.getString("id_number_masked"),
                                rs.getString("id_region"),
                                rs.getObject("birth_date", LocalDate.class),
                                AgeTier.parse(rs.getString("age_tier")),
                                rs.getObject("verified_at", LocalDateTime.class),
                                rs.getString("guardian_contact")
                        ),
                        userId)
                .stream()
                .filter(identity -> identity.verifiedAt() != null)
                .findFirst();
    }

    @Transactional
    public void updateGuardianContact(String userId, String guardianContact) {
        String contact = guardianContact == null ? "" : guardianContact.trim();
        if (contact.length() < 6) {
            throw new BusinessException("请填写有效的监护人联系方式");
        }
        int updated = jdbcTemplate.update(
                "UPDATE user_compliance SET guardian_contact = ? WHERE user_id = ?", contact, userId);
        if (updated == 0) {
            throw new BusinessException("请先完成实名认证");
        }
    }

    private void assertNotBoundToAnotherUser(String userId, String hash, String region) {
        Integer conflicts = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_compliance WHERE id_number_hash = ? AND user_id <> ?",
                Integer.class,
                hash,
                userId
        );
        if (conflicts != null && conflicts > 0) {
            throw reject(userId, region, "该证件已绑定其他账号");
        }
    }

    /**
     * Recomputes the tier from the stored birth date rather than trusting the stored tier, so a user who
     * verified at 17 is treated as an adult the day they turn 18 without any batch job.
     */
    public AgeTier resolveCurrentTier(VerifiedIdentity identity) {
        if (identity == null || identity.birthDate() == null) {
            return AgeTier.ADULT;
        }
        return AgeTier.ofBirthDate(identity.birthDate(), LocalDate.now());
    }

    private BusinessException reject(String userId, String region, String message) {
        log(userId, region, "REJECTED", message, null);
        return new BusinessException(message);
    }

    private void log(String userId, String region, String outcome, String reason, AgeTier tier) {
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO user_identity_verify_log (id, user_id, id_region, outcome, reason, age_tier, created_time)
                            VALUES (?,?,?,?,?,?,?)
                            """,
                    IdUtil.fastSimpleUUID(),
                    userId,
                    region,
                    outcome,
                    reason,
                    tier == null ? null : tier.name(),
                    LocalDateTime.now()
            );
        } catch (Exception ex) {
            // An audit write must never be the reason a user cannot verify.
            log.warn("Failed to record identity verification attempt for {}: {}", userId, ex.getMessage());
        }
    }

    private String hash(String normalizedIdNumber) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(hashSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(normalizedIdNumber.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException ex) {
            throw new BusinessException("实名认证暂不可用，请稍后重试");
        }
    }

    public record VerificationResult(AgeTier ageTier, LocalDate birthDate, String region, String maskedIdNumber) {
    }

    public record VerifiedIdentity(
            String realName,
            String maskedIdNumber,
            String region,
            LocalDate birthDate,
            AgeTier ageTierAtVerification,
            LocalDateTime verifiedAt,
            String guardianContact
    ) {
    }
}
