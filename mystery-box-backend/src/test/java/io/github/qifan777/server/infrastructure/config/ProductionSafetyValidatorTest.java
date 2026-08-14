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
        ReflectionTestUtils.setField(validator, "smsProvider", "vn_esms");
        assertFalse((Boolean) ReflectionTestUtils.invokeMethod(validator, "isUnsafeSmsProvider"));
    }

    @Test
    void rejectsPlaceholderIdentityHashSecret() {
        assertTrue(ProductionSafetyValidator.isUnsafeIdentityHashSecret(""));
        assertTrue(ProductionSafetyValidator.isUnsafeIdentityHashSecret("CHANGE_ME_IDENTITY_HASH_SECRET"));
        assertTrue(ProductionSafetyValidator.isUnsafeIdentityHashSecret("CHANGE_ME"));
        assertTrue(ProductionSafetyValidator.isUnsafeIdentityHashSecret("placeholder"));
        assertFalse(ProductionSafetyValidator.isUnsafeIdentityHashSecret("prod-identity-hash-9f3a2c1b"));
    }

    @Test
    void prodVnWarnsWhenIdentityProviderStillLocal() throws Exception {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod-vn");
        ProductionSafetyValidator validator = new ProductionSafetyValidator(env);
        ReflectionTestUtils.setField(validator, "identityProvider", "local");
        Method method = ProductionSafetyValidator.class.getDeclaredMethod("warnLocalIdentityOnProdVn");
        method.setAccessible(true);
        method.invoke(validator);

        ReflectionTestUtils.setField(validator, "identityProvider", "ekyc_vendor");
        method.invoke(validator);
    }

    @Test
    void warnAppAttestScaffoldRefusesBootUntilVerifyImplemented() throws Exception {
        MockEnvironment env = new MockEnvironment();
        ProductionSafetyValidator validator = new ProductionSafetyValidator(env);
        ReflectionTestUtils.setField(validator, "iosAppAttestEnabled", true);
        ReflectionTestUtils.setField(validator, "iosAppAttestRequireHeader", true);
        Method method = ProductionSafetyValidator.class.getDeclaredMethod("warnAppAttestScaffold");
        method.setAccessible(true);
        try {
            method.invoke(validator);
            org.junit.jupiter.api.Assertions.fail("expected IllegalStateException");
        } catch (java.lang.reflect.InvocationTargetException ex) {
            assertTrue(ex.getCause() instanceof IllegalStateException);
            assertTrue(ex.getCause().getMessage().contains("App Attest"));
        }
    }

    @Test
    void refuseAppleIapUntilWired() throws Exception {
        ProductionSafetyValidator validator = new ProductionSafetyValidator(new MockEnvironment());
        ReflectionTestUtils.setField(validator, "appleIapEnabled", true);
        Method method = ProductionSafetyValidator.class.getDeclaredMethod("refuseAppleIapUntilWired");
        method.setAccessible(true);
        try {
            method.invoke(validator);
            org.junit.jupiter.api.Assertions.fail("expected IllegalStateException");
        } catch (java.lang.reflect.InvocationTargetException ex) {
            assertTrue(ex.getCause() instanceof IllegalStateException);
            assertTrue(ex.getCause().getMessage().contains("apple.iap"));
        }
    }

    @Test
    void warnVnEsmsUnwiredInvokesWhenProviderSetWithoutZalo() throws Exception {
        ProductionSafetyValidator validator = new ProductionSafetyValidator(new MockEnvironment());
        ReflectionTestUtils.setField(validator, "smsProvider", "vn_esms");
        ReflectionTestUtils.setField(validator, "zaloEnabled", false);
        Method method = ProductionSafetyValidator.class.getDeclaredMethod("warnVnEsmsUnwired");
        method.setAccessible(true);
        method.invoke(validator);
    }
}
