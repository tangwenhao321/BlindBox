package io.github.qifan777.server.leaderboard.model;

public record LeaderboardMeView(
        int rank,
        int highCount,
        String title,
        boolean onBoard
) {
}
