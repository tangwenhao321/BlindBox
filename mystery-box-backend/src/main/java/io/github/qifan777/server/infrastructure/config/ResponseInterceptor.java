package io.github.qifan777.server.infrastructure.config;

import tools.jackson.databind.json.JsonMapper;
import io.qifan.infrastructure.common.model.R;
import lombok.AllArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
@RestControllerAdvice(basePackages = "io.github.qifan777")
@Slf4j
@AllArgsConstructor
public class ResponseInterceptor implements ResponseBodyAdvice<Object> {

    private final JsonMapper objectMapper;

    @Override
    public boolean supports(MethodParameter returnType, Class converterType) {
        return true;
    }

    @SneakyThrows
    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType,
                                  MediaType selectedContentType, Class selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (shouldKeepRawResponse(returnType, request)) {
            return body;
        }
        if (body instanceof byte[]) {
            return body;
        }
        if (body instanceof R) {
            return body;
        }
        if (body instanceof String) {
            response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            return objectMapper.writeValueAsString(R.ok(body));
        }
        if (body == null) {
            return body;
        }
        log.debug("响应结果：{}", body);
        return R.ok(body);

    }

    private boolean shouldKeepRawResponse(MethodParameter returnType, ServerHttpRequest request) {
        if (returnType.getContainingClass().isAnnotationPresent(RawResponse.class) || returnType.hasMethodAnnotation(RawResponse.class)) {
            return true;
        }
        String path = request.getURI().getPath();
        return path != null && path.contains("/notify/");
    }
}
