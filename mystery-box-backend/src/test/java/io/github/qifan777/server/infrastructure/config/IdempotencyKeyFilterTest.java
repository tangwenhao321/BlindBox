package io.github.qifan777.server.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class IdempotencyKeyFilterTest {

    private final IdempotencyKeyFilter filter = new IdempotencyKeyFilter();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "ttlMs", 900_000L);
        ReflectionTestUtils.setField(filter, "distributed", false);
        ReflectionTestUtils.setField(filter, "required", false);
        ReflectionTestUtils.setField(filter, "redisTemplate", null);
    }

    @Test
    void orderQueryPostDoesNotRequireIdempotencyKey() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/front/mystery-box-order/query");
        assertThat(invokeMandatoryIdempotency(request)).isFalse();
    }

    @Test
    void orderCreatePostRequiresIdempotencyKey() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        assertThat(invokeMandatoryIdempotency(request)).isTrue();
    }

    @Test
    void orderCalculatePostDoesNotRequireIdempotencyKey() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/front/mystery-box-order/calculate");
        assertThat(invokeMandatoryIdempotency(request)).isFalse();
    }

    @Test
    void marketplaceBuyPostRequiresIdempotencyKey() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/front/marketplace/listings/abc/buy");
        assertThat(invokeMandatoryIdempotency(request)).isTrue();
    }

    @Test
    void prepayPostRequiresIdempotencyKey() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/front/mystery-box-order/id/prepay/vnpay");
        assertThat(invokeMandatoryIdempotency(request)).isTrue();
    }

    @Test
    void orderCalculatePostDoesNotRequireIdempotencyKeyEvenWhenRequired() throws Exception {
        ReflectionTestUtils.setField(filter, "required", true);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/front/mystery-box-order/calculate");
        assertThat(invokeMandatoryIdempotency(request)).isFalse();
        ReflectionTestUtils.setField(filter, "required", false);
    }

    @Test
    void missingKeyOnMandatoryPathReturnsIdempotencyKeyRequired() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentAsString()).contains("IDEMPOTENCY_KEY_REQUIRED");
    }

    @Test
    void duplicateSuccessfulRequestReplaysCachedBody() throws Exception {
        String body = "{\"code\":0,\"data\":\"ok\"}";
        FilterChain successChain = (req, res) -> {
            HttpServletResponse http = (HttpServletResponse) res;
            http.setStatus(200);
            http.setContentType("application/json");
            http.getWriter().write(body);
        };

        MockHttpServletRequest first = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        first.addHeader("x-idempotency-key", "key-1");
        MockHttpServletResponse firstResp = new MockHttpServletResponse();
        filter.doFilter(first, firstResp, successChain);
        assertThat(firstResp.getStatus()).isEqualTo(200);
        assertThat(firstResp.getContentAsString()).isEqualTo(body);

        FilterChain mustNotRun = (req, res) -> {
            throw new IllegalStateException("controller must not re-execute");
        };
        MockHttpServletRequest second = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        second.addHeader("x-idempotency-key", "key-1");
        MockHttpServletResponse secondResp = new MockHttpServletResponse();
        filter.doFilter(second, secondResp, mustNotRun);
        assertThat(secondResp.getStatus()).isEqualTo(200);
        assertThat(secondResp.getContentAsString()).isEqualTo(body);
    }

    @Test
    void inFlightDuplicateReturnsIdempotencyInProgress() throws Exception {
        FilterChain hangThenOk = (req, res) -> {
            MockHttpServletRequest concurrent = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
            concurrent.addHeader("x-idempotency-key", "inflight-1");
            MockHttpServletResponse concurrentResp = new MockHttpServletResponse();
            filter.doFilter(concurrent, concurrentResp, (r, s) -> {
                throw new IllegalStateException("should not run");
            });
            assertThat(concurrentResp.getStatus()).isEqualTo(409);
            assertThat(concurrentResp.getContentAsString()).contains("IDEMPOTENCY_IN_PROGRESS");

            HttpServletResponse http = (HttpServletResponse) res;
            http.setStatus(200);
            http.setContentType("application/json");
            http.getWriter().write("{\"ok\":true}");
        };

        MockHttpServletRequest first = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        first.addHeader("x-idempotency-key", "inflight-1");
        MockHttpServletResponse firstResp = new MockHttpServletResponse();
        filter.doFilter(first, firstResp, hangThenOk);
        assertThat(firstResp.getStatus()).isEqualTo(200);
    }

    @Test
    void failedResponseReleasesClaimSoRetryCanProceed() throws Exception {
        FilterChain failOnce = (req, res) -> {
            HttpServletResponse http = (HttpServletResponse) res;
            http.setStatus(500);
            http.getWriter().write("{\"code\":500}");
        };
        MockHttpServletRequest first = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        first.addHeader("x-idempotency-key", "retry-1");
        MockHttpServletResponse firstResp = new MockHttpServletResponse();
        filter.doFilter(first, firstResp, failOnce);
        assertThat(firstResp.getStatus()).isEqualTo(500);

        String okBody = "{\"code\":0}";
        FilterChain success = (req, res) -> {
            HttpServletResponse http = (HttpServletResponse) res;
            http.setStatus(200);
            http.getWriter().write(okBody);
        };
        MockHttpServletRequest second = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        second.addHeader("x-idempotency-key", "retry-1");
        MockHttpServletResponse secondResp = new MockHttpServletResponse();
        filter.doFilter(second, secondResp, success);
        assertThat(secondResp.getStatus()).isEqualTo(200);
        assertThat(secondResp.getContentAsString()).isEqualTo(okBody);
    }

    private boolean invokeMandatoryIdempotency(MockHttpServletRequest request) throws Exception {
        Method method = IdempotencyKeyFilter.class.getDeclaredMethod("mandatoryIdempotency", jakarta.servlet.http.HttpServletRequest.class);
        method.setAccessible(true);
        return (boolean) method.invoke(filter, request);
    }
}
