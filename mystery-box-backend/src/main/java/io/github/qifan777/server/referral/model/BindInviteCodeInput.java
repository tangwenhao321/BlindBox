package io.github.qifan777.server.referral.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BindInviteCodeInput {
    @NotBlank
    private String inviteCode;
}
