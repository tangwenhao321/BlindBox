# 功能点与用例覆盖矩阵

> 生成时间：2026-08-14T15:40:31.891Z
> 功能点：**229**｜黑盒：**4988**｜白盒：**372**｜P0黑盒：**3092**

## 说明

1. 黑盒按功能点展开：主路径、鉴权、权限、协议、幂等/并发、ID边界、字段等价类+边界+安全输入、枚举判定、列表空/尾页等。
2. 白盒按核心单元条件真/假 + 判定/短路 + 必要循环边界，面向**条件覆盖/判定覆盖**，不是路径穷举。
3. 路径组合爆炸（全条件笛卡尔积）可达数万级，本仓库采用**可执行的条件覆盖集**；若需路径覆盖率报告请结合 JaCoCo 增量补用例。
4. **不能**声称「已覆盖所有绝对路径」；可声称「功能点清单已覆盖 + 每功能点标准黑盒展开 + 核心资金域白盒条件覆盖」。

## 模块汇总

| 模块 | 功能点数 | 黑盒用例数 |
|---|---:|---:|
| C端用户 | 8 | 198 |
| 交易订单 | 11 | 301 |
| 商品目录 | 8 | 153 |
| 基础能力 | 4 | 40 |
| 定时任务 | 9 | 54 |
| 库存开盒 | 5 | 89 |
| 支付回调 | 3 | 30 |
| 消息通知 | 4 | 65 |
| 社区内容 | 6 | 133 |
| 移动端UI | 16 | 173 |
| 管理端-内容 | 6 | 166 |
| 管理端-商品 | 24 | 742 |
| 管理端-库存 | 3 | 106 |
| 管理端-报表 | 3 | 81 |
| 管理端-权限 | 7 | 182 |
| 管理端-用户 | 7 | 211 |
| 管理端-系统 | 12 | 348 |
| 管理端-营销 | 12 | 410 |
| 管理端-订单 | 9 | 241 |
| 管理端UI | 9 | 120 |
| 营销资产 | 8 | 166 |
| 订单状态机 | 42 | 748 |
| 认证授权 | 6 | 106 |
| 购物车心愿 | 7 | 125 |

## 功能点清单

| 模块 | 功能点 | 入口 | 优先级 |
|---|---|---|---|
| 认证授权 | 微信小程序登录 | POST /api/auth/wx-mini-app-login | P0 |
| 认证授权 | 管理端账号密码登录 | POST /api/auth/password-login | P0 |
| 认证授权 | 短信登录 | POST /api/auth/sms-login | P0 |
| 认证授权 | 发送短信验证码 | POST /api/auth/send-sms | P0 |
| 认证授权 | 退出登录 | POST /api/auth/logout | P1 |
| 认证授权 | 刷新/校验会话 | GET /api/auth/session | P1 |
| C端用户 | 当前用户资料 | GET /api/user/me | P0 |
| C端用户 | 更新资料 | PUT /api/user/profile | P1 |
| C端用户 | 绑定手机 | POST /api/user/bind-phone | P0 |
| C端用户 | 收货地址列表 | GET /api/user/addresses | P1 |
| C端用户 | 新增收货地址 | POST /api/user/addresses | P0 |
| C端用户 | 修改收货地址 | PUT /api/user/addresses/{id} | P1 |
| C端用户 | 删除收货地址 | DELETE /api/user/addresses/{id} | P1 |
| C端用户 | 设置默认地址 | POST /api/user/addresses/{id}/default | P1 |
| 商品目录 | 盲盒系列列表 | GET /api/series | P0 |
| 商品目录 | 系列详情 | GET /api/series/{id} | P0 |
| 商品目录 | SKU列表 | GET /api/sku | P0 |
| 商品目录 | SKU详情 | GET /api/sku/{id} | P0 |
| 商品目录 | 分类树 | GET /api/category/tree | P1 |
| 商品目录 | 搜索商品 | GET /api/search | P1 |
| 商品目录 | Banner列表 | GET /api/banner | P2 |
| 商品目录 | 活动页配置 | GET /api/activity/{id} | P2 |
| 购物车心愿 | 购物车列表 | GET /api/cart | P1 |
| 购物车心愿 | 加购 | POST /api/cart | P0 |
| 购物车心愿 | 改数量 | PUT /api/cart/{id} | P1 |
| 购物车心愿 | 删购物车项 | DELETE /api/cart/{id} | P1 |
| 购物车心愿 | 心愿单列表 | GET /api/wishlist | P2 |
| 购物车心愿 | 加入心愿 | POST /api/wishlist | P2 |
| 购物车心愿 | 移出心愿 | DELETE /api/wishlist/{id} | P2 |
| 交易订单 | 创建订单 | POST /api/order | P0 |
| 交易订单 | 订单预览计价 | POST /api/order/preview | P0 |
| 交易订单 | 发起支付 | POST /api/order/{id}/pay | P0 |
| 交易订单 | 取消订单 | POST /api/order/{id}/cancel | P0 |
| 交易订单 | 订单详情 | GET /api/order/{id} | P0 |
| 交易订单 | 我的订单列表 | GET /api/order | P0 |
| 交易订单 | 确认收货 | POST /api/order/{id}/confirm | P0 |
| 交易订单 | 申请退款 | POST /api/order/{id}/refund | P0 |
| 交易订单 | 物流查询 | GET /api/order/{id}/logistics | P1 |
| 交易订单 | 开盒结果查询 | GET /api/order/{id}/draw | P0 |
| 交易订单 | 二次购买 | POST /api/order/{id}/rebuy | P1 |
| 支付回调 | 微信支付结果通知 | POST /api/pay/wx/notify | P0 |
| 支付回调 | 微信退款结果通知 | POST /api/pay/wx/refund-notify | P0 |
| 支付回调 | 支付单查询对账 | GET /api/pay/{id} | P0 |
| 库存开盒 | 库存预占 | 内部 InventoryReserve | P0 |
| 库存开盒 | 库存释放 | 内部 InventoryRelease | P0 |
| 库存开盒 | 抽盒算法 | 内部 DrawService | P0 |
| 库存开盒 | 概率配置查询 | GET /api/box/probability | P1 |
| 库存开盒 | 箱柜状态 | GET /api/box/cabinet/{id} | P1 |
| 营销资产 | 我的优惠券 | GET /api/coupon/mine | P0 |
| 营销资产 | 领取优惠券 | POST /api/coupon/claim | P0 |
| 营销资产 | 下单可用券列表 | GET /api/coupon/available | P0 |
| 营销资产 | 余额查询 | GET /api/wallet/balance | P0 |
| 营销资产 | 余额流水 | GET /api/wallet/ledger | P1 |
| 营销资产 | 积分查询 | GET /api/points/balance | P1 |
| 营销资产 | 积分兑换 | POST /api/points/exchange | P1 |
| 营销资产 | 积分流水 | GET /api/points/ledger | P2 |
| 社区内容 | 动态列表 | GET /api/feed | P2 |
| 社区内容 | 发帖 | POST /api/feed | P2 |
| 社区内容 | 删帖 | DELETE /api/feed/{id} | P2 |
| 社区内容 | 点赞 | POST /api/feed/{id}/like | P2 |
| 社区内容 | 评论 | POST /api/feed/{id}/comment | P2 |
| 社区内容 | 举报 | POST /api/report | P2 |
| 消息通知 | 站内信列表 | GET /api/message | P1 |
| 消息通知 | 标记已读 | POST /api/message/{id}/read | P1 |
| 消息通知 | 全部已读 | POST /api/message/read-all | P2 |
| 消息通知 | 未读数 | GET /api/message/unread-count | P1 |
| 基础能力 | 文件上传 | POST /api/upload | P1 |
| 基础能力 | 客户端配置 | GET /api/config/client | P1 |
| 基础能力 | 字典项查询 | GET /api/dict/{type} | P2 |
| 基础能力 | 健康检查 | GET /actuator/health | P2 |
| 管理端-商品 | 系列分页 | GET /api/admin/series | P0 |
| 管理端-商品 | 系列详情 | GET /api/admin/series/{id} | P0 |
| 管理端-商品 | 系列新建 | POST /api/admin/series | P0 |
| 管理端-商品 | 系列更新 | PUT /api/admin/series/{id} | P0 |
| 管理端-商品 | 系列删除 | DELETE /api/admin/series/{id} | P0 |
| 管理端-商品 | 系列启停 | POST /api/admin/series/{id}/status | P0 |
| 管理端-商品 | SKU分页 | GET /api/admin/sku | P0 |
| 管理端-商品 | SKU详情 | GET /api/admin/sku/{id} | P0 |
| 管理端-商品 | SKU新建 | POST /api/admin/sku | P0 |
| 管理端-商品 | SKU更新 | PUT /api/admin/sku/{id} | P0 |
| 管理端-商品 | SKU删除 | DELETE /api/admin/sku/{id} | P0 |
| 管理端-商品 | SKU启停 | POST /api/admin/sku/{id}/status | P0 |
| 管理端-商品 | 分类分页 | GET /api/admin/category | P1 |
| 管理端-商品 | 分类详情 | GET /api/admin/category/{id} | P1 |
| 管理端-商品 | 分类新建 | POST /api/admin/category | P1 |
| 管理端-商品 | 分类更新 | PUT /api/admin/category/{id} | P1 |
| 管理端-商品 | 分类删除 | DELETE /api/admin/category/{id} | P1 |
| 管理端-商品 | 分类启停 | POST /api/admin/category/{id}/status | P1 |
| 管理端-商品 | Banner分页 | GET /api/admin/banner | P2 |
| 管理端-商品 | Banner详情 | GET /api/admin/banner/{id} | P2 |
| 管理端-商品 | Banner新建 | POST /api/admin/banner | P2 |
| 管理端-商品 | Banner更新 | PUT /api/admin/banner/{id} | P2 |
| 管理端-商品 | Banner删除 | DELETE /api/admin/banner/{id} | P2 |
| 管理端-商品 | Banner启停 | POST /api/admin/banner/{id}/status | P2 |
| 管理端-营销 | 优惠券模板分页 | GET /api/admin/coupon-template | P0 |
| 管理端-营销 | 优惠券模板详情 | GET /api/admin/coupon-template/{id} | P0 |
| 管理端-营销 | 优惠券模板新建 | POST /api/admin/coupon-template | P0 |
| 管理端-营销 | 优惠券模板更新 | PUT /api/admin/coupon-template/{id} | P0 |
| 管理端-营销 | 优惠券模板删除 | DELETE /api/admin/coupon-template/{id} | P0 |
| 管理端-营销 | 优惠券模板启停 | POST /api/admin/coupon-template/{id}/status | P0 |
| 管理端-营销 | 活动分页 | GET /api/admin/activity | P1 |
| 管理端-营销 | 活动详情 | GET /api/admin/activity/{id} | P1 |
| 管理端-营销 | 活动新建 | POST /api/admin/activity | P1 |
| 管理端-营销 | 活动更新 | PUT /api/admin/activity/{id} | P1 |
| 管理端-营销 | 活动删除 | DELETE /api/admin/activity/{id} | P1 |
| 管理端-营销 | 活动启停 | POST /api/admin/activity/{id}/status | P1 |
| 管理端-内容 | 公告分页 | GET /api/admin/announcement | P2 |
| 管理端-内容 | 公告详情 | GET /api/admin/announcement/{id} | P2 |
| 管理端-内容 | 公告新建 | POST /api/admin/announcement | P2 |
| 管理端-内容 | 公告更新 | PUT /api/admin/announcement/{id} | P2 |
| 管理端-内容 | 公告删除 | DELETE /api/admin/announcement/{id} | P2 |
| 管理端-内容 | 公告启停 | POST /api/admin/announcement/{id}/status | P2 |
| 管理端-系统 | 字典分页 | GET /api/admin/dict | P2 |
| 管理端-系统 | 字典详情 | GET /api/admin/dict/{id} | P2 |
| 管理端-系统 | 字典新建 | POST /api/admin/dict | P2 |
| 管理端-系统 | 字典更新 | PUT /api/admin/dict/{id} | P2 |
| 管理端-系统 | 字典删除 | DELETE /api/admin/dict/{id} | P2 |
| 管理端-系统 | 字典启停 | POST /api/admin/dict/{id}/status | P2 |
| 管理端-系统 | 配置项分页 | GET /api/admin/config | P1 |
| 管理端-系统 | 配置项详情 | GET /api/admin/config/{id} | P1 |
| 管理端-系统 | 配置项新建 | POST /api/admin/config | P1 |
| 管理端-系统 | 配置项更新 | PUT /api/admin/config/{id} | P1 |
| 管理端-系统 | 配置项删除 | DELETE /api/admin/config/{id} | P1 |
| 管理端-系统 | 配置项启停 | POST /api/admin/config/{id}/status | P1 |
| 管理端-订单 | 订单分页 | GET /api/admin/order | P0 |
| 管理端-订单 | 订单详情 | GET /api/admin/order/{id} | P0 |
| 管理端-订单 | 发货 | POST /api/admin/order/{id}/ship | P0 |
| 管理端-订单 | 改价 | POST /api/admin/order/{id}/adjust-price | P0 |
| 管理端-订单 | 后台取消 | POST /api/admin/order/{id}/cancel | P0 |
| 管理端-订单 | 后台退款审核通过 | POST /api/admin/refund/{id}/approve | P0 |
| 管理端-订单 | 后台退款驳回 | POST /api/admin/refund/{id}/reject | P0 |
| 管理端-订单 | 手动补单 | POST /api/admin/pay/{id}/reconcile | P0 |
| 管理端-订单 | 导出订单 | GET /api/admin/order/export | P1 |
| 管理端-用户 | 用户分页 | GET /api/admin/user | P0 |
| 管理端-用户 | 用户详情 | GET /api/admin/user/{id} | P0 |
| 管理端-用户 | 禁用用户 | POST /api/admin/user/{id}/disable | P0 |
| 管理端-用户 | 启用用户 | POST /api/admin/user/{id}/enable | P0 |
| 管理端-用户 | 调整余额 | POST /api/admin/user/{id}/balance | P0 |
| 管理端-用户 | 调整积分 | POST /api/admin/user/{id}/points | P1 |
| 管理端-用户 | 发放优惠券 | POST /api/admin/user/{id}/coupon | P0 |
| 管理端-权限 | 管理员分页 | GET /api/admin/admin-user | P0 |
| 管理端-权限 | 创建管理员 | POST /api/admin/admin-user | P0 |
| 管理端-权限 | 重置管理员密码 | POST /api/admin/admin-user/{id}/reset-password | P0 |
| 管理端-权限 | 角色分页 | GET /api/admin/role | P0 |
| 管理端-权限 | 角色授权菜单 | PUT /api/admin/role/{id}/menus | P0 |
| 管理端-权限 | 菜单树 | GET /api/admin/menu/tree | P1 |
| 管理端-权限 | 操作日志分页 | GET /api/admin/audit-log | P1 |
| 管理端-库存 | 库存调整 | POST /api/admin/inventory/adjust | P0 |
| 管理端-库存 | 库存流水 | GET /api/admin/inventory/ledger | P1 |
| 管理端-库存 | 箱柜配置 | PUT /api/admin/box/cabinet/{id} | P0 |
| 管理端-报表 | 销售日报 | GET /api/admin/report/sales-daily | P1 |
| 管理端-报表 | 用户增长 | GET /api/admin/report/user-growth | P2 |
| 管理端-报表 | 支付对账报表 | GET /api/admin/report/pay-reconcile | P0 |
| 定时任务 | 关单超时取消 | Job:关单超时取消 | P0 |
| 定时任务 | 支付结果补偿查询 | Job:支付结果补偿查询 | P0 |
| 定时任务 | 退款结果补偿 | Job:退款结果补偿 | P0 |
| 定时任务 | 优惠券过期 | Job:优惠券过期 | P1 |
| 定时任务 | 积分过期 | Job:积分过期 | P1 |
| 定时任务 | 库存预占超时释放 | Job:库存预占超时释放 | P0 |
| 定时任务 | 消息推送重试 | Job:消息推送重试 | P1 |
| 定时任务 | 数据归档 | Job:数据归档 | P1 |
| 定时任务 | 对账任务 | Job:对账任务 | P1 |
| 移动端UI | 首页Feed | Screen:Home | P1 |
| 移动端UI | 系列详情 | Screen:SeriesDetail | P1 |
| 移动端UI | 确认订单 | Screen:OrderConfirm | P0 |
| 移动端UI | 收银台 | Screen:Pay | P1 |
| 移动端UI | 开盒动画 | Screen:Draw | P0 |
| 移动端UI | 订单列表 | Screen:Orders | P0 |
| 移动端UI | 订单详情 | Screen:OrderDetail | P0 |
| 移动端UI | 退款申请页 | Screen:RefundApply | P1 |
| 移动端UI | 地址管理 | Screen:Address | P1 |
| 移动端UI | 优惠券中心 | Screen:Coupon | P1 |
| 移动端UI | 我的钱包 | Screen:Wallet | P1 |
| 移动端UI | 个人中心 | Screen:Me | P1 |
| 移动端UI | 登录页 | Screen:Login | P0 |
| 移动端UI | 搜索页 | Screen:Search | P1 |
| 移动端UI | 消息中心 | Screen:Messages | P1 |
| 移动端UI | 物流详情 | Screen:Logistics | P1 |
| 管理端UI | 登录页 | Page:AdminLogin | P1 |
| 管理端UI | 订单工作台 | Page:AdminOrders | P1 |
| 管理端UI | 发货弹窗 | Page:ShipDialog | P1 |
| 管理端UI | 退款审核 | Page:RefundAudit | P1 |
| 管理端UI | 商品编辑 | Page:SkuEdit | P1 |
| 管理端UI | 券模板编辑 | Page:CouponEdit | P1 |
| 管理端UI | 用户详情操作 | Page:UserOps | P1 |
| 管理端UI | 角色授权 | Page:RoleAuth | P1 |
| 管理端UI | 报表看板 | Page:Reports | P1 |
| 订单状态机 | PENDING_PAY->PAID | 状态迁移:支付成功 | P0 |
| 订单状态机 | PENDING_PAY->CANCELLED | 状态迁移:用户/超时取消 | P0 |
| 订单状态机 | PAID->SHIPPED | 状态迁移:发货 | P0 |
| 订单状态机 | PAID->REFUNDING | 状态迁移:申请退款 | P0 |
| 订单状态机 | SHIPPED->COMPLETED | 状态迁移:确认收货 | P0 |
| 订单状态机 | SHIPPED->REFUNDING | 状态迁移:售后申请 | P0 |
| 订单状态机 | REFUNDING->REFUNDED | 状态迁移:退款成功 | P0 |
| 订单状态机 | REFUNDING->PAID | 状态迁移:退款驳回回滚 | P0 |
| 订单状态机 | 非法PENDING_PAY->SHIPPED | 强制迁移 | P0 |
| 订单状态机 | 非法PENDING_PAY->COMPLETED | 强制迁移 | P0 |
| 订单状态机 | 非法PENDING_PAY->REFUNDING | 强制迁移 | P0 |
| 订单状态机 | 非法PENDING_PAY->REFUNDED | 强制迁移 | P0 |
| 订单状态机 | 非法PAID->PENDING_PAY | 强制迁移 | P0 |
| 订单状态机 | 非法PAID->COMPLETED | 强制迁移 | P0 |
| 订单状态机 | 非法PAID->CANCELLED | 强制迁移 | P0 |
| 订单状态机 | 非法PAID->REFUNDED | 强制迁移 | P0 |
| 订单状态机 | 非法SHIPPED->PENDING_PAY | 强制迁移 | P0 |
| 订单状态机 | 非法SHIPPED->PAID | 强制迁移 | P0 |
| 订单状态机 | 非法SHIPPED->CANCELLED | 强制迁移 | P0 |
| 订单状态机 | 非法SHIPPED->REFUNDED | 强制迁移 | P0 |
| 订单状态机 | 非法COMPLETED->PENDING_PAY | 强制迁移 | P0 |
| 订单状态机 | 非法COMPLETED->PAID | 强制迁移 | P0 |
| 订单状态机 | 非法COMPLETED->SHIPPED | 强制迁移 | P0 |
| 订单状态机 | 非法COMPLETED->CANCELLED | 强制迁移 | P0 |
| 订单状态机 | 非法COMPLETED->REFUNDING | 强制迁移 | P0 |
| 订单状态机 | 非法COMPLETED->REFUNDED | 强制迁移 | P0 |
| 订单状态机 | 非法CANCELLED->PENDING_PAY | 强制迁移 | P0 |
| 订单状态机 | 非法CANCELLED->PAID | 强制迁移 | P0 |
| 订单状态机 | 非法CANCELLED->SHIPPED | 强制迁移 | P0 |
| 订单状态机 | 非法CANCELLED->COMPLETED | 强制迁移 | P0 |
| 订单状态机 | 非法CANCELLED->REFUNDING | 强制迁移 | P0 |
| 订单状态机 | 非法CANCELLED->REFUNDED | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDING->PENDING_PAY | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDING->SHIPPED | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDING->COMPLETED | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDING->CANCELLED | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDED->PENDING_PAY | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDED->PAID | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDED->SHIPPED | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDED->COMPLETED | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDED->CANCELLED | 强制迁移 | P0 |
| 订单状态机 | 非法REFUNDED->REFUNDING | 强制迁移 | P0 |


## 高价值叠加

见 [HIGH_VALUE_PRIORITY.md](./HIGH_VALUE_PRIORITY.md)。本轮高价值黑盒 **1091**、白盒 **626** 已合并入 ALL。
