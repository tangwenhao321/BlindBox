package io.github.qifan777.server.infrastructure.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class IdempotencyKeyFilterTest {

    private final IdempotencyKeyFilter filter = new IdempotencyKeyFilter();

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

    private boolean invokeMandatoryIdempotency(MockHttpServletRequest request) throws Exception {
        Method method = IdempotencyKeyFilter.class.getDeclaredMethod("mandatoryIdempotency", jakarta.servlet.http.HttpServletRequest.class);
        method.setAccessible(true);
        return (boolean) method.invoke(filter, request);
    }
}
