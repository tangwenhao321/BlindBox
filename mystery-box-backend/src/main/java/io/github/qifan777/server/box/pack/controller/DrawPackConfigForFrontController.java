package io.github.qifan777.server.box.pack.controller;

import io.github.qifan777.server.box.pack.model.DrawPackConfigView;
import io.github.qifan777.server.box.pack.service.DrawPackConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("front/mystery-box/draw-pack-configs")
@RequiredArgsConstructor
public class DrawPackConfigForFrontController {
    private final DrawPackConfigService drawPackConfigService;

    @GetMapping
    public List<DrawPackConfigView> list() {
        return drawPackConfigService.listEnabled();
    }
}
