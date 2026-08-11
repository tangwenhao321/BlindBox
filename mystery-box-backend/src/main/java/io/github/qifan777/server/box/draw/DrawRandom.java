package io.github.qifan777.server.box.draw;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * The single source of randomness for anything a user can win.
 *
 * <p>When an order fairness seed is bound via {@link #bindSeed(String)}, draws for that thread are
 * deterministic from the seed (verifiable). Otherwise {@link SecureRandom} is used.
 */
public final class DrawRandom {
    private static final SecureRandom FALLBACK = new SecureRandom();
    private static final ThreadLocal<SecureRandom> BOUND = new ThreadLocal<>();

    private DrawRandom() {
    }

    /** Bind a per-order fairness seed for the current thread (call clearSeed in finally). */
    public static void bindSeed(String seed) {
        if (seed == null || seed.isBlank() || "PENDING".equalsIgnoreCase(seed)) {
            BOUND.remove();
            return;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(seed.getBytes(StandardCharsets.UTF_8));
            SecureRandom random = SecureRandom.getInstance("SHA1PRNG");
            random.setSeed(hash);
            BOUND.set(random);
        } catch (Exception ex) {
            BOUND.remove();
        }
    }

    public static void clearSeed() {
        BOUND.remove();
    }

    private static SecureRandom rng() {
        SecureRandom bound = BOUND.get();
        return bound != null ? bound : FALLBACK;
    }

    /** Uniform value in {@code [0, boundExclusive)}. */
    public static int nextInt(int boundExclusive) {
        if (boundExclusive <= 0) {
            return 0;
        }
        return rng().nextInt(boundExclusive);
    }

    /** One element chosen uniformly, or {@code null} for an empty list. */
    public static <T> T pickOne(List<T> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        return candidates.get(nextInt(candidates.size()));
    }

    /**
     * {@code count} distinct elements chosen uniformly. Mirrors the previous behaviour of returning the
     * whole list when {@code count} covers it, so a small prize pool still fills a large draw.
     */
    public static <T> List<T> pickDistinct(List<T> candidates, int count) {
        if (candidates == null || candidates.isEmpty() || count <= 0) {
            return List.of();
        }
        if (count >= candidates.size()) {
            return List.copyOf(candidates);
        }
        List<T> shuffled = new ArrayList<>(candidates);
        Collections.shuffle(shuffled, rng());
        return List.copyOf(shuffled.subList(0, count));
    }
}
