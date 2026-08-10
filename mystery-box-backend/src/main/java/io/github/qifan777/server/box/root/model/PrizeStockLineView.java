package io.github.qifan777.server.box.root.model;

public record PrizeStockLineView(
        String relId,
        String productId,
        String productName,
        String qualityType,
        int stockTotal,
        int stockRemaining,
        boolean lastOne,
        boolean soldOut,
        int sortOrder
) {
}
