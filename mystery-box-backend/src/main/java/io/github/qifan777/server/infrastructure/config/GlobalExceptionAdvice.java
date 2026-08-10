package io.github.qifan777.server.infrastructure.config;

import cn.dev33.satoken.exception.DisableServiceException;
import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotRoleException;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.qifan.infrastructure.common.exception.SystemException;
import io.qifan.infrastructure.common.model.R;
import io.qifan.infrastructure.security.AuthErrorCode;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.ArrayList;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionAdvice {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<R<String>> handleBusinessException(BusinessException e) {
        log.warn("业务异常, traceId={}, message={}", resolveTraceId(), e.getMessage());
        return withTraceHeader(ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(R.fail(e.getResultCode(), e.getMessage())));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<R<String>> handleIllegalArgument(IllegalArgumentException e) {
        String message = e.getMessage();
        if (message == null || message.isBlank()) {
            message = "参数错误";
        }
        log.warn("参数异常, traceId={}, message={}", resolveTraceId(), message);
        return withTraceHeader(ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(R.fail(ResultCode.ParamSetIllegal, message)));
    }

    @ExceptionHandler(SystemException.class)
    public ResponseEntity<R<String>> handleSystemException(SystemException e) {
        log.error("系统异常, traceId={}", resolveTraceId(), e);
        return withTraceHeader(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(R.fail(ResultCode.SystemError)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<R<String>> handleException(Exception e) {
        log.error("系统异常, traceId={}", resolveTraceId(), e);
        return withTraceHeader(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(R.fail(ResultCode.SystemError)));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<R<String>> handleValidateException(ConstraintViolationException e) {
        log.warn("校验异常, traceId={}", resolveTraceId(), e);
        ArrayList<ConstraintViolation<?>> constraintViolations = new ArrayList<>(e.getConstraintViolations());
        return withTraceHeader(ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(R.fail(ResultCode.ValidateError, constraintViolations.get(0).getMessage())));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<R<String>> handleValidateExceptionForSpring(MethodArgumentNotValidException e) {
        log.warn("校验异常, traceId={}", resolveTraceId(), e);
        return withTraceHeader(ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(R.fail(ResultCode.ValidateError,
                        e.getBindingResult().getAllErrors().get(0).getDefaultMessage())));
    }

    @ExceptionHandler(NotLoginException.class)
    public ResponseEntity<R<String>> handleNotLogin(NotLoginException e) {
        log.warn("未登录, traceId={}", resolveTraceId());
        return withTraceHeader(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(R.fail(AuthErrorCode.USER_PERMISSION_UNAUTHENTICATED)));
    }

    @ExceptionHandler(NotRoleException.class)
    public ResponseEntity<R<String>> handleNotRole(NotRoleException e) {
        log.warn("角色校验异常, traceId={}, message={}", resolveTraceId(), e.getMessage());
        return withTraceHeader(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(R.fail(ResultCode.NotGrant, e.getMessage())));
    }

    @ExceptionHandler(DisableServiceException.class)
    public ResponseEntity<R<String>> handleDisabledException(DisableServiceException e) {
        log.warn("账号封禁, traceId={}", resolveTraceId());
        return withTraceHeader(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(R.fail(ResultCode.StatusHasInvalid, "账号已被封禁")));
    }

    private ResponseEntity<R<String>> withTraceHeader(ResponseEntity<R<String>> entity) {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            attrs.getResponse().setHeader(TraceIdFilter.TRACE_ID_RESPONSE_HEADER, resolveTraceId());
        }
        return entity;
    }

    private String resolveTraceId() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "N/A";
        }
        Object traceId = attrs.getRequest().getAttribute(TraceIdFilter.TRACE_ID_ATTR);
        if (traceId instanceof String traceText && !traceText.isBlank()) {
            return traceText;
        }
        return "N/A";
    }
}
