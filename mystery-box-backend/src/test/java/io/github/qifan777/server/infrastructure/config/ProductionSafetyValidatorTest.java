package io.github.qifan777.server.infrastructure.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionSafetyValidatorTest {

    @Test
    void detectsProductionProfile() throws Exception {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev", "prod");
        ProductionSafetyValidator validator = new ProductionSafetyValidator(env);
        Method method = ProductionSafetyValidator.class.getDeclaredMethod("isProductionProfile");
        method.setAccessible(true);
        assertTrue((Boolean) method.invoke(validator));
    }

    @Test
    void nonProductionProfile() throws Exception {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev", "private");
        ProductionSafetyValidator validator = new ProductionSafetyValidator(env);
        Method method = ProductionSafetyValidator.class.getDeclaredMethod("isProductionProfile");
        method.setAccessible(true);
        assertFalse((Boolean) method.invoke(validator));
    }

    @Test
    void rejectsDefaultOtpPlaceholder() {
        ProductionSafetyValidator validator = new ProductionSafetyValidator(new MockEnvironment());
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(validator, "isDefaultOrWeakOtp", "CHANGE_ME_IN_PRIVATE_YML"));
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(validator, "isDefaultOrWeakOtp", "11111111"));
        assertFalse((Boolean) ReflectionTestUtils.invokeMethod(validator, "isDefaultOrWeakOtp", "ProdOtp2026!"));
    }

    @Test
    void rejectsWildcardCors() {
        ProductionSafetyValidator validator = new ProductionSafetyValidator(new MockEnvironment());
        ReflectionTestUtils.setField(validator, "corsAllowedOriginPatterns", "*");
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(validator, "isUnsafeCors"));
        ReflectionTestUtils.setField(validator, "corsAllowedOriginPatterns", "https://admin.example.com");
        assertFalse((Boolean) ReflectionTestUtils.invokeMethod(validator, "isUnsafeCors"));
    }

    @Test
    void rejectsUnsafeSmsProvider() {
        ProductionSafetyValidator validator = new ProductionSafetyValidator(new MockEnvironment());
        ReflectionTestUtils.setField(validator, "smsProvider", "none");
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(validator, "isUnsafeSmsProvider"));
        ReflectionTestUtils.setField(validator, "smsProvider", "ali_yun");
        assertFalse((Boolean) ReflectionTestUtils.invokeMethod(validator, "isUnsafeSmsProvider"));
    }
}
