package io.github.qifan777.server.user.compliance;

import java.time.LocalDate;
import java.time.Period;

/**
 * Age bands that drive spend caps and reveal-audio limits for minors.
 *
 * <p>The bands follow the usual minor-protection split rather than a single 18+ cutoff: a 17 year old
 * and a 12 year old are both minors but warrant very different treatment, and a flat ban on under-18s
 * would be both unenforceable and commercially pointless. {@code spendRatio} is a fraction of the
 * platform cap so the same tiers work in any currency.
 */
public enum AgeTier {
    /** Under 8: no purchases, mute reveal audio. */
    CHILD(0, 8, 0d, 0d),
    /** 8-15: token spend only, quiet reveals. */
    YOUNG_TEEN(8, 16, 0.05d, 0.5d),
    /** 16-17: reduced spend (plus a hard daily cap), softened reveals. */
    TEEN(16, 18, 0.15d, 0.7d),
    ADULT(18, Integer.MAX_VALUE, 1d, 1d);

    private final int minAgeInclusive;
    private final int maxAgeExclusive;
    private final double spendRatio;
    private final double audioVolumeScale;

    AgeTier(int minAgeInclusive, int maxAgeExclusive, double spendRatio, double audioVolumeScale) {
        this.minAgeInclusive = minAgeInclusive;
        this.maxAgeExclusive = maxAgeExclusive;
        this.spendRatio = spendRatio;
        this.audioVolumeScale = audioVolumeScale;
    }

    /** Fraction of the platform spend cap this tier is allowed. {@code 0} means purchases are blocked. */
    public double spendRatio() {
        return spendRatio;
    }

    /** Multiplier applied to reveal sound volume, so an unattended child does not get a full-blast ceremony. */
    public double audioVolumeScale() {
        return audioVolumeScale;
    }

    public boolean purchaseAllowed() {
        return spendRatio > 0d;
    }

    public boolean minor() {
        return this != ADULT;
    }

    public int minAgeInclusive() {
        return minAgeInclusive;
    }

    public int maxAgeExclusive() {
        return maxAgeExclusive;
    }

    public static AgeTier ofAge(int age) {
        for (AgeTier tier : values()) {
            if (age >= tier.minAgeInclusive && age < tier.maxAgeExclusive) {
                return tier;
            }
        }
        return age < 0 ? CHILD : ADULT;
    }

    public static AgeTier ofBirthDate(LocalDate birthDate, LocalDate today) {
        if (birthDate == null) {
            return ADULT;
        }
        return ofAge(Period.between(birthDate, today).getYears());
    }

    public static AgeTier parse(String value) {
        if (value == null || value.isBlank()) {
            return ADULT;
        }
        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return ADULT;
        }
    }
}
