const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname);
const BB = path.join(ROOT, "BLACKBOX");
const WB = path.join(ROOT, "WHITEBOX");
for (const d of [BB, WB, path.join(ROOT, "reports")]) fs.mkdirSync(d, { recursive: true });

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const row = (a) => a.map(esc).join(",");

/** Expand one HTTP FP into many BB cases */
function expandHttp(fp, auth) {
  const out = [];
  const base = {
    module: fp.m, feature: fp.f, type: "API", entry: fp.e, pre: fp.pre || "系统可用",
    post: "可观测响应/数据", prio: fp.p || "P1",
  };
  const id = () => `BB-${String(out.length + 1).padStart(5, "0")}`;

  // Happy
  out.push({ ...base, id: id(), title: `${fp.f}-正常主路径`, steps: "合法入参调用", expect: "业务成功", technique: "场景法", class: "有效等价类" });

  // Auth matrix
  if (auth !== "public") {
    out.push({ ...base, id: id(), title: `${fp.f}-无Token`, steps: "不带Authorization", expect: "401/未登录", technique: "场景法", class: "无效-鉴权", prio: "P0" });
    out.push({ ...base, id: id(), title: `${fp.f}-伪造Token`, steps: "无效JWT/伪造sa-token", expect: "401", technique: "错误猜测", class: "无效-鉴权", prio: "P0" });
    out.push({ ...base, id: id(), title: `${fp.f}-过期Token`, steps: "过期会话", expect: "401", technique: "边界值", class: "无效-鉴权" });
  }
  if (auth === "admin") {
    out.push({ ...base, id: id(), title: `${fp.f}-C端用户访问管理端`, steps: "普通用户token调管理API", expect: "403", technique: "场景法", class: "无效-权限", prio: "P0" });
    out.push({ ...base, id: id(), title: `${fp.f}-无菜单权限角色`, steps: "低权限管理员", expect: "403", technique: "判定表", class: "无效-权限" });
  }
  if (auth === "user") {
    out.push({ ...base, id: id(), title: `${fp.f}-越权访问他人资源`, steps: "A用户操作B资源", expect: "拒绝/空", technique: "场景法", class: "无效-越权", prio: "P0" });
  }

  // Method / content-type
  out.push({ ...base, id: id(), title: `${fp.f}-错误HTTP方法`, steps: "改用错误Method", expect: "405/失败", technique: "错误猜测", class: "无效-协议" });
  out.push({ ...base, id: id(), title: `${fp.f}-错误Content-Type`, steps: "text/plain提交JSON体", expect: "415/参数失败", technique: "错误猜测", class: "无效-协议" });

  // Idempotency for writes
  if (fp.write) {
    out.push({ ...base, id: id(), title: `${fp.f}-重复提交`, steps: "连续双击/双请求", expect: "幂等或防重", technique: "场景法", class: "边界-幂等", prio: "P0" });
    out.push({ ...base, id: id(), title: `${fp.f}-并发双请求`, steps: "同参数并发2次", expect: "至多一次生效", technique: "场景法", class: "边界-并发", prio: "P0" });
  }

  // Resource id
  if (fp.id) {
    for (const [t, s, e, c] of [
      ["ID为空", "id缺省", "参数错误", "无效"],
      ["ID=0", "id=0", "不存在或参数错误", "边界"],
      ["ID负数", "id=-1", "参数错误", "无效"],
      ["ID超大", "id=Long.MAX", "不存在", "边界"],
      ["ID不存在", "合法格式不存在id", "业务不存在", "无效"],
      ["ID非数字", "id=abc", "参数错误", "无效"],
    ]) {
      out.push({ ...base, id: id(), title: `${fp.f}-${t}`, steps: s, expect: e, technique: "边界值/等价类", class: c });
    }
  }

  // Fields: empty / overlong / special / type / boundary for each
  for (const field of fp.fields || []) {
    const variants = [
      ["为空", `${field}=空`, "校验失败", "无效-必填", "等价类"],
      ["仅空格", `${field}=空白串`, "校验失败", "无效", "边界值"],
      ["超长", `${field}=超max长度`, "校验失败", "边界", "边界值"],
      ["临界最大", `${field}=max长度`, "按规格成功或失败", "边界", "边界值"],
      ["特殊字符", `${field}=<>'"&\\`, "安全过滤/校验", "无效-安全", "错误猜测"],
      ["Unicode", `${field}=emoji/中文混合`, "按规格", "有效/边界", "等价类"],
      ["SQL元字符", `${field}=' OR 1=1--`, "参数化不注入", "无效-安全", "错误猜测"],
      ["类型错误", `${field}=错误类型`, "参数错误", "无效", "等价类"],
    ];
    if (field.includes("金额") || field.includes("数量") || field.includes("价格") || field.includes("分")) {
      variants.push(
        ["=0", `${field}=0`, "按规格拒绝或允许", "边界", "边界值"],
        ["=-1", `${field}=-1`, "拒绝", "无效", "边界值"],
        ["=0.01最小正", `${field}=最小正数`, "按规格", "边界", "边界值"],
        ["超大金额", `${field}=极大值`, "拒绝或限额", "边界", "边界值"],
        ["小数位过多", `${field}=1.234`, "精度规则", "边界", "边界值"],
      );
    }
    if (field.includes("手机") || field.includes("phone")) {
      variants.push(
        ["少一位", "手机号10位", "失败", "边界", "边界值"],
        ["多一位", "手机号12位", "失败", "边界", "边界值"],
        ["非1开头", "20000000000", "失败", "无效", "等价类"],
      );
    }
    if (field.includes("页") || field.includes("page") || field.includes("size")) {
      variants.push(
        ["page=0", "page=0", "按规格", "边界", "边界值"],
        ["page=-1", "page=-1", "失败或默认", "无效", "边界值"],
        ["size=0", "size=0", "失败或空", "边界", "边界值"],
        ["size超大", "size=10000", "截断/失败", "边界", "边界值"],
      );
    }
    for (const [t, s, e, c, tech] of variants) {
      out.push({ ...base, id: id(), title: `${fp.f}-${field}${t}`, steps: s, expect: e, technique: tech, class: c });
    }
  }

  // Enum / status if any
  for (const [name, vals] of Object.entries(fp.enums || {})) {
    for (const v of vals) {
      out.push({ ...base, id: id(), title: `${fp.f}-${name}=${v}`, steps: `传${name}=${v}`, expect: "按判定表处理", technique: "判定表", class: "有效/无效-枚举" });
    }
    out.push({ ...base, id: id(), title: `${fp.f}-${name}非法值`, steps: `${name}=UNKNOWN`, expect: "失败", technique: "等价类", class: "无效-枚举" });
  }

  // List filters
  if (fp.list) {
    out.push({ ...base, id: id(), title: `${fp.f}-空结果集`, steps: "无匹配条件", expect: "空列表非报错", technique: "场景法", class: "有效-空" });
    out.push({ ...base, id: id(), title: `${fp.f}-大数据量分页尾页`, steps: "page=最后一页", expect: "正确条数", technique: "边界值", class: "边界" });
    out.push({ ...base, id: id(), title: `${fp.f}-排序字段非法`, steps: "sort=非法", expect: "默认/失败", technique: "错误猜测", class: "无效" });
  }

  return out;
}

function expandUi(fp) {
  const out = [];
  const base = { module: fp.m, feature: fp.f, type: "UI", entry: fp.e, pre: fp.pre || "已进入页面", post: "UI反馈正确", prio: fp.p || "P1" };
  const id = () => `BB-${String(out.length + 1).padStart(5, "0")}`;
  const items = [
    ["主路径完成", "按主流程操作", "成功反馈", "场景法", "有效"],
    ["弱网超时", "限速/断网后操作", "超时提示可重试", "场景法", "无效-网络"],
    ["中途返回", "操作中返回上一页", "无脏数据/可恢复", "场景法", "边界"],
    ["快速连点", "连续点击主按钮", "防抖/单次生效", "边界值", "边界-幂等"],
    ["前后台切换", "操作中切后台再回", "状态保持或提示", "场景法", "边界"],
    ["空态展示", "无数据进入", "空态文案", "场景法", "有效-空"],
    ["加载失败重试", "接口失败点重试", "可恢复", "场景法", "无效-恢复"],
    ["权限不足入口隐藏", "无权限账号", "入口不可见或禁用", "判定表", "无效-权限"],
  ];
  for (const [t, s, e, tech, c] of items) {
    out.push({ ...base, id: id(), title: `${fp.f}-${t}`, steps: s, expect: e, technique: tech, class: c });
  }
  for (const field of fp.fields || []) {
    for (const [t, s, e] of [
      ["必填空提交", "清空后提交", "前端校验"],
      ["格式错误提交", "错误格式提交", "前端校验"],
      ["超长输入", "贴超长文本", "截断或提示"],
    ]) {
      out.push({ ...base, id: id(), title: `${fp.f}-${field}${t}`, steps: s, expect: e, technique: "等价类", class: "无效-UI校验" });
    }
  }
  return out;
}

function expandJob(fp) {
  const out = [];
  const base = { module: fp.m, feature: fp.f, type: "JOB", entry: fp.e, pre: "调度可用", post: "日志可审计", prio: fp.p || "P1" };
  const id = () => `BB-${String(out.length + 1).padStart(5, "0")}`;
  for (const [t, s, e, c] of [
    ["有数据处理", "准备待处理数据触发", "处理成功落库", "有效"],
    ["空跑", "无待处理数据", "空跑成功无副作用", "有效-空"],
    ["部分失败", "混合成功失败数据", "失败可重试成功保留", "无效-部分"],
    ["锁竞争", "多实例同时触发", "ShedLock仅一实例执行", "边界-并发"],
    ["执行超时", "模拟慢任务", "超时策略符合配置", "边界"],
    ["下游不可用", "依赖服务宕机", "失败可观测可重试", "无效-依赖"],
  ]) {
    out.push({ ...base, id: id(), title: `${fp.f}-${t}`, steps: s, expect: e, technique: "场景法", class: c });
  }
  return out;
}

function expandNotify(fp) {
  const out = [];
  const base = { module: fp.m, feature: fp.f, type: "API", entry: fp.e, pre: "回调通道可用", post: "幂等落库", prio: "P0" };
  const id = () => `BB-${String(out.length + 1).padStart(5, "0")}`;
  for (const [t, s, e, c] of [
    ["签名合法首次", "合法签名首次回调", "更新成功", "有效"],
    ["签名非法", "篡改签名", "拒绝", "无效-安全"],
    ["重复回调", "同一通知重复投递", "幂等成功", "边界-幂等"],
    ["乱序回调", "先退款后支付等乱序", "状态机正确", "场景法"],
    ["金额不一致", "通知金额≠订单", "拒绝/告警", "无效"],
    ["未知商户订单号", "不存在outTradeNo", "失败可审计", "无效"],
    ["空body", "空请求体", "失败", "无效"],
    ["超大body", "超大payload", "拒绝", "边界"],
  ]) {
    out.push({ ...base, id: id(), title: `${fp.f}-${t}`, steps: s, expect: e, technique: "场景法/安全", class: c });
  }
  return out;
}

// ========== Function points (comprehensive inventory) ==========
const FPS = [];
const A = (x) => FPS.push(x);

// Auth
A({ m: "认证授权", f: "微信小程序登录", e: "POST /api/auth/wx-mini-app-login", auth: "public", write: true, fields: ["code", "加密用户信息"], p: "P0" });
A({ m: "认证授权", f: "管理端账号密码登录", e: "POST /api/auth/password-login", auth: "public", write: true, fields: ["用户名", "密码", "验证码"], p: "P0" });
A({ m: "认证授权", f: "短信登录", e: "POST /api/auth/sms-login", auth: "public", write: true, fields: ["手机号", "短信验证码"], p: "P0" });
A({ m: "认证授权", f: "发送短信验证码", e: "POST /api/auth/send-sms", auth: "public", write: true, fields: ["手机号"], p: "P0" });
A({ m: "认证授权", f: "退出登录", e: "POST /api/auth/logout", auth: "user", write: true, p: "P1" });
A({ m: "认证授权", f: "刷新/校验会话", e: "GET /api/auth/session", auth: "user", p: "P1" });

// User C
A({ m: "C端用户", f: "当前用户资料", e: "GET /api/user/me", auth: "user", p: "P0" });
A({ m: "C端用户", f: "更新资料", e: "PUT /api/user/profile", auth: "user", write: true, fields: ["昵称", "头像", "性别"], enums: { 性别: ["MALE", "FEMALE", "UNKNOWN"] }, p: "P1" });
A({ m: "C端用户", f: "绑定手机", e: "POST /api/user/bind-phone", auth: "user", write: true, fields: ["手机号", "验证码"], p: "P0" });
A({ m: "C端用户", f: "收货地址列表", e: "GET /api/user/addresses", auth: "user", list: true, p: "P1" });
A({ m: "C端用户", f: "新增收货地址", e: "POST /api/user/addresses", auth: "user", write: true, fields: ["收件人", "手机号", "省市区", "详细地址"], p: "P0" });
A({ m: "C端用户", f: "修改收货地址", e: "PUT /api/user/addresses/{id}", auth: "user", write: true, id: true, fields: ["收件人", "手机号", "详细地址"], p: "P1" });
A({ m: "C端用户", f: "删除收货地址", e: "DELETE /api/user/addresses/{id}", auth: "user", write: true, id: true, p: "P1" });
A({ m: "C端用户", f: "设置默认地址", e: "POST /api/user/addresses/{id}/default", auth: "user", write: true, id: true, p: "P1" });

// Catalog
A({ m: "商品目录", f: "盲盒系列列表", e: "GET /api/series", auth: "public", list: true, fields: ["page", "size", "关键词"], p: "P0" });
A({ m: "商品目录", f: "系列详情", e: "GET /api/series/{id}", auth: "public", id: true, p: "P0" });
A({ m: "商品目录", f: "SKU列表", e: "GET /api/sku", auth: "public", list: true, fields: ["page", "size", "系列ID"], p: "P0" });
A({ m: "商品目录", f: "SKU详情", e: "GET /api/sku/{id}", auth: "public", id: true, p: "P0" });
A({ m: "商品目录", f: "分类树", e: "GET /api/category/tree", auth: "public", list: true, p: "P1" });
A({ m: "商品目录", f: "搜索商品", e: "GET /api/search", auth: "public", list: true, fields: ["关键词", "page", "size"], p: "P1" });
A({ m: "商品目录", f: "Banner列表", e: "GET /api/banner", auth: "public", list: true, p: "P2" });
A({ m: "商品目录", f: "活动页配置", e: "GET /api/activity/{id}", auth: "public", id: true, p: "P2" });

// Cart / Wishlist
A({ m: "购物车心愿", f: "购物车列表", e: "GET /api/cart", auth: "user", list: true, p: "P1" });
A({ m: "购物车心愿", f: "加购", e: "POST /api/cart", auth: "user", write: true, fields: ["SKU_ID", "数量"], p: "P0" });
A({ m: "购物车心愿", f: "改数量", e: "PUT /api/cart/{id}", auth: "user", write: true, id: true, fields: ["数量"], p: "P1" });
A({ m: "购物车心愿", f: "删购物车项", e: "DELETE /api/cart/{id}", auth: "user", write: true, id: true, p: "P1" });
A({ m: "购物车心愿", f: "心愿单列表", e: "GET /api/wishlist", auth: "user", list: true, p: "P2" });
A({ m: "购物车心愿", f: "加入心愿", e: "POST /api/wishlist", auth: "user", write: true, fields: ["SKU_ID"], p: "P2" });
A({ m: "购物车心愿", f: "移出心愿", e: "DELETE /api/wishlist/{id}", auth: "user", write: true, id: true, p: "P2" });

// Order trade P0
A({ m: "交易订单", f: "创建订单", e: "POST /api/order", auth: "user", write: true, fields: ["SKU_ID", "数量", "地址ID", "优惠券ID", "金额分"], enums: { 支付方式: ["WECHAT", "BALANCE"] }, p: "P0" });
A({ m: "交易订单", f: "订单预览计价", e: "POST /api/order/preview", auth: "user", write: true, fields: ["SKU_ID", "数量", "优惠券ID", "金额分"], p: "P0" });
A({ m: "交易订单", f: "发起支付", e: "POST /api/order/{id}/pay", auth: "user", write: true, id: true, fields: ["支付方式"], enums: { 支付方式: ["WECHAT", "BALANCE"] }, p: "P0" });
A({ m: "交易订单", f: "取消订单", e: "POST /api/order/{id}/cancel", auth: "user", write: true, id: true, p: "P0" });
A({ m: "交易订单", f: "订单详情", e: "GET /api/order/{id}", auth: "user", id: true, p: "P0" });
A({ m: "交易订单", f: "我的订单列表", e: "GET /api/order", auth: "user", list: true, fields: ["page", "size"], enums: { 状态: ["PENDING_PAY", "PAID", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDING", "REFUNDED"] }, p: "P0" });
A({ m: "交易订单", f: "确认收货", e: "POST /api/order/{id}/confirm", auth: "user", write: true, id: true, p: "P0" });
A({ m: "交易订单", f: "申请退款", e: "POST /api/order/{id}/refund", auth: "user", write: true, id: true, fields: ["退款原因", "金额分"], p: "P0" });
A({ m: "交易订单", f: "物流查询", e: "GET /api/order/{id}/logistics", auth: "user", id: true, p: "P1" });
A({ m: "交易订单", f: "开盒结果查询", e: "GET /api/order/{id}/draw", auth: "user", id: true, p: "P0" });
A({ m: "交易订单", f: "二次购买", e: "POST /api/order/{id}/rebuy", auth: "user", write: true, id: true, p: "P1" });

// Payment notify
A({ m: "支付回调", f: "微信支付结果通知", e: "POST /api/pay/wx/notify", auth: "public", notify: true, p: "P0" });
A({ m: "支付回调", f: "微信退款结果通知", e: "POST /api/pay/wx/refund-notify", auth: "public", notify: true, p: "P0" });
A({ m: "支付回调", f: "支付单查询对账", e: "GET /api/pay/{id}", auth: "admin", id: true, p: "P0" });

// Inventory / box
A({ m: "库存开盒", f: "库存预占", e: "内部 InventoryReserve", auth: "user", write: true, fields: ["SKU_ID", "数量"], p: "P0" });
A({ m: "库存开盒", f: "库存释放", e: "内部 InventoryRelease", auth: "user", write: true, id: true, p: "P0" });
A({ m: "库存开盒", f: "抽盒算法", e: "内部 DrawService", auth: "user", write: true, fields: ["系列ID", "箱号"], p: "P0" });
A({ m: "库存开盒", f: "概率配置查询", e: "GET /api/box/probability", auth: "public", list: true, p: "P1" });
A({ m: "库存开盒", f: "箱柜状态", e: "GET /api/box/cabinet/{id}", auth: "user", id: true, p: "P1" });

// Coupon wallet points
A({ m: "营销资产", f: "我的优惠券", e: "GET /api/coupon/mine", auth: "user", list: true, enums: { 状态: ["UNUSED", "USED", "EXPIRED"] }, p: "P0" });
A({ m: "营销资产", f: "领取优惠券", e: "POST /api/coupon/claim", auth: "user", write: true, fields: ["券模板ID"], p: "P0" });
A({ m: "营销资产", f: "下单可用券列表", e: "GET /api/coupon/available", auth: "user", list: true, fields: ["订单金额分"], p: "P0" });
A({ m: "营销资产", f: "余额查询", e: "GET /api/wallet/balance", auth: "user", p: "P0" });
A({ m: "营销资产", f: "余额流水", e: "GET /api/wallet/ledger", auth: "user", list: true, fields: ["page", "size"], p: "P1" });
A({ m: "营销资产", f: "积分查询", e: "GET /api/points/balance", auth: "user", p: "P1" });
A({ m: "营销资产", f: "积分兑换", e: "POST /api/points/exchange", auth: "user", write: true, fields: ["兑换商品ID", "数量"], p: "P1" });
A({ m: "营销资产", f: "积分流水", e: "GET /api/points/ledger", auth: "user", list: true, fields: ["page", "size"], p: "P2" });

// Community
A({ m: "社区内容", f: "动态列表", e: "GET /api/feed", auth: "public", list: true, fields: ["page", "size"], p: "P2" });
A({ m: "社区内容", f: "发帖", e: "POST /api/feed", auth: "user", write: true, fields: ["正文", "图片URL"], p: "P2" });
A({ m: "社区内容", f: "删帖", e: "DELETE /api/feed/{id}", auth: "user", write: true, id: true, p: "P2" });
A({ m: "社区内容", f: "点赞", e: "POST /api/feed/{id}/like", auth: "user", write: true, id: true, p: "P2" });
A({ m: "社区内容", f: "评论", e: "POST /api/feed/{id}/comment", auth: "user", write: true, id: true, fields: ["评论内容"], p: "P2" });
A({ m: "社区内容", f: "举报", e: "POST /api/report", auth: "user", write: true, fields: ["目标ID", "原因"], p: "P2" });

// Message
A({ m: "消息通知", f: "站内信列表", e: "GET /api/message", auth: "user", list: true, fields: ["page", "size"], p: "P1" });
A({ m: "消息通知", f: "标记已读", e: "POST /api/message/{id}/read", auth: "user", write: true, id: true, p: "P1" });
A({ m: "消息通知", f: "全部已读", e: "POST /api/message/read-all", auth: "user", write: true, p: "P2" });
A({ m: "消息通知", f: "未读数", e: "GET /api/message/unread-count", auth: "user", p: "P1" });

// Upload / config
A({ m: "基础能力", f: "文件上传", e: "POST /api/upload", auth: "user", write: true, fields: ["文件", "业务类型"], p: "P1" });
A({ m: "基础能力", f: "客户端配置", e: "GET /api/config/client", auth: "public", p: "P1" });
A({ m: "基础能力", f: "字典项查询", e: "GET /api/dict/{type}", auth: "public", id: true, p: "P2" });
A({ m: "基础能力", f: "健康检查", e: "GET /actuator/health", auth: "public", p: "P2" });

// Admin - product
const adminCrud = (m, name, pathBase, fields, p = "P1") => {
  A({ m, f: `${name}分页`, e: `GET ${pathBase}`, auth: "admin", list: true, fields: ["page", "size", "关键词"], p });
  A({ m, f: `${name}详情`, e: `GET ${pathBase}/{id}`, auth: "admin", id: true, p });
  A({ m, f: `${name}新建`, e: `POST ${pathBase}`, auth: "admin", write: true, fields, p });
  A({ m, f: `${name}更新`, e: `PUT ${pathBase}/{id}`, auth: "admin", write: true, id: true, fields, p });
  A({ m, f: `${name}删除`, e: `DELETE ${pathBase}/{id}`, auth: "admin", write: true, id: true, p });
  A({ m, f: `${name}启停`, e: `POST ${pathBase}/{id}/status`, auth: "admin", write: true, id: true, enums: { 状态: ["ENABLE", "DISABLE"] }, p });
};
adminCrud("管理端-商品", "系列", "/api/admin/series", ["名称", "封面", "价格分", "排序"], "P0");
adminCrud("管理端-商品", "SKU", "/api/admin/sku", ["名称", "系列ID", "库存数量", "价格分"], "P0");
adminCrud("管理端-商品", "分类", "/api/admin/category", ["名称", "父级ID", "排序"], "P1");
adminCrud("管理端-商品", "Banner", "/api/admin/banner", ["标题", "图片", "跳转链接", "排序"], "P2");
adminCrud("管理端-营销", "优惠券模板", "/api/admin/coupon-template", ["名称", "面额分", "门槛分", "库存数量", "有效期"], "P0");
adminCrud("管理端-营销", "活动", "/api/admin/activity", ["名称", "开始时间", "结束时间", "规则JSON"], "P1");
adminCrud("管理端-内容", "公告", "/api/admin/announcement", ["标题", "正文", "排序"], "P2");
adminCrud("管理端-系统", "字典", "/api/admin/dict", ["类型", "编码", "名称", "排序"], "P2");
adminCrud("管理端-系统", "配置项", "/api/admin/config", ["键", "值", "描述"], "P1");

A({ m: "管理端-订单", f: "订单分页", e: "GET /api/admin/order", auth: "admin", list: true, fields: ["page", "size", "订单号", "用户ID"], enums: { 状态: ["PENDING_PAY", "PAID", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDING", "REFUNDED"] }, p: "P0" });
A({ m: "管理端-订单", f: "订单详情", e: "GET /api/admin/order/{id}", auth: "admin", id: true, p: "P0" });
A({ m: "管理端-订单", f: "发货", e: "POST /api/admin/order/{id}/ship", auth: "admin", write: true, id: true, fields: ["物流公司", "运单号"], p: "P0" });
A({ m: "管理端-订单", f: "改价", e: "POST /api/admin/order/{id}/adjust-price", auth: "admin", write: true, id: true, fields: ["金额分"], p: "P0" });
A({ m: "管理端-订单", f: "后台取消", e: "POST /api/admin/order/{id}/cancel", auth: "admin", write: true, id: true, fields: ["原因"], p: "P0" });
A({ m: "管理端-订单", f: "后台退款审核通过", e: "POST /api/admin/refund/{id}/approve", auth: "admin", write: true, id: true, p: "P0" });
A({ m: "管理端-订单", f: "后台退款驳回", e: "POST /api/admin/refund/{id}/reject", auth: "admin", write: true, id: true, fields: ["原因"], p: "P0" });
A({ m: "管理端-订单", f: "手动补单", e: "POST /api/admin/pay/{id}/reconcile", auth: "admin", write: true, id: true, p: "P0" });
A({ m: "管理端-订单", f: "导出订单", e: "GET /api/admin/order/export", auth: "admin", list: true, fields: ["开始时间", "结束时间"], p: "P1" });

A({ m: "管理端-用户", f: "用户分页", e: "GET /api/admin/user", auth: "admin", list: true, fields: ["page", "size", "手机号", "关键词"], p: "P0" });
A({ m: "管理端-用户", f: "用户详情", e: "GET /api/admin/user/{id}", auth: "admin", id: true, p: "P0" });
A({ m: "管理端-用户", f: "禁用用户", e: "POST /api/admin/user/{id}/disable", auth: "admin", write: true, id: true, p: "P0" });
A({ m: "管理端-用户", f: "启用用户", e: "POST /api/admin/user/{id}/enable", auth: "admin", write: true, id: true, p: "P0" });
A({ m: "管理端-用户", f: "调整余额", e: "POST /api/admin/user/{id}/balance", auth: "admin", write: true, id: true, fields: ["金额分", "备注"], p: "P0" });
A({ m: "管理端-用户", f: "调整积分", e: "POST /api/admin/user/{id}/points", auth: "admin", write: true, id: true, fields: ["数量", "备注"], p: "P1" });
A({ m: "管理端-用户", f: "发放优惠券", e: "POST /api/admin/user/{id}/coupon", auth: "admin", write: true, id: true, fields: ["券模板ID", "数量"], p: "P0" });

A({ m: "管理端-权限", f: "管理员分页", e: "GET /api/admin/admin-user", auth: "admin", list: true, fields: ["page", "size"], p: "P0" });
A({ m: "管理端-权限", f: "创建管理员", e: "POST /api/admin/admin-user", auth: "admin", write: true, fields: ["用户名", "密码", "角色ID"], p: "P0" });
A({ m: "管理端-权限", f: "重置管理员密码", e: "POST /api/admin/admin-user/{id}/reset-password", auth: "admin", write: true, id: true, fields: ["新密码"], p: "P0" });
A({ m: "管理端-权限", f: "角色分页", e: "GET /api/admin/role", auth: "admin", list: true, p: "P0" });
A({ m: "管理端-权限", f: "角色授权菜单", e: "PUT /api/admin/role/{id}/menus", auth: "admin", write: true, id: true, fields: ["菜单ID列表"], p: "P0" });
A({ m: "管理端-权限", f: "菜单树", e: "GET /api/admin/menu/tree", auth: "admin", list: true, p: "P1" });
A({ m: "管理端-权限", f: "操作日志分页", e: "GET /api/admin/audit-log", auth: "admin", list: true, fields: ["page", "size", "操作人"], p: "P1" });

A({ m: "管理端-库存", f: "库存调整", e: "POST /api/admin/inventory/adjust", auth: "admin", write: true, fields: ["SKU_ID", "数量", "备注"], p: "P0" });
A({ m: "管理端-库存", f: "库存流水", e: "GET /api/admin/inventory/ledger", auth: "admin", list: true, fields: ["page", "size", "SKU_ID"], p: "P1" });
A({ m: "管理端-库存", f: "箱柜配置", e: "PUT /api/admin/box/cabinet/{id}", auth: "admin", write: true, id: true, fields: ["概率配置JSON"], p: "P0" });
A({ m: "管理端-报表", f: "销售日报", e: "GET /api/admin/report/sales-daily", auth: "admin", list: true, fields: ["开始时间", "结束时间"], p: "P1" });
A({ m: "管理端-报表", f: "用户增长", e: "GET /api/admin/report/user-growth", auth: "admin", list: true, fields: ["开始时间", "结束时间"], p: "P2" });
A({ m: "管理端-报表", f: "支付对账报表", e: "GET /api/admin/report/pay-reconcile", auth: "admin", list: true, fields: ["开始时间", "结束时间"], p: "P0" });

// Jobs
["关单超时取消", "支付结果补偿查询", "退款结果补偿", "优惠券过期", "积分过期", "库存预占超时释放", "消息推送重试", "数据归档", "对账任务"].forEach((f) => {
  A({ m: "定时任务", f, e: `Job:${f}`, job: true, p: f.includes("支付") || f.includes("退款") || f.includes("关单") || f.includes("库存") ? "P0" : "P1" });
});

// Mobile UI
[
  ["首页Feed", "Home", ["下拉刷新"]],
  ["系列详情", "SeriesDetail", ["数量"]],
  ["确认订单", "OrderConfirm", ["地址", "优惠券", "数量"]],
  ["收银台", "Pay", ["支付方式"]],
  ["开盒动画", "Draw", []],
  ["订单列表", "Orders", ["状态筛选"]],
  ["订单详情", "OrderDetail", []],
  ["退款申请页", "RefundApply", ["退款原因", "金额分"]],
  ["地址管理", "Address", ["收件人", "手机号", "详细地址"]],
  ["优惠券中心", "Coupon", []],
  ["我的钱包", "Wallet", []],
  ["个人中心", "Me", []],
  ["登录页", "Login", ["手机号", "验证码"]],
  ["搜索页", "Search", ["关键词"]],
  ["消息中心", "Messages", []],
  ["物流详情", "Logistics", []],
].forEach(([f, e, fields]) => A({ m: "移动端UI", f, e: `Screen:${e}`, ui: true, fields, p: f.includes("支付") || f.includes("订单") || f.includes("开盒") || f.includes("登录") ? "P0" : "P1" }));

// Admin UI
[
  ["登录页", "AdminLogin", ["用户名", "密码"]],
  ["订单工作台", "AdminOrders", ["订单号"]],
  ["发货弹窗", "ShipDialog", ["物流公司", "运单号"]],
  ["退款审核", "RefundAudit", ["原因"]],
  ["商品编辑", "SkuEdit", ["名称", "价格分", "库存数量"]],
  ["券模板编辑", "CouponEdit", ["面额分", "门槛分", "库存数量"]],
  ["用户详情操作", "UserOps", ["金额分", "备注"]],
  ["角色授权", "RoleAuth", []],
  ["报表看板", "Reports", ["开始时间", "结束时间"]],
].forEach(([f, e, fields]) => A({ m: "管理端UI", f, e: `Page:${e}`, ui: true, fields, p: "P1" }));

// Order state matrix as dedicated FPs (each transition)
const states = ["PENDING_PAY", "PAID", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDING", "REFUNDED"];
const transitions = [
  ["PENDING_PAY", "PAID", "支付成功"],
  ["PENDING_PAY", "CANCELLED", "用户/超时取消"],
  ["PAID", "SHIPPED", "发货"],
  ["PAID", "REFUNDING", "申请退款"],
  ["SHIPPED", "COMPLETED", "确认收货"],
  ["SHIPPED", "REFUNDING", "售后申请"],
  ["REFUNDING", "REFUNDED", "退款成功"],
  ["REFUNDING", "PAID", "退款驳回回滚"],
];
for (const [from, to, via] of transitions) {
  A({ m: "订单状态机", f: `${from}->${to}`, e: `状态迁移:${via}`, auth: "user", write: true, p: "P0", fields: ["订单ID"] });
}
// illegal transitions
for (const from of states) {
  for (const to of states) {
    if (from === to) continue;
    if (transitions.some(([a, b]) => a === from && b === to)) continue;
    A({ m: "订单状态机", f: `非法${from}->${to}`, e: `强制迁移`, auth: "admin", write: true, p: "P0", fields: ["订单ID"] });
  }
}

// ========== Generate BB ==========
let bb = [];
for (const fp of FPS) {
  let cases;
  if (fp.notify) cases = expandNotify(fp);
  else if (fp.job) cases = expandJob(fp);
  else if (fp.ui) cases = expandUi(fp);
  else cases = expandHttp(fp, fp.auth || "user");
  // fix ids globally later
  bb = bb.concat(cases);
}
bb = bb.map((c, i) => ({ ...c, id: `BB-${String(i + 1).padStart(5, "0")}` }));

const bbHeader = ["用例ID", "模块", "功能点", "用例标题", "用例类型", "优先级", "前置条件", "入口/接口", "步骤摘要", "预期结果", "测试技术", "等价类/边界", "关联白盒"];
fs.writeFileSync(path.join(BB, "ALL_BLACKBOX_CASES.csv"), "\uFEFF" + [row(bbHeader), ...bb.map((c) => row([c.id, c.module, c.feature, c.title, c.type, c.prio, c.pre, c.entry, c.steps, c.expect, c.technique, c.class, ""]))].join("\n"), "utf8");

// per module files
const byMod = {};
for (const c of bb) (byMod[c.module] ||= []).push(c);
for (const [m, list] of Object.entries(byMod)) {
  const safe = m.replace(/[\\/:*?"<>|]/g, "_");
  fs.writeFileSync(path.join(BB, `${safe}.csv`), "\uFEFF" + [row(bbHeader), ...list.map((c) => row([c.id, c.module, c.feature, c.title, c.type, c.prio, c.pre, c.entry, c.steps, c.expect, c.technique, c.class, ""]))].join("\n"), "utf8");
}

// ========== Whitebox ==========
const wbUnits = [
  { m: "支付域", u: "PayService.createPay", conds: ["订单存在", "状态PENDING_PAY", "金额>0", "未超支付窗口", "渠道可用", "幂等键未占用", "用户匹配", "库存仍预占"] },
  { m: "支付域", u: "PayService.handlePayNotify", conds: ["签名合法", "订单存在", "金额一致", "非终态可入账", "未重复通知", "事务提交成功", "开盒触发条件满足"] },
  { m: "支付域", u: "PayService.refund", conds: ["订单可退", "退款额<=实付", "渠道受理成功", "状态机允许", "未重复退款", "券回滚需要", "积分回滚需要"] },
  { m: "支付域", u: "PayService.handleRefundNotify", conds: ["签名合法", "退款单存在", "金额一致", "状态REFUNDING", "幂等", "库存回补策略"] },
  { m: "订单域", u: "OrderService.create", conds: ["SKU上架", "库存充足", "地址有效", "券可用", "计价一致", "用户未封禁", "活动有效", "限购未超"] },
  { m: "订单域", u: "OrderService.cancel", conds: ["所有者", "可取消状态", "释放库存", "回滚券", "关闭支付单"] },
  { m: "订单域", u: "OrderService.confirmReceive", conds: ["所有者", "已发货", "未确认过", "售后未进行中"] },
  { m: "订单域", u: "OrderStateMachine.transition", conds: ["from合法", "事件合法", "守卫通过", "动作成功", "并发版本匹配"] },
  { m: "库存域", u: "InventoryService.reserve", conds: ["SKU存在", "可售库存>=n", "预占锁获取", "过期时间写入", "事务成功"] },
  { m: "库存域", u: "InventoryService.release", conds: ["预占存在", "未消费", "回补成功", "幂等"] },
  { m: "库存域", u: "InventoryService.consume", conds: ["预占有效", "扣减成功", "流水写入"] },
  { m: "开盒域", u: "DrawService.draw", conds: ["已支付", "箱未抽完", "概率表合法", "随机源可用", "结果落库", "稀有度约束"] },
  { m: "券域", u: "CouponService.claim", conds: ["模板有效", "库存>0", "用户未超领", "时间窗内", "人群包匹配"] },
  { m: "券域", u: "CouponService.lockForOrder", conds: ["券未使用", "未过期", "门槛满足", "适用商品", "锁定成功"] },
  { m: "券域", u: "CouponService.consume", conds: ["已锁定", "订单支付成功", "核销幂等"] },
  { m: "券域", u: "CouponService.rollback", conds: ["曾核销或锁定", "订单取消/退款", "回滚幂等"] },
  { m: "钱包域", u: "WalletService.debit", conds: ["余额充足", "用户匹配", "金额>0", "并发乐观锁", "流水写入"] },
  { m: "钱包域", u: "WalletService.credit", conds: ["金额>0", "幂等键", "流水写入"] },
  { m: "积分域", u: "PointsService.earn", conds: ["规则命中", "未超日上限", "幂等", "流水"] },
  { m: "积分域", u: "PointsService.spend", conds: ["余额充足", "商品可兑", "扣减成功"] },
  { m: "用户域", u: "AuthService.wxLogin", conds: ["code有效", "微信接口成功", "用户创建或绑定", "token签发"] },
  { m: "用户域", u: "AuthService.passwordLogin", conds: ["用户存在", "密码匹配", "未锁定", "验证码正确", "token签发"] },
  { m: "用户域", u: "SmsService.send", conds: ["手机合法", "频控通过", "渠道成功", "验证码缓存"] },
  { m: "权限域", u: "AdminAuthz.check", conds: ["已登录", "角色启用", "菜单权限命中", "数据权限命中"] },
  { m: "任务域", u: "CloseOrderJob", conds: ["存在超时单", "状态仍待支付", "取消成功", "锁持有"] },
  { m: "任务域", u: "PayCompensateJob", conds: ["疑似已支付", "渠道查单成功", "本地未入账", "补单成功"] },
  { m: "任务域", u: "RefundCompensateJob", conds: ["退款中超时", "渠道成功", "本地未终态", "补偿成功"] },
  { m: "任务域", u: "CouponExpireJob", conds: ["存在过期券", "批量更新", "锁持有"] },
  { m: "基础设施", u: "RedisLock.execute", conds: ["锁获取成功", "业务成功", "锁释放", "看门狗续期"] },
  { m: "基础设施", u: "IdempotentAspect", conds: ["幂等键存在", "首次请求", "重复请求", "TTL有效"] },
  { m: "基础设施", u: "TransactionalMoneyPath", conds: ["DB提交", "Redis一致", "异常回滚", "部分失败补偿"] },
];

let wb = [];
for (const u of wbUnits) {
  // each condition T/F
  u.conds.forEach((cond, idx) => {
    wb.push({ m: u.m, u: u.u, title: `${cond}=真其余默认真`, cond: `${cond}=TRUE`, path: `主路径/分支${idx + 1}T`, crit: "条件覆盖", expect: "按设计通过或进入对应分支" });
    wb.push({ m: u.m, u: u.u, title: `${cond}=假`, cond: `${cond}=FALSE;其余尽量真`, path: `分支${idx + 1}F`, crit: "条件覆盖", expect: "拒绝/降级/对应错误码" });
  });
  // decision MC/DC style pair
  wb.push({ m: u.m, u: u.u, title: "全真主路径", cond: u.conds.map((c) => `${c}=T`).join(" && "), path: "主路径", crit: "判定覆盖", expect: "成功" });
  wb.push({ m: u.m, u: u.u, title: "复合条件短路", cond: "前条件假触发短路", path: "短路路径", crit: "条件判定", expect: "不执行后续副作用" });
  // loops / boundaries if inventory-like
  if (u.u.includes("Inventory") || u.u.includes("Draw") || u.u.includes("Job")) {
    wb.push({ m: u.m, u: u.u, title: "循环0次", cond: "集合空", path: "循环边界0", crit: "循环覆盖", expect: "空处理正确" });
    wb.push({ m: u.m, u: u.u, title: "循环1次", cond: "集合1", path: "循环边界1", crit: "循环覆盖", expect: "单次正确" });
    wb.push({ m: u.m, u: u.u, title: "循环多次", cond: "集合N>1", path: "循环多次", crit: "循环覆盖", expect: "批量正确" });
  }
}
wb = wb.map((c, i) => ({ ...c, id: `WB-${String(i + 1).padStart(5, "0")}` }));
const wbHeader = ["用例ID", "模块", "单元/方法", "用例标题", "条件赋值", "路径/分支", "覆盖准则", "预期", "关联黑盒"];
fs.writeFileSync(path.join(WB, "ALL_WHITEBOX_CASES.csv"), "\uFEFF" + [row(wbHeader), ...wb.map((c) => row([c.id, c.m, c.u, c.title, c.cond, c.path, c.crit, c.expect, ""]))].join("\n"), "utf8");

// coverage + readme
const p0 = bb.filter((c) => c.prio === "P0").length;
const mods = Object.keys(byMod).sort();
let cov = `# 功能点与用例覆盖矩阵\n\n> 生成时间：${new Date().toISOString()}\n> 功能点：**${FPS.length}**｜黑盒：**${bb.length}**｜白盒：**${wb.length}**｜P0黑盒：**${p0}**\n\n## 说明\n\n1. 黑盒按功能点展开：主路径、鉴权、权限、协议、幂等/并发、ID边界、字段等价类+边界+安全输入、枚举判定、列表空/尾页等。\n2. 白盒按核心单元条件真/假 + 判定/短路 + 必要循环边界，面向**条件覆盖/判定覆盖**，不是路径穷举。\n3. 路径组合爆炸（全条件笛卡尔积）可达数万级，本仓库采用**可执行的条件覆盖集**；若需路径覆盖率报告请结合 JaCoCo 增量补用例。\n4. **不能**声称「已覆盖所有绝对路径」；可声称「功能点清单已覆盖 + 每功能点标准黑盒展开 + 核心资金域白盒条件覆盖」。\n\n## 模块汇总\n\n| 模块 | 功能点数 | 黑盒用例数 |\n|---|---:|---:|\n`;
for (const m of mods) {
  const fc = FPS.filter((f) => f.m === m).length;
  cov += `| ${m} | ${fc} | ${byMod[m].length} |\n`;
}
cov += `\n## 功能点清单\n\n| 模块 | 功能点 | 入口 | 优先级 |\n|---|---|---|---|\n`;
for (const f of FPS) cov += `| ${f.m} | ${f.f} | ${f.e} | ${f.p || "P1"} |\n`;
fs.writeFileSync(path.join(ROOT, "00-FUNCTION-COVERAGE.md"), cov, "utf8");

const readme = `# 测试用例包（黑盒 / 白盒）\n\n| 指标 | 数量 |\n|---|---:|\n| 功能点 | ${FPS.length} |\n| 黑盒用例 | ${bb.length} |\n| 白盒用例 | ${wb.length} |\n| P0 黑盒 | ${p0} |\n\n## 目录\n\n- \`BLACKBOX/ALL_BLACKBOX_CASES.csv\` — 全量黑盒\n- \`BLACKBOX/<模块>.csv\` — 分模块\n- \`WHITEBOX/ALL_WHITEBOX_CASES.csv\` — 全量白盒\n- \`00-FUNCTION-COVERAGE.md\` — 功能点矩阵与方法论说明\n- \`P0_SMOKE.md\` — P0 冒烟子集\n- \`_generate_thousands.js\` — 生成脚本（可继续加功能点后重跑）\n\n## 与「几千条」的关系\n\n当前黑盒约 **${bb.length}** 条，来自 **${FPS.length}** 个功能点 × 标准展开（鉴权/边界/等价类等）。\n若把「每个接口 × 每个字段 × 每种组合 × 每种状态」做全笛卡尔积，理论上可到数万；那会严重冗余且不可维护。\n本包策略：**功能点全覆盖 + 每点充分展开 + 资金域白盒条件覆盖**；用 JaCoCo 缺口再补白盒。\n\n## 再生\n\n\`\`\`bash\nnode docs/TEST_CASES/_generate_thousands.js\n\`\`\`\n`;
fs.writeFileSync(path.join(ROOT, "README.md"), readme, "utf8");

const p0list = bb.filter((c) => c.prio === "P0").slice(0, 400);
let p0md = `# P0 冒烟用例（截取前 ${p0list.length} / 全量 P0 ${p0}）\n\n`;
for (const c of p0list) p0md += `- ${c.id} [${c.module}/${c.feature}] ${c.title}\n`;
fs.writeFileSync(path.join(ROOT, "P0_SMOKE.md"), p0md, "utf8");

fs.writeFileSync(path.join(ROOT, "reports", "COVERAGE_TEMPLATE.md"), `# 执行覆盖率记录模板\n\n| 轮次 | 日期 | 黑盒执行 | 黑盒通过 | 白盒/单测 | JaCoCo行 | JaCoCo分支 | 备注 |\n|---|---|---:|---:|---:|---:|---:|---|\n| 1 |  |  |  |  |  |  |  |\n`, "utf8");

console.log(JSON.stringify({ fps: FPS.length, blackbox: bb.length, whitebox: wb.length, p0, modules: mods.length }, null, 2));