package io.github.qifan777.server.box.draw.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Publishes a daily fairness beacon (UTC date) that is mixed into draw commits.
 * Clients can fetch today's beacon before/after draw to verify commit material.
 * Not a third-party beacon — still server-published — but binds all draws of the day to one public value.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FairnessDailyBeaconService {
    private static final DateTimeFormatter DAY = DateTimeFormatter.BASIC_ISO_DATE;
    private static final Duration TTL = Duration.ofHours(48);

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    public DailyBeacon today() {
        LocalDate day = LocalDate.now(ZoneOffset.UTC);
        return forDay(day);
    }

    public DailyBeacon forDay(LocalDate day) {
        String dayKey = DAY.format(day);
        String beacon = loadOrCreate(dayKey);
        return new DailyBeacon(dayKey, beacon);
    }

    /** Stable value mixed into commit strings. */
    public String todayBeaconValue() {
        return today().beacon();
    }

    private String loadOrCreate(String dayKey) {
        String redisKey = "fairness:daily-beacon:" + dayKey;
        if (redisTemplate != null) {
            try {
                String existing = redisTemplate.opsForValue().get(redisKey);
                if (existing != null && !existing.isBlank()) {
                    return existing;
                }
                String created = sha256Hex(dayKey + "|" + UUID.randomUUID());
                Boolean set = redisTemplate.opsForValue().setIfAbsent(redisKey, created, TTL);
                if (Boolean.TRUE.equals(set)) {
                    return created;
                }
                String raced = redisTemplate.opsForValue().get(redisKey);
                if (raced != null && !raced.isBlank()) {
                    return raced;
                }
                return created;
            } catch (Exception ex) {
                log.warn("fairness daily beacon redis failed, using ephemeral: {}", ex.getMessage());
            }
        }
        // No Redis: deterministic-ish per JVM day (not multi-instance safe).
        return sha256Hex(dayKey + "|local|" + System.getProperty("user.name", "node"));
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    public record DailyBeacon(String dayUtc, String beacon) {
    }
}
