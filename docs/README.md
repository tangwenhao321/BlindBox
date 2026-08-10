# 项目文档目录

## 核心手册（优先阅读）

| 文档 | 说明 |
|------|------|
| [**项目全功能手册.md**](项目全功能手册.md) | **全功能清单 + 使用方法 + 操作步骤**（三端、启动、打包、SOP）。有功能更新时请同步维护该文档 §0.2 |

## 专项文档

| 文档 | 说明 |
|------|------|
| [**TEST_ENV_GUIDE.md**](TEST_ENV_GUIDE.md) | **测试环境部署、隔离说明、使用指南、概率说明、注意事项** |
| [../MOBILE_APP_SETUP.md](../MOBILE_APP_SETUP.md) | 移动端本地部署、API、SSE、支付、围观 |
| [../RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md) | 发布检查清单 |
| [../COMMERCIAL_READINESS.md](../COMMERCIAL_READINESS.md) | 商业化就绪 |
| [OPS_RUNBOOK.md](OPS_RUNBOOK.md) | 运维 / on-call |
| [VN_LAUNCH_RUNBOOK.md](VN_LAUNCH_RUNBOOK.md) | 越南 VNPay 上线 |
| [REVEAL_AND_OPS.md](REVEAL_AND_OPS.md) | 开奖与运营配置 |
| [METRICS_ALERTS.md](METRICS_ALERTS.md) | 指标与告警 |

## 文档维护约定

1. 新增用户可见功能 → 更新 `项目全功能手册.md` 对应章节 + 更新记录表  
2. 仅运维/临时排障 → 可只更新专项 runbook，并在全功能手册 §15 保留链接  
3. 代码单一事实来源：App 路由 `mystery-box-mobile-app/src/navigation/routeRegistry.ts`；功能入口 `src/config/featureRegistry.ts`；管理端路由 `mystery-box-admin/src/router/index.ts`
