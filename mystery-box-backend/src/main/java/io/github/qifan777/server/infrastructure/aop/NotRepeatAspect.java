package io.github.qifan777.server.infrastructure.aop;


import cn.dev33.satoken.stp.StpUtil;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

@Aspect
@Slf4j
@Component
@AllArgsConstructor
public class NotRepeatAspect {

    public static final String USER_INVOKE = "user:invoke:";
    private final StringRedisTemplate redisTemplate;

    @Pointcut("@annotation(notRepeat)")
    private void notRepeatPoints(NotRepeat notRepeat) {
    }

    @Around(value = "notRepeatPoints(notRepeat)", argNames = "joinPoint,notRepeat")
    public Object forbidRepeat(ProceedingJoinPoint joinPoint, NotRepeat notRepeat) throws Throwable {
        String lockKey = buildLockKey(joinPoint);
        Boolean ifAbsent = redisTemplate.opsForValue().setIfAbsent(lockKey, "", 10, TimeUnit.SECONDS);
        if (ifAbsent == null || !ifAbsent) {
            throw new BusinessException(ResultCode.StatusHasInvalid, "请勿重复操作");
        }
        try {
            return joinPoint.proceed();
        } finally {
            redisTemplate.delete(lockKey);
        }

    }

    private String buildLockKey(ProceedingJoinPoint joinPoint) {
        String loginId = StpUtil.getLoginIdAsString();
        String method = ((MethodSignature) joinPoint.getSignature()).toShortString();
        String uri = "unknown";
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            uri = attrs.getRequest().getRequestURI();
        }
        int argsHash = Arrays.deepHashCode(
                Arrays.stream(joinPoint.getArgs())
                        .filter(Objects::nonNull)
                        .limit(2)
                        .toArray()
        );
        return USER_INVOKE + loginId + ":" + uri + ":" + method + ":" + argsHash;
    }
}
