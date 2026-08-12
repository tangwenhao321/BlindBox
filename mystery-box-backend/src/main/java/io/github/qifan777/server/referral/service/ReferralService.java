package io.github.qifan777.server.referral.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrderTable;
import io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
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
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.service.UserCoinLedgerService;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReferralService {
    private static final String INVITE_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int INVITE_CODE_LENGTH = 6;
    private static final SecureRandom INVITE_CODE_RANDOM = new SecureRandom();
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
    private final UserWalletService userWalletService;
    private final UserCoinLedgerService userCoinLedgerService;
    private final ReferralCommissionRecordRepository referralCommissionRecordRepository;
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;

    @Value("${app.referral.commission-rate:0.05}")
    private BigDecimal commissionRate = new BigDecimal("0.05");

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
        if (userRepository.findById(userId).isEmpty()) {
            return;
        }
        boolean credited = userCoinLedgerService.credit(
                userId,
                UserCoinLedgerService.COIN_TYPE_LUCKY,
                rewardCoins,
                "REFERRAL_MILESTONE",
                "referral_milestone:" + targetCount
        );
        if (!credited && isMilestoneClaimed(userId, targetCount)) {
            return;
        }
        jdbcTemplate.update(
                """
                        INSERT IGNORE INTO referral_milestone_grant (id, user_id, target_count, reward_coins, created_time)
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
        BigDecimal rate = commissionRate != null ? commissionRate : new BigDecimal("0.05");
        if (marketProperties == null || !org.springframework.util.StringUtils.hasText(marketProperties.getCurrency())) {
            throw new IllegalStateException("MARKET_CURRENCY_MISSING: marketProperties.currency is required");
        }
        String currency = marketProperties.getCurrency().trim();
        BigDecimal commission = MoneyRounding.round(payAmount.multiply(rate), currency);
        if (commission.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        String inviterId = buyer.inviterId();
        userWalletService.credit(
                inviterId,
                commission,
                "REFERRAL_COMMISSION",
                "邀请佣金",
                orderId
        );
        referralCommissionRecordRepository.save(ReferralCommissionRecordDraft.$.produce(draft -> draft
                .setUserId(inviterId)
                .setSourceUserId(buyerId)
                .setOrderId(orderId)
                .setAmount(commission)
                .setRemark("下级开盒佣金")
                .setCreatedTime(LocalDateTime.now())
                .setEditedTime(LocalDateTime.now())));
    }

    /** Reverse commission when order is refunded. Idempotent via REFERRAL_CLAWBACK+orderId. */
    public void clawbackCommissionOnRefund(String orderId) {
        if (!StringUtils.hasText(orderId)) {
            return;
        }
        referralCommissionRecordRepository.findByOrderId(orderId).ifPresent(record -> {
            BigDecimal amount = record.amount();
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                return;
            }
            String inviterId = record.user().id();
            try {
                userWalletService.deduct(
                        inviterId,
                        amount,
                        "REFERRAL_CLAWBACK",
                        "订单退款收回邀请佣金",
                        orderId
                );
            } catch (BusinessException ex) {
                log.warn("Referral clawback failed (insufficient balance?) orderId={} inviterId={}: {}",
                        orderId, inviterId, ex.getMessage());
                LocalDateTime now = LocalDateTime.now();
                jdbcTemplate.update(
                        """
                                INSERT INTO referral_clawback_debt
                                    (order_id, inviter_user_id, amount, status, created_time, edited_time)
                                VALUES (?, ?, ?, 'OPEN', ?, ?)
                                ON DUPLICATE KEY UPDATE
                                    inviter_user_id = VALUES(inviter_user_id),
                                    amount = VALUES(amount),
                                    status = 'OPEN',
                                    edited_time = VALUES(edited_time)
                                """,
                        orderId,
                        inviterId,
                        amount,
                        now,
                        now
                );
            }
        });
    }

    private String generateUniqueInviteCode() {
        UserTable userTable = UserTable.$;
        for (int i = 0; i < 20; i++) {
            String code = randomInviteCode();
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

    /**
     * Invite codes decide who earns commission, so they are drawn from {@link SecureRandom}: codes from a
     * predictable generator could be guessed ahead of issue and used to hijack a referral chain.
     */
    private static String randomInviteCode() {
        StringBuilder code = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            code.append(INVITE_CODE_ALPHABET.charAt(INVITE_CODE_RANDOM.nextInt(INVITE_CODE_ALPHABET.length())));
        }
        return code.toString();
    }

    private static String maskPhone(String phone) {
        if (!StringUtils.hasText(phone) || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
