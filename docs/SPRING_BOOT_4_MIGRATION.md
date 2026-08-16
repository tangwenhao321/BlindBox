# Spring Boot 4.1 migration (landed)

**Current parent: `4.1.0`** (Java 17). Previous line was `3.2.12` (OSS EOL).

## Dependency map (post-upgrade)

| Dependency | Version | Notes |
|------------|---------|-------|
| `spring-boot-starter-parent` | **4.1.0** | Modular starters: `webmvc`, `aspectj`, `flyway` |
| `sa-token-spring-boot4-starter` | **1.45.0** | Replaces `sa-token-spring-boot3-starter` |
| `jimmer-spring-boot-starter` | **0.11.2** | Jackson 3 / Boot 4; DTO `id(assoc)` → `associatedIdEq` in specs; `Objects` → `Immutables` |
| `wx-java-*-spring-boot-starter` | **4.7.0** | Compiles on Boot 4 |
| ShedLock | **7.7.0** | Boot 4 / Spring 7 matrix |
| Testcontainers | **2.0.5** (BOM) | Artifacts `testcontainers-mysql` / `testcontainers-junit-jupiter`; `MySQLContainer` is non-generic |
| Jackson | Boot 4 default **3** (`tools.jackson`) | App code uses `JsonMapper`; `spring-boot-jackson2` **removed** |
| Internal `io.github.qifan777:*` | uni-ai `0.1.10` | Still on classpath; watch for Boot 4 autoconfig gaps |

## Local JDK

- Dev/CI currently use **Temurin 17**.
- Java **21** is preferred for Boot 4 long-term; bump `java.version` + CI `setup-java` together once Temurin 21 is installed on developer machines.

## Code changes required for Boot 4 / Jimmer 0.11

1. Starters: `spring-boot-starter-web` → `webmvc`; `aop` → `aspectj`; Flyway via `spring-boot-starter-flyway`.
2. `@JsonComponent` → `@JacksonComponent` + `tools.jackson` `ValueSerializer` / `ValueDeserializer`.
3. Injected mappers: `com.fasterxml.jackson.databind.ObjectMapper` → `tools.jackson.databind.json.JsonMapper`.
4. Redis auto-config: `DataRedisAutoConfiguration` under `org.springframework.boot.data.redis.autoconfigure`.
5. Redis JSON: `GenericJacksonJsonRedisSerializer` (Jackson 3), not deprecated `GenericJackson2*`.
6. Dict enums extracted to **top-level** types (`Gender`, `PayType`, …) — Jimmer JSpecify cannot annotate nested types.
7. Refund notify payload: `WeChatRefundNotifyDetails` top-level wrapper (wx-java nested `DecryptNotifyResult`).
8. Tests: `@MockBean` → `@MockitoBean`; `@AutoConfigureMockMvc` package `org.springframework.boot.webmvc.test.autoconfigure`; Redis `ValueOperations.set` matchers use `Duration`.

## Verified locally

- `mvn -DskipTests compile` — **SUCCESS**
- Expanded suite — **55 passed** (money-path + reveal room + search/Zalo/push + ProductionSafetyValidator)

## Remaining / follow-ups

- [ ] Staging soak: WeChat / VNPay IPN, draw-queue SSE, marketplace chat SSE, admin cookie auth — run `docs/STAGING_SOAK.md` / `scripts/staging-soak.*`
- [ ] Prefer Java **21** LTS when CI images + local Temurin 21 are ready (currently **17**)
- [ ] Full `mvn test` with Docker Desktop running (Testcontainers); without Docker, integration tests error/skip
- [ ] Keep previous Boot 3.2 jar available for first production rollback window
- [x] Wipe residual: Freemarker top-level dict enums, User password strip, prod idle-timeout/CORS/proxy, VN eSMS refuse — see `docs/WIPE_RESIDUAL_HARDENING.md`
- [x] Staging soak probe scripts + checklist (`docs/STAGING_SOAK.md`)

## Explicit non-goals (still)

- No partial stop on Boot 3.5 (also OSS EOL)
- Ops-only items (Sentry DSN, Grafana routing, merchant secrets) unchanged
