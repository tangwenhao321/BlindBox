package io.github.qifan777.server.box.win.service;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRule;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinHitLog;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinHitLogDraft;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLog;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLogDraft;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleDraft;
import io.github.qifan777.server.box.win.repository.MysteryBoxWinHitLogRepository;
import io.github.qifan777.server.box.win.repository.MysteryBoxWinRuleOpLogRepository;
import io.github.qifan777.server.box.win.repository.MysteryBoxWinRuleRepository;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class MysteryBoxWinRuleService {

    private final MysteryBoxWinRuleRepository mysteryBoxWinRuleRepository;
    private final MysteryBoxWinHitLogRepository mysteryBoxWinHitLogRepository;
    private final MysteryBoxWinRuleOpLogRepository mysteryBoxWinRuleOpLogRepository;
    private final ProductRepository productRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final Map<String, Long> opCounters = new LinkedHashMap<>();

    @Value("${app.fairness.allow-win-rule-override:false}")
    private boolean allowWinRuleOverride = false;

    public String createRule(String userId,
                             String mysteryBoxId,
                             String productId,
                             int remainingCount,
                             String remark) {
        assertOverrideAllowed("CREATE");
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(mysteryBoxId) || !StringUtils.hasText(productId)) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "用户、盲盒、商品不能为空");
        }
        if (remainingCount <= 0) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "生效次数必须大于0");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "指定商品不存在"));
        boolean inBox = mysteryBoxRepository.findById(mysteryBoxId, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "盲盒不存在"))
                .products()
                .stream()
                .anyMatch(p -> p.id().equals(product.id()));
        if (!inBox) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "指定商品不在该盲盒中");
        }
        MysteryBoxWinRule entity = MysteryBoxWinRuleDraft.$.produce(draft -> draft
                .setUserId(userId)
                .setMysteryBoxId(mysteryBoxId)
                .setProductId(productId)
                .setRemainingCount(remainingCount)
                .setEnabled(false)
                .setApproved(false)
                .setRemark(StringUtils.hasText(remark) ? remark : ""));
        String id = mysteryBoxWinRuleRepository.save(entity).id();
        logRuleOperation(id, "CREATE_PENDING", "规则已创建，待审批");
        return id;
    }

    public Optional<MysteryBoxWinRule> findFirstActiveRule(String userId, String mysteryBoxId) {
        return mysteryBoxWinRuleRepository.findFirstActiveRule(userId, mysteryBoxId);
    }

    public void consumeOne(MysteryBoxWinRule rule) {
        if (!consumeOneAtomic(rule)) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "指定中奖次数已用尽");
        }
    }

    /** CAS decrement remaining_count; false when concurrent consume emptied the rule. */
    public boolean consumeOneAtomic(MysteryBoxWinRule rule) {
        return mysteryBoxWinRuleRepository.consumeOneAtomic(rule.id());
    }

    public void setEnabled(String id, boolean enabled) {
        if (enabled) {
            assertOverrideAllowed("ENABLE");
        }
        MysteryBoxWinRule rule = mysteryBoxWinRuleRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "规则不存在"));
        if (!rule.approved()) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "规则尚未审批通过，不能启停");
        }
        MysteryBoxWinRule updated = MysteryBoxWinRuleDraft.$.produce(rule, draft -> draft.setEnabled(enabled));
        mysteryBoxWinRuleRepository.save(updated);
        logRuleOperation(id, enabled ? "ENABLE" : "DISABLE", "切换启用状态");
    }

    public void approveRule(String id) {
        assertOverrideAllowed("APPROVE");
        MysteryBoxWinRule rule = mysteryBoxWinRuleRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "规则不存在"));
        if (rule.approved()) {
            return;
        }
        MysteryBoxWinRule updated = MysteryBoxWinRuleDraft.$.produce(rule, draft -> draft
                .setApproved(true)
                .setApprovedById(StpUtil.getLoginIdAsString())
                .setApprovedTime(LocalDateTime.now())
                .setEnabled(true));
        mysteryBoxWinRuleRepository.save(updated);
        logRuleOperation(id, "APPROVE", "规则审批通过并启用");
    }

    public void deleteRule(String id) {
        mysteryBoxWinRuleRepository.deleteById(id);
        logRuleOperation(id, "DELETE", "规则已删除");
    }

    public void recordHit(String ruleId,
                          String userId,
                          String mysteryBoxOrderId,
                          String mysteryBoxOrderItemId,
                          String mysteryBoxId,
                          String originalProductId,
                          String designatedProductId,
                          String remark) {
        MysteryBoxWinHitLog log = MysteryBoxWinHitLogDraft.$.produce(draft -> draft
                .setRuleId(ruleId)
                .setUserId(userId)
                .setMysteryBoxOrderId(mysteryBoxOrderId)
                .setMysteryBoxOrderItemId(mysteryBoxOrderItemId)
                .setMysteryBoxId(mysteryBoxId)
                .setOriginalProductId(originalProductId)
                .setDesignatedProductId(designatedProductId)
                .setRemark(StringUtils.hasText(remark) ? remark : ""));
        mysteryBoxWinHitLogRepository.save(log);
    }

    public List<MysteryBoxWinHitLog> queryLatestLogs(int limit) {
        return mysteryBoxWinHitLogRepository.findLatest(limit <= 0 ? 50 : Math.min(limit, 500));
    }

    public List<MysteryBoxWinHitLog> queryLatestLogs(int limit,
                                                     String userId,
                                                     String mysteryBoxOrderId,
                                                     LocalDateTime createdTimeStart,
                                                     LocalDateTime createdTimeEnd) {
        int safeLimit = limit <= 0 ? 50 : Math.min(limit, 500);
        return mysteryBoxWinHitLogRepository.findLatestWithFilters(
                safeLimit,
                userId,
                mysteryBoxOrderId,
                createdTimeStart,
                createdTimeEnd
        );
    }

    public List<MysteryBoxWinRuleOpLog> queryLatestOpLogs(int limit) {
        return mysteryBoxWinRuleOpLogRepository.findLatest(limit <= 0 ? 50 : limit);
    }

    public Map<String, Long> queryOpCounters() {
        return new LinkedHashMap<>(opCounters);
    }

    private void assertOverrideAllowed(String action) {
        if (!allowWinRuleOverride) {
            throw new BusinessException(
                    "WIN_RULE_DISABLED: 指定中奖已关闭（app.fairness.allow-win-rule-override=false），无法"
                            + action);
        }
    }

    private void logRuleOperation(String ruleId, String action, String detail) {
        String operatorId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : "system";
        MysteryBoxWinRuleOpLog log = MysteryBoxWinRuleOpLogDraft.$.produce(draft -> draft
                .setRuleId(ruleId)
                .setAction(action)
                .setOperatorId(operatorId)
                .setDetail(detail));
        mysteryBoxWinRuleOpLogRepository.save(log);
        opCounters.put(action, opCounters.getOrDefault(action, 0L) + 1);
    }
}
