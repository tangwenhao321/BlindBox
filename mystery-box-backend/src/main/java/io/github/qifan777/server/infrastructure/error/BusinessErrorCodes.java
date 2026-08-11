package io.github.qifan777.server.infrastructure.error;

import io.qifan.infrastructure.common.constants.BaseEnum;
import io.qifan.infrastructure.common.exception.BusinessException;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves a stable SCREAMING_SNAKE {@code errorCode} for mobile clients.
 */
public final class BusinessErrorCodes {
    private static final Pattern TOKEN_PREFIX = Pattern.compile("^([A-Z][A-Z0-9_]{2,})\\s*:");

    private BusinessErrorCodes() {
    }

    public static String resolve(BusinessException exception) {
        if (exception == null) {
            return null;
        }
        BaseEnum resultCode = exception.getResultCode();
        if (resultCode instanceof Enum<?> enumerated) {
            String enumName = enumerated.name();
            if (isStableToken(enumName)) {
                return enumName;
            }
        }
        return tokenFromMessage(exception.getMessage());
    }

    public static String tokenFromMessage(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        Matcher matcher = TOKEN_PREFIX.matcher(message.trim());
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private static boolean isStableToken(String name) {
        return name != null && name.length() >= 3 && name.matches("[A-Z][A-Z0-9_]+");
    }
}
