package io.github.qifan777.server.user.root.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.entity.UserBalanceLogDraft;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserWalletService {
    /** Change types that always decrease balance (amount stored as absolute in ledger). */
    private static final Set<String> DEBIT_CHANGE_TYPES = Set.of(
            "MARKETPLACE_HOLD",
            "WAREHOUSE_SHIP",
            "REFERRAL_CLAWBACK"
    );

    private final UserRepository userRepository;
    private final UserBalanceLogRepository userBalanceLogRepository;
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;

    @Transactional
    public void transfer(String fromUserId, String toUserId, BigDecimal amount, String changeType, String remark, String refId) {
        BigDecimal rounded = requirePositiveRounded(amount, "转账金额须大于 0");
        if (fromUserId.equals(toUserId)) {
            throw new BusinessException("不能向自己转账");
        }
        deduct(fromUserId, rounded, changeType + "_OUT", remark, refId);
        credit(toUserId, rounded, changeType + "_IN", remark, refId);
    }

    /**
     * Credits user balance and appends a ledger row. When {@code refId} is present, the operation is
     * idempotent on (userId, changeType, refId): ledger insert-first so concurrent credits cannot
     * double-apply balance before the unique key fires.
     */
    @Transactional
    public void credit(String userId, BigDecimal amount, String changeType, String remark, String refId) {
        BigDecimal rounded = requirePositiveRounded(amount, "入账金额须大于 0");
        String normalizedRef = normalizeRef(refId);
        if (normalizedRef != null) {
            String logId = IdUtil.fastSimpleUUID();
            if (!tryInsertLedger(logId, userId, changeType, rounded, normalizedRef, remark)) {
                return;
            }
            userRepository.addBalance(userId, rounded);
            touchBalanceAfter(logId, userId);
            return;
        }
        userRepository.addBalance(userId, rounded);
        appendLog(userId, rounded, changeType, remark, null);
    }

    /**
     * Deducts user balance and appends a ledger row. Idempotent when {@code refId} is present
     * (insert-first + CAS deduct).
     */
    @Transactional
    public void deduct(String userId, BigDecimal amount, String changeType, String remark, String refId) {
        BigDecimal rounded = requirePositiveRounded(amount, "扣款金额须大于 0");
        String normalizedRef = normalizeRef(refId);
        if (normalizedRef != null) {
            String logId = IdUtil.fastSimpleUUID();
            if (!tryInsertLedger(logId, userId, changeType, rounded, normalizedRef, remark)) {
                return;
            }
            int updated = casDeduct(userId, rounded);
            if (updated == 0) {
                jdbcTemplate.update("DELETE FROM user_balance_log WHERE id = ?", logId);
                throw new BusinessException("余额不足");
            }
            touchBalanceAfter(logId, userId);
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        if (user.balance() == null || user.balance().compareTo(rounded) < 0) {
            throw new BusinessException("余额不足");
        }
        int updated = casDeduct(userId, rounded);
        if (updated == 0) {
            throw new BusinessException("余额不足");
        }
        appendLog(userId, rounded.negate(), changeType, remark, null);
    }

    /**
     * Compares {@code user.balance} to the signed sum of ledger amounts (debits negative).
     */
    @Transactional(readOnly = true)
    public WalletReconcileResult reconcileBalanceVsLogs(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        BigDecimal userBalance = user.balance() == null ? BigDecimal.ZERO : user.balance();
        List<UserBalanceLog> logs = userBalanceLogRepository.findAllByUserOrdered(userId);
        BigDecimal ledgerSignedSum = BigDecimal.ZERO;
        BigDecimal latestBalanceAfter = null;
        for (UserBalanceLog log : logs) {
            ledgerSignedSum = ledgerSignedSum.add(toSignedAmount(log));
            latestBalanceAfter = log.balanceAfter();
        }
        boolean matched = userBalance.compareTo(ledgerSignedSum) == 0;
        return new WalletReconcileResult(userId, userBalance, ledgerSignedSum, latestBalanceAfter, matched);
    }

    public record WalletReconcileResult(
            String userId,
            BigDecimal userBalance,
            BigDecimal ledgerSignedSum,
            BigDecimal latestBalanceAfter,
            boolean matched
    ) {
    }

    private boolean tryInsertLedger(
            String logId,
            String userId,
            String changeType,
            BigDecimal amount,
            String refId,
            String remark
    ) {
        LocalDateTime now = LocalDateTime.now();
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO user_balance_log
                                (id, user_id, change_type, amount, balance_after, related_order_id, remark,
                                 created_time, edited_time)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    logId,
                    userId,
                    changeType,
                    amount.abs(),
                    BigDecimal.ZERO,
                    refId,
                    remark,
                    now,
                    now
            );
            return true;
        } catch (DuplicateKeyException dup) {
            log.debug("wallet ledger duplicate userId={} changeType={} ref={}", userId, changeType, refId);
            return false;
        }
    }

    private void touchBalanceAfter(String logId, String userId) {
        BigDecimal balanceAfter = userRepository.findById(userId)
                .map(User::balance)
                .orElse(BigDecimal.ZERO);
        jdbcTemplate.update(
                "UPDATE user_balance_log SET balance_after = ?, edited_time = ? WHERE id = ?",
                balanceAfter,
                LocalDateTime.now(),
                logId
        );
    }

    private int casDeduct(String userId, BigDecimal amount) {
        return userRepository.sql().createUpdate(UserRepository.userTable)
                .where(UserRepository.userTable.id().eq(userId))
                .where(UserRepository.userTable.balance().ge(amount))
                .set(UserRepository.userTable.balance(), UserRepository.userTable.balance().minus(amount))
                .execute();
    }

    private void appendLog(String userId, BigDecimal signedAmount, String changeType, String remark, String refId) {
        BigDecimal balanceAfter = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"))
                .balance();
        UserBalanceLog log = UserBalanceLogDraft.$.produce(draft -> draft
                .setUserId(userId)
                .setChangeType(changeType)
                .setAmount(signedAmount.abs())
                .setBalanceAfter(balanceAfter)
                .setRelatedOrderId(refId)
                .setRemark(remark));
        userBalanceLogRepository.save(log);
    }

    private static String normalizeRef(String refId) {
        return StringUtils.hasText(refId) ? refId.trim() : null;
    }

    private BigDecimal requirePositiveRounded(BigDecimal amount, String message) {
        BigDecimal rounded = MoneyRounding.round(amount, marketProperties.getCurrency());
        if (rounded == null || rounded.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(message);
        }
        return rounded;
    }

    static BigDecimal toSignedAmount(UserBalanceLog log) {
        BigDecimal abs = log.amount() == null ? BigDecimal.ZERO : log.amount().abs();
        String type = log.changeType();
        if (type != null && (type.endsWith("_OUT") || DEBIT_CHANGE_TYPES.contains(type))) {
            return abs.negate();
        }
        return abs;
    }
}
