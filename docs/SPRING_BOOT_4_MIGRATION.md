# Spring Boot 4.x migration (deferred)

Current parent: **3.2.12** (final OSS patch for the 3.2 line; OSS EOL).

## Why not inlined

Jumping to supported **4.0 / 4.1** is a separate wave:

- Spring Framework 7 / Boot 4 API and dependency BOM changes
- Compatibility matrix for Jimmer, Sa-Token Boot3 starter, wx-java starters, ShedLock
- CI + staging soak for payment notify, Flyway, SSE

## Suggested approach (when scheduled)

1. Spike branch: bump parent to latest supported 4.x; fix compile only.
2. Run `mvn test` with MySQL/Redis services; fix payment/refund/idempotency suites first.
3. Staging soak: VNPay/WeChat notify, draw queue SSE, marketplace chat SSE.
4. Cut over with rollback jar kept.

Do **not** mix this with product feature PRs.
