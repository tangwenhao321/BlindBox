package io.github.qifan777.server.reveal.theme;

public record RevealThemeProgressView(
        int openCount,
        boolean hasHidden,
        boolean seriesComplete,
        String equippedThemeId
) {
}
