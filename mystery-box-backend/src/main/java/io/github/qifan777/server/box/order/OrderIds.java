package io.github.qifan777.server.box.order;

import cn.hutool.core.util.IdUtil;

/** Numeric identifiers for commerce orders (snowflake). Legacy rows may use UUID-style ids. */
public final class OrderIds {

    private OrderIds() {
    }

    public static String next() {
        return IdUtil.getSnowflakeNextIdStr();
    }

    /** Snowflake ids are numeric strings, typically 18–19 digits. */
    public static boolean isSnowflake(String id) {
        if (id == null || id.isBlank() || id.length() > 20) {
            return false;
        }
        for (int i = 0; i < id.length(); i++) {
            if (!Character.isDigit(id.charAt(i))) {
                return false;
            }
        }
        return id.length() >= 10;
    }

    /** Legacy Jimmer UUID ids stored without dashes (32 hex chars). */
    public static boolean isLegacyUuid(String id) {
        if (id == null || id.isBlank()) {
            return false;
        }
        String normalized = id.replace("-", "");
        if (normalized.length() != 32) {
            return false;
        }
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
                return false;
            }
        }
        return true;
    }

    public static String formatKind(String id) {
        if (isSnowflake(id)) {
            return "SNOWFLAKE";
        }
        if (isLegacyUuid(id)) {
            return "LEGACY_UUID";
        }
        return "OTHER";
    }
}
