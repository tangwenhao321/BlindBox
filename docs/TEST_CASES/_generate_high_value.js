/**
 * High-ROI full expansion for money / trade / draw / stock / auth-critical paths.
 * Merges into ALL_* CSVs (append + renumber) and writes dedicated HIGH_VALUE files.
 *
 * Priority domains (real controllers):
 *  1. front/mystery-box-order  (create→prepay×3→notify×3→cancel/redeem/confirm/refund)
 *  2. admin mystery-box-order + refund-record
 *  3. draw-queue / prize-stock / fairness
 *  4. vip-order parallel pay paths
 *  5. auth grant / zalo / sms abuse
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const BB = path.join(ROOT, "BLACKBOX");
const WB = path.join(ROOT, "WHITEBOX");
for (const d of [BB, WB, path.join(ROOT, "reports")]) fs.mkdirSync(d, { recursive: true });

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const row = (a) => a.map(esc).join(",");
const push = (arr, o) => arr.push(o);

const ORDER_STATUS = [
  "TO_BE_PAID",
  "TO_BE_DELIVERED",
  "TO_BE_RECEIVED",
  "TO_BE_EVALUATED",
  "CLOSED",
  "REFUNDED",
];

const PAY_CHANNELS = ["WECHAT", "VNPAY", "MOMO", "MOCK", "BALANCE"];

const ACTIONS = [
  ["create", "POST front/mystery-box-order/create"],
  ["calculate", "POST front/mystery-box-order/calculate"],
  ["prepay_wechat", "POST front/mystery-box-order/{id}/prepay/wechat"],
  ["prepay_wechat_retry", "POST front/mystery-box-order/{id}/prepay/wechat/retry"],
  ["prepay_vnpay", "POST front/mystery-box-order/{id}/prepay/vnpay"],
  ["prepay_vnpay_retry", "POST front/mystery-box-order/{id}/prepay/vnpay/retry"],
  ["prepay_momo", "POST front/mystery-box-order/{id}/prepay/momo"],
  ["prepay_momo_retry", "POST front/mystery-box-order/{id}/prepay/momo/retry"],
  ["pay_mock", "POST front/mystery-box-order/{id}/pay/mock"],
  ["cancel_unpaid", "POST front/mystery-box-order/{id}/unpaid/cancel/user"],
  ["redeem_balance", "POST front/mystery-box-order/{id}/redeem/balance"],
  ["confirm_receive", "POST front/mystery-box-order/{id}/confirm-receive/user"],
  ["abandon_offer", "POST front/mystery-box-order/{id}/abandon-offer"],
  ["admin_paid_cancel", "POST admin/mystery-box-order/{id}/paid/cancel"],
  ["admin_deliver", "POST admin/mystery-box-order/{id}/deliver"],
  ["admin_deliver_batch", "POST admin/mystery-box-order/deliver/batch"],
  ["refund_approve", "POST admin/refund-record/{id}/approve"],
  ["refund_reject", "POST admin/refund-record/{id}/reject"],
  ["item_redeem_balance", "POST front/mystery-box-order-item/{itemId}/redeem-balance"],
];

/** Legal (status, action) → expected; others = reject */
const LEGAL = new Set([
  "TO_BE_PAID|prepay_wechat",
  "TO_BE_PAID|prepay_wechat_retry",
  "TO_BE_PAID|prepay_vnpay",
  "TO_BE_PAID|prepay_vnpay_retry",
  "TO_BE_PAID|prepay_momo",
  "TO_BE_PAID|prepay_momo_retry",
  "TO_BE_PAID|pay_mock",
  "TO_BE_PAID|cancel_unpaid",
  "TO_BE_PAID|calculate",
  "TO_BE_DELIVERED|admin_deliver",
  "TO_BE_DELIVERED|admin_paid_cancel",
  "TO_BE_DELIVERED|refund_approve",
  "TO_BE_DELIVERED|refund_reject",
  "TO_BE_DELIVERED|item_redeem_balance",
  "TO_BE_DELIVERED|redeem_balance",
  "TO_BE_DELIVERED|abandon_offer",
  "TO_BE_RECEIVED|confirm_receive",
  "TO_BE_RECEIVED|admin_paid_cancel",
  "TO_BE_RECEIVED|refund_approve",
  "TO_BE_RECEIVED|refund_reject",
  "TO_BE_RECEIVED|item_redeem_balance",
  "TO_BE_EVALUATED|refund_approve",
  "TO_BE_EVALUATED|refund_reject",
  "CLOSED|refund_approve",
]);

function bbBase(module, feature, entry, prio = "P0") {
  return {
    module,
    feature,
    type: "API",
    entry,
    pre: "高价值资金/交易前置数据就绪",
    post: "账实一致可审计",
    prio,
    technique: "判定表/场景法",
    class: "高价值-全量",
  };
}

function generateHighValueBlackbox() {
  const out = [];

  // ---- 1) Order status × action full decision table ----
  for (const st of ORDER_STATUS) {
    for (const [act, entry] of ACTIONS) {
      if (act === "create" || act === "calculate" || act === "admin_deliver_batch") continue;
      const legal = LEGAL.has(`${st}|${act}`);
      push(out, {
        ...bbBase("HV-订单状态机", `${st}×${act}`, entry),
        title: legal ? `合法-${st}-${act}` : `非法-${st}-${act}`,
        steps: `订单状态=${st} 调用 ${act}`,
        expect: legal ? "按业务成功或进入下一状态" : "拒绝且无资金/库存副作用",
        technique: "判定表",
        class: legal ? "有效-状态迁移" : "无效-非法迁移",
      });
    }
  }

  // ---- 2) Multi-gateway pay notify matrix ----
  const notifySpecs = [
    ["微信", "POST front/mystery-box-order/notify/pay/wechat", ["签名头", "订单号", "金额分", "transactionId"]],
    ["VNPay", "POST front/mystery-box-order/notify/pay/vnpay", ["vnp_SecureHash", "vnp_TxnRef", "vnp_Amount", "vnp_ResponseCode"]],
    ["VNPay-GET", "GET front/mystery-box-order/notify/pay/vnpay", ["query签名参数"]],
    ["MoMo", "POST front/mystery-box-order/notify/pay/momo", ["signature", "orderId", "amount", "resultCode"]],
    ["MoMo-GET", "GET front/mystery-box-order/notify/pay/momo", ["query签名参数"]],
    ["微信退款", "POST front/mystery-box-order/notify/refund/wechat", ["签名头", "退款单号", "退款金额分", "refund_status"]],
    ["VIP微信", "POST front/vip-order/notify/pay/wechat", ["签名头", "VIP订单号", "金额分"]],
    ["VIP-VNPay", "POST front/vip-order/notify/pay/vnpay", ["vnp_SecureHash", "vnp_TxnRef"]],
    ["VIP-MoMo", "POST front/vip-order/notify/pay/momo", ["signature", "orderId"]],
  ];
  const notifyScenes = [
    ["首次合法成功", "合法签名+金额一致+待支付", "入账成功幂等键占用", "有效"],
    ["重复通知", "同一成功通知再投递", "幂等成功不重复开盒/入账", "边界-幂等"],
    ["三次重复", "成功通知连续3次", "仍幂等", "边界-幂等"],
    ["签名非法", "篡改body或签名", "拒绝不入账", "无效-安全"],
    ["签名过期窗口", "时间戳超窗", "拒绝", "边界-安全"],
    ["金额少一分", "通知金额=应付-1", "拒绝/告警", "边界-金额"],
    ["金额多一分", "通知金额=应付+1", "拒绝/告警", "边界-金额"],
    ["金额少1%", "通知金额=应付*0.99", "拒绝", "边界-金额"],
    ["金额为0", "amount=0", "拒绝", "无效"],
    ["金额为负", "amount=-1", "拒绝", "无效"],
    ["金额超大", "amount=Long上限", "拒绝", "边界"],
    ["币种不一致", "currency不匹配", "拒绝", "无效"],
    ["未知订单号", "不存在outTradeNo", "失败可审计", "无效"],
    ["已关闭订单", "订单CLOSED仍通知成功", "按补偿策略处理不双花", "场景-补偿"],
    ["已支付再通知", "已入账后再成功通知", "幂等", "边界-幂等"],
    ["已退款再支付通知", "REFUNDED后支付回调", "拒绝或告警不入账", "场景-乱序"],
    ["待发货再支付通知", "TO_BE_DELIVERED再成功回调", "幂等", "边界-幂等"],
    ["乱序退款先到", "退款通知早于支付成功", "状态机不破坏", "场景-乱序"],
    ["空body", "空请求体", "失败", "无效"],
    ["非JSON", "text/plain body", "失败", "无效-协议"],
    ["缺必填字段", "缺订单号", "失败", "无效"],
    ["渠道失败码", "resultCode/ResponseCode失败", "不入账可重试", "无效-渠道"],
    ["渠道处理中码", "pending/processing码", "不入账可等待", "边界"],
    ["并发双通知", "两路同时回调", "至多一次入账", "边界-并发"],
    ["并发通知+用户取消", "回调与cancel竞态", "最终一致无双花", "边界-并发"],
    ["重放旧通知", "历史成功包重放", "幂等或拒绝", "无效-安全"],
  ];
  for (const [name, entry, fields] of notifySpecs) {
    for (const [t, s, e, c] of notifyScenes) {
      push(out, {
        ...bbBase("HV-支付回调", `${name}回调-${t}`, entry),
        title: `${name}-${t}`,
        steps: s,
        expect: e,
        class: c,
      });
    }
    // × each order status outcome for success-shaped notify
    for (const st of ORDER_STATUS) {
      push(out, {
        ...bbBase("HV-支付回调", `${name}×状态${st}`, entry),
        title: `${name}-成功形态×${st}`,
        steps: `订单=${st} 投递成功形态回调`,
        expect: st === "TO_BE_PAID" ? "入账" : "幂等/拒绝/补偿策略且不双花",
        class: "判定表-状态×回调",
        technique: "判定表",
      });
    }
    for (const f of fields) {
      for (const [t, s, e] of [
        ["缺失", `${f}缺失`, "校验失败"],
        ["空串", `${f}=空`, "校验失败"],
        ["伪造", `${f}伪造`, "拒绝"],
        ["超长", `${f}超长`, "拒绝"],
        ["特殊字符", `${f}含<>'\"`, "安全处理"],
      ]) {
        push(out, {
          ...bbBase("HV-支付回调", `${name}字段-${f}`, entry),
          title: `${name}-${f}${t}`,
          steps: s,
          expect: e,
          class: "无效-字段",
          technique: "等价类",
        });
      }
    }
  }

  // ---- 3) Create / calculate dense ----
  const createFields = [
    "mysteryBoxId",
    "数量",
    "优惠券ID",
    "地址ID",
    "drawMode",
    "slotNo",
    "recommendVariant",
    "clientFairnessNonce",
    "金额分",
  ];
  const createScenes = [
    ["单抽正常", "数量=1合法券可选", "下单成功库存预占", "有效"],
    ["连抽上限内", "数量=pack上限", "成功", "边界"],
    ["超连抽上限", "数量>pack上限", "拒绝", "边界"],
    ["数量0", "数量=0", "拒绝", "边界"],
    ["数量负", "数量=-1", "拒绝", "无效"],
    ["箱已下架", "box status disable", "拒绝", "无效"],
    ["库存不足", "可售<数量", "拒绝", "无效"],
    ["库存刚好", "可售=数量", "成功预占清零", "边界"],
    ["超限购", "超过purchase-limit", "拒绝", "无效"],
    ["限购临界", "刚好等于限购", "成功", "边界"],
    ["券门槛不足", "券门槛>应付", "拒绝或忽略券", "无效"],
    ["券不适用该箱", "券scope不匹配", "拒绝", "无效"],
    ["券已用", "券USED", "拒绝", "无效"],
    ["券过期", "券EXPIRED", "拒绝", "无效"],
    ["计价漂移", "calculate金额≠create提交", "拒绝", "无效-安全"],
    ["无券计价", "autoCoupon=false", "原价成功", "有效"],
    ["自动最优券", "autoCoupon=true", "选最优券", "有效"],
    ["留存单复用", "带retentionOrderId", "按留存策略", "场景"],
    ["公平nonce重复", "同一clientFairnessNonce重放", "拒绝或幂等", "边界-幂等"],
    ["指定slot占用", "slotNo已被占", "拒绝", "无效"],
    ["指定slot空闲", "合法slotNo", "成功绑定", "有效"],
    ["用户封禁", "UserStatus禁用", "拒绝", "无效-权限"],
    ["并发抢最后一件", "两用户同时create最后库存", "仅一单成功", "边界-并发"],
    ["重复create同幂等键", "客户端重试同键", "至多一单", "边界-幂等"],
  ];
  for (const [t, s, e, c] of createScenes) {
    push(out, {
      ...bbBase("HV-下单计价", `创建订单-${t}`, "POST front/mystery-box-order/create"),
      title: `create-${t}`,
      steps: s,
      expect: e,
      class: c,
    });
    push(out, {
      ...bbBase("HV-下单计价", `计价-${t}`, "POST front/mystery-box-order/calculate"),
      title: `calculate-${t}`,
      steps: s,
      expect: e.includes("成功") ? "返回一致金额明细" : "失败或提示",
      class: c,
    });
  }
  for (const f of createFields) {
    for (const [t, s, e] of [
      ["空", `${f}空`, "校验失败"],
      ["类型错", `${f}类型错误`, "参数错误"],
      ["越界", `${f}越界`, "拒绝"],
    ]) {
      push(out, {
        ...bbBase("HV-下单计价", `字段-${f}`, "POST front/mystery-box-order/create"),
        title: `create-${f}${t}`,
        steps: s,
        expect: e,
        class: "无效-字段",
        technique: "边界值",
      });
    }
  }

  // ---- 4) Prepay × channel × state ----
  for (const ch of ["wechat", "vnpay", "momo"]) {
    const entry = `POST front/mystery-box-order/{id}/prepay/${ch}`;
    const retry = `POST front/mystery-box-order/{id}/prepay/${ch}/retry`;
    const scenes = [
      ["待支付首次", "TO_BE_PAID首次预下单", "返回支付参数", "有效"],
      ["待支付重试", "渠道超时后retry", "新单号或原单可付", "场景-重试"],
      ["已支付再预下单", "已入账", "拒绝", "无效"],
      ["已取消", "CLOSED", "拒绝", "无效"],
      ["他人订单", "A付B单", "拒绝越权", "无效-越权"],
      ["渠道宕机", "网关5xx", "可重试错误", "无效-依赖"],
      ["渠道超时", "网关超时", "可retry", "边界"],
      ["金额变更后", "后台改价后", "按最新金额或拒绝", "场景"],
      ["并发双预下单", "同时两次prepay", "幂等单一支付单", "边界-并发"],
      ["clientIp空", "缺IP(VNPay/MoMo)", "按规格失败或默认", "边界"],
      ["WX未配置", "mchId占位local/xxxx", "明确失败保留工单", "无效-配置"],
    ];
    for (const [t, s, e, c] of scenes) {
      push(out, {
        ...bbBase("HV-预支付", `${ch}-${t}`, entry),
        title: `prepay-${ch}-${t}`,
        steps: s,
        expect: e,
        class: c,
      });
      push(out, {
        ...bbBase("HV-预支付", `${ch}-retry-${t}`, retry),
        title: `prepay-retry-${ch}-${t}`,
        steps: s,
        expect: e,
        class: c,
      });
    }
  }
  // mock pay
  for (const [t, s, e, c] of [
    ["dev开启成功", "paymentMockEnabled+TO_BE_PAID", "直接入账开盒", "有效"],
    ["prod关闭", "生产关闭mock", "拒绝", "无效-安全"],
    ["非待支付", "已发货点mock", "拒绝", "无效"],
    ["并发mock", "双请求", "一次入账", "边界-并发"],
  ]) {
    push(out, {
      ...bbBase("HV-预支付", `mock-${t}`, "POST front/mystery-box-order/{id}/pay/mock"),
      title: `mockPay-${t}`,
      steps: s,
      expect: e,
      class: c,
    });
  }

  // ---- 5) Refund channel × status × amount matrix ----
  const refundScenes = [
    ["审核通过渠道成功", "approve渠道成功", "退款成功账实一致", "有效"],
    ["审核通过渠道失败", "网关失败", "工单保留可重试", "无效-渠道"],
    ["网关超时", "refund API超时", "可重试不丢单", "边界"],
    ["MoMo未开通", "unsupported", "人工工单不假装成功", "无效-配置"],
    ["WX未配置", "mchId占位local/xxxx", "保留工单抛错", "无效-配置"],
    ["余额即时退", "walletOrMock", "余额回补", "有效"],
    ["VNPay退款API", "VNPay refund", "成功落库", "有效"],
    ["重复approve", "已SUCCESS再approve", "幂等", "边界-幂等"],
    ["重复reject", "已驳回再reject", "幂等", "边界-幂等"],
    ["approve后reject", "终态后再驳回", "拒绝", "无效"],
    ["reject成功", "reject", "状态回滚正确", "有效"],
    ["部分退超额", "退款额>实付", "拒绝", "边界-金额"],
    ["退款额=0", "0", "拒绝", "边界"],
    ["退款额=1分", "最小正", "按规则", "边界"],
    ["退款额=实付", "全额", "成功", "边界"],
    ["退款额=实付-1", "少1分", "按规则允许或拒", "边界"],
    ["无reason驳回", "reject缺原因", "校验失败", "无效"],
    ["池已预留回补", "poolReserved", "回补奖品库存", "场景-库存"],
    ["无池预留", "未reserve", "不误回补", "场景-库存"],
    ["存在退款中单", "existsRefundingOrSuccess", "不重复建单", "边界-幂等"],
    ["并发双approve", "两管理员同时通过", "至多一次退款", "边界-并发"],
    ["退款回调SUCCESS", "微信退款notify成功", "终态SUCCESS", "有效"],
    ["退款回调FAILED", "notify失败态", "FAILED可重试", "无效-渠道"],
    ["退款回调重复", "SUCCESS再通知", "幂等", "边界-幂等"],
  ];
  for (const ch of PAY_CHANNELS) {
    for (const [t, s, e, c] of refundScenes) {
      push(out, {
        ...bbBase("HV-退款", `${ch}-${t}`, "POST admin/refund-record/{id}/approve|reject + notify"),
        title: `refund-${ch}-${t}`,
        steps: `payType=${ch}; ${s}`,
        expect: e,
        class: c,
      });
    }
    for (const st of ORDER_STATUS) {
      push(out, {
        ...bbBase("HV-退款", `${ch}×${st}-approve`, "POST admin/refund-record/{id}/approve"),
        title: `refund-${ch}-approve×${st}`,
        steps: `订单状态=${st} payType=${ch} 审核通过`,
        expect: ["TO_BE_DELIVERED", "TO_BE_RECEIVED", "TO_BE_EVALUATED", "CLOSED"].includes(st)
          ? "按可退规则处理"
          : "拒绝或不可退",
        class: "判定表-状态×退款",
        technique: "判定表",
      });
      push(out, {
        ...bbBase("HV-退款", `${ch}×${st}-reject`, "POST admin/refund-record/{id}/reject"),
        title: `refund-${ch}-reject×${st}`,
        steps: `退款单关联订单=${st} 驳回`,
        expect: "驳回成功或状态不允许",
        class: "判定表-状态×退款",
        technique: "判定表",
      });
    }
  }

  // ---- 6) Draw queue / buyout / stock ----
  const queueApis = [
    ["join", "POST front/mystery-box/{mysteryBoxId}/draw-queue/join"],
    ["leave", "DELETE front/mystery-box/{mysteryBoxId}/draw-queue/leave"],
    ["status", "GET front/mystery-box/{mysteryBoxId}/draw-queue/status"],
    ["renew", "POST front/mystery-box/{mysteryBoxId}/draw-queue/renew"],
    ["buyout_lock", "POST front/mystery-box/{mysteryBoxId}/draw-queue/buyout-lock"],
    ["buyout_unlock", "DELETE front/mystery-box/{mysteryBoxId}/draw-queue/buyout-lock"],
    ["buyout_renew", "POST front/mystery-box/{mysteryBoxId}/draw-queue/buyout-lock/renew"],
    ["buyout_get", "GET front/mystery-box/{mysteryBoxId}/draw-queue/buyout-lock"],
  ];
  const queueScenes = [
    ["正常入队", "空闲队列join", "获得排队位", "有效"],
    ["重复入队", "已在队join", "幂等或拒绝", "边界"],
    ["队满", "队列达上限", "拒绝", "边界"],
    ["续期成功", "持有位renew", "TTL延长", "有效"],
    ["过期后续期", "TTL已过", "失败需重新join", "边界"],
    ["买断锁获取", "无人锁", "锁定成功", "有效"],
    ["买断锁冲突", "他人已锁", "拒绝", "无效"],
    ["买断锁续期", "持有者renew", "成功", "有效"],
    ["非持有者续期", "他人renew", "拒绝", "无效-越权"],
    ["解锁", "持有者unlock", "释放", "有效"],
    ["他人解锁", "非持有者", "拒绝", "无效-越权"],
    ["离开队列", "leave", "位释放", "有效"],
    ["未登录", "无token", "401", "无效-鉴权"],
    ["箱不存在", "bad boxId", "404", "无效"],
  ];
  for (const [name, entry] of queueApis) {
    for (const [t, s, e, c] of queueScenes) {
      push(out, {
        ...bbBase("HV-开盒队列", `${name}-${t}`, entry),
        title: `queue-${name}-${t}`,
        steps: s,
        expect: e,
        class: c,
      });
    }
  }

  // Prize stock concurrency
  for (const [t, s, e, c] of [
    ["预占成功", "stock>=n", "预占写入", "有效"],
    ["库存0", "stock=0", "失败", "边界"],
    ["并发扣减最后N", "N+1并发", "仅N成功", "边界-并发"],
    ["支付失败释放", "cancel后", "库存回补", "场景"],
    ["退款回补", "refund success", "库存回补", "场景"],
    ["超卖防护", "无锁双扣", "不出现负库存", "边界-并发"],
    ["审计流水", "adjust", "ledger可追", "有效"],
    ["低库存告警", "低于阈值", "admin low-stock-alerts可见", "有效"],
  ]) {
    push(out, {
      ...bbBase("HV-奖品库存", t, "内部 PrizeStockService / admin/prize-stock-audit"),
      title: `stock-${t}`,
      steps: s,
      expect: e,
      class: c,
      type: "SERVICE",
    });
  }

  // Fairness / draw integrity
  for (const [t, s, e, c] of [
    ["draw-integrity正常", "GET .../draw-integrity 已支付已开盒", "校验通过", "有效"],
    ["未支付查完整性", "TO_BE_PAID", "拒绝或空", "无效"],
    ["越权查他人", "A查B", "拒绝", "无效-越权"],
    ["公平承诺可验证", "fairness commit/reveal", "可审计", "有效"],
    ["篡改开盒结果", "改DB结果", "integrity失败告警", "无效-安全"],
    ["对账任务发现缺口", "OrderDrawIntegrityReconciliationJob", "修复或告警", "场景-任务"],
    ["支付对账补单", "PaymentReconciliationJob", "本地补入账", "场景-任务"],
    ["SSE队列流鉴权", "draw-queue/stream无token", "拒绝", "无效-鉴权"],
    ["SSE断线重连", "中途断网", "可续订不丢关键事件", "边界"],
  ]) {
    push(out, {
      ...bbBase("HV-公平与对账", t, "front draw-integrity / fairness / jobs / SSE"),
      title: `fair-${t}`,
      steps: s,
      expect: e,
      class: c,
    });
  }

  // ---- 7) VIP order money path (parallel) ----
  for (const ch of ["wechat", "vnpay", "momo"]) {
    for (const [t, s, e, c] of [
      ["创建套餐单", "合法package", "订单TO_BE_PAID", "有效"],
      ["预支付", `prepay/${ch}`, "支付参数", "有效"],
      ["回调入账", "合法notify", "VIP生效", "有效"],
      ["重复购买有效期叠加", "已是VIP再买", "按规则延展", "场景"],
      ["mock支付", "pay/mock", "dev可入账", "有效"],
    ]) {
      push(out, {
        ...bbBase("HV-VIP订单", `${ch}-${t}`, `front/vip-order ... ${ch}`),
        title: `vip-${ch}-${t}`,
        steps: s,
        expect: e,
        class: c,
      });
    }
  }

  // ---- 8) Admin money ops ----
  for (const [t, s, e, c] of [
    ["已支付取消全额退", "paid/cancel", "关单+退款路径", "有效"],
    ["已支付取消部分已兑换", "部分item已redeem", "按规则拒绝或差额退", "场景"],
    ["发货成功", "deliver+运单", "TO_BE_RECEIVED", "有效"],
    ["批量发货部分失败", "batch混合", "成功项发货失败项可重试", "边界"],
    ["无运单发货", "缺物流号", "校验失败", "无效"],
    ["重复发货", "已发货再deliver", "幂等或拒绝", "边界-幂等"],
    ["余额兑换赏品", "redeem/balance", "余额增加item核销", "有效"],
    ["余额不足兑换", "余额不够", "若纯兑换则N/A；核销侧成功", "场景"],
    ["确认收货", "confirm-receive", "完结", "有效"],
    ["未发货确认收货", "TO_BE_DELIVERED", "拒绝", "无效"],
    ["放弃加价购", "abandon-offer", "按策略", "场景"],
    ["查询payment-meta", "GET payment-meta", "脱敏元数据", "有效"],
    ["purchase-limit查询", "GET purchase-limit/{boxId}", "剩余可购", "有效"],
  ]) {
    push(out, {
      ...bbBase("HV-履约售后", t, "front/admin mystery-box-order"),
      title: `fulfill-${t}`,
      steps: s,
      expect: e,
      class: c,
    });
  }

  // ---- 9) Auth / grant high risk ----
  for (const [t, s, e, c] of [
    ["管理端登录成功", "正确账密+OTP", "发token", "有效"],
    ["密码错误锁定", "连续错误", "锁定", "边界"],
    ["action-grant窗口", "高危操作授权", "短时grant有效", "有效"],
    ["grant过期仍操作", "过期后发货/退款", "拒绝", "无效-权限"],
    ["无grant直接退款审核", "缺action-grant", "拒绝", "无效-权限"],
    ["短信频控", "1分钟连发", "限流", "边界"],
    ["短信刷接口", "换号爆破", "限流/风控", "无效-安全"],
    ["Zalo登录code重放", "旧code", "失败", "无效"],
    ["Zalo配置关闭", "config disabled", "入口不可用", "场景"],
  ]) {
    push(out, {
      ...bbBase("HV-鉴权高危", t, "admin/auth / front/auth"),
      title: `auth-${t}`,
      steps: s,
      expect: e,
      class: c,
    });
  }

  // ---- 10) End-to-end money journeys (channel × outcome) ----
  const journeyCore = [
    ["主路径支付开盒履约", "浏览→计价→下单→预下单→回调→开盒→发货→确认收货", "全链路账实一致"],
    ["未支付取消回滚", "下单→取消→库存回补→券回滚", "可再买"],
    ["支付后后台取消退款", "入账→admin paid/cancel→退款成功→库存回补", "渠道/余额退回"],
    ["售中退款通过", "申请退→approve→渠道退→REFUNDED", "券库存回滚"],
    ["售中退款驳回", "申请退→reject→恢复履约", "无资金误退"],
    ["对账补单", "渠道已付本地未付→Job补单→开盒补齐", "无丢单"],
    ["重复支付防护", "预下单两次→两次回调", "只入账一次"],
    ["弱网重试", "create/prepay超时重试", "幂等不双单"],
    ["退款通知乱序", "退款回调早到", "最终一致"],
    ["余额兑换闭环", "开盒→item redeem→余额再用", "无重复兑"],
  ];
  for (const ch of PAY_CHANNELS) {
    for (const [t, s, e] of journeyCore) {
      push(out, {
        ...bbBase("HV-端到端旅程", `${ch}-${t}`, "E2E"),
        title: `e2e-${ch}-${t}`,
        steps: `渠道=${ch}; ${s}`,
        expect: e,
        type: "E2E",
        technique: "场景法",
        class: "有效-旅程",
      });
    }
  }
  for (const [t, s, e] of [
    ["抢购最后一抽", "两用户并发最后库存", "一人成功一人失败"],
    ["买断锁下单", "buyout-lock→下单→支付→解锁", "锁与支付绑定正确"],
    ["VIP微信开通", "vip create→wechat→权益", "到期正确"],
    ["VIP-VNPay开通", "vip→vnpay", "权益正确"],
    ["VIP-MoMo开通", "vip→momo", "权益正确"],
    ["连抽pack边界", "数量=pack上限支付开盒", "结果条数=数量"],
    ["指定slot开盒", "slotNo下单支付", "开出对应位置策略正确"],
    ["公平nonce审计", "带fairness nonce全流程", "可验证承诺"],
  ]) {
    push(out, {
      ...bbBase("HV-端到端旅程", t, "E2E"),
      title: `e2e-${t}`,
      steps: s,
      expect: e,
      type: "E2E",
      technique: "场景法",
      class: "有效-旅程",
    });
  }

  // ---- 11) Money amount boundary series (create/pay/refund) ----
  const amounts = ["0", "1", "99", "100", "101", "999999", "-1", "0.001", "1.005", "null", "abc"];
  for (const amt of amounts) {
    for (const [feat, entry] of [
      ["计价金额", "POST front/mystery-box-order/calculate"],
      ["退款金额", "POST admin/refund-record/{id}/approve"],
      ["余额兑换入账", "POST front/mystery-box-order/{id}/redeem/balance"],
    ]) {
      push(out, {
        ...bbBase("HV-金额边界", `${feat}=${amt}`, entry),
        title: `amount-${feat}-${amt}`,
        steps: `${feat}输入=${amt}`,
        expect: "按最小货币单位与校验规则接受或拒绝",
        technique: "边界值",
        class: "边界-金额",
      });
    }
  }

  return out;
}

function generateHighValueWhitebox() {
  const units = [
    {
      m: "HV-支付入账",
      u: "MysteryBoxOrderPaymentNotifyService.paymentNotifyWechat",
      conds: [
        "签名合法",
        "订单存在",
        "状态TO_BE_PAID可入账",
        "金额一致",
        "未重复通知",
        "事务提交成功",
        "开盒/池预留触发成功",
        "优惠券核销成功",
      ],
    },
    {
      m: "HV-支付入账",
      u: "MysteryBoxOrderPaymentNotifyService.paymentNotifyVNPay",
      conds: ["SecureHash合法", "TxnRef映射订单", "ResponseCode成功", "金额一致", "幂等", "入账事务"],
    },
    {
      m: "HV-支付入账",
      u: "MysteryBoxOrderPaymentNotifyService.paymentNotifyMoMo",
      conds: ["signature合法", "resultCode成功", "orderId映射", "金额一致", "幂等", "入账事务"],
    },
    {
      m: "HV-支付入账",
      u: "MysteryBoxOrderPaymentNotifyService.mockPay",
      conds: ["mock开关开启", "订单TO_BE_PAID", "所有者", "入账成功"],
    },
    {
      m: "HV-预支付",
      u: "MysteryBoxOrderPrepayService.prepay",
      conds: ["订单存在", "TO_BE_PAID", "所有者", "微信通道配置有效", "统一下单成功", "支付单落库"],
    },
    {
      m: "HV-预支付",
      u: "MysteryBoxOrderPrepayService.prepayVNPay",
      conds: ["订单存在", "TO_BE_PAID", "clientIp可用", "签名生成成功", "返回支付URL"],
    },
    {
      m: "HV-预支付",
      u: "MysteryBoxOrderPrepayService.prepayMoMo",
      conds: ["订单存在", "TO_BE_PAID", "MoMo配置有效", "创建支付成功"],
    },
    {
      m: "HV-退款",
      u: "MysteryBoxOrderRefundService.refundByChannel",
      conds: [
        "退款单非终态",
        "MoMo未开通分支",
        "walletOrMock分支",
        "VNPay分支",
        "微信配置有效",
        "微信退款受理成功",
        "existsRefundingOrSuccess防重",
      ],
    },
    {
      m: "HV-退款",
      u: "MysteryBoxOrderRefundService.handleWechatRefundNotify",
      conds: ["退款单存在", "已SUCCESS/FAILED短路", "refund_status=SUCCESS", "落库成功", "库存回补需要"],
    },
    {
      m: "HV-退款",
      u: "MysteryBoxOrderRefundService.ensureRefundOnClosed",
      conds: ["订单CLOSED", "已支付过", "无退款中/成功单", "按渠道发起", "池预留释放"],
    },
    {
      m: "HV-下单",
      u: "MysteryBoxOrderCreateService.create",
      conds: [
        "箱子上架",
        "库存充足",
        "限购未超",
        "券可用",
        "计价一致",
        "用户未封禁",
        "slot可占",
        "fairnessNonce合法",
        "预占事务成功",
      ],
    },
    {
      m: "HV-下单",
      u: "MysteryBoxOrderCreateService.calculate",
      conds: ["箱子有效", "autoCoupon策略", "retentionOrderId", "券门槛", "运费/活动"],
    },
    {
      m: "HV-取消",
      u: "MysteryBoxOrderCancelService.cancelUnpaidByUser",
      conds: ["所有者", "TO_BE_PAID", "释放预占", "回滚券", "关单"],
    },
    {
      m: "HV-取消",
      u: "MysteryBoxOrderCancelService.cancelPaidByAdmin",
      conds: ["管理员授权", "可取消已支付状态", "退款路径触发", "库存回补", "grant有效"],
    },
    {
      m: "HV-履约",
      u: "MysteryBoxOrderLogisticsService.deliver",
      conds: ["TO_BE_DELIVERED", "物流号合法", "批量项校验", "状态迁移", "幂等"],
    },
    {
      m: "HV-履约",
      u: "MysteryBoxOrderRedeemService.redeemBalance",
      conds: ["订单已支付可兑", "item未兑", "余额入账成功", "item核销", "并发防重"],
    },
    {
      m: "HV-履约",
      u: "MysteryBoxOrderItemRedeemService.redeemItemBalance",
      conds: ["item归属用户", "可兑状态", "金额>0", "幂等键"],
    },
    {
      m: "HV-库存",
      u: "PrizeStockService.reserveAndConsume",
      conds: ["stock>=n", "乐观锁版本匹配", "并发下不超卖", "ledger写入", "回滚路径"],
    },
    {
      m: "HV-开盒",
      u: "BoxExpectedValueGuard.check",
      conds: ["EV配置存在", "实际EV<=阈值", "关闭时跳过", "违规拒绝"],
    },
    {
      m: "HV-开盒",
      u: "OrderDrawIntegrityService.verify",
      conds: ["订单已支付", "抽赏结果存在", "哈希/承诺可验证", "不一致告警"],
    },
    {
      m: "HV-队列",
      u: "DrawQueue.buyoutLock",
      conds: ["无人持锁", "同用户重入", "TTL", "续期持有者校验", "解锁持有者校验"],
    },
    {
      m: "HV-对账任务",
      u: "PaymentReconciliationJob.run",
      conds: ["锁持有", "存在可疑单", "渠道已付本地未付", "补单成功", "空跑"],
    },
    {
      m: "HV-对账任务",
      u: "OrderDrawIntegrityReconciliationJob.run",
      conds: ["锁持有", "存在缺口", "修复或告警", "空跑"],
    },
    {
      m: "HV-VIP",
      u: "VipOrderService.payAndActivate",
      conds: ["订单待支付", "回调合法", "权益生效", "续期叠加规则", "幂等"],
    },
    {
      m: "HV-券",
      u: "CouponService.lockConsumeRollback",
      conds: ["锁定成功", "支付成功核销", "取消回滚", "退款回滚", "并发双锁"],
    },
    {
      m: "HV-鉴权",
      u: "AdminAuthController.actionGrant",
      conds: ["管理员已登录", "OTP/授权通过", "TTL窗口", "高危接口校验grant", "过期拒绝"],
    },
  ];

  const wb = [];
  for (const u of units) {
    // condition coverage T/F
    u.conds.forEach((cond, idx) => {
      wb.push({
        m: u.m,
        u: u.u,
        title: `${cond}=T`,
        cond: `${cond}=TRUE;其余默认T`,
        path: `C${idx + 1}-T`,
        crit: "条件覆盖",
        expect: "进入对应真分支",
      });
      wb.push({
        m: u.m,
        u: u.u,
        title: `${cond}=F`,
        cond: `${cond}=FALSE;其余尽量T`,
        path: `C${idx + 1}-F`,
        crit: "条件覆盖",
        expect: "拒绝/短路/错误码且无脏写",
      });
    });
    // all-true + short-circuit
    wb.push({
      m: u.m,
      u: u.u,
      title: "全真主路径",
      cond: u.conds.map((c) => `${c}=T`).join(" && "),
      path: "MAIN",
      crit: "判定覆盖",
      expect: "成功提交",
    });
    wb.push({
      m: u.m,
      u: u.u,
      title: "首条件假短路",
      cond: `${u.conds[0]}=F`,
      path: "SHORT-CIRCUIT",
      crit: "条件判定",
      expect: "后续副作用不执行",
    });
    // adjacent pairwise (MC/DC-ish) for first 5 pairs
    for (let i = 0; i < Math.min(u.conds.length - 1, 6); i++) {
      wb.push({
        m: u.m,
        u: u.u,
        title: `成对-${u.conds[i]}×${u.conds[i + 1]}`,
        cond: `${u.conds[i]}=T,${u.conds[i + 1]}=F;其余T`,
        path: `PAIR-${i + 1}`,
        crit: "成对/修正条件",
        expect: "独立影响可观察",
      });
      wb.push({
        m: u.m,
        u: u.u,
        title: `成对反-${u.conds[i]}×${u.conds[i + 1]}`,
        cond: `${u.conds[i]}=F,${u.conds[i + 1]}=T;其余T`,
        path: `PAIR-${i + 1}R`,
        crit: "成对/修正条件",
        expect: "独立影响可观察",
      });
    }
    // exception / concurrency
    wb.push({
      m: u.m,
      u: u.u,
      title: "事务中异常回滚",
      cond: "中段抛错",
      path: "TX-ROLLBACK",
      crit: "异常路径",
      expect: "DB/Redis无部分提交",
    });
    wb.push({
      m: u.m,
      u: u.u,
      title: "并发双入",
      cond: "两线程同时进入",
      path: "CONCURRENT",
      crit: "并发路径",
      expect: "幂等锁/乐观锁仅一次生效",
    });
  }

  // Explicit status×event whitebox for assertStatus helper
  for (const st of ORDER_STATUS) {
    for (const expect of ORDER_STATUS) {
      wb.push({
        m: "HV-状态断言",
        u: "MysteryBoxOrderRefundService.assertStatus",
        title: `assert ${st} expect ${expect}`,
        cond: `actual=${st};expected=${expect}`,
        path: st === expect ? "PASS" : "THROW",
        crit: "判定表",
        expect: st === expect ? "通过" : "ParamSetIllegal",
      });
    }
  }

  return wb;
}

function readCsvRows(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  return lines.slice(1);
}

function main() {
  const hvBb = generateHighValueBlackbox();
  const hvWb = generateHighValueWhitebox();

  const bbHeader = [
    "用例ID",
    "模块",
    "功能点",
    "用例标题",
    "用例类型",
    "优先级",
    "前置条件",
    "入口/接口",
    "步骤摘要",
    "预期结果",
    "测试技术",
    "等价类/边界",
    "关联白盒",
  ];
  const wbHeader = ["用例ID", "模块", "单元/方法", "用例标题", "条件赋值", "路径/分支", "覆盖准则", "预期", "关联黑盒"];

  // Dedicated HV files
  const hvBbNumbered = hvBb.map((c, i) => ({
    ...c,
    id: `HV-BB-${String(i + 1).padStart(5, "0")}`,
  }));
  const hvWbNumbered = hvWb.map((c, i) => ({
    ...c,
    id: `HV-WB-${String(i + 1).padStart(5, "0")}`,
  }));

  fs.writeFileSync(
    path.join(BB, "HIGH_VALUE_BLACKBOX.csv"),
    "\uFEFF" +
      [
        row(bbHeader),
        ...hvBbNumbered.map((c) =>
          row([
            c.id,
            c.module,
            c.feature,
            c.title,
            c.type,
            c.prio,
            c.pre,
            c.entry,
            c.steps,
            c.expect,
            c.technique,
            c.class,
            "",
          ])
        ),
      ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(WB, "HIGH_VALUE_WHITEBOX.csv"),
    "\uFEFF" +
      [
        row(wbHeader),
        ...hvWbNumbered.map((c) =>
          row([c.id, c.m, c.u, c.title, c.cond, c.path, c.crit, c.expect, ""])
        ),
      ].join("\n"),
    "utf8"
  );

  // Merge into ALL: keep existing base rows, drop previous HV-* modules, append new HV
  const allBbPath = path.join(BB, "ALL_BLACKBOX_CASES.csv");
  const allWbPath = path.join(WB, "ALL_WHITEBOX_CASES.csv");
  const existingBb = readCsvRows(allBbPath).filter((line) => !line.includes(",\"HV-"));
  const existingWb = readCsvRows(allWbPath).filter((line) => !line.includes(",\"HV-"));

  const mergedBb = [];
  let i = 0;
  for (const line of existingBb) {
    i += 1;
    // renumber first column
    const cols = line.match(/("([^"]|"")*"|[^,]*)/g) || [];
    // simpler: replace leading "BB-xxxxx"
    mergedBb.push(line.replace(/^"BB-\d+"/, `"BB-${String(i).padStart(5, "0")}"`));
  }
  for (const c of hvBbNumbered) {
    i += 1;
    mergedBb.push(
      row([
        `BB-${String(i).padStart(5, "0")}`,
        c.module,
        c.feature,
        c.title,
        c.type,
        c.prio,
        c.pre,
        c.entry,
        c.steps,
        c.expect,
        c.technique,
        c.class,
        c.id,
      ])
    );
  }

  let j = 0;
  const mergedWb = [];
  for (const line of existingWb) {
    j += 1;
    mergedWb.push(line.replace(/^"WB-\d+"/, `"WB-${String(j).padStart(5, "0")}"`));
  }
  for (const c of hvWbNumbered) {
    j += 1;
    mergedWb.push(
      row([
        `WB-${String(j).padStart(5, "0")}`,
        c.m,
        c.u,
        c.title,
        c.cond,
        c.path,
        c.crit,
        c.expect,
        c.id,
      ])
    );
  }

  fs.writeFileSync(allBbPath, "\uFEFF" + [row(bbHeader), ...mergedBb].join("\n"), "utf8");
  fs.writeFileSync(allWbPath, "\uFEFF" + [row(wbHeader), ...mergedWb].join("\n"), "utf8");

  // Per HV module extracts
  const byMod = {};
  for (const c of hvBbNumbered) (byMod[c.module] ||= []).push(c);
  for (const [m, list] of Object.entries(byMod)) {
    const safe = m.replace(/[\\/:*?"<>|]/g, "_");
    fs.writeFileSync(
      path.join(BB, `${safe}.csv`),
      "\uFEFF" +
        [
          row(bbHeader),
          ...list.map((c) =>
            row([
              c.id,
              c.module,
              c.feature,
              c.title,
              c.type,
              c.prio,
              c.pre,
              c.entry,
              c.steps,
              c.expect,
              c.technique,
              c.class,
              "",
            ])
          ),
        ].join("\n"),
      "utf8"
    );
  }

  const summary = {
    hvBlackbox: hvBbNumbered.length,
    hvWhitebox: hvWbNumbered.length,
    allBlackbox: mergedBb.length,
    allWhitebox: mergedWb.length,
    hvModules: Object.keys(byMod).length,
  };

  const md = `# 高价值域全量补齐说明

> 生成时间：${new Date().toISOString()}

## 为什么先补这些

按**资损风险 × 发生频率 × 监管/对账成本**排序，优先全量补齐：

1. **多渠道支付入账与回调幂等**（微信 / VNPay / MoMo / Mock）
2. **退款渠道矩阵与工单兜底**（含 MoMo 未开通、WX 未配置）
3. **订单状态 × 动作判定表**（真实 \`ProductOrderStatus\`）
4. **下单/计价/限购/库存并发**
5. **开盒队列买断锁 / 公平性 / 对账 Job**
6. **VIP 并行资金链、管理端已支付取消与发货**
7. **高危鉴权 action-grant / 短信风控**

## 本轮增量

| 指标 | 数量 |
|---|---:|
| 高价值黑盒 | ${summary.hvBlackbox} |
| 高价值白盒 | ${summary.hvWhitebox} |
| 合并后全量黑盒 | ${summary.allBlackbox} |
| 合并后全量白盒 | ${summary.allWhitebox} |

## 文件

- \`BLACKBOX/HIGH_VALUE_BLACKBOX.csv\`
- \`WHITEBOX/HIGH_VALUE_WHITEBOX.csv\`
- 已合并进 \`ALL_BLACKBOX_CASES.csv\` / \`ALL_WHITEBOX_CASES.csv\`（\`关联*\`列指向 \`HV-*\` ID）

## 再生

\`\`\`bash
node docs/TEST_CASES/_generate_thousands.js   # 基底
node docs/TEST_CASES/_generate_high_value.js  # 高价值叠加（可重复执行）
\`\`\`

## 覆盖声明

- 高价值域：**状态×动作判定表 + 渠道×场景矩阵 + 端到端旅程 + 白盒条件/成对/并发/回滚** 已全量展开。
- 仍非全项目路径笛卡尔积；低风险 CRUD 维持标准展开即可。
`;
  fs.writeFileSync(path.join(ROOT, "HIGH_VALUE_PRIORITY.md"), md, "utf8");

  // Patch README counts lightly
  const readmePath = path.join(ROOT, "README.md");
  const readme =
    `# 测试用例包（黑盒 / 白盒）\n\n` +
    `| 指标 | 数量 |\n|---|---:|\n` +
    `| 黑盒用例（全量） | ${summary.allBlackbox} |\n` +
    `| 白盒用例（全量） | ${summary.allWhitebox} |\n` +
    `| 其中高价值黑盒 | ${summary.hvBlackbox} |\n` +
    `| 其中高价值白盒 | ${summary.hvWhitebox} |\n\n` +
    `高价值补齐说明见 \`HIGH_VALUE_PRIORITY.md\`。\n\n` +
    `## 再生\n\n\`\`\`bash\nnode docs/TEST_CASES/_generate_thousands.js\nnode docs/TEST_CASES/_generate_high_value.js\n\`\`\`\n`;
  fs.writeFileSync(readmePath, readme, "utf8");

  const covPath = path.join(ROOT, "00-FUNCTION-COVERAGE.md");
  if (fs.existsSync(covPath)) {
    let cov = fs.readFileSync(covPath, "utf8");
    cov = cov.replace(
      /\| 黑盒：\*\*\d+\*\*｜白盒：\*\*\d+\*\*/,
      `| 黑盒：**${summary.allBlackbox}**｜白盒：**${summary.allWhitebox}**`
    );
    if (!cov.includes("HIGH_VALUE_PRIORITY")) {
      cov += `\n\n## 高价值叠加\n\n见 [HIGH_VALUE_PRIORITY.md](./HIGH_VALUE_PRIORITY.md)。本轮高价值黑盒 **${summary.hvBlackbox}**、白盒 **${summary.hvWhitebox}** 已合并入 ALL。\n`;
    }
    fs.writeFileSync(covPath, cov, "utf8");
  }

  console.log(JSON.stringify(summary, null, 2));
}

main();
