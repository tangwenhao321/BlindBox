package io.github.qifan777.server.user.auth;

import tools.jackson.databind.json.JsonMapper;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ZaloOAuthClientTest {

    @Mock
    private RestTemplate restTemplate;

    private ZaloProperties properties;
    private ZaloOAuthClient client;

    @BeforeEach
    void setUp() {
        properties = new ZaloProperties();
        properties.setClientId("app-123");
        properties.setClientSecret("secret-xyz");
        client = new ZaloOAuthClient(restTemplate, JsonMapper.shared(), properties);
    }

    @Test
    void exchangeCodePostsToOfficialTokenEndpointWithSecretHeader() {
        when(restTemplate.exchange(
                eq("https://oauth.zaloapp.com/v4/access_token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(String.class)
        )).thenReturn(ResponseEntity.ok("{\"access_token\":\"tok-1\",\"refresh_token\":\"r\",\"expires_in\":3600}"));

        String token = client.exchangeCodeForAccessToken("auth-code", "verifier-abc");
        assertThat(token).isEqualTo("tok-1");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<MultiValueMap<String, String>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                eq("https://oauth.zaloapp.com/v4/access_token"),
                eq(HttpMethod.POST),
                captor.capture(),
                eq(String.class)
        );
        HttpEntity<MultiValueMap<String, String>> entity = captor.getValue();
        assertThat(entity.getHeaders().getFirst("secret_key")).isEqualTo("secret-xyz");
        assertThat(entity.getBody().getFirst("app_id")).isEqualTo("app-123");
        assertThat(entity.getBody().getFirst("code")).isEqualTo("auth-code");
        assertThat(entity.getBody().getFirst("grant_type")).isEqualTo("authorization_code");
        assertThat(entity.getBody().getFirst("code_verifier")).isEqualTo("verifier-abc");
    }

    @Test
    void fetchProfileUsesGraphMeAndAppsecretProof() {
        when(restTemplate.exchange(
                eq("https://graph.zalo.me/v2.0/me?fields=id,name,picture"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)
        )).thenReturn(ResponseEntity.ok("""
                {"error":0,"message":"Success","id":"3681046936240438345","name":"Tun","picture":{"data":{"url":"https://cdn.example/a.jpg"}}}
                """));

        ZaloOAuthClient.ZaloProfile profile = client.fetchProfile("access-tok");
        assertThat(profile.id()).isEqualTo("3681046936240438345");
        assertThat(profile.name()).isEqualTo("Tun");
        assertThat(profile.pictureUrl()).isEqualTo("https://cdn.example/a.jpg");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<Void>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                eq("https://graph.zalo.me/v2.0/me?fields=id,name,picture"),
                eq(HttpMethod.GET),
                captor.capture(),
                eq(String.class)
        );
        assertThat(captor.getValue().getHeaders().getFirst("access_token")).isEqualTo("access-tok");
        assertThat(captor.getValue().getHeaders().getFirst("appsecret_proof"))
                .isEqualTo(ZaloOAuthClient.appsecretProof("access-tok", "secret-xyz"));
    }

    @Test
    void exchangeCodeFailsWhenTokenMissing() {
        when(restTemplate.exchange(
                eq("https://oauth.zaloapp.com/v4/access_token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(String.class)
        )).thenReturn(ResponseEntity.ok("{\"error\":-14016,\"error_name\":\"Invalid code\"}"));

        assertThatThrownBy(() -> client.exchangeCodeForAccessToken("bad", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ZALO_LOGIN_FAILED");
    }

    @Test
    void appIdAliasFallsBackWhenClientIdBlank() {
        properties.setClientId("");
        properties.setAppId("alias-app");
        properties.setClientSecret("");
        properties.setAppSecret("alias-secret");
        assertThat(properties.isConfigured()).isTrue();
        assertThat(properties.resolveAppId()).isEqualTo("alias-app");
        assertThat(properties.resolveAppSecret()).isEqualTo("alias-secret");
    }

    @Test
    void syntheticPhoneFitsColumn() {
        assertThat(ZaloAuthService.syntheticPhone("3681046936240438345")).isEqualTo("zalo:3681046936240438345");
        assertThat(ZaloAuthService.syntheticPhone("x".repeat(80)).length()).isLessThanOrEqualTo(32);
    }
}
