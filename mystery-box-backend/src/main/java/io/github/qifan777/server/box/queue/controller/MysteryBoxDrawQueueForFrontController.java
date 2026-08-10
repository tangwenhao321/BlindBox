package io.github.qifan777.server.box.queue.controller;

import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("front/mystery-box/{mysteryBoxId}/draw-queue")
@RequiredArgsConstructor
public class MysteryBoxDrawQueueForFrontController {
    private final MysteryBoxDrawQueueService mysteryBoxDrawQueueService;

    @PostMapping("buyout-lock")
    public void buyoutLock(@PathVariable String mysteryBoxId) {
        mysteryBoxDrawQueueService.acquireBuyoutLock(mysteryBoxId, cn.dev33.satoken.stp.StpUtil.getLoginIdAsString());
    }

    @DeleteMapping("buyout-lock")
    public void releaseBuyoutLock(@PathVariable String mysteryBoxId) {
        mysteryBoxDrawQueueService.releaseBuyoutLock(mysteryBoxId, cn.dev33.satoken.stp.StpUtil.getLoginIdAsString());
    }

    @PostMapping("join")
    public MysteryBoxDrawQueueService.QueueStatus join(@PathVariable String mysteryBoxId) {
        return mysteryBoxDrawQueueService.joinQueue(mysteryBoxId);
    }

    @GetMapping("status")
    public MysteryBoxDrawQueueService.QueueStatus status(@PathVariable String mysteryBoxId) {
        return mysteryBoxDrawQueueService.status(mysteryBoxId, cn.dev33.satoken.stp.StpUtil.getLoginIdAsString());
    }

    @PostMapping("renew")
    public MysteryBoxDrawQueueService.QueueStatus renew(@PathVariable String mysteryBoxId) {
        String userId = cn.dev33.satoken.stp.StpUtil.getLoginIdAsString();
        return mysteryBoxDrawQueueService.renewQueue(mysteryBoxId, userId);
    }

    @PostMapping("buyout-lock/renew")
    public void renewBuyoutLock(@PathVariable String mysteryBoxId) {
        mysteryBoxDrawQueueService.renewBuyoutLock(
                mysteryBoxId,
                cn.dev33.satoken.stp.StpUtil.getLoginIdAsString()
        );
    }

    @GetMapping("buyout-lock")
    public MysteryBoxDrawQueueService.BuyoutLockView getBuyoutLock(@PathVariable String mysteryBoxId) {
        return mysteryBoxDrawQueueService.buyoutLockStatus(mysteryBoxId);
    }

    @DeleteMapping("leave")
    public void leave(@PathVariable String mysteryBoxId) {
        mysteryBoxDrawQueueService.leaveQueue(mysteryBoxId);
    }
}
