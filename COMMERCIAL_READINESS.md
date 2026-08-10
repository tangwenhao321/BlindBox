# 商用上线完成清单（已落地项）

## 已落地（代码内）

- 指定中奖规则审批流：创建后默认待审批，不可直接生效
- 高危操作二次口令：创建/审批/启停/删除均要求 `x-admin-action-otp`
- 审计日志：
  - 命中日志：`mystery_box_win_hit_log`
  - 操作日志：`mystery_box_win_rule_op_log`
- 运营指标接口：`/admin/mystery-box-win-rule/metrics`
- 管理端能力：
  - 审批按钮、审批状态
  - 操作日志查看
  - 指标面板查看
  - 高危口令输入
- 客户端开奖体验：
  - 分级特效、震动、音效
  - 性能模式、自动重播开关
  - 缓存预热、失败兜底、埋点

## 外部依赖（需上线流程配合）

- 支付真闭环联调（微信 SDK、回调验签、对账）
- 用户协议/隐私政策与备案材料
- 灰度发布与回滚策略（商店审核流程）
- 监控告警平台接入（Sentry/Prometheus/云监控）

## 配置要求

- 后端配置：`security.admin-action-otp` 必填（建议仅放 `application-private.yml`）
- 生产环境禁止使用默认口令

