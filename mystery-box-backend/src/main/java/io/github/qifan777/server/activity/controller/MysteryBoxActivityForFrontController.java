package io.github.qifan777.server.activity.controller;

import io.github.qifan777.server.activity.service.MysteryBoxActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("front/activities")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxActivityForFrontController {
    private final MysteryBoxActivityService mysteryBoxActivityService;

    @GetMapping("active")
    public List<MysteryBoxActivityService.ActivityView> active() {
        return mysteryBoxActivityService.active();
    }

    @GetMapping("{id}")
    public MysteryBoxActivityService.ActivityDetailView detail(@PathVariable String id) {
        return mysteryBoxActivityService.detail(id);
    }
}
