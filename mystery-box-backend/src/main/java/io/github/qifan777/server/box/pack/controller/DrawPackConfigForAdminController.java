package io.github.qifan777.server.box.pack.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
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

    @GetMapping
    public List<DrawPackConfigView> list() {
        return drawPackConfigService.listAll();
    }

    @PostMapping
    public DrawPackConfigView save(@RequestBody DrawPackConfigView input) {
        return drawPackConfigService.save(input);
    }

    @DeleteMapping("{id}")
    public void delete(@PathVariable String id) {
        drawPackConfigService.delete(id);
    }
}
