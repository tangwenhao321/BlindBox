package io.github.qifan777.server.infrastructure.error;

import io.qifan.infrastructure.common.constants.BaseEnum;
import io.qifan.infrastructure.common.model.R;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Failure payload that keeps the standard {@link R} shape and adds a stable string {@code errorCode}
 * (same field name as {@code IdempotencyKeyFilter}).
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ErrorR extends R<String> {
    private String errorCode;

    public static ErrorR fail(BaseEnum resultCode, String msg, String errorCode) {
        ErrorR body = new ErrorR();
        body.setCode(resultCode.getCode());
        body.setMsg(msg);
        body.setResult(null);
        body.setErrorCode(errorCode);
        return body;
    }
}
