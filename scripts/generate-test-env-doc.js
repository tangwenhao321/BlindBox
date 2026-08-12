#!/usr/bin/env node
/** Generate 盲盒测试环境使用说明.docx (requires: npm install docx in scripts/) */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "docs", "盲盒测试环境使用说明.docx");
const APK_URL = "http://120.26.181.145:9920/test-downloads/mystery-box-test.apk";

async function main() {
  let docx;
  try {
    docx = require("docx");
  } catch {
    console.log("Installing docx package...");
    require("child_process").execSync("npm install docx --no-save", {
      cwd: __dirname,
      stdio: "inherit",
    });
    docx = require("docx");
  }

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
  } = docx;

  const h1 = (t) =>
    new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 } });
  const h2 = (t) =>
    new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } });
  const p = (t, opts = {}) =>
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: t, ...opts })],
    });
  const bullet = (t) =>
    new Paragraph({
      text: t,
      bullet: { level: 0 },
      spacing: { after: 60 },
    });

  const cell = (text, bold = false) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold })],
        }),
      ],
    });

  const table = (rows) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (r, i) =>
          new TableRow({
            children: r.map((c, j) => cell(c, i === 0 || j === 0)),
          }),
      ),
    });

  const doc = new Document({
    creator: "Mystery Box Deploy",
    title: "盲盒测试环境使用说明",
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "神秘盲盒 · 测试环境", bold: true, size: 36 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "环境信息及详细使用说明",
                size: 28,
                color: "666666",
              }),
            ],
          }),
          p(`文档生成日期：2026年7月9日`, { italics: true, color: "888888" }),

          h1("一、环境概述"),
          p(
            "本测试环境部署于阿里云 Linux 服务器 120.26.181.145，与四方支付系统（ehpay/jeepay）同机运行，但数据库、Redis、端口、上传目录、Nginx 路径均独立隔离，不影响四方生产业务。",
          ),

          h1("二、访问地址"),
          table([
            ["用途", "地址"],
            ["公网 API", "http://120.26.181.145:9920/test-api"],
            ["管理端", "http://120.26.181.145:9920/test-admin"],
            ["健康检查", "http://120.26.181.145:9920/test-api/actuator/health"],
            ["测试 APK 下载", APK_URL],
          ]),

          h1("三、服务器资源隔离"),
          table([
            ["资源", "四方/ehpay", "盲盒测试环境", "隔离方式"],
            ["MySQL", "ehpay 业务库", "mystery_box_test", "独立数据库"],
            ["Redis", "DB 0", "DB 1", "不同 logical DB"],
            ["后端端口", "9216-9218 等", "9913（内网）", "独立 Java 进程"],
            ["上传目录", "ehpay uploads", "/opt/mystery-box-test/data/uploads-test", "独立路径"],
            ["Nginx", "ehpay 80 端口", "独立 9920 端口", "不修改 ehpay.conf"],
            ["Android 包名", "四方 App", "com.mysterybox.mobile.test", "可同机并存"],
          ]),

          h1("四、测试账号"),
          table([
            ["角色", "账号", "密码/验证码", "说明"],
            ["管理端", "admin_test", "见服务器 DEFAULT_ADMIN_PASSWORD", "后台管理系统登录"],
            ["App 用户", "13900000001", "见测试账号文档 / 种子配置", "手机端测试账号"],
            ["短信验证码", "—", "000000", "Mock 模式，任意手机号可用此码"],
            ["高危操作 OTP", "—", "见服务器 ADMIN_ACTION_OTP", "删除/敏感操作二次确认"],
          ]),

          h1("五、测试 APK 安装"),
          h2("5.1 下载与安装"),
          bullet(`浏览器或手机访问：${APK_URL}`),
          bullet("下载完成后安装「神秘盲盒·测试」（约 47 MB）"),
          bullet("若提示「未知来源」，请在系统设置中允许安装此来源的应用"),
          bullet("可与四方 App 同时安装，互不影响"),
          h2("5.2 App 配置说明"),
          bullet("API 地址已内置：http://120.26.181.145:9920/test-api"),
          bullet("支付模式：模拟支付（Mock），点击确认即成功，无真实扣款"),
          bullet("验证码：000000"),

          h1("六、管理端使用指南"),
          bullet("打开 http://120.26.181.145:9920/test-admin ，使用 admin_test 登录"),
          bullet("盲盒管理：查看/编辑套系、赏品关联、库存、热盒配置"),
          bullet("订单管理：核对支付状态、发货、物流"),
          bullet("用户管理：查看测试用户、碎片余额等"),
          bullet("碎片商城：管理 fragment_exchange_sku 兑换商品（已预置 15 条种子数据）"),

          h1("七、手机 App 使用流程"),
          h2("7.1 登录/注册"),
          bullet("使用种子账号 13900000001 / Test@123456 登录"),
          bullet("或新手机号注册，验证码填 000000"),
          h2("7.2 抽盲盒"),
          bullet("首页 → 选择盲盒 → 查看概率公示"),
          bullet("选择抽数（1/5/10 连抽等）→ 确认订单 → 模拟支付 → 开盒动画 → 查看结果"),
          bullet("仓库：查看已抽中的赏品"),
          bullet("订单：全部 / 待支付 / 待发货 / 已完成"),
          h2("7.3 碎片商城"),
          bullet("抽盒或活动可获得碎片"),
          bullet("进入碎片商城，使用碎片兑换预置 SKU（15 款赏品，碎片消耗 35~180 不等）"),
          h2("7.4 公平验证"),
          bullet("订单开奖后，可在 App「公平验证」页查看 seed/hash"),
          bullet("API：GET /front/fairness/order/{orderId}"),

          h1("八、概率与保底说明"),
          p("系统使用 10000 万分比作为概率基数：legendary_rate（传说）、hidden_rate（隐藏）、general_rate（普通）三者之和必须等于 10000。"),
          p("种子套系默认：传说 1% / 隐藏 5% / 普通 94%。"),
          p("单次抽奖：支付成功后按抽数循环；随机整数 [0,9999] 映射档位；档位内按剩余库存加权选赏品；扣减库存并写入 fairness 日志。"),
          p("保底（Pity）：连续未出传说/隐藏达到 pity_threshold（默认 50）后，下一抽强制高档；出高档后计数清零。"),

          h1("九、注意事项"),
          bullet("测试环境非生产，数据可随时清空，请勿录入真实隐私或真实支付信息"),
          bullet("禁止修改四方 ehpay 配置、停止四方进程或删除 vip 等业务库"),
          bullet("Redis 必须使用 DB 1，避免与四方 DB 0 冲突"),
          bullet("9913 为后端内网端口；公网访问请走 Nginx 9920（需在安全组放行）"),
          bullet("概率为长期统计比例，单次结果随机；频繁测试可能导致某赏品售罄"),
          bullet("部分鸿蒙/Android 机型开盒动画可能静态展示，以结算页奖品为准"),

          h1("十、运维命令（SSH 登录服务器后）"),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: [
                  "systemctl status mystery-box-test",
                  "systemctl restart mystery-box-test",
                  "curl http://127.0.0.1:9913/actuator/health",
                  "journalctl -u mystery-box-test -f",
                  "docker exec ehpay-mysql mysql -uroot -p\"$TEST_DB_PASSWORD\" mystery_box_test",
                ].join("\n"),
                font: "Consolas",
                size: 20,
              }),
            ],
          }),

          h1("十一、验收清单"),
          bullet("mystery_box_test 库已创建，与四方库隔离"),
          bullet("Redis 使用 DB 1"),
          bullet("9913 健康检查 UP"),
          bullet("Nginx /test-api、/test-admin 在 9920 端口可访问（安全组已放行）"),
          bullet("管理端 admin_test 可登录"),
          bullet("碎片商城 15 条 SKU 可展示与兑换"),
          bullet("测试 APK 可登录/下单/模拟支付/开盒"),
          bullet("手机可同时安装四方 App 与「神秘盲盒·测试」"),

          h1("附录：相关脚本（Windows 本机）"),
          table([
            ["脚本", "用途"],
            ["scripts/deploy-remote-node.js", "本机构建并远程部署"],
            ["scripts/seed-fragments.js", "补碎片商城种子数据"],
            ["scripts/upload-test-apk.js", "上传测试 APK 到服务器"],
            ["scripts/verify-full.js", "15 项 API 全量验收"],
            ["scripts/generate-test-env-doc.js", "生成本 Word 文档"],
          ]),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log(`Word document: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
