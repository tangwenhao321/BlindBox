# 本地部署 + 手机 App 改造说明

## 1. 启动依赖服务

在项目根目录执行：

```bash
docker compose -f docker-compose.local.yml up -d
```

这会启动：

- MySQL 8（`3306`，账号 `root`，密码 `123456`）
- Redis（`6379`，密码 `123456`）

`database.sql` 会自动初始化到 `mystery_box` 数据库。

## 2. 启动后端

**一键（Windows，后端 + Expo）：**

```powershell
cd mystery-box-main
powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

或手动：

```bash
cd mystery-box-backend
mvn spring-boot:run
```

默认地址：`http://localhost:9912`

如果后端报配置相关错误，检查：

- `src/main/resources/application-private.yml`
- `src/main/resources/application-dev.yml`

这两份文件是本地可运行配置，默认使用本地数据库与 Redis。

## 3. 启动手机 App（Expo / React Native）

```bash
cd mystery-box-mobile-app
npm install
npm run start
```

默认使用 **8083** 端口（避免与本机其他 Metro 占用的 8081 冲突）。若需 8081：`npm run start:8081`。

### API 地址配置

在 `mystery-box-mobile-app` 目录创建 `.env`（可参考 `.env.example`）：

```bash
EXPO_PUBLIC_API_BASE_URL=http://你的局域网IP:9912
# 可选：模拟支付（开发环境默认开启）
# EXPO_PUBLIC_MOCK_PAYMENT=true
# 可选：客服电话、企业微信（用于「联系客服」「企业微信」入口）
# EXPO_PUBLIC_SUPPORT_PHONE=400-xxx-xxxx
# EXPO_PUBLIC_ENTERPRISE_WECHAT=your-work-wechat-id
```

- Android 模拟器可用 `http://10.0.2.2:9912`
- iOS 模拟器可用 `http://127.0.0.1:9912`
- 真机请填写电脑局域网 IP（与手机同一 WiFi）

### 商城与分类

- 底部 **商城** Tab 使用服务端分类筛选与关键字搜索（`GET /front/mystery-box/query`）
- 分类列表：`GET /front/mystery-box-category/query`

### 邀请注册

- 注册页可填写 **邀请码（选填）**，绑定上级后支付订单将产生 5% 推广佣金
- 我的 → **推广中心** 查看邀请码、团队与佣金

### 模拟支付（当前默认）

- `EXPO_PUBLIC_MOCK_PAYMENT=true`（开发默认开启）：走 `POST /front/mystery-box-order/{id}/pay/mock`
- 收银台文案统一为「模拟环境」，不会误导为真实微信支付
- 创建订单可带请求头 `x-draw-mode`：`instant` | `queue` | `buyout`

### 赏品库存与战报（管理端 + App）

- Flyway：`V20260526_01`（赏品 `stock_*`、`mystery_box_draw_log`）、`V20260526_02`（保底/物流/碎片/活动）
- 管理端编辑 **盲盒商品关联** 时可配置：`stock_total`、`stock_remaining`、`is_last_one`、`sort_order`
- App 详情页展示分档余量表；首页/详情战报来自 `GET /front/mystery-box/draw-feed`
- 概率公示：`GET /front/mystery-box/{id}/probability` → 详情「概率公示」页

### Redis（排队 / 全收锁池）

- 本地需 Redis `6379`（与 `docker-compose.local.yml` 一致）
- 排队：`POST .../draw-queue/join`，`GET .../status`
- 全收：`POST .../draw-queue/buyout-lock`（下单前获取，支付后释放）

### 实时 SSE（排队 / 战报 / 池子）

- 排队流（需登录）：`GET /front/mystery-box/{id}/draw-queue/stream` → 事件 `QUEUE_STATUS`
- 战报流（可围观）：`GET /front/mystery-box/draw-feed/stream?boxId=` → 事件 `DRAW_FEED`
- 池子流（可围观）：`GET /front/mystery-box/{id}/pool-stream` → 事件 `POOL_UPDATE`
- App 在 SSE 不可用时自动降级为 1s（排队）/ 30s（战报）轮询

### 首页聚合与社区

- `GET /front/home/summary`：今日开盒数、传说数、热盒列表
- `GET /front/home/recommend`：本周必抽盒 ID
- 社区晒单：`GET/POST /front/community/posts`（首页「晒单墙」入口）
- **管理端热盒**：登录后台 → 盲盒管理 → **首页热盒**（路径 `/ops-home-hot-box`），配置 `ops_home_hot_box`；未配置时 App 按近 7 日开盒量排序
- 接口验证脚本（需管理员密码）：`powershell -File scripts/verify-ops-home-hot-box.ps1 -Password '你的密码'`

### 围观模式

- 未登录可访问：`insight`、`pool-dashboard`、`trust-meta`、`probability`、全局战报
- 抽赏 / 排队 / 下单仍需登录

### 待支付挽留（模拟）

- `GET /front/mystery-box-order/{id}/payment-meta`：含 `payDeadline`（创建后 15 分钟）
- 关闭模拟支付窗可调用 `POST .../abandon-offer` 领取一次 ¥5 模拟挽留券（幂等）

### 开奖战报分享

- 开奖结果弹窗点击 **「生成战报图并分享」**：按最高品级奖品生成 `RevealShareCard` 图片并调起系统分享

### 留存扩展 API

- 签到：`GET /front/welfare/check-in/status` 含 `streakDays`、`weekCalendar`
- 推广阶梯：`GET /front/referral/milestones`
- 碎片图鉴：`GET /front/fragment/progress`
- 个人周榜：`GET /front/leaderboard/me`

### 本地校验

```bash
cd mystery-box-mobile-app
npm run check   # TypeScript + 单元测试
```

### 首页「加载异常」排查

1. **后端是否启动**：`mvn spring-boot:run` 后访问 `http://localhost:9912/actuator/health`
2. **API 地址**：真机不要用 `127.0.0.1`，应填电脑局域网 IP（与手机同一 WiFi）
3. **数据库迁移**：重启后端后 Flyway 会自动执行；若仍报字段缺失，确认 MySQL 已启动且 `application-private.yml` 密码正确
4. App 首页横幅会显示具体错误（如无法连接后端）；点「重试」可重新拉取

### 管理端配置新人专享盲盒

1. 登录管理后台，进入盲盒编辑页
2. 勾选 **「新人专享」** 并设置低价（如 0.01 元）
3. 保存后，App 新人弹窗与 `GET /front/mystery-box/newcomer-offer` 将返回该盲盒

## 4. 当前手机端能力

已实现：

- 手机号登录
- 手机号注册并自动登录
- 盲盒列表
- 盲盒详情（含商品列表）
- 地址新增与选择
- 创建盲盒订单（1件）
- 订单列表
- 取消未支付订单
- 订单详情查看
- 获取微信预支付参数（用于后续接原生支付 SDK）
- 订单状态手动刷新
- 订单状态筛选（全部/待支付/待发货/已关闭）
- 订单页自动轮询刷新（5 秒）
- 订单详情独立页面（替代弹窗）
- 订单状态中文显示（便于业务排查）
- 按状态禁用操作按钮（非待支付订单不可取消）
- 自动刷新可手动开关
- 扩展状态筛选（待收货/已完成/已退款）
- 订单ID关键字搜索
- 下拉刷新防抖（短时间重复下拉不重复请求）
- 代码结构重构：拆分 `api`、`types`、登录组件、订单筛选组件
- 进一步模块化：新增 `useAuth`、`useOrders` hooks，订单卡片拆分为独立组件
- 页面拆分：盲盒列表/盲盒详情/订单详情已拆为独立视图组件，`App.tsx` 仅做路由编排
- 地址弹窗已抽成独立组件，主样式迁移到 `styles/appStyles.ts`
- 服务层抽离完成：`authService` / `boxService` / `addressService` / `orderService`
- 新增聚合数据 Hook：`useAppData`（集中管理列表加载、全量刷新、清空与防抖刷新）
- 新增主区域容器组件：`MainTabsView`（盲盒/订单视图切换集中管理）
- `MainTabsView` 参数收敛：按 `boxViewProps` / `orderViewProps` 分组传参，减少长参数列表
- 动作层抽离：新增 `useAppActions`（下单、取消、详情、预支付、地址保存统一管理）
- 配置集中化：新增 `config/constants.ts`，统一管理分页、轮询、防抖、订单状态与筛选项
- 最小测试闭环：接入 Vitest，已覆盖 `constants`、`order-utils`、`useOrders` 核心逻辑
- 服务层测试：新增 `orderService` 单测（下单、取消、预支付、价格计算）
- 服务层测试补齐：新增 `authService`、`boxService`、`addressService` 单测
- CI 已接入：`.github/workflows/mobile-app-ci.yml` 自动执行 `npm test` 与 `tsc --noEmit`
- CI 增强：新增覆盖率任务（`npm run test:coverage`）与 Expo 健康检查（`npm run doctor`）

说明：

- 目前已打通从浏览到下单的基础链路（不含微信支付拉起）。
- 地址保存依赖腾讯地图 Key（后端会调用地理编码接口）。
- 预支付参数已可获取；真正唤起微信支付需在原生层接入支付 SDK。

## 5. 指定中奖（后台可控）

后端已支持按用户定向中奖规则（用于活动运营）：

- 接口前缀：`/admin/mystery-box-win-rule`
- `POST /create`：创建规则（`userId`、`mysteryBoxId`、`productId`、`remainingCount`、`remark`）
- `GET /query`：查询规则列表
- `GET /hit-log?limit=100&userId=&mysteryBoxOrderId=&createdTimeStart=&createdTimeEnd=`：查询规则命中记录（审计，支持筛选）
- `POST /{id}/enable?enabled=true|false`：启用/停用规则
- `DELETE /{id}`：删除规则

规则命中逻辑：

- 用户支付成功后，在发奖环节按 `userId + mysteryBoxId` 查找启用且 `remainingCount > 0` 的最早规则
- 命中后将订单项中奖商品中的第一个商品替换为规则指定商品
- 规则 `remainingCount` 自动减 1（减到 0 后不再生效）
- 每次命中会写入 `mystery_box_win_hit_log` 审计日志

## 6. 手机端开奖特效（分级 + 可降级）

订单详情页已支持：

- 普通/隐藏/传说分级特效（奖品越好，特效越强）
- 重播特效按钮（带 1s 冷却，避免连点）
- 自动重播开关
- 性能模式开关（自动降低粒子、延时、震动强度）
- 音效开关（普通/隐藏/传说分级音效）
- 音效稳定策略：主音源失败自动切备用音源，并自动清理并发播放
- 音效缓存策略：进入页面时预热并缓存远程音效，后续播放更稳定
- 动画生命周期清理（离开页面会停止动画并取消震动）
- 特效埋点日志（控制台输出 `effect` 事件计数）

## 7. 管理端运营配置（Admin）

本地 Admin 默认 `http://localhost:5173`（以实际端口为准），需登录具备「盲盒」权限的账号：

| 菜单路径 | 功能 |
|---------|------|
| `/mystery-box-details?id=…` → **赏品库存** Tab | 配置 `stock_total` / `stock_remaining` / `sort_order` / 终赏 Last One |
| `/mystery-box-activity` | 限时活动 CRUD（标题、Banner、结束时间、关联盲盒） |
| `/fragment-exchange-sku` | 碎片兑换 SKU CRUD |
| `/draw-pack-config` | 连拍优惠配置 |

数据库以 Flyway 迁移为准；`database.sql` 顶部有增量摘要注释。

## 8. 支付模式（模拟 / 生产插槽）

- **当前默认**：模拟支付（`MockPaymentModal`），不接入微信 SDK。
- App 环境变量：`EXPO_PUBLIC_PAYMENT_MODE=mock|wechat`（见 `src/config/payment.ts`）。
- 生产接入检查清单见 App **设置** 页；后端预支付接口：`POST /front/order/prepay/wechat`、回调 `notify`（需商户配置）。
- **待支付 15 分钟提醒**：`expo-notifications` 本地调度（需 dev build；Expo Go 可能不可用）。
- **分享海报**：`react-native-view-shot` + `expo-sharing`（同样建议 dev build 真机验证）。
- **邀请链接 QR**：可选 `EXPO_PUBLIC_INVITE_BASE_URL=https://your-domain.com`（见 `SharePosterModal`）。
- **App 架构**：`App.tsx` + `useAppController` + `AuthenticatedShell`；首页战报 ticker 支持轮播并点击打开战报弹窗。

## 9. 本地 MySQL / Redis（推荐凭据）

与 `application-dev.yml` 对齐时：

- MySQL：`localhost:3306`，`root` / `Admin123#`，库 `mystery_box`
- Redis：`localhost:6379`（排队 ZSET、全收锁）

启动示例：

```powershell
# 推荐：一键启动后端 + 管理端（需先配置 application-private.yml）
cd mystery-box-main
.\scripts\dev.ps1

# 或仅后端
cd mystery-box-backend
$env:DEV_DB_PASSWORD='Admin123#'
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

本地图片上传：`application-private.yml` 中 `oss.provider=local`，返回 `/uploads/...`；管理端 Vite 已代理 `/uploads`，App 通过 `EXPO_PUBLIC_API_BASE_URL` 拼接访问。

### Docker 依赖（可选）

```powershell
cd mystery-box-main
docker compose up -d          # MySQL 3306 + Redis 6379
.\scripts\dev.ps1 -UseDocker  # 启动前后端并等待健康检查
```

生产部署参考：`deploy/nginx.conf.example`、`application-prod.example.yml`、Admin `.env.production.example`。
