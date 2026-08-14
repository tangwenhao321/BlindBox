/**
 * Classify ALL blackbox cases into automation tiers and emit catalogs.
 * Tiers:
 *  AUTO_UNIT   - pure logic / mocked service (Vitest/JUnit)
 *  AUTO_IT     - needs DB/Redis/Testcontainers or Spring context
 *  AUTO_E2E    - Maestro/Playwright device or local app+backend
 *  MANUAL      - needs human/real gateway/visual-audio judgment
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BB = path.join(ROOT, "BLACKBOX", "ALL_BLACKBOX_CASES.csv");
const OUT = path.join(ROOT, "AUTOMATION");
fs.mkdirSync(OUT, { recursive: true });

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const parts = [];
    let cur = "";
    let q = false;
    const line = lines[li];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        }
        q = !q;
        continue;
      }
      if (ch === "," && !q) {
        parts.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    parts.push(cur);
    rows.push({
      id: parts[0],
      module: parts[1],
      feature: parts[2],
      title: parts[3],
      type: parts[4],
      prio: parts[5],
      entry: parts[7],
      steps: parts[8],
      expect: parts[9],
      technique: parts[10],
      klass: parts[11],
    });
  }
  return rows;
}

function classify(r) {
  const blob = `${r.module}|${r.feature}|${r.title}|${r.type}|${r.entry}|${r.steps}|${r.expect}|${r.klass}`.toLowerCase();

  // Hard MANUAL signals — but demote when proxy automation exists
  const demoteToUnit =
    /相位.*长按加速|settings-anim=|e2e-单抽全特效|mockpay生产|开盒动画性能|接口与网关压测|流畅度|掉帧|吞吐|抢购|幂等键冲突|发货批量|20连|跳过释放|连续开5|sse长连|弱网开盒|冷启动|市集聊天sse|对账job/i.test(
      blob
    );
  if (demoteToUnit) {
    return {
      tier: "AUTO_UNIT",
      reason: "已降级为策略/预算代理断言（非视听主观终审）",
      runner: "vitest-proxy",
    };
  }

  const manualHints = [
    "真实微信",
    "真实证书",
    "真机",
    "肉眼",
    "听感",
    "音画同步",
    "可感知",
    "蓝牙",
    "来电",
    "app store",
    "appstore",
    "生产开启",
    "监管",
    "人工工单",
    "灰度rollout",
    "fps>=",
    "掉帧",
    "内存可控",
    "p95",
    "压测",
    "吞吐",
  ];
  if (manualHints.some((h) => blob.includes(h.toLowerCase()))) {
    // Some perf can be AUTO_E2E later; keep MANUAL for now if visual/perf subjective
    if (r.type === "PERF" || blob.includes("fps") || blob.includes("压测") || blob.includes("吞吐")) {
      return {
        tier: "MANUAL",
        reason: "性能/体感指标需设备与基准环境，暂无统一自动化阈值门禁",
        runner: "manual-perf-lab",
      };
    }
    if (blob.includes("音画") || blob.includes("听感") || blob.includes("可感知") || blob.includes("肉眼")) {
      return {
        tier: "MANUAL",
        reason: "视听主观验收（音效听感/动画观感）无法用断言替代",
        runner: "manual-qa",
      };
    }
    if (blob.includes("真实微信") || blob.includes("真实证书") || blob.includes("生产")) {
      return {
        tier: "MANUAL",
        reason: "依赖真实支付证书/生产通道，沙箱无法完整替代",
        runner: "manual-gateway",
      };
    }
  }

  // AUTO_UNIT: pure policy / fee / decision table / whitebox-mapped
  if (
    blob.includes("revealskip") ||
    blob.includes("跳过策略") ||
    blob.includes("accelerate") ||
    blob.includes("加速") ||
    blob.includes("guarded") ||
    blob.includes("computefee") ||
    blob.includes("手续费") ||
    blob.includes("fee-rate") ||
    blob.includes("seller_proceeds") ||
    blob.includes("marketplaceproceeds") ||
    blob.includes("moneyrounding") ||
    blob.includes("判定表") ||
    blob.includes("resolveskip") ||
    blob.includes("条件覆盖") ||
    r.module.startsWith("JOURNEY-WB") ||
    r.module.includes("DRAW-WB") ||
    (r.module.startsWith("HV-状态断言") || blob.includes("assertstatus"))
  ) {
    return { tier: "AUTO_UNIT", reason: "纯逻辑/判定表，可用 Vitest/JUnit 参数化覆盖", runner: "unit" };
  }

  if (r.module.startsWith("JOURNEY-分片-开盒动画") || r.module === "DRAW-特效音效") {
    // Many effect cases are unit-testable for policy; visual remains manual subset
    if (
      blob.includes("skip") ||
      blob.includes("跳过") ||
      blob.includes("加速") ||
      blob.includes("turbo") ||
      blob.includes("reducemotion") ||
      blob.includes("减弱") ||
      blob.includes("rhythm") ||
      blob.includes("节奏") ||
      blob.includes("masterSound".toLowerCase()) ||
      blob.includes("静音") ||
      blob.includes("模板") ||
      blob.includes("远程配置") ||
      blob.includes("正交") ||
      blob.includes("breath") ||
      blob.includes("动作锁")
    ) {
      return {
        tier: "AUTO_UNIT",
        reason: "策略/配置钳制/设置组合可用单测；实际渲染观感另列 MANUAL",
        runner: "vitest-effects",
      };
    }
  }

  if (r.type === "SEC" || blob.includes("安全") || blob.includes("越权") || blob.includes("幂等") || blob.includes("伪造") || blob.includes("xss")) {
    return {
      tier: "AUTO_UNIT",
      reason: "安全规则可用 Mock 服务/过滤器单测或契约测试覆盖",
      runner: "unit-security",
    };
  }

  if (
    r.module.startsWith("HV-") ||
    r.module.startsWith("MP-") ||
    r.module.includes("支付") ||
    r.module.includes("退款") ||
    r.module.includes("订单") ||
    r.module.includes("库存") ||
    blob.includes("notify") ||
    blob.includes("回调")
  ) {
    if (blob.includes("mock") || blob.includes("幂等") || blob.includes("签名非法") || blob.includes("状态机") || blob.includes("判定表")) {
      return { tier: "AUTO_UNIT", reason: "资金域 Mock/状态机单测可覆盖", runner: "junit-money" };
    }
    return { tier: "AUTO_IT", reason: "需 Spring/DB/Redis 或深度 Mock 集成", runner: "junit-it" };
  }

  if (r.type === "E2E" || r.type === "SCENE" || r.module.startsWith("JOURNEY-") || r.module === "DRAW-MP-E2E") {
    return {
      tier: "AUTO_E2E",
      reason: "链路场景映射 Maestro/Playwright + mock-pay；无设备时仅校验 flow 语法",
      runner: "maestro-or-playwright",
    };
  }

  if (r.type === "UI" || r.type === "JOB") {
    return {
      tier: "AUTO_E2E",
      reason: "UI/Job 场景优先 Maestro 或调度集成测",
      runner: "maestro-or-job-it",
    };
  }

  if (r.type === "API" || r.type === "SERVICE") {
    return { tier: "AUTO_UNIT", reason: "API/服务默认 Mockito 单测或 MockMvc", runner: "junit-api" };
  }

  return { tier: "MANUAL", reason: "未能可靠映射到现有自动化层", runner: "manual-review" };
}

function esc(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function main() {
  const rows = parseCsv(fs.readFileSync(BB, "utf8"));
  const classified = rows.map((r) => {
    const c = classify(r);
    return { ...r, ...c };
  });

  const counts = {};
  for (const r of classified) counts[r.tier] = (counts[r.tier] || 0) + 1;

  const header = [
    "用例ID",
    "自动化分层",
    "执行器",
    "模块",
    "功能点",
    "用例标题",
    "用例类型",
    "优先级",
    "分类理由",
  ];
  const lines = [
    header.map(esc).join(","),
    ...classified.map((r) =>
      [r.id, r.tier, r.runner, r.module, r.feature, r.title, r.type, r.prio, r.reason].map(esc).join(",")
    ),
  ];
  fs.writeFileSync(path.join(OUT, "CASE_AUTOMATION_CATALOG.csv"), "\uFEFF" + lines.join("\n"), "utf8");

  const manual = classified.filter((r) => r.tier === "MANUAL");
  let manualMd = `# 暂无法充分自动化的用例清单\n\n> 生成时间：${new Date().toISOString()}\n> 共 **${manual.length}** 条（全量 ${classified.length}）\n\n`;
  manualMd += `这些用例在当前基建下无法用稳定断言替代，需人工或专用实验室环境。已尽量把策略/判定表部分拆到 AUTO_UNIT。\n\n`;
  manualMd += `## 按原因汇总\n\n`;
  const byReason = {};
  for (const r of manual) (byReason[r.reason] ||= []).push(r);
  for (const [reason, list] of Object.entries(byReason)) {
    manualMd += `### ${reason}（${list.length}）\n\n`;
    for (const r of list.slice(0, 80)) {
      manualMd += `- ${r.id} [${r.module}/${r.feature}] ${r.title}\n`;
    }
    if (list.length > 80) manualMd += `- … 另有 ${list.length - 80} 条见 CSV\n`;
    manualMd += `\n`;
  }
  fs.writeFileSync(path.join(OUT, "MANUAL_CASES.md"), manualMd, "utf8");

  // Mapping hints to existing suites
  const mapping = `# 自动化执行映射\n\n| 分层 | 数量 | 如何跑 |\n|---|---:|---|\n| AUTO_UNIT | ${counts.AUTO_UNIT || 0} | 后端 \`mvn test\` + 移动端 \`npm test\` + 管理端 \`npm test\` |\n| AUTO_IT | ${counts.AUTO_IT || 0} | \`mvn test\`（需 Docker/本地 MySQL+Redis；不可用则 skip） |\n| AUTO_E2E | ${counts.AUTO_E2E || 0} | Maestro \`validate:maestro\`；有设备时 \`test:e2e\`；管理端 Playwright smoke |\n| MANUAL | ${counts.MANUAL || 0} | 见 \`MANUAL_CASES.md\` |\n\n## 关键已落地自动化增强\n\n- 移动端：\`revealSkipPolicy\` 全判定表、加速倍率、旅程覆盖映射单测\n- 后端：市集手续费边界、资金域既有 Mockito 套件\n- 脚本：\`docs/TEST_CASES/AUTOMATION/run-automation.ps1\`\n\n## 再生分类\n\n\`\`\`bash\nnode docs/TEST_CASES/AUTOMATION/classify-cases.js\n\`\`\`\n`;
  fs.writeFileSync(path.join(OUT, "README.md"), mapping, "utf8");

  fs.writeFileSync(
    path.join(OUT, "summary.json"),
    JSON.stringify({ total: classified.length, counts, manual: manual.length, generatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );

  console.log(JSON.stringify({ total: classified.length, counts }, null, 2));
}

main();
