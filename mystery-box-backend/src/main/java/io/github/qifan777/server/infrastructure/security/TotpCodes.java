package io.github.qifan777.server.infrastructure.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;

/** Minimal RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) — no extra dependency. */
public final class TotpCodes {
    private static final int STEP_SECONDS = 30;
    private static final int DIGITS = 6;

    private TotpCodes() {
    }

    public static boolean matches(String base32Secret, String code) {
        if (base32Secret == null || base32Secret.isBlank() || code == null || code.isBlank()) {
            return false;
        }
        String normalized = code.trim().replace(" ", "");
        if (!normalized.matches("\\d{" + DIGITS + "}")) {
            return false;
        }
        long counter = System.currentTimeMillis() / 1000L / STEP_SECONDS;
        try {
            byte[] key = decodeBase32(base32Secret.trim());
            for (long skew = -1; skew <= 1; skew++) {
                String candidate = formatCode(hotp(key, counter + skew));
                if (constantTimeEquals(candidate, normalized)) {
                    return true;
                }
            }
            return false;
        } catch (Exception ex) {
            return false;
        }
    }

    private static int hotp(byte[] key, long counter) throws GeneralSecurityException {
        byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(data);
        int offset = hash[hash.length - 1] & 0x0F;
        int binary =
                ((hash[offset] & 0x7F) << 24)
                        | ((hash[offset + 1] & 0xFF) << 16)
                        | ((hash[offset + 2] & 0xFF) << 8)
                        | (hash[offset + 3] & 0xFF);
        int mod = 1;
        for (int i = 0; i < DIGITS; i++) {
            mod *= 10;
        }
        return binary % mod;
    }

    private static String formatCode(int value) {
        String raw = Integer.toString(value);
        if (raw.length() >= DIGITS) {
            return raw.substring(raw.length() - DIGITS);
        }
        return "0".repeat(DIGITS - raw.length()) + raw;
    }

    private static byte[] decodeBase32(String input) {
        String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        String cleaned = input.replace("=", "").replace(" ", "").toUpperCase();
        int buffer = 0;
        int bitsLeft = 0;
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        for (int i = 0; i < cleaned.length(); i++) {
            int val = alphabet.indexOf(cleaned.charAt(i));
            if (val < 0) {
                throw new IllegalArgumentException("invalid base32");
            }
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return out.toByteArray();
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
