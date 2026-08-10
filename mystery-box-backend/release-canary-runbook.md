# 灰度与回滚手册

## 灰度发布

1. 将 `application-private.yml` 中流量开关按环境拆分：
   - `security.risk-control.enabled=true`
   - `feature.recommendation.enabled=true`
2. 首批流量仅对测试账号或白名单用户开放（建议 5%）。
3. 观察 30 分钟关键指标：
   - 支付成功率
   - 下单接口 4xx/5xx
   - 社区发帖/评论失败率
4. 指标稳定后逐步提升到 25% -> 50% -> 100%。

## 快速回滚

1. 发现核心指标异常时，先关功能开关，不回滚数据库：
   - `RISK_CONTROL_ENABLED=false`
   - `RATE_LIMIT_DISTRIBUTED=false`
2. 若故障持续，回滚应用到上一版本镜像。
3. 使用 `audit_trail` 与 `analytics_event` 排查异常请求链路。

## 发布门禁

- 后端：`mvn -DskipTests compile`
- Admin：`npm run type-check` + `npm run e2e:smoke`
- Mobile：`npm run test`
