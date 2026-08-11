package io.github.qifan777.server.user.root.service;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class UserPasswordPolicyTest {

    @Test
    void acceptsLetterAndDigitEightPlus() {
        assertDoesNotThrow(() -> UserService.assertPasswordPolicy("abcd1234"));
    }

    @Test
    void rejectsShortOrLettersOnly() {
        assertThrows(BusinessException.class, () -> UserService.assertPasswordPolicy("abc123"));
        assertThrows(BusinessException.class, () -> UserService.assertPasswordPolicy("abcdefgh"));
        assertThrows(BusinessException.class, () -> UserService.assertPasswordPolicy("12345678"));
    }
}
