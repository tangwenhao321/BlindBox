package io.github.qifan777.server.user.root.service;

import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.entity.UserBalanceLogDraft;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class UserWalletService {
    private final UserRepository userRepository;
    private final UserBalanceLogRepository userBalanceLogRepository;

    @Transactional
    public void transfer(String fromUserId, String toUserId, BigDecimal amount, String changeType, String remark, String refId) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("转账金额须大于 0");
        }
        if (fromUserId.equals(toUserId)) {
            throw new BusinessException("不能向自己转账");
        }
        deduct(fromUserId, amount, changeType + "_OUT", remark, refId);
        credit(toUserId, amount, changeType + "_IN", remark, refId);
    }

    public void credit(String userId, BigDecimal amount, String changeType, String remark, String refId) {
        userRepository.addBalance(userId, amount);
        appendLog(userId, amount, changeType, remark, refId);
    }

    public void deduct(String userId, BigDecimal amount, String changeType, String remark, String refId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        if (user.balance() == null || user.balance().compareTo(amount) < 0) {
            throw new BusinessException("余额不足");
        }
        int updated = userRepository.sql().createUpdate(UserRepository.userTable)
                .where(UserRepository.userTable.id().eq(userId))
                .where(UserRepository.userTable.balance().ge(amount))
                .set(UserRepository.userTable.balance(), UserRepository.userTable.balance().minus(amount))
                .execute();
        if (updated == 0) {
            throw new BusinessException("余额不足");
        }
        appendLog(userId, amount.negate(), changeType, remark, refId);
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
}
