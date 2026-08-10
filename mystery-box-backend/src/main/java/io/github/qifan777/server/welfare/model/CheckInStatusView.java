package io.github.qifan777.server.welfare.model;

import java.util.List;

public record CheckInStatusView(
        boolean checkedToday,
        int luckyCoins,
        int starStones,
        int todayRewardCoins,
        int streakDays,
        List<WeekDayCheckIn> weekCalendar
) {
    public record WeekDayCheckIn(String date, boolean checked) {
    }
}