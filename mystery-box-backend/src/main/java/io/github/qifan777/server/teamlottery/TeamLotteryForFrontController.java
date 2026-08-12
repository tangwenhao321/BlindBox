package io.github.qifan777.server.teamlottery;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.util.ClientIpResolver;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.babyfish.jimmer.client.ApiIgnore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@ApiIgnore
@RestController
@RequestMapping("front/team-lottery")
@RequiredArgsConstructor
public class TeamLotteryForFrontController {
    private final TeamLotteryService teamLotteryService;
    private final ClientIpResolver clientIpResolver;
    private final UserComplianceService userComplianceService;

    @PostMapping
    public TeamLotteryService.TeamView create(@RequestBody CreateRequest body, HttpServletRequest request) {
        String userId = StpUtil.getLoginIdAsString();
        userComplianceService.assertAgeConfirmed(userId);
        return teamLotteryService.create(
                userId,
                body.boxId(),
                body.deviceId(),
                body.phoneHash(),
                clientIpResolver.resolve(request)
        );
    }

    @PostMapping("join")
    public TeamLotteryService.TeamView join(@RequestBody JoinRequest body, HttpServletRequest request) {
        String userId = StpUtil.getLoginIdAsString();
        userComplianceService.assertAgeConfirmed(userId);
        return teamLotteryService.join(
                userId,
                body.inviteCode(),
                body.deviceId(),
                body.phoneHash(),
                clientIpResolver.resolve(request)
        );
    }

    @GetMapping("mine")
    public List<TeamLotteryService.TeamView> mine() {
        return teamLotteryService.mine(StpUtil.getLoginIdAsString());
    }

    @GetMapping("{id}")
    public TeamLotteryService.TeamView get(@PathVariable String id) {
        return teamLotteryService.get(id, StpUtil.getLoginIdAsString());
    }

    @GetMapping("{id}/members")
    public List<TeamLotteryService.MemberView> members(@PathVariable String id) {
        return teamLotteryService.get(id, StpUtil.getLoginIdAsString()).members();
    }

    @PostMapping("{id}/lock")
    public TeamLotteryService.TeamView lock(@PathVariable String id) {
        return teamLotteryService.lock(StpUtil.getLoginIdAsString(), id);
    }

    @PostMapping("{id}/draw")
    public TeamLotteryService.DrawResult draw(@PathVariable String id, @RequestBody DrawRequest body) {
        String userId = StpUtil.getLoginIdAsString();
        userComplianceService.assertAgeConfirmed(userId);
        // hitHidden from client is ignored; server derives HIDDEN from paid order prizes.
        return teamLotteryService.consumeDraw(
                userId,
                id,
                body.orderId(),
                body.resultJson()
        );
    }

    @GetMapping("{id}/chat")
    public List<TeamLotteryService.ChatMessage> chat(@PathVariable String id, @RequestParam(defaultValue = "50") int limit) {
        return teamLotteryService.listChat(id, StpUtil.getLoginIdAsString(), limit);
    }

    @PostMapping("{id}/chat")
    public void postChat(@PathVariable String id, @RequestBody ChatRequest body) {
        teamLotteryService.postChat(id, StpUtil.getLoginIdAsString(), body.msgType(), body.body());
    }

    public record CreateRequest(String boxId, String deviceId, String phoneHash) {
    }

    public record JoinRequest(String inviteCode, String deviceId, String phoneHash) {
    }

    public record DrawRequest(String orderId, Boolean hitHidden, String resultJson) {
    }

    public record ChatRequest(String msgType, String body) {
    }
}
