package io.github.qifan777.server.newcomer.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.newcomer.service.NewcomerMissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("admin/newcomer/missions")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box")
public class NewcomerMissionForAdminController {

    @GetMapping("template")
    public List<MissionTemplateView> template() {
        return NewcomerMissionService.templateDefinitions().stream()
                .map(item -> new MissionTemplateView(
                        item.dayIndex(),
                        item.missionKey(),
                        item.title(),
                        item.target(),
                        item.rewardCoins(),
                        item.rewardHintCards()
                ))
                .toList();
    }

    public record MissionTemplateView(
            int dayIndex,
            String missionKey,
            String title,
            int target,
            int rewardCoins,
            int rewardHintCards
    ) {
    }
}
