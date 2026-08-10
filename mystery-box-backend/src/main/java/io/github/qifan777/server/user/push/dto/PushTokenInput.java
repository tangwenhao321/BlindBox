package io.github.qifan777.server.user.push.dto;

import jakarta.validation.constraints.NotBlank;

public record PushTokenInput(
        @NotBlank String expoPushToken,
        String platform
) {
}
