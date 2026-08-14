/**
 * Full + partial journey/scenario pack.
 * Chain slices: browse→order→pay→reveal→settle→warehouse→market
 * Merges into ALL_* ; drops previous JOURNEY-* modules on re-run.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const BB = path.join(ROOT, "BLACKBOX");
const WB = path.join(ROOT, "WHITEBOX");
for (const d of [BB, WB]) fs.mkdirSync(d, { recursive: true });

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const row = (a) => a.map(esc).join(",");
const push = (arr, o) => arr.push(o);

function J(module, feature, title, steps, expect, opts = {}) {
  return {
    module,
    feature,
    title,
    type: opts.type || "E2E",
    entry: opts.entry || "JOURNEY",
    pre: opts.pre || "账号/箱/库存/支付通道就绪",
    post: opts.post || "链路终态可审计",
    prio: opts.prio || "P0",
    steps,
    expect,
    technique: opts.technique || "场景法",
    class: opts.class || "链路-场景",
  };
}

const CHANNELS = ["WECHAT", "VNPAY", "MOMO", "MOCK", "BALANCE"];
const PACKS = [1, 3, 5, 10];
const TEMPLATES = ["lively", "minimal", "turbo", "eyeCare", "collectMinimal"];
const RHYTHMS = ["immersive", "standard", "rapid"];

function generateJourneys() {
  const out = [];

  // ========== FULL chains ==========
  for (const ch of CHANNELS) {
    push(
      out,
      J(
        "JOURNEY-完整开盒",
        `${ch}-标准全链路`,
        `full-${ch}-browse-to-warehouse`,
        `浏览箱详情→看概率→选pack→计价→下单→${ch}预下单→支付成功→开盒动画(全特效)→结算→进仓库`,
        "账实一致；奖品数=下单数；音画完整",
        { entry: `channel=${ch}` }
      )
    );
    push(
      out,
      J(
        "JOURNEY-完整开盒",
        `${ch}-券+限购`,
        `full-${ch}-coupon-limit`,
        `领券→选适用箱→自动最优券计价→下单支付(${ch})→开盒→结算；再测限购临界与超限`,
        "券核销正确；超限拒绝；临界成功",
        { entry: `channel=${ch}` }
      )
    );
    push(
      out,
      J(
        "JOURNEY-完整开盒",
        `${ch}-排队买断`,
        `full-${ch}-queue-buyout`,
        `join队列→获买断锁→下单支付(${ch})→开盒→解锁/离开`,
        "锁与订单绑定；无锁无法buyout下单",
        { entry: `channel=${ch}` }
      )
    );
    push(
      out,
      J(
        "JOURNEY-完整开盒",
        `${ch}-退款闭环`,
        `full-${ch}-refund-loop`,
        `支付开盒后→申请退/后台取消→渠道退(${ch})→库存回补→券回滚`,
        "资金与库存最终一致",
        { entry: `channel=${ch}` }
      )
    );
    push(
      out,
      J(
        "JOURNEY-完整开盒",
        `${ch}-对账补单开盒`,
        `full-${ch}-reconcile-draw`,
        `渠道已付本地未付→PaymentReconciliationJob补单→自动开盒→可揭示`,
        "不丢单；可播动画；integrity通过",
        { entry: `channel=${ch}` }
      )
    );
  }

  for (const n of PACKS) {
    for (const tpl of TEMPLATES) {
      push(
        out,
        J(
          "JOURNEY-完整开盒",
          `连抽${n}×模板${tpl}`,
          `full-pack${n}-${tpl}`,
          `选${n}连→支付→仪式模板=${tpl}播放→可加速/跳过→结算${n}件`,
          `结果${n}件；模板视听符合；跳过不丢奖`,
          { entry: `pack=${n};template=${tpl}` }
        )
      );
    }
  }

  // Full: open box → marketplace sell → buy → settle
  for (const ch of ["WALLET"]) {
    push(
      out,
      J(
        "JOURNEY-完整市集",
        "开盒到卖出打款",
        "full-draw-to-marketplace-payout",
        "开盒入仓→上架标价→买家购买(HOLD)→24h冷静→结算打款(wallet)→双方评价",
        "卖家到账=标价-手续费；信用更新；listing=SOLD",
        { entry: ch }
      )
    );
    push(
      out,
      J(
        "JOURNEY-完整市集",
        "开盒到外部打款",
        "full-draw-to-external-payout",
        "开盒入仓→上架→购买→冷静结束PENDING_EXTERNAL→admin OTP complete-external",
        "COMPLETED；无重复打款",
        { entry: "MOMO/ZALOPAY" }
      )
    );
    push(
      out,
      J(
        "JOURNEY-完整市集",
        "聊后成交再发货",
        "full-chat-buy-ship",
        "上架→买卖双方聊天SSE→购买→冷静完成→仓库发货→buyer_ship_status=SHIPPED",
        "聊天仅双方；发货状态同步市集",
        { entry: "marketplace+warehouse" }
      )
    );
  }

  // ========== PARTIAL chain slices ==========
  // Slice A: browse → confirm order
  const sliceBrowse = [
    ["看概率后下单", "详情→probability→ConfirmOrder", "概率展示后可下单"],
    ["看pity后下单", "详情→pity进度→下单", "进度影响文案/CTA"],
    ["切换pack后计价", "切换1/3/5/10→calculate", "金额随数量变"],
    ["选券后计价", "选券→calculate→create", "抵扣一致"],
    ["无券原价", "清券→计价", "原价"],
    ["未登录打断", "游客点开盒→登录→回到确认", "上下文恢复"],
    ["年龄门禁打断", "未确认年龄→拦截", "不可create"],
    ["iOS门禁打断", "AppStore客户端", "禁售路径生效"],
  ];
  for (const [t, s, e] of sliceBrowse) {
    push(out, J("JOURNEY-分片-浏览下单", t, `slice-browse-${t}`, s, e, { type: "SCENE" }));
  }

  // Slice B: order → pay → paid
  for (const ch of CHANNELS) {
    const paySlices = [
      [`${ch}首次预下单成功`, `create→prepay/${ch}→拉起支付`, "拿到支付参数"],
      [`${ch}用户取消支付`, `预下单后取消回App`, "仍TO_BE_PAID可重付"],
      [`${ch}支付成功回跳`, `支付成功→payment-return→轮询入账`, "可进入揭示"],
      [`${ch}回调先于回跳`, `notify先到→再打开return`, "幂等已入账"],
      [`${ch}回跳先于回调`, `return时仍待支付→轮询/对账`, "最终可开盒"],
      [`${ch}预下单重试`, `超时→retry prepay`, "可继续支付"],
      [`${ch}重复回调`, `成功notify×2`, "只入账一次只开一次盒"],
      [`${ch}未支付取消`, `cancel unpaid`, "库存券回滚"],
    ];
    for (const [t, s, e] of paySlices) {
      push(out, J("JOURNEY-分片-支付入账", t, `slice-pay-${t}`, s, e, { type: "SCENE", entry: ch }));
    }
  }

  // Slice C: paid → reveal controls
  const revealSlices = [
    ["自动播放仪式", "入账→自动enqueueReveal", "全特效播放"],
    ["静音播放", "masterSound=off→揭示", "无音有画有结果"],
    ["分层关蓄力音", "charge=off", "无蓄力音其他层在"],
    ["减弱动效", "reduceMotion→揭示", "降级可读"],
    ["heavy跳过仪式", "reduceMotionLevel=heavy", "直接结果"],
    ["单击加速1.5x", "accelerate tier1", "时长×0.67速率×1.5"],
    ["长按加速2.5x", "accelerate tier2", "时长×0.4速率×2.5"],
    ["普通跳过", "normal相位tap", "立即skip"],
    ["终极首击暂停", "guarded首击", "pause"],
    ["终极再击跳过", "pause后再击/长按", "skip到结果"],
    ["跳过取消残音", "skip中", "cancelScheduledRevealSounds"],
    ["十连中途跳过", "第3抽skip", "仍结算全部奖品"],
    ["杀进程重进", "动画中杀App→订单详情", "结果仍在可补播"],
    ["离线补揭示", "入账后离线→联网", "offline queue补播"],
    ["观战同步揭示", "房主播观众看", "进度一致"],
    ["待支付不播", "未入账尝试揭示", "blocked"],
    ...RHYTHMS.map((r) => [`节奏${r}`, `rhythm=${r}揭示`, "时长缩放符合预设"]),
    ...TEMPLATES.map((t) => [`模板${t}`, `template=${t}`, "视听符合模板"]),
  ];
  for (const [t, s, e] of revealSlices) {
    push(out, J("JOURNEY-分片-开盒动画", t, `slice-reveal-${t}`, s, e, { type: "SCENE" }));
  }

  // Slice D: settle → warehouse → fulfill
  const settleSlices = [
    ["结算进仓库", "结果CTA→Warehouse", "新赏可见"],
    ["兑换余额", "redeem/balance→余额增加", "item核销"],
    ["部分兑换", "多件兑一件", "状态正确"],
    ["申请发货", "仓库ship", "物流状态"],
    ["确认收货", "TO_BE_RECEIVED→confirm", "完结"],
    ["公平校验", "结算后fairness verify", "通过"],
    ["draw-integrity", "查完整性", "一致"],
    ["放弃offer", "abandon-offer", "按策略关闭"],
  ];
  for (const [t, s, e] of settleSlices) {
    push(out, J("JOURNEY-分片-结算履约", t, `slice-settle-${t}`, s, e, { type: "SCENE" }));
  }

  // Slice E: pity / odds / fairness partial
  const oddsSlices = [
    ["概率页再返回下单", "probability→返回→下单", "上下文保持"],
    ["pity将满提示", "差1次阈值", "文案提示"],
    ["pity触发高稀有", "达阈开盒", "forceHigh或补偿"],
    ["pity无高库存补偿", "forceHigh空库存", "退款/POINTS/WAIT不失款"],
    ["日beacon后验证订单", "beacon→verify order", "匹配"],
  ];
  for (const [t, s, e] of oddsSlices) {
    push(out, J("JOURNEY-分片-概率保底", t, `slice-odds-${t}`, s, e, { type: "SCENE" }));
  }

  // Slice F: marketplace partial chains
  const mpSlices = [
    ["仅上架不上架取消", "仓库→上架→cancel", "回仓"],
    ["上架后被他人买", "上架→他买→COOLING", "HOLD成功"],
    ["冷静期取消退款", "买→cancel-trade", "退款+ON_SALE"],
    ["冷静到期钱包打款", "24h Job→wallet settle", "COMPLETED"],
    ["冷静到期外部待处理", "Job→PENDING_EXTERNAL", "可admin处理"],
    ["外部完成", "complete-external+OTP", "COMPLETED"],
    ["外部失败退款", "fail-external+OTP", "退款货回架"],
    ["先聊后买", "chat→buy", "仅双方可聊"],
    ["买后评价", "COMPLETED→rate", "信用变"],
    ["证书提交审核", "certificate→admin approve", "APPROVED"],
    ["证书驳回", "reject+OTP", "REJECTED"],
    ["信用不足打断上架", "credit<3→上架", "拒绝"],
    ["信用不足打断购买", "credit<3→buy", "拒绝"],
    ["并发抢同一listing", "两人同时buy", "一人成功"],
    ["幂等键重放购买", "同键buy两次", "一笔交易"],
    ["卖出后再发货", "成交→warehouse ship", "buyer_ship_status更新"],
  ];
  for (const [t, s, e] of mpSlices) {
    push(out, J("JOURNEY-分片-市集", t, `slice-mp-${t}`, s, e, { type: "SCENE" }));
  }

  // Slice G: abnormal / interrupt chains
  const abn = [
    ["支付中杀进程", "预下单后杀App→重进订单", "可继续付或取消"],
    ["回调与取消竞态", "notify与cancel同时", "最终一致不双花"],
    ["开盒中来电", "揭示中断→恢复", "不叠音不花屏"],
    ["开盒中切后台超时", "超background-resume-max", "会话策略正确"],
    ["弱网十连", "限速开10连", "可完成或可重试不丢奖"],
    ["SSE断线再开盒", "queue SSE断→重连→到号开盒", "不丢到号"],
    ["市集买后断网", "buy成功本地超时", "以服务端HOLD为准"],
    ["重复点击开盒CTA", "连点确认", "单笔订单"],
  ];
  for (const [t, s, e] of abn) {
    push(out, J("JOURNEY-分片-异常中断", t, `slice-abn-${t}`, s, e, { type: "SCENE", class: "链路-异常" }));
  }

  // Cross-scene matrix: channel × reveal mode (partial pay+reveal)
  for (const ch of CHANNELS) {
    for (const mode of ["全特效", "静音", "减弱动效", "turbo加速", "跳过"]) {
      push(
        out,
        J(
          "JOURNEY-分片-支付加揭示",
          `${ch}×${mode}`,
          `slice-payreveal-${ch}-${mode}`,
          `${ch}入账后以「${mode}」完成揭示→结算`,
          "支付与揭示解耦正确；结果完整",
          { type: "SCENE", entry: `${ch}/${mode}` }
        )
      );
    }
  }

  // VIP parallel short full chains
  for (const ch of ["WECHAT", "VNPAY", "MOMO"]) {
    push(
      out,
      J(
        "JOURNEY-完整VIP",
        `${ch}-开通权益`,
        `full-vip-${ch}`,
        `选套餐→create vip-order→prepay/${ch}→回调→权益生效`,
        "到期时间正确；可续期叠加",
        { entry: `vip/${ch}` }
      )
    );
  }

  return out;
}

function generateJourneyWhitebox() {
  // Light WB: journey guard conditions
  const units = [
    {
      m: "JOURNEY-WB",
      u: "FullDrawChain.guards",
      conds: ["箱上架", "库存足", "支付成功CAS", "抽赏成功", "揭示未阻断", "结果落仓"],
    },
    {
      m: "JOURNEY-WB",
      u: "PayThenReveal.guards",
      conds: ["已入账", "非pendingPaymentBlock", "会话可获取", "音效策略", "skip策略"],
    },
    {
      m: "JOURNEY-WB",
      u: "MarketplaceSellChain.guards",
      conds: ["仓库有货", "信用>=3", "上架成功", "购买HOLD", "冷静结束", "打款成功"],
    },
  ];
  const wb = [];
  for (const u of units) {
    u.conds.forEach((c, i) => {
      wb.push({
        m: u.m,
        u: u.u,
        title: `${c}=T`,
        cond: `${c}=TRUE`,
        path: `C${i + 1}T`,
        crit: "条件覆盖",
        expect: "继续下一环",
      });
      wb.push({
        m: u.m,
        u: u.u,
        title: `${c}=F`,
        cond: `${c}=FALSE`,
        path: `C${i + 1}F`,
        crit: "条件覆盖",
        expect: "链路在本环失败可观测",
      });
    });
    wb.push({
      m: u.m,
      u: u.u,
      title: "全真主路径",
      cond: u.conds.map((c) => `${c}=T`).join("&&"),
      path: "MAIN",
      crit: "判定覆盖",
      expect: "闭环成功",
    });
  }
  return wb;
}

function readCsvRows(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1);
}

function isJourneyLine(line) {
  return line.includes(",\"JOURNEY-");
}

function main() {
  // Rebuild base stacks first
  execSync(`node "${path.join(ROOT, "_generate_thousands.js")}"`, { stdio: "inherit" });
  execSync(`node "${path.join(ROOT, "_generate_high_value.js")}"`, { stdio: "inherit" });
  // draw marketplace without re-running nested thousands: call generate only via full script
  // The draw script re-runs thousands+hv; invoke it then re-append journeys after filtering
  execSync(`node "${path.join(ROOT, "_generate_draw_marketplace.js")}"`, { stdio: "inherit" });

  const bb = generateJourneys();
  const wb = generateJourneyWhitebox();
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

  const bbN = bb.map((c, i) => ({ ...c, id: `JN-BB-${String(i + 1).padStart(5, "0")}` }));
  const wbN = wb.map((c, i) => ({ ...c, id: `JN-WB-${String(i + 1).padStart(5, "0")}` }));

  fs.writeFileSync(
    path.join(BB, "JOURNEY_SCENARIOS_BLACKBOX.csv"),
    "\uFEFF" +
      [
        row(bbHeader),
        ...bbN.map((c) =>
          row([c.id, c.module, c.feature, c.title, c.type, c.prio, c.pre, c.entry, c.steps, c.expect, c.technique, c.class, ""])
        ),
      ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(WB, "JOURNEY_SCENARIOS_WHITEBOX.csv"),
    "\uFEFF" +
      [row(wbHeader), ...wbN.map((c) => row([c.id, c.m, c.u, c.title, c.cond, c.path, c.crit, c.expect, ""]))].join("\n"),
    "utf8"
  );

  const allBbPath = path.join(BB, "ALL_BLACKBOX_CASES.csv");
  const allWbPath = path.join(WB, "ALL_WHITEBOX_CASES.csv");
  const existingBb = readCsvRows(allBbPath).filter((l) => !isJourneyLine(l));
  const existingWb = readCsvRows(allWbPath).filter((l) => !isJourneyLine(l));

  const mergedBb = [];
  let i = 0;
  for (const line of existingBb) {
    i += 1;
    mergedBb.push(line.replace(/^"BB-\d+"/, `"BB-${String(i).padStart(5, "0")}"`));
  }
  for (const c of bbN) {
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

  const mergedWb = [];
  let j = 0;
  for (const line of existingWb) {
    j += 1;
    mergedWb.push(line.replace(/^"WB-\d+"/, `"WB-${String(j).padStart(5, "0")}"`));
  }
  for (const c of wbN) {
    j += 1;
    mergedWb.push(row([`WB-${String(j).padStart(5, "0")}`, c.m, c.u, c.title, c.cond, c.path, c.crit, c.expect, c.id]));
  }

  fs.writeFileSync(allBbPath, "\uFEFF" + [row(bbHeader), ...mergedBb].join("\n"), "utf8");
  fs.writeFileSync(allWbPath, "\uFEFF" + [row(wbHeader), ...mergedWb].join("\n"), "utf8");

  const byMod = {};
  for (const c of bbN) (byMod[c.module] ||= []).push(c);
  for (const [m, list] of Object.entries(byMod)) {
    const safe = m.replace(/[\\/:*?"<>|]/g, "_");
    fs.writeFileSync(
      path.join(BB, `${safe}.csv`),
      "\uFEFF" +
        [
          row(bbHeader),
          ...list.map((c) =>
            row([c.id, c.module, c.feature, c.title, c.type, c.prio, c.pre, c.entry, c.steps, c.expect, c.technique, c.class, ""])
          ),
        ].join("\n"),
      "utf8"
    );
  }

  const full = bbN.filter((c) => c.type === "E2E").length;
  const partial = bbN.filter((c) => c.type === "SCENE").length;

  let idx = `# 链路场景索引（完整 / 分片）\n\n> ${new Date().toISOString()}\n\n`;
  idx += `| 指标 | 数量 |\n|---|---:|\n| 本包合计 | ${bbN.length} |\n| 完整链路 E2E | ${full} |\n| 分片场景 SCENE | ${partial} |\n| 合并全量黑盒 | ${mergedBb.length} |\n| 合并全量白盒 | ${mergedWb.length} |\n\n`;
  idx += `## 模块\n\n| 模块 | 条数 | 说明 |\n|---|---:|---|\n`;
  for (const m of Object.keys(byMod).sort()) {
    idx += `| ${m} | ${byMod[m].length} | 见 \`BLACKBOX/${m.replace(/[\\/:*?"<>|]/g, "_")}.csv\` |\n`;
  }
  idx += `\n## 推荐执行顺序\n\n1. \`JOURNEY-完整开盒\` 标准全链路（各渠道）\n2. \`JOURNEY-分片-支付入账\` → \`JOURNEY-分片-开盒动画\` → \`JOURNEY-分片-结算履约\`\n3. \`JOURNEY-完整市集\` + \`JOURNEY-分片-市集\`\n4. \`JOURNEY-分片-异常中断\`\n\n## 文件\n\n- \`BLACKBOX/JOURNEY_SCENARIOS_BLACKBOX.csv\`\n- \`WHITEBOX/JOURNEY_SCENARIOS_WHITEBOX.csv\`\n\n## 再生\n\n\`\`\`bash\nnode docs/TEST_CASES/_generate_journey_scenarios.js\n\`\`\`\n`;
  fs.writeFileSync(path.join(ROOT, "JOURNEY_SCENARIOS.md"), idx, "utf8");

  const readme =
    `# 测试用例包（黑盒 / 白盒）\n\n` +
    `| 指标 | 数量 |\n|---|---:|\n` +
    `| 黑盒全量 | ${mergedBb.length} |\n` +
    `| 白盒全量 | ${mergedWb.length} |\n` +
    `| 链路场景包 | ${bbN.length}（E2E ${full} + 分片 ${partial}） |\n\n` +
    `链路索引：\`JOURNEY_SCENARIOS.md\`；开盒市集：\`DRAW_MARKETPLACE_COVERAGE.md\`；高价值：\`HIGH_VALUE_PRIORITY.md\`。\n\n` +
    `## 再生\n\n\`\`\`bash\nnode docs/TEST_CASES/_generate_journey_scenarios.js\n\`\`\`\n`;
  fs.writeFileSync(path.join(ROOT, "README.md"), readme, "utf8");

  console.log(JSON.stringify({ journeyBb: bbN.length, full, partial, journeyWb: wbN.length, allBb: mergedBb.length, allWb: mergedWb.length }, null, 2));
}

main();
