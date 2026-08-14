/**
 * Map catalog runners → real automated suites (Round 4 honesty layer).
 * Writes REAL_TEST_MAPPING.md
 */
const fs = require("fs");
const path = require("path");

const OUT = __dirname;
const CATALOG = path.join(OUT, "CASE_AUTOMATION_CATALOG.csv");

const RUNNER_MAP = {
  "junit-money": {
    depth: "mockito-real-service",
    suites: [
      "PaymentNotifyRealServiceParameterizedTest",
      "MarketplaceBuyGateParameterizedTest",
      "RefundPaidAfterCancelGateParameterizedTest",
      "RefundReconciliationJobParameterizedTest",
      "MysteryBoxOrderServicePaymentNotifyTest",
      "MysteryBoxOrderServiceRefundTest",
      "MarketplaceServiceTest",
      "OrderStatusActionMatrixTest",
      "PaymentNotifyDecisionMatrixTest",
      "PaymentMockProductionGuardTest",
    ],
  },
  "junit-it": {
    depth: "spring-or-jdbc-it",
    suites: [
      "PrizeStockServiceSpringIntegrationTest",
      "PaymentNotifyLogJdbcIT",
      "MarketplaceCoolingQueryJdbcIT",
      "MarketplaceSettleClaimJdbcIT",
      "RefundStuckQueryJdbcIT",
      "AbstractMysqlRedisSpringBootIT",
    ],
  },
  "vitest-proxy": {
    depth: "vitest-proxy",
    suites: [
      "revealEffectProxy.automation.test.ts",
      "perfBudgetProxy.automation.test.ts",
      "fullCatalogAutomation.test.ts",
    ],
  },
  "vitest-effects": {
    depth: "vitest-logic",
    suites: ["revealSkipPolicy.automation.test.ts", "marketplaceProceeds.automation.test.ts"],
  },
  "maestro-or-playwright": {
    depth: "maestro-inventory-or-device",
    suites: [".maestro/flows/*-smoke.yaml", "scripts/maestro-ci-smoke.sh"],
  },
  "maestro-or-job-it": {
    depth: "job-mockito-or-maestro",
    suites: ["MarketplaceCoolingJobTest", "RefundReconciliationJobTest", "RefundReconciliationJobParameterizedTest"],
  },
  "junit-api": {
    depth: "catalog-contract-or-api-mock",
    suites: ["execute-all-cases.js (contract-proxy)", "(expand MockMvc as needed)"],
  },
  "unit-security": {
    depth: "catalog-contract-or-security-unit",
    suites: ["execute-all-cases.js auth-security handlers"],
  },
  unit: {
    depth: "catalog-or-unit",
    suites: ["execute-all-cases.js executor-logic / matrices"],
  },
};

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
    rows.push(parts);
  }
  return rows;
}

function main() {
  const rows = parseCsv(fs.readFileSync(CATALOG, "utf8"));
  const byRunner = {};
  for (const p of rows) {
    const runner = p[2] || "unknown";
    byRunner[runner] = (byRunner[runner] || 0) + 1;
  }

  let md = `# 目录 Runner → 真实测试映射（Round 4）\n\n`;
  md += `> 生成：${new Date().toISOString()}\n\n`;
  md += `本表说明：分类器里的 runner **不保证** 每条 CSV 都有 1:1 测试方法；真测以右侧 suites 为准。\n\n`;
  md += `| runner | catalog rows | depth | real suites |\n|---|---:|---|---|\n`;
  for (const [runner, count] of Object.entries(byRunner).sort((a, b) => b[1] - a[1])) {
    const m = RUNNER_MAP[runner] || { depth: "unmapped", suites: ["(none — contract executor only)"] };
    md += `| \`${runner}\` | ${count} | ${m.depth} | ${m.suites.map((s) => `\`${s}\``).join(", ")} |\n`;
  }
  md += `\n## 资金真测优先清单\n\n`;
  md += RUNNER_MAP["junit-money"].suites.map((s) => `- ${s}`).join("\n");
  md += `\n\n## IT / JDBC\n\n`;
  md += RUNNER_MAP["junit-it"].suites.map((s) => `- ${s}`).join("\n");
  md += `\n`;

  fs.writeFileSync(path.join(OUT, "REAL_TEST_MAPPING.md"), md, "utf8");
  console.log(JSON.stringify({ runners: byRunner, wrote: "REAL_TEST_MAPPING.md" }, null, 2));
}

main();
