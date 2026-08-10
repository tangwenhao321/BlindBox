package io.github.qifan777.server.box.draw.support;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public final class DrawFeedCursor {
    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private DrawFeedCursor() {
    }

    public record Parsed(LocalDateTime createdTime, String id) {
    }

    public static String encode(LocalDateTime createdTime, String id) {
        return FORMAT.format(createdTime) + "|" + id;
    }

    public static Parsed parse(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        int sep = cursor.indexOf('|');
        if (sep <= 0 || sep >= cursor.length() - 1) {
            return null;
        }
        LocalDateTime time = LocalDateTime.parse(cursor.substring(0, sep), FORMAT);
        String id = cursor.substring(sep + 1);
        return new Parsed(time, id);
    }
}
