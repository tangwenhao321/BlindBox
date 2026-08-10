package io.github.qifan777.server.user.privacy;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NicknameMaskServiceTest {

    @Test
    void masksUserIdWithPrefix() {
        NicknameMaskService service = new NicknameMaskService();
        String masked = service.maskUserId("abc123456789", "欧皇");
        assertTrue(masked.startsWith("欧皇"));
        assertTrue(masked.length() > "欧皇".length());
    }

    @Test
    void prefersNicknameWhenPresent() {
        NicknameMaskService service = new NicknameMaskService();
        assertEquals("小明", service.displayName("uid", "小明"));
    }
}
