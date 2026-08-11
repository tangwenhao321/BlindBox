package io.github.qifan777.server.user.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("front/auth/sms")
@RequiredArgsConstructor
public class AuthSmsForFrontController {
    private final AuthSmsSendService authSmsSendService;

    @PostMapping("send")
    public boolean send(@RequestParam String phone) {
        return authSmsSendService.send(phone);
    }
}
