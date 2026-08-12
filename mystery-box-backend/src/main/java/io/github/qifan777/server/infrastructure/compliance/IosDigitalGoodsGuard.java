package io.github.qifan777.server.infrastructure.compliance;

import io.qifan.infrastructure.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * App Store Guideline 3.1.1 — block digital wallet / fragment loops for iOS App Store clients.
 * <p>
 * Signals (any may trigger the block):
 * <ul>
 *   <li>{@code X-Client-Platform: ios}</li>
 *   <li>missing platform when {@code fail-closed=true}</li>
 *   <li>{@code X-App-Channel} matching App Store channel (blocks platform spoof)</li>
 * </ul>
 * Optional HMAC attestation and App Attest header raise the bar until full Apple verify is wired.
 */
@Component
public class IosDigitalGoodsGuard {

    public static final String HEADER = "X-Client-Platform";
    public static final String CHANNEL_HEADER = "X-App-Channel";
    public static final String ATTESTATION_HEADER = "X-Client-Attestation";
    /** Interim / real App Attest assertion (base64). Full Apple verify is a follow-up. */
    public static final String APP_ATTEST_HEADER = "X-Apple-App-Attest";

    @Value("${security.ios.digital-goods.fail-closed:false}")
    private boolean failClosed;

    @Value("${security.ios.digital-goods.require-attestation:false}")
    private boolean requireAttestation;

    @Value("${security.ios.digital-goods.app-store-channel:appstore}")
    private String appStoreChannel;

    @Value("${security.client-attestation-secret:}")
    private String attestationSecret;

    /** When true, App Store-channel clients must present {@link #APP_ATTEST_HEADER}. */
    @Value("${security.ios.app-attest.enabled:false}")
    private boolean appAttestEnabled;

    /**
     * When true with {@code enabled}, blank/missing App Attest header fails closed.
     * When false, header is accepted if present but not required (scaffold / canary).
     */
    @Value("${security.ios.app-attest.require-header:false}")
    private boolean appAttestRequireHeader;

    public void rejectIfIosAppStoreClient() {
        HttpServletRequest request = currentRequest();
        String platform = resolveHeader(request, HEADER);
        String channel = resolveHeader(request, CHANNEL_HEADER);
        boolean treatAsAppStore =
                (platform != null && platform.equalsIgnoreCase("ios"))
                        || (failClosed && !StringUtils.hasText(platform))
                        || isAppStoreChannel(channel);
        if (!treatAsAppStore) {
            return;
        }
        assertAppAttestIfRequired(request);
        assertAttestationIfRequired(request);
        throw new BusinessException("IOS_DIGITAL_GOODS_BLOCKED");
    }

    private boolean isAppStoreChannel(String channel) {
        return StringUtils.hasText(appStoreChannel)
                && StringUtils.hasText(channel)
                && appStoreChannel.trim().equalsIgnoreCase(channel.trim());
    }

    private void assertAppAttestIfRequired(HttpServletRequest request) {
        if (!appAttestEnabled) {
            return;
        }
        String provided = resolveHeader(request, APP_ATTEST_HEADER);
        if (!StringUtils.hasText(provided)) {
            if (appAttestRequireHeader) {
                throw new BusinessException("IOS_APP_ATTEST_REQUIRED");
            }
            return;
        }
        // Interim scaffold: non-blank header accepted. Optional HMAC shape when secret is set
        // (prefix app-attest|) until DeviceCheck/App Attest server verify is integrated.
        if (StringUtils.hasText(attestationSecret) && appAttestRequireHeader) {
            long bucket = System.currentTimeMillis() / 300_000L;
            String expected = hmacSha256Hex(attestationSecret.trim(), "app-attest|" + bucket);
            String expectedPrev = hmacSha256Hex(attestationSecret.trim(), "app-attest|" + (bucket - 1));
            String normalized = provided.trim().toLowerCase();
            boolean hmacShape = constantTimeEquals(expected, normalized)
                    || constantTimeEquals(expectedPrev, normalized);
            // Accept either HMAC interim token or opaque Apple assertion (length gate).
            if (!hmacShape && provided.trim().length() < 32) {
                throw new BusinessException("IOS_APP_ATTEST_INVALID");
            }
        }
    }

    private void assertAttestationIfRequired(HttpServletRequest request) {
        if (!requireAttestation || !StringUtils.hasText(attestationSecret)) {
            return;
        }
        assertAttestation(request);
    }

    private void assertAttestation(HttpServletRequest request) {
        if (request == null) {
            throw new BusinessException("IOS_DIGITAL_GOODS_BLOCKED");
        }
        String provided = request.getHeader(ATTESTATION_HEADER);
        if (!StringUtils.hasText(provided)) {
            throw new BusinessException("IOS_CLIENT_ATTESTATION_REQUIRED");
        }
        long bucket = System.currentTimeMillis() / 300_000L;
        String expected = hmacSha256Hex(attestationSecret.trim(), buildAttestationPayload(request, bucket));
        String expectedPrev = hmacSha256Hex(attestationSecret.trim(), buildAttestationPayload(request, bucket - 1));
        String normalized = provided.trim().toLowerCase();
        if (!constantTimeEquals(expected, normalized) && !constantTimeEquals(expectedPrev, normalized)) {
            throw new BusinessException("IOS_CLIENT_ATTESTATION_INVALID");
        }
    }

    private static String buildAttestationPayload(HttpServletRequest request, long bucket) {
        String path = request.getRequestURI() == null ? "" : request.getRequestURI();
        String method = request.getMethod() == null ? "" : request.getMethod();
        return method + "|" + path + "|" + bucket;
    }

    private static String hmacSha256Hex(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("attestation hmac failed", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }

    private static HttpServletRequest currentRequest() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        return attrs.getRequest();
    }

    private static String resolveHeader(HttpServletRequest request, String name) {
        if (request == null) {
            return null;
        }
        String header = request.getHeader(name);
        return header == null ? null : header.trim();
    }
}
