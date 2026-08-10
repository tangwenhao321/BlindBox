package io.github.qifan777.server.referral.service;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrderTable;
import io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.referral.entity.ReferralCommissionRecord;
import io.github.qifan777.server.referral.entity.ReferralCommissionRecordDraft;
import io.github.qifan777.server.referral.entity.dto.ReferralCommissionRecordSpec;
import io.github.qifan777.server.referral.model.ReferralMilestonesView;
import io.github.qifan777.server.referral.model.ReferralStatsView;
import io.github.qifan777.server.referral.model.TeamMemberView;
import io.github.qifan777.server.referral.repository.ReferralCommissionRecordRepository;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.entity.UserTable;
import io.github.qifan777.server.user.root.entity.UserBalanceLogDraft;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@AllArgsConstructor
@Transactional
public class ReferralService {
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.05");
    private static final List<InviteMilestoneDef> INVITE_MILESTONES = List.of(
            new InviteMilestoneDef(1, 20, "下级开盒返 5% 佣金到余额"),
            new InviteMilestoneDef(3, 30, "累计邀请奖励"),
            new InviteMilestoneDef(5, 50, "累计邀请奖励"),
            new InviteMilestoneDef(10, 100, "累计邀请奖励")
    );
    private static final Set<ProductOrderStatus> OPENED_STATUSES = Set.of(
            ProductOrderStatus.TO_BE_DELIVERED,
            ProductOrderStatus.TO_BE_RECEIVED,
            ProductOrderStatus.FINISHED,
            ProductOrderStatus.TO_BE_EVALUATED
    );

    private final UserRepository userRepository;
    private final UserBalanceLogRepository userBalanceLogRepository;
    private final ReferralCommissionRecordRepository referralCommissionRecordRepository;
    private final JdbcTemplate jdbcTemplate;

    private record InviteMilestoneDef(int targetCount, int rewardCoins, String perkHint) {
        String label() {
            if (targetCount == 1) {
                return "邀 1 人 · 幸运币 +" + rewardCoins + "，" + perkHint;
            }
            return "邀 " + targetCount + " 人 · 幸运币 +" + rewardCoins;
        }
    }

    public boolean isNewcomer(String userId) {
        MysteryBoxOrderTable orderTable = MysteryBoxOrderTable.$;
        Long count = userRepository.sql().createQuery(orderTable)
                .where(
                        orderTable.creatorId().eq(userId),
                        orderTable.status().in(OPENED_STATUSES)
                )
                .select(orderTable.id().count())
                .fetchOne();
        return count == null || count == 0;
    }

    public String ensureInviteCode(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        if (StringUtils.hasText(user.inviteCode())) {
            return user.inviteCode();
        }
        String code = generateUniqueInviteCode();
        userRepository.update(UserDraft.$.produce(draft -> draft.setId(userId).setInviteCode(code)));
        return code;
    }

    public void bindInviterOnRegister(String userId, String inviteCode) {
        if (!StringUtils.hasText(inviteCode)) {
            ensureInviteCode(userId);
            return;
        }
        UserTable userTable = UserTable.$;
        User inviter = userRepository.sql().createQuery(userTable)
                .where(userTable.inviteCode().eq(inviteCode.trim().toUpperCase()))
                .select(userTable)
                .fetchOptional()
                .orElse(null);
        String myCode = generateUniqueInviteCode();
        userRepository.update(UserDraft.$.produce(draft -> {
            draft.setId(userId).setInviteCode(myCode);
            if (inviter != null && !inviter.id().equals(userId)) {
                draft.setInviterId(inviter.id());
            }
        }));
        if (inviter != null && !inviter.id().equals(userId)) {
            syncInviteMilestoneRewards(inviter.id());
        }
    }

    public void bindInviteCode(String userId, String inviteCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        if (StringUtils.hasText(user.inviterId())) {
            throw new BusinessException(ResultCode.StatusHasValid, "已绑定邀请人，无法重复绑定");
        }
        if (!isNewcomer(userId)) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "仅未开盒用户可绑定邀请码");
        }
        bindInviterOnRegister(userId, inviteCode);
    }

    public ReferralMilestonesView milestones(String userId) {
        syncInviteMilestoneRewards(userId);
        ReferralStatsView stats = getStats(userId);
        int count = stats.invitedCount();
        List<ReferralMilestonesView.MilestoneTier> tiers = INVITE_MILESTONES.stream()
                .map(def -> new ReferralMilestonesView.MilestoneTier(
                        def.targetCount(),
                        def.label(),
                        count >= def.targetCount(),
                        def.rewardCoins(),
                        isMilestoneClaimed(userId, def.targetCount())
                ))
                .toList();
        return new ReferralMilestonesView(count, tiers);
    }

    private void syncInviteMilestoneRewards(String userId) {
        int count = countDirectInvites(userId);
        for (InviteMilestoneDef def : INVITE_MILESTONES) {
            if (count >= def.targetCount()) {
                grantMilestoneCoinsIfAbsent(userId, def.targetCount(), def.rewardCoins());
            }
        }
    }

    private int countDirectInvites(String userId) {
        UserTable userTable = UserTable.$;
        Long total = userRepository.sql().createQuery(userTable)
                .where(userTable.inviterId().eq(userId))
                .select(userTable.id().count())
                .fetchOne();
        return total == null ? 0 : total.intValue();
    }

    private boolean isMilestoneClaimed(String userId, int targetCount) {
        Integer exists = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM referral_milestone_grant
                        WHERE user_id = ? AND target_count = ?
                        """,
                Integer.class,
                userId,
                targetCount
        );
        return exists != null && exists > 0;
    }

    private void grantMilestoneCoinsIfAbsent(String userId, int targetCount, int rewardCoins) {
        if (rewardCoins <= 0 || isMilestoneClaimed(userId, targetCount)) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        int nextCoins = user.luckyCoins() + rewardCoins;
        userRepository.update(UserDraft.$.produce(draft -> draft.setId(userId).setLuckyCoins(nextCoins)));
        jdbcTemplate.update(
                """
                        INSERT INTO referral_milestone_grant (id, user_id, target_count, reward_coins, created_time)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                IdUtil.fastSimpleUUID(),
                userId,
                targetCount,
                rewardCoins,
                LocalDateTime.now()
        );
    }

    public ReferralStatsView getStats(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        String inviteCode = ensureInviteCode(userId);
        UserTable userTable = UserTable.$;
        int invitedCount = countDirectInvites(userId);
        int level2Count = (int) (long) userRepository.sql().createQuery(userTable)
                .where(userTable.inviter().inviterId().eq(userId))
                .select(userTable.id().count())
                .fetchOne();
        BigDecimal totalCommission = referralCommissionRecordRepository.sumAmountByUserId(userId);
        return new ReferralStatsView(
                inviteCode,
                invitedCount,
                level2Count,
                totalCommission,
                user.luckyCoins(),
                user.starStones()
        );
    }

    public Page<ReferralCommissionRecord> queryCommissions(String userId, QueryRequest<ReferralCommissionRecordSpec> request) {
        request.getQuery().setUserId(userId);
        return referralCommissionRecordRepository.findPage(request, ReferralCommissionRecordRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    public List<TeamMemberView> getTeamMembers(String userId, int level) {
        UserTable userTable = UserTable.$;
        List<User> users;
        if (level <= 1) {
            users = userRepository.sql().createQuery(userTable)
                    .where(userTable.inviterId().eq(userId))
                    .select(userTable)
                    .execute();
        } else {
            List<String> level1Ids = userRepository.sql().createQuery(userTable)
                    .where(userTable.inviterId().eq(userId))
                    .select(userTable.id())
                    .execute();
            if (level1Ids.isEmpty()) {
                return List.of();
            }
            users = userRepository.sql().createQuery(userTable)
                    .where(userTable.inviterId().in(level1Ids))
                    .select(userTable)
                    .execute();
        }
        return users.stream()
                .map(u -> new TeamMemberView(
                        u.id(),
                        u.nickname(),
                        maskPhone(u.phone()),
                        u.createdTime()
                ))
                .toList();
    }

    public void grantCommissionOnPayment(String buyerId, String orderId, BigDecimal payAmount) {
        if (payAmount == null || payAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        User buyer = userRepository.findById(buyerId).orElse(null);
        if (buyer == null || !StringUtils.hasText(buyer.inviterId())) {
            return;
        }
        BigDecimal commission = payAmount.multiply(COMMISSION_RATE).setScale(2, RoundingMode.HALF_UP);
        if (commission.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        String inviterId = buyer.inviterId();
        userRepository.addBalance(inviterId, commission);
        BigDecimal latestBalance = userRepository.findById(inviterId).orElseThrow().balance();
        referralCommissionRecordRepository.save(ReferralCommissionRecordDraft.$.produce(draft -> draft
                .setUserId(inviterId)
                .setSourceUserId(buyerId)
                .setOrderId(orderId)
                .setAmount(commission)
                .setRemark("下级开盒佣金")
                .setCreatedTime(LocalDateTime.now())
                .setEditedTime(LocalDateTime.now())));
        userBalanceLogRepository.save(UserBalanceLogDraft.$.produce(draft -> draft
                .setUserId(inviterId)
                .setChangeType("REFERRAL_COMMISSION")
                .setAmount(commission)
                .setBalanceAfter(latestBalance)
                .setRelatedOrderId(orderId)
                .setRemark("邀请佣金")));
    }

    private String generateUniqueInviteCode() {
        UserTable userTable = UserTable.$;
        for (int i = 0; i < 20; i++) {
            String code = RandomUtil.randomString(6).toUpperCase();
            boolean exists = userRepository.sql().createQuery(userTable)
                    .where(userTable.inviteCode().eq(code))
                    .select(userTable.id())
                    .fetchOptional()
                    .isPresent();
            if (!exists) {
                return code;
            }
        }
        throw new BusinessException("邀请码生成失败，请重试");
    }

    private static String maskPhone(String phone) {
        if (!StringUtils.hasText(phone) || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
