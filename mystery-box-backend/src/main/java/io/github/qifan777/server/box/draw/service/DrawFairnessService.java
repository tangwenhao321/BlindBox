package io.github.qifan777.server.box.draw.service;

import cn.hutool.core.util.IdUtil;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

@Service
public class DrawFairnessService {
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");
    private static final int MAX_CLIENT_NONCE_LEN = 64;

    /**
     * Issue a server seed and public commit.
     * When {@code clientNonce} is present, commit = sha256(seed|nonce) so the client can bind entropy.
     */
    public FairnessToken issue(String userId, String mysteryBoxId, String orderId) {
        return issue(userId, mysteryBoxId, orderId, null);
    }

    public FairnessToken issue(String userId, String mysteryBoxId, String orderId, String clientNonce) {
        String seed = IdUtil.fastSimpleUUID();
        String nonce = normalizeNonce(clientNonce);
        return new FairnessToken(seed, commitOf(seed, nonce), nonce);
    }

    public String commitOf(String seed) {
        return commitOf(seed, null);
    }

    public String commitOf(String seed, String clientNonce) {
        if (seed == null || seed.isBlank()) {
            return null;
        }
        String nonce = normalizeNonce(clientNonce);
        String material = nonce == null ? seed : seed + "|" + nonce;
        return sha256Hex(material);
    }

    public boolean verifyCommit(String seed, String commit, String clientNonce) {
        if (seed == null || commit == null) {
            return false;
        }
        return commit.equalsIgnoreCase(commitOf(seed, clientNonce));
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

    /** @param commit sha256(seed) or sha256(seed|clientNonce) */
    public record FairnessToken(String seed, String commit, String clientNonce) {
    }
}
