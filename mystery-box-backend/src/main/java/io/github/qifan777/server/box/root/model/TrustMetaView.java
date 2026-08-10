package io.github.qifan777.server.box.root.model;

import java.time.LocalDateTime;

public record TrustMetaView(
        LocalDateTime probabilityUpdatedAt,
        String shippingPromise,
        String minorProtectionHint,
        String disclosureNote
) {
}
