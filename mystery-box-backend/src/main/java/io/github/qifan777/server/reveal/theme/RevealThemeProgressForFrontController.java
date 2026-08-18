package io.github.qifan777.server.reveal.theme;

import cn.dev33.satoken.stp.StpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("front/reveal/theme-progress")
@RequiredArgsConstructor
@Transactional
public class RevealThemeProgressForFrontController {

    private final RevealThemeProgressService revealThemeProgressService;

    @GetMapping
    public RevealThemeProgressView get() {
        return revealThemeProgressService.get(StpUtil.getLoginIdAsString());
    }

    @PostMapping
    public RevealThemeProgressView recordOpen(@RequestBody RecordOpenRequest body) {
        return revealThemeProgressService.recordOpen(
                StpUtil.getLoginIdAsString(),
                body == null ? null : body.orderId(),
                body != null && Boolean.TRUE.equals(body.hasHidden()),
                body != null && Boolean.TRUE.equals(body.seriesComplete())
        );
    }

    @PutMapping("equipped")
    public RevealThemeProgressView equip(@RequestBody EquipRequest body) {
        return revealThemeProgressService.equip(
                StpUtil.getLoginIdAsString(),
                body == null ? null : body.equippedThemeId()
        );
    }

    public record RecordOpenRequest(String orderId, Boolean hasHidden, Boolean seriesComplete) {
    }

    public record EquipRequest(String equippedThemeId) {
    }
}
