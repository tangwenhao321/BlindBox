package io.github.qifan777.server.box.pack.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import io.github.qifan777.server.box.draw.BoxProfitabilityService;
import io.github.qifan777.server.box.pack.model.DrawPackConfigView;
import io.github.qifan777.server.box.pack.service.DrawPackConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("admin/mystery-box/draw-pack-configs")
@RequiredArgsConstructor
@SaCheckRole("管理员")
public class DrawPackConfigForAdminController {
    private final DrawPackConfigService drawPackConfigService;
    private final BoxProfitabilityService boxProfitabilityService;

    @GetMapping
    public List<DrawPackConfigView> list() {
        return drawPackConfigService.listAll();
    }

    @PostMapping
    public DrawPackConfigView save(@RequestBody DrawPackConfigView input) {
        DrawPackConfigView saved = drawPackConfigService.save(input);
        if (saved.enabled()) {
            boxProfitabilityService.recheckAllBoxesForPackChange();
        }
        return saved;
    }

    @DeleteMapping("{id}")
    public void delete(@PathVariable String id) {
        drawPackConfigService.delete(id);
        boxProfitabilityService.recheckAllBoxesForPackChange();
    }
}
