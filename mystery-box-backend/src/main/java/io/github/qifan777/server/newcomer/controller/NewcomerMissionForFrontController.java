package io.github.qifan777.server.newcomer.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.newcomer.service.NewcomerMissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/newcomer")
@RequiredArgsConstructor
public class NewcomerMissionForFrontController {
    private final NewcomerMissionService newcomerMissionService;

    @GetMapping("missions")
    public List<NewcomerMissionService.MissionView> missions() {
        return newcomerMissionService.listMissions(StpUtil.getLoginIdAsString());
    }

    @PostMapping("missions/{id}/claim")
    public NewcomerMissionService.MissionView claim(@PathVariable String id) {
        return newcomerMissionService.claim(StpUtil.getLoginIdAsString(), id);
    }
}
