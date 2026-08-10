package io.github.qifan777.server.box.draw.model;

import java.util.List;

public record DrawFeedPageView(List<DrawFeedItemView> items, String nextCursor) {
}
