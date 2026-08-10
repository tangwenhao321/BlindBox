package io.github.qifan777.server.box.draw.support;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class DrawFeedCursorTest {

    @Test
    void encodeAndParseRoundTrip() {
        LocalDateTime time = LocalDateTime.of(2026, 5, 26, 12, 0, 0);
        String id = "abc123";
        String encoded = DrawFeedCursor.encode(time, id);
        DrawFeedCursor.Parsed parsed = DrawFeedCursor.parse(encoded);
        assertNotNull(parsed);
        assertEquals(time, parsed.createdTime());
        assertEquals(id, parsed.id());
    }

    @Test
    void blankCursorReturnsNull() {
        assertNull(DrawFeedCursor.parse(null));
        assertNull(DrawFeedCursor.parse(""));
    }
}
