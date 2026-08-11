package io.github.qifan777.server.user.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class LoginLockoutServiceTest {

    private LoginLockoutService service;

    @BeforeEach
    void setUp() {
        service = new LoginLockoutService();
        ReflectionTestUtils.setField(service, "maxFailures", 3);
        ReflectionTestUtils.setField(service, "lockMinutes", 15);
    }

    @Test
    void locksAfterMaxFailures() {
        assertThat(service.isLocked("0901111222")).isFalse();
        service.recordFailure("0901111222");
        service.recordFailure("0901111222");
        assertThat(service.isLocked("0901111222")).isFalse();
        service.recordFailure("0901111222");
        assertThat(service.isLocked("0901111222")).isTrue();
    }

    @Test
    void clearRemovesLock() {
        service.recordFailure("0901111222");
        service.recordFailure("0901111222");
        service.recordFailure("0901111222");
        service.clear("0901111222");
        assertThat(service.isLocked("0901111222")).isFalse();
    }
}
