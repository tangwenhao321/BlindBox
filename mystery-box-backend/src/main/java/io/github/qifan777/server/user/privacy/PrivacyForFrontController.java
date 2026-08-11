package io.github.qifan777.server.user.privacy;

import cn.dev33.satoken.annotation.SaCheckDisable;
import cn.dev33.satoken.stp.StpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * PDPL / personal-data endpoints for authenticated front users.
 * Always available when logged in (no feature flag).
 */
@RestController
@RequestMapping("front/user/privacy")
@RequiredArgsConstructor
@SaCheckDisable
@Transactional
public class PrivacyForFrontController {
    private final UserPrivacyService userPrivacyService;

    @GetMapping("export")
    public Map<String, Object> export() {
        return userPrivacyService.exportPersonalData(StpUtil.getLoginIdAsString());
    }

    @PostMapping("delete-request")
    public UserPrivacyService.DeleteRequestResult deleteRequest() {
        return userPrivacyService.requestDeletion(StpUtil.getLoginIdAsString());
    }
}
