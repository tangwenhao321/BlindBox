package io.github.qifan777.server.user.root.entity.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Passwordless SMS login (phone + OTP).
 */
public record UserSmsLoginInput(
        @NotBlank String phone,
        @NotBlank String code
) {
}
