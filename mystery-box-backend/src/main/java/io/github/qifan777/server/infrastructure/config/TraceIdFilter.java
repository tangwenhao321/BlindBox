package io.github.qifan777.server.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {
    public static final String TRACE_ID_ATTR = "traceId";
    public static final String TRACE_ID_MDC_KEY = "traceId";
    public static final String TRACE_ID_RESPONSE_HEADER = "X-Trace-Id";
    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String TRACE_ID_HEADER = "X-Trace-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String traceId = extractTraceId(request);
        request.setAttribute(TRACE_ID_ATTR, traceId);
        response.setHeader(TRACE_ID_RESPONSE_HEADER, traceId);
        MDC.put(TRACE_ID_MDC_KEY, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(TRACE_ID_MDC_KEY);
        }
    }

    private String extractTraceId(HttpServletRequest request) {
        String traceId = request.getHeader(REQUEST_ID_HEADER);
        if (isBlank(traceId)) {
            traceId = request.getHeader(TRACE_ID_HEADER);
        }
        if (isBlank(traceId)) {
            Object existing = request.getAttribute(TRACE_ID_ATTR);
            if (existing instanceof String) {
                traceId = (String) existing;
            }
        }
        if (isBlank(traceId)) {
            traceId = UUID.randomUUID().toString();
        }
        return traceId.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
