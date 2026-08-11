package io.github.qifan777.server.user.root.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

/**
 * Parallel coin ledger for lucky coins / star stones.
 * <p>
 * When {@code relatedRefId} is present, credit is idempotent on
 * {@code (user_id, coin_type, change_type, related_ref_id)} and still updates the
 * denormalized {@code user.lucky_coins} / {@code user.star_stones} fields on first grant.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserCoinLedgerService {
    public static final String COIN_TYPE_LUCKY = "LUCKY_COIN";
    public static final String COIN_TYPE_STAR = "STAR_STONE";

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Credits coins and appends a ledger row. Idempotent when {@code relatedRefId} is present.
     *
     * @return {@code true} if balance was increased; {@code false} if skipped as duplicate
     */
    @Transactional
    public boolean credit(String userId, String coinType, int amount, String changeType, String relatedRefId) {
        if (amount <= 0) {
            throw new BusinessException("入账数量须大于 0");
        }
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(coinType) || !StringUtils.hasText(changeType)) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "币种入账参数不完整");
        }
        String normalizedType = coinType.trim().toUpperCase();
        String normalizedChange = changeType.trim();
        String normalizedRef = normalizeRef(relatedRefId);

        if (normalizedRef != null && exists(userId, normalizedType, normalizedChange, normalizedRef)) {
            return false;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));

        // Insert ledger first so unique-key races cannot double-credit the denormalized balance.
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO user_coin_log
                                (id, user_id, coin_type, change_amount, change_type, related_ref_id, created_time)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                    IdUtil.fastSimpleUUID(),
                    userId,
                    normalizedType,
                    amount,
                    normalizedChange,
                    normalizedRef,
                    LocalDateTime.now()
            );
        } catch (DuplicateKeyException dup) {
            log.debug("user_coin_log duplicate userId={} changeType={} ref={}", userId, normalizedChange, normalizedRef);
            return false;
        }

        applyBalance(userId, user, normalizedType, amount);
        return true;
    }

    private void applyBalance(String userId, User user, String coinType, int amount) {
        if (COIN_TYPE_STAR.equals(coinType)) {
            int next = user.starStones() + amount;
            userRepository.update(UserDraft.$.produce(draft -> draft.setId(userId).setStarStones(next)));
            return;
        }
        if (!COIN_TYPE_LUCKY.equals(coinType)) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "不支持的币种: " + coinType);
        }
        int next = user.luckyCoins() + amount;
        userRepository.update(UserDraft.$.produce(draft -> draft.setId(userId).setLuckyCoins(next)));
    }

    private boolean exists(String userId, String coinType, String changeType, String relatedRefId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM user_coin_log
                        WHERE user_id = ? AND coin_type = ? AND change_type = ? AND related_ref_id = ?
                        """,
                Integer.class,
                userId,
                coinType,
                changeType,
                relatedRefId
        );
        return count != null && count > 0;
    }

    private static String normalizeRef(String relatedRefId) {
        return StringUtils.hasText(relatedRefId) ? relatedRefId.trim() : null;
    }
}
