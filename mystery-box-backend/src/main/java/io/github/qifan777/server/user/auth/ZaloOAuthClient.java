package io.github.qifan777.server.user.auth;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * Zalo OAuth v4 HTTP client.
 * <ul>
 *   <li>Token: {@code POST https://oauth.zaloapp.com/v4/access_token}
 *       (form: app_id, code, grant_type=authorization_code, code_verifier?; header: secret_key)</li>
 *   <li>Profile: {@code GET https://graph.zalo.me/v2.0/me?fields=id,name,picture}
 *       (headers: access_token, appsecret_proof)</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ZaloOAuthClient {
    private final RestTemplate restTemplate;
    private final JsonMapper objectMapper;
    private final ZaloProperties properties;

    public String exchangeCodeForAccessToken(String code, String codeVerifier) {
        if (!StringUtils.hasText(code)) {
            throw new BusinessException("ZALO_LOGIN_INVALID: Missing authorization code");
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("app_id", properties.resolveAppId());
        form.add("code", code.trim());
        form.add("grant_type", "authorization_code");
        if (StringUtils.hasText(codeVerifier)) {
            form.add("code_verifier", codeVerifier.trim());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("secret_key", properties.resolveAppSecret());

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    properties.getTokenUrl(),
                    HttpMethod.POST,
                    new HttpEntity<>(form, headers),
                    String.class
            );
            JsonNode root = objectMapper.readTree(response.getBody() == null ? "{}" : response.getBody());
            String accessToken = text(root, "access_token");
            if (!StringUtils.hasText(accessToken)) {
                String err = text(root, "error_name");
                String desc = text(root, "error_description");
                log.warn("Zalo token exchange failed: error={}, desc={}", err, desc);
                throw new BusinessException("ZALO_LOGIN_FAILED: Token exchange failed"
                        + (StringUtils.hasText(err) ? " (" + err + ")" : ""));
            }
            return accessToken;
        } catch (BusinessException e) {
            throw e;
        } catch (RestClientException e) {
            log.warn("Zalo token endpoint unreachable: {}", e.getMessage());
            throw new BusinessException("ZALO_LOGIN_FAILED: Token endpoint unreachable");
        } catch (Exception e) {
            log.warn("Zalo token parse error: {}", e.getMessage());
            throw new BusinessException("ZALO_LOGIN_FAILED: Invalid token response");
        }
    }

    public ZaloProfile fetchProfile(String accessToken) {
        if (!StringUtils.hasText(accessToken)) {
            throw new BusinessException("ZALO_LOGIN_INVALID: Missing access token");
        }
        String url = UriComponentsBuilder.fromUriString(properties.getProfileUrl())
                .queryParam("fields", "id,name,picture")
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("access_token", accessToken.trim());
        headers.set("appsecret_proof", appsecretProof(accessToken.trim(), properties.resolveAppSecret()));

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );
            JsonNode root = objectMapper.readTree(response.getBody() == null ? "{}" : response.getBody());
            int error = root.path("error").asInt(0);
            if (error != 0) {
                log.warn("Zalo profile error {}: {}", error, text(root, "message"));
                throw new BusinessException("ZALO_LOGIN_FAILED: Profile fetch failed");
            }
            String id = text(root, "id");
            if (!StringUtils.hasText(id)) {
                throw new BusinessException("ZALO_LOGIN_FAILED: Profile missing id");
            }
            String name = text(root, "name");
            String picture = null;
            JsonNode picNode = root.path("picture");
            if (picNode.isTextual()) {
                picture = picNode.asText();
            } else if (picNode.isObject()) {
                picture = text(picNode.path("data"), "url");
            }
            return new ZaloProfile(id, name, picture);
        } catch (BusinessException e) {
            throw e;
        } catch (RestClientException e) {
            log.warn("Zalo profile endpoint unreachable: {}", e.getMessage());
            throw new BusinessException("ZALO_LOGIN_FAILED: Profile endpoint unreachable");
        } catch (Exception e) {
            log.warn("Zalo profile parse error: {}", e.getMessage());
            throw new BusinessException("ZALO_LOGIN_FAILED: Invalid profile response");
        }
    }

    static String appsecretProof(String accessToken, String appSecret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(accessToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute appsecret_proof", e);
        }
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String s = value.asText();
        return StringUtils.hasText(s) ? s : null;
    }

    public record ZaloProfile(String id, String name, String pictureUrl) {
    }
}
