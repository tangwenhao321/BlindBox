package io.github.qifan777.server.teamlottery;

/**
 * Pure rules for 对对碰 team lottery — kept package-visible for unit tests.
 */
public final class TeamLotteryRules {
    public static final int MAX_MEMBERS = 5;
    public static final int TEAM_BONUS_DRAWS = 2;
    public static final int CHAT_TTL_HOURS = 72;

    private TeamLotteryRules() {
    }

    /** Quota = memberCount + 2 when team is full (or locked); otherwise memberCount. */
    public static int calculateDrawQuota(int memberCount, boolean lockedOrFull) {
        int members = Math.max(0, Math.min(memberCount, MAX_MEMBERS));
        if (lockedOrFull || members >= MAX_MEMBERS) {
            return members + TEAM_BONUS_DRAWS;
        }
        return members;
    }

    public static boolean isFull(int memberCount) {
        return memberCount >= MAX_MEMBERS;
    }

    /**
     * Anti-cheat: same device / ip / phone may only appear in one active team.
     * Returns true when the join should be rejected.
     */
    public static boolean conflictsWithActiveMembership(
            boolean sameDeviceInOtherActiveTeam,
            boolean sameIpInOtherActiveTeam,
            boolean samePhoneInOtherActiveTeam
    ) {
        return sameDeviceInOtherActiveTeam || sameIpInOtherActiveTeam || samePhoneInOtherActiveTeam;
    }
}
