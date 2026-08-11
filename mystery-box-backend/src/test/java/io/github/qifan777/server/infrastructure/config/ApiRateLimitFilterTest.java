package io.github.qifan777.server.infrastructure.config;

import io.github.qifan777.server.infrastructure.util.ClientIpResolver;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiRateLimitFilterTest {
    private static ApiRateLimitFilter newFilter() {
        ApiRateLimitFilter filter = new ApiRateLimitFilter();
        ClientIpResolver resolver = new ClientIpResolver();
        ReflectionTestUtils.setField(resolver, "trustedProxy", false);
        ReflectionTestUtils.setField(filter, "clientIpResolver", resolver);
        return filter;
    }

    @Test
    void blocksWhenExceedPerMinuteLimit() throws Exception {
        ApiRateLimitFilter filter = newFilter();
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "perMinute", 1);
        ReflectionTestUtils.setField(filter, "orderCreatePerMinute", 1);

        MockHttpServletRequest req1 = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        req1.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse resp1 = new MockHttpServletResponse();
        filter.doFilter(req1, resp1, new MockFilterChain());
        assertEquals(200, resp1.getStatus());

        MockHttpServletRequest req2 = new MockHttpServletRequest("POST", "/front/mystery-box-order/create");
        req2.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse resp2 = new MockHttpServletResponse();
        filter.doFilter(req2, resp2, new MockFilterChain());
        assertEquals(429, resp2.getStatus());
    }

    @Test
    void blocksRepeatedSpectatorGetRequests() throws Exception {
        ApiRateLimitFilter filter = newFilter();
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "spectatorGetPerMinute", 1);

        MockHttpServletRequest req1 = new MockHttpServletRequest("GET", "/front/reveal/spectator/tok-abc");
        req1.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse resp1 = new MockHttpServletResponse();
        filter.doFilter(req1, resp1, new MockFilterChain());
        assertEquals(200, resp1.getStatus());

        MockHttpServletRequest req2 = new MockHttpServletRequest("GET", "/front/reveal/spectator/tok-abc");
        req2.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse resp2 = new MockHttpServletResponse();
        filter.doFilter(req2, resp2, new MockFilterChain());
        assertEquals(429, resp2.getStatus());
    }
}
