package io.github.qifan777.server.payment.gateway;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

final class VNPaySignatureUtil {
    private VNPaySignatureUtil() {
    }

    static String hmacSha512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("VNPay HMAC failed", ex);
        }
    }

    static String buildSignedQuery(Map<String, String> params, String hashSecret) {
        List<String> keys = new ArrayList<>(params.keySet());
        Collections.sort(keys);
        String hashData = keys.stream()
                .filter(k -> params.get(k) != null && !params.get(k).isBlank())
                .map(k -> k + "=" + params.get(k))
                .collect(Collectors.joining("&"));
        String secureHash = hmacSha512(hashSecret, hashData);
        return keys.stream()
                .filter(k -> params.get(k) != null && !params.get(k).isBlank())
                .map(k -> urlEncode(k) + "=" + urlEncode(params.get(k)))
                .collect(Collectors.joining("&")) + "&vnp_SecureHash=" + secureHash;
    }

    static boolean verify(Map<String, String> params, String hashSecret) {
        String received = params.get("vnp_SecureHash");
        if (received == null || received.isBlank()) {
            return false;
        }
        Map<String, String> copy = params.entrySet().stream()
                .filter(e -> !"vnp_SecureHash".equals(e.getKey()) && !"vnp_SecureHashType".equals(e.getKey()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        List<String> keys = new ArrayList<>(copy.keySet());
        Collections.sort(keys);
        String hashData = keys.stream()
                .filter(k -> copy.get(k) != null && !copy.get(k).isBlank())
                .map(k -> k + "=" + copy.get(k))
                .collect(Collectors.joining("&"));
        return received.equalsIgnoreCase(hmacSha512(hashSecret, hashData));
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
