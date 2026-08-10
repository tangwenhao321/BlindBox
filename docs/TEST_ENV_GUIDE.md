# 盲盒商城 · 测试服务器部署与使用指南

> 适用：**Linux 测试服务器**（与四方系统 `vipDistributionMall` 同机但隔离）  
> 本地 Windows 仅用于上传代码、打测试 APK

---

## 一、与四方系统隔离原则

四方（vipDistributionMall）与本项目**共用一台服务器时**，必须隔离以下资源：

| 资源 | 四方系统（典型） | 盲盒测试环境 | 隔离方式 |
|------|------------------|--------------|----------|
| 业务数据库 | `vip` @ MySQL 3306 | **`mystery_box_test`** | 独立库 + 独立账号 |
| Redis | `6380` / DB **0** | **6380** / DB **1** 或 Docker **6381** | 不同 logical DB |
| 后端端口 | Node **3000** | Java **9913** | 不同进程/端口 |
| 上传目录 | 四方 uploads | **`/opt/mystery-box-test/data/uploads-test`** | 独立路径 |
| Nginx 域名 | 商城 API 域名 | **`test-api.*` / `test-admin.*`** | 独立 server_name |
| 手机 App | 四方小程序/App | **`com.mysterybox.mobile.test`** | 不同包名，可同机安装 |
| 管理账号 | 四方 merchant | **`admin_test`** | 独立种子用户 |

**禁止：** 盲盒测试连接 `vip` 库、共用 Redis DB 0、覆盖四方 Nginx 配置、安装同名 Android 包。

---

## 二、服务器目录规划

```
/opt/mystery-box-test/
├── .env                          # 环境变量（从 deploy/test-server.env.example 复制）
├── src/                          # 代码（deploy-test-remote.ps1 上传）
├── releases/
│   ├── mystery-box-backend.jar
│   └── admin-dist/               # 管理端静态资源
├── data/uploads-test/            # 本地上传文件
├── logs/
│   ├── backend.log
│   └── backend.err.log
└── config/
    └── application-private-test.yml  # 可选，或放在 src 内
```

---

## 三、首次部署（服务器上执行）

### 3.1 安装依赖

```bash
# JDK 17, Maven, Node 18+, Docker(可选), Nginx
sudo bash /opt/mystery-box-test/src/scripts/deploy-test-server.sh install
```

### 3.2 初始化 MySQL（二选一）

**方案 A — 共用服务器 MySQL，仅新建库（推荐，与四方隔离）**

```bash
# 修改 deploy/sql/init-test-mysql.sql 中的密码后执行
mysql -uroot -p < /opt/mystery-box-test/src/deploy/sql/init-test-mysql.sql
```

**方案 B — Docker 独立 MySQL/Redis 实例（端口 3307/6381）**

```bash
cd /opt/mystery-box-test/src
sudo docker compose -f docker-compose.test.yml up -d
# .env 中 TEST_DB_PORT=3307, TEST_REDIS_PORT=6381
```

### 3.3 配置环境变量

```bash
sudo cp /opt/mystery-box-test/src/deploy/test-server.env.example /opt/mystery-box-test/.env
sudo nano /opt/mystery-box-test/.env
```

必改项：

- `TEST_DB_PASSWORD` — 与 init SQL 一致  
- `TEST_REDIS_PASSWORD` / `REDIS_URL` — 与服务器 Redis 一致，**库索引用 1**  
- `PUBLIC_API_BASE_URL` — 公网 API 地址（App 用）  
- `ADMIN_ACTION_OTP` — 高危操作口令  

复制私密配置：

```bash
cp src/mystery-box-backend/src/main/resources/application-private.test.example.yml \
   src/mystery-box-backend/src/main/resources/application-private-test.yml
# 编辑 DB 密码、upload 路径
```

### 3.4 构建并启动

```bash
cd /opt/mystery-box-test/src
sudo bash scripts/deploy-test-server.sh deploy
sudo systemctl status mystery-box-test
curl http://127.0.0.1:9913/actuator/health
```

Flyway 会在首次启动时自动建表并执行种子数据（限定套系、热盒等）。

### 3.5 配置 Nginx（公网访问）

```bash
sudo cp deploy/nginx.test-server.conf.example /etc/nginx/conf.d/mystery-box-test.conf
# 修改 server_name 为你的测试域名
sudo nginx -t && sudo systemctl reload nginx
```

建议域名示例：

- API：`https://test-api.your-domain.com` → `127.0.0.1:9913`  
- 管理端：`https://test-admin.your-domain.com` → `/opt/mystery-box-test/releases/admin-dist`

防火墙放行 80/443（**不要**对外直接暴露 9913，除非内网调试）。

---

## 四、从 Windows 本机上传并部署（jarcheng.top 测试服务器）

项目内已按 **`www.jarcheng.top`** 预填配置（与 `application-dev.yml` 中 `notify-url` 一致）：

| 项 | 值 |
|----|-----|
| 服务器域名 | `jarcheng.top` / `www.jarcheng.top` |
| 当前解析 IP | `101.37.39.40`（以 DNS 为准） |
| API 公网路径 | `https://www.jarcheng.top/test-api` |
| 管理端路径 | `https://www.jarcheng.top/test-admin` |
| 部署目录 | `/opt/mystery-box-test` |

### 4.1 首次部署（两步）

**步骤 1 — 上传 + 初始化目录**

```powershell
cd D:\A-WorkSpace\blindBox\mystery-box-main
.\scripts\deploy-test-remote.ps1 -ServerHost jarcheng.top -ServerUser root -FirstRun
```

**步骤 2 — SSH 登录服务器完成配置**

```bash
ssh root@jarcheng.top

# 建库（与四方 vip 库隔离）
mysql -uroot -p < /opt/mystery-box-test/src/deploy/sql/init-test-mysql.sql

# 编辑环境变量（密码与 SQL 一致）
nano /opt/mystery-box-test/.env
# 参考: deploy/test-server.jarcheng.env.example

# 合并 Nginx（勿覆盖四方 location）
sudo cp /opt/mystery-box-test/src/deploy/nginx.jarcheng.test.conf.example /etc/nginx/conf.d/mystery-box-test.conf
# 若已有 www.jarcheng.top 的 server{}，只复制 location 块
sudo nginx -t && sudo systemctl reload nginx
```

**步骤 3 — 本机再次执行部署**

```powershell
.\scripts\deploy-test-remote.ps1 -ServerHost jarcheng.top -ServerUser root -BuildApk
```

### 4.2 日常更新

```powershell
.\scripts\deploy-test-remote.ps1 -ServerHost jarcheng.top -ServerUser root
```

### 4.3 验证

```bash
curl http://127.0.0.1:9913/actuator/health          # 服务器本机
curl https://www.jarcheng.top/test-api/actuator/health  # 公网
```

> **SSH 说明**：本机需配置密钥或交互输入密码。若用户名不是 `root`，改 `-ServerUser`。

---

## 五、测试 App 安装（与四方并存）

1. 编辑 `mystery-box-mobile-app\.env.test`：

```env
EXPO_PUBLIC_APP_VARIANT=test
EXPO_PUBLIC_API_BASE_URL=https://www.jarcheng.top/test-api
EXPO_PUBLIC_MOCK_PAYMENT=true
EXPO_PUBLIC_PAYMENT_MODE=mock
```

2. 本机打 APK（使用 `.env.test` 中的公网 API，非局域网 IP）：

```powershell
.\scripts\deploy-test-remote.ps1 -ServerHost jarcheng.top -BuildApk
# 或
.\scripts\deploy-test.ps1 -BuildApk -ServerApi
# 输出: D:\软件安装\mystery-box-test-harmony.apk
```

3. 手机安装 **「神秘盲盒·测试」**（包名 `com.mysterybox.mobile.test`），**不要**卸载四方 App。

---

## 六、账号与访问地址

| 用途 | 地址/账号 |
|------|-----------|
| 管理端 | `https://www.jarcheng.top/test-admin` |
| API | `https://www.jarcheng.top/test-api` |
| 管理登录 | `admin_test` / `Admin@Test2026` |
| App 测试用户 | `13900000001` / `Test@123456` |
| 短信验证码 | `000000`（mock） |
| 高危 OTP | `TestEnvOtp2026!` |

---

## 七、使用指南（测试人员）

### 7.1 管理端

1. 登录 `test-admin` 域名  
2. **盲盒管理**：查看/编辑套系、赏品关联、库存  
3. **订单管理**：核对支付、发货状态  
4. **用户管理**：查看测试用户数据  

### 7.2 手机 App

1. 安装测试 APK，注册或使用种子账号登录  
2. 首页 → 盲盒详情 → 选抽数 → 确认 → **模拟支付** → 开盒  
3. **仓库**：查看已抽赏品  
4. **订单**：全部/待支付/待发货  
5. **概率公示**：详情页查看档位概率  
6. **公平验证**：订单开奖后可验 hash  

### 7.3 模拟支付

测试环境 `PAYMENT_MOCK_ENABLED=true`，点击「确认支付」即成功，**无真实扣款**。

---

## 八、概率说明

### 8.1 概率基数

系统使用 **10000** 万分比：

| 字段 | 含义 |
|------|------|
| `legendary_rate` | 传说档权重 |
| `hidden_rate` | 隐藏档权重 |
| `general_rate` | 普通档权重 |

三者之和 **必须 = 10000**。种子套系默认：**传说 1% / 隐藏 5% / 普通 94%**。

### 8.2 单次抽奖

1. 支付成功 → 按订单抽数循环  
2. 随机整数 `[0,9999]` 映射档位  
3. 档位内按**剩余库存**加权选具体赏品  
4. 扣减库存，写开奖日志（含 fairness seed/hash）  

### 8.3 保底（Pity）

连续未出传说/隐藏达到 `pity_threshold`（默认 50）后，下一抽强制高档；出高档后计数清零。

### 8.4 公平验证

App「公平验证」或 API：

- `GET /front/fairness/order/{orderId}`  
- `GET /front/mystery-box/{id}/probability`  

---

## 九、注意事项

1. **测试环境非生产**：数据可清空，勿录真实隐私/真实支付信息。  
2. **与四方隔离**：勿改四方 `.env`、勿停四方 Node 进程、勿删 `vip` 库。  
3. **Redis**：务必使用 **DB 1** 或独立 6381，避免与四方缓存冲突。  
4. **端口**：9913 仅本机或内网；公网走 Nginx 443。  
5. **支付**：仅模拟支付；上线生产需换 `prod` profile 与真实微信参数。  
6. **概率**：为长期统计比例，单次结果随机；测试频繁可能导致某赏品售罄。  
7. **开盒动画**：部分鸿蒙/Android 机型可能静态展示，以结算页奖品为准。  
8. **日志**：`journalctl -u mystery-box-test -f` 或 `/opt/mystery-box-test/logs/`  

---

## 十、运维命令

```bash
# 状态
sudo systemctl status mystery-box-test
curl http://127.0.0.1:9913/actuator/health

# 重启
sudo systemctl restart mystery-box-test

# 重新构建部署
cd /opt/mystery-box-test/src && sudo bash scripts/deploy-test-server.sh deploy

# Docker 测试依赖
cd /opt/mystery-box-test/src && docker compose -f docker-compose.test.yml ps
```

---

## 十一、验收清单

- [ ] `mystery_box_test` 库已创建，与 `vip` 库隔离  
- [ ] Redis 使用 DB 1 或 6381，未占用四方 DB 0  
- [ ] `9913` 健康检查 UP  
- [ ] Nginx test-api / test-admin 可访问  
- [ ] 管理端 `admin_test` 可登录  
- [ ] 测试 APK 可注册/登录/下单/模拟支付/开盒  
- [ ] 手机可同时安装四方 App 与「神秘盲盒·测试」  
- [ ] 概率公示与后台配置一致  

---

## 附录 A — 仅本机调试（非服务器）

若只在 Windows 本机调试，使用：

```powershell
.\scripts\deploy-test.ps1
```

详见脚本内说明；**与服务器测试环境端口规划一致**（9913/5178/3307/6381）。

---

## 附录 B — 相关文件

| 文件 | 说明 |
|------|------|
| `deploy/test-server.jarcheng.env.example` | jarcheng.top 服务器 `.env` 模板 |
| `deploy/nginx.jarcheng.test.conf.example` | jarcheng 路径式 Nginx |
| `deploy/sql/init-test-mysql.sql` | MySQL 建库脚本 |
| `scripts/deploy-test-server.sh` | 服务器构建/部署 |
| `scripts/deploy-test-remote.ps1` | 本机上传 + 远程部署 |
| `docker-compose.test.yml` | 可选独立 MySQL/Redis |

---

**请将 SSH 用户/密钥配置好后执行 `deploy-test-remote.ps1`。** 完整指南见 `docs/TEST_ENV_GUIDE.md`。
