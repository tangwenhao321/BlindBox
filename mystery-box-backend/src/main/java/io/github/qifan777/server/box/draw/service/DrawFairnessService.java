package io.github.qifan777.server.box.draw.service;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class DrawFairnessService {
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");
    private static final int MAX_CLIENT_NONCE_LEN = 64;

    private final FairnessDailyBeaconService fairnessDailyBeaconService;

    /**
     * Issue a server seed and public commit.
     * Commit = sha256(seed[|nonce][|beacon:daily]) so clients can bind nonce + published daily beacon.
     */
    public FairnessToken issue(String userId, String mysteryBoxId, String orderId) {
        return issue(userId, mysteryBoxId, orderId, null);
    }

    public FairnessToken issue(String userId, String mysteryBoxId, String orderId, String clientNonce) {
        String seed = IdUtil.fastSimpleUUID();
        String nonce = normalizeNonce(clientNonce);
        FairnessDailyBeaconService.DailyBeacon daily = fairnessDailyBeaconService.today();
        return new FairnessToken(seed, commitOf(seed, nonce, daily.beacon()), nonce, daily.dayUtc(), daily.beacon());
    }

    public String commitOf(String seed) {
        return commitOf(seed, null, fairnessDailyBeaconService.todayBeaconValue());
    }

    public String commitOf(String seed, String clientNonce) {
        return commitOf(seed, clientNonce, fairnessDailyBeaconService.todayBeaconValue());
    }

    public String commitOf(String seed, String clientNonce, String beacon) {
        if (seed == null || seed.isBlank()) {
            return null;
        }
        String nonce = normalizeNonce(clientNonce);
        StringBuilder material = new StringBuilder(seed);
        if (nonce != null) {
            material.append('|').append(nonce);
        }
        if (StringUtils.hasText(beacon)) {
            material.append("|beacon:").append(beacon.trim());
        }
        return sha256Hex(material.toString());
    }

    public boolean verifyCommit(String seed, String commit, String clientNonce) {
        return verifyCommit(seed, commit, clientNonce, fairnessDailyBeaconService.todayBeaconValue());
    }

    public boolean verifyCommit(String seed, String commit, String clientNonce, String beacon) {
        if (seed == null || commit == null) {
            return false;
        }
        return commit.equalsIgnoreCase(commitOf(seed, clientNonce, beacon));
    }

    public String hash(String seed, String userId, String mysteryBoxId, String orderId, String productId, LocalDateTime createdTime) {
        String payload = String.join("|",
                seed,
                userId,
                mysteryBoxId,
                orderId,
                productId,
                TS.format(createdTime)
        );
        return sha256Hex(payload);
    }

    public boolean verify(String seed, String hash, String userId, String mysteryBoxId, String orderId,
                          String productId, LocalDateTime createdTime) {
        if (seed == null || hash == null) {
            return false;
        }
        return hash.equals(hash(seed, userId, mysteryBoxId, orderId, productId, createdTime));
    }

    private static String normalizeNonce(String clientNonce) {
        if (!StringUtils.hasText(clientNonce)) {
            return null;
        }
        String trimmed = clientNonce.trim();
        if (trimmed.length() > MAX_CLIENT_NONCE_LEN) {
            trimmed = trimmed.substring(0, MAX_CLIENT_NONCE_LEN);
        }
        if (!trimmed.matches("[A-Za-z0-9_-]+")) {
            return null;
        }
        return trimmed;
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public record FairnessToken(String seed, String commit, String clientNonce, String beaconDayUtc, String beacon) {
    }
}
