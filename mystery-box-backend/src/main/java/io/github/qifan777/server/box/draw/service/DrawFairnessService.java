package io.github.qifan777.server.box.draw.service;

import cn.hutool.core.util.IdUtil;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

@Service
public class DrawFairnessService {
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");

    public FairnessToken issue(String userId, String mysteryBoxId, String orderId) {
        String seed = IdUtil.fastSimpleUUID();
        return new FairnessToken(seed, null);
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

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public record FairnessToken(String seed, String hash) {
    }
}
