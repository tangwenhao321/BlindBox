package io.github.qifan777.server.box.slot.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.slot.service.MysteryBoxHintService;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("front/mystery-box/{mysteryBoxId}")
@RequiredArgsConstructor
public class MysteryBoxCabinetForFrontController {
    private final MysteryBoxPoolSlotService poolSlotService;
    private final MysteryBoxHintService hintService;

    @GetMapping("slots")
    public MysteryBoxPoolSlotService.SlotGridView slots(@PathVariable String mysteryBoxId) {
        return poolSlotService.listSlots(mysteryBoxId);
    }

    @PostMapping("slots/{slotNo}/reserve")
    public MysteryBoxPoolSlotService.SlotView reserve(@PathVariable String mysteryBoxId,
                                                      @PathVariable int slotNo) {
        return poolSlotService.reserve(mysteryBoxId, slotNo, StpUtil.getLoginIdAsString());
    }

    @DeleteMapping("slots/reserve")
    public void release(@PathVariable String mysteryBoxId) {
        poolSlotService.release(mysteryBoxId, StpUtil.getLoginIdAsString());
    }

    @GetMapping("hint/session")
    public MysteryBoxHintService.HintSessionView hintSession(@PathVariable String mysteryBoxId) {
        return hintService.session(mysteryBoxId, StpUtil.getLoginIdAsString());
    }

    @PostMapping("hint")
    public MysteryBoxHintService.HintResultView hint(@PathVariable String mysteryBoxId) {
        return hintService.hint(mysteryBoxId, StpUtil.getLoginIdAsString());
    }
}
