package io.github.qifan777.server.welfare.service;

import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.service.UserCoinLedgerService;
import io.github.qifan777.server.welfare.entity.UserCheckIn;
import io.github.qifan777.server.welfare.entity.UserCheckInDraft;
import io.github.qifan777.server.welfare.entity.UserFavorite;
import io.github.qifan777.server.welfare.entity.UserFavoriteDraft;
import io.github.qifan777.server.welfare.model.CheckInStatusView;
import io.github.qifan777.server.welfare.repository.UserCheckInRepository;
import io.github.qifan777.server.welfare.repository.UserFavoriteRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.qifan777.server.welfare.model.CheckInStatusView.WeekDayCheckIn;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
@Service
@AllArgsConstructor
@Transactional
public class WelfareService {
    private static final int CHECK_IN_REWARD_COINS = 10;

    private final UserCheckInRepository userCheckInRepository;
    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final UserCoinLedgerService userCoinLedgerService;

    public CheckInStatusView checkInStatus(String userId) {
        LocalDate today = LocalDate.now();
        boolean checked = userCheckInRepository.findByUserAndDate(userId, today).isPresent();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        return buildStatusView(checked, user.luckyCoins(), user.starStones(), userId);
    }

    public CheckInStatusView checkIn(String userId) {        LocalDate today = LocalDate.now();
        if (userCheckInRepository.findByUserAndDate(userId, today).isPresent()) {
            throw new BusinessException(ResultCode.StatusHasValid, "今日已签到");
        }
        userCheckInRepository.save(UserCheckInDraft.$.produce(draft -> draft
                .setUserId(userId)
                .setCheckInDate(today)
                .setRewardCoins(CHECK_IN_REWARD_COINS)
                .setCreatedTime(LocalDateTime.now())));
        userCoinLedgerService.credit(
                userId,
                UserCoinLedgerService.COIN_TYPE_LUCKY,
                CHECK_IN_REWARD_COINS,
                "CHECK_IN",
                "checkin:" + today
        );
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        return buildStatusView(true, user.luckyCoins(), user.starStones(), userId);
    }

    private CheckInStatusView buildStatusView(boolean checkedToday, int luckyCoins, int starStones, String userId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);
        Set<LocalDate> checkedDates = userCheckInRepository.findDatesByUserBetween(userId, weekStart.minusDays(30), today);
        List<WeekDayCheckIn> weekCalendar = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            weekCalendar.add(new WeekDayCheckIn(d.toString(), checkedDates.contains(d)));
        }
        int streak = 0;
        for (LocalDate d = today; checkedDates.contains(d); d = d.minusDays(1)) {
            streak++;
        }
        return new CheckInStatusView(
                checkedToday,
                luckyCoins,
                starStones,
                CHECK_IN_REWARD_COINS,
                streak,
                weekCalendar
        );
    }

    public List<String> listFavoriteBoxIds(String userId) {        return userFavoriteRepository.findBoxIdsByUser(userId);
    }

    public boolean toggleFavorite(String userId, String mysteryBoxId) {
        var existing = userFavoriteRepository.findByUserAndBox(userId, mysteryBoxId);
        if (existing.isPresent()) {
            userFavoriteRepository.deleteById(existing.get().id());
            return false;
        }
        userFavoriteRepository.save(UserFavoriteDraft.$.produce(draft -> draft
                .setUserId(userId)
                .setMysteryBoxId(mysteryBoxId)
                .setCreatedTime(LocalDateTime.now())));
        return true;
    }
}
