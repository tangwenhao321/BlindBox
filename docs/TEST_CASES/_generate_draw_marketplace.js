/**
 * Full coverage pack: draw/reveal chain (order→VFX/SFX→skip/turbo→settle→odds→pity→queue)
 * + marketplace + performance + security.
 * Merges into ALL_* (drops previous DRAW-|MP-|PERF-|SEC- modules on re-run).
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

function base(module, feature, entry, opts = {}) {
  return {
    module,
    feature,
    type: opts.type || "API",
    entry,
    pre: opts.pre || "账号可用/资源就绪",
    post: opts.post || "可观测结果符合规格",
    prio: opts.prio || "P0",
    technique: opts.technique || "场景法",
    class: opts.class || "有效",
  };
}

function matrix(out, module, feature, entry, scenes, opts = {}) {
  for (const [title, steps, expect, cls, tech] of scenes) {
    push(out, {
      ...base(module, feature, entry, opts),
      title: `${feature}-${title}`,
      steps,
      expect,
      class: cls || opts.class || "有效",
      technique: tech || opts.technique || "场景法",
      type: opts.type || "API",
      prio: opts.prio || "P0",
    });
  }
}

function generateBlackbox() {
  const out = [];

  // ========== A. 开盒下单链路 ==========
  matrix(
    out,
    "DRAW-下单",
    "确认订单弹窗",
    "ConfirmOrderModal / POST front/mystery-box-order/create",
    [
      ["单抽主路径", "选单抽→确认→创建成功", "进入预支付", "有效"],
      ["连抽pack选中", "DrawPackModal选N连", "数量=N计价正确", "有效"],
      ["快速pack选择器", "DrawPackQuickSelector", "数量同步到底栏", "有效"],
      ["切换drawMode排队", "queue mode", "create带队列约束", "有效"],
      ["切换buyout", "buyout mode需持锁", "无锁拒绝有锁成功", "判定表"],
      ["slot指定开盒", "选slotNo", "绑定槽位", "有效"],
      ["推荐变体", "recommendVariant", "按变体计价", "有效"],
      ["fairness nonce提交", "clientFairnessNonce", "服务端记录可验证", "有效"],
      ["自动最优券", "autoCoupon", "券抵扣正确", "有效"],
      ["手动选券", "指定couponId", "门槛不满足拒绝", "无效"],
      ["限购提示", "purchase-limit达上限", "CTA禁用或报错", "边界"],
      ["余额不足引导", "钱包不足选余额通道", "提示充值/换渠道", "场景"],
      ["弱网创建超时重试", "超时后重试同幂等键", "不双单", "边界-幂等"],
      ["未登录拉起登录", "游客点开盒", "登录后回到确认", "场景"],
      ["iOS数字商品门禁", "AppStore客户端禁售路径", "按IosDigitalGoodsGuard", "无效-合规"],
      ["年龄未确认", "compliance未确认", "拦截下单", "无效-合规"],
    ],
    { type: "UI", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-下单",
    "支付返回",
    "payment-return / PaymentReturnView",
    [
      ["微信成功回跳", "支付成功回App", "拉单展示开盒入口", "有效"],
      ["VNPay成功回跳", "return URL", "入账后可开盒动画", "有效"],
      ["MoMo成功回跳", "return URL", "同上", "有效"],
      ["用户取消支付", "取消回跳", "订单仍TO_BE_PAID可重付", "场景"],
      ["支付成功本地未入账", "回跳时仍待支付", "轮询/对账提示", "场景-补偿"],
      ["重复回跳", "多次打开return", "幂等不重复播动画", "边界-幂等"],
    ],
    { type: "UI", prio: "P0" }
  );

  // ========== B2. 远程特效配置项逐项开关（对照 AppPublicConfig / AppRevealConfig） ==========
  const revealFlags = [
    ["particle-scale", "粒子缩放"],
    ["confetti-scale", "彩屑缩放"],
    ["charge-scale", "蓄力缩放"],
    ["flash-scale", "闪屏缩放"],
    ["lustre-scale", "光泽缩放"],
    ["dark-flash-scale", "暗闪缩放"],
    ["effect-variance-scale", "特效方差"],
    ["compact-reveal-scale", "紧凑揭示"],
    ["feed-ticker-enabled", "动态Ticker"],
    ["finale-teaser-enabled", "终章预告"],
    ["finale-teaser-haptic-enabled", "终章触觉"],
    ["finale-teaser-sound-enabled", "终章预告音"],
    ["highlights-panel-enabled", "高光面板"],
    ["box-tap-interaction-enabled", "点箱交互"],
    ["collection-easter-egg-enabled", "收集彩蛋"],
    ["batch-beat-enabled", "批量节拍"],
    ["atmosphere-buff-enabled", "氛围增益"],
    ["intro-video-uri", "开场视频"],
    ["theme-id", "主题ID"],
    ["lustre-palette-id", "光泽色板"],
    ["inter-draw-delay-ms", "抽间延迟"],
    ["finale-pause-ms", "终章暂停"],
    ["finale-hold-ms-extra", "终章额外停留"],
    ["silence-before-finale-ms", "终章前静音"],
    ["summary-hero-ms", "摘要英雄时长"],
    ["action-lock-ms", "动作锁"],
    ["exit-settle-ms", "退出结算窗"],
    ["batch-reveal-threshold", "批量阈值"],
    ["batch-reveal-size", "批量大小"],
    ["replay-daily-cap", "日重播上限"],
    ["replay-degrade-after", "重播降级阈值"],
    ["background-resume-max-ms", "后台恢复上限"],
    ["short-draw-slow-scale", "短抽慢放"],
    ["long-draw-front-scale", "长抽前段"],
    ["long-draw-finale-scale", "长抽终章"],
  ];
  for (const [key, label] of revealFlags) {
    matrix(
      out,
      "DRAW-特效音效",
      `远程配置-${label}`,
      `app.reveal / AppRevealConfig:${key}`,
      [
        ["有效值", `配置合法${key}`, "客户端表现符合", "有效"],
        ["缺省", `未配置${key}`, "使用默认不崩溃", "边界"],
        ["超上限", `超过MAX钳制`, "被钳制到安全范围", "边界-安全"],
        ["非法类型", `类型错误`, "忽略或默认", "无效"],
        ["开关false/0", `关闭或0`, "对应特效关闭或最小", "判定表"],
      ],
      { type: "UI", prio: "P1", technique: "边界值" }
    );
  }

  // 相位 × 跳过 × 加速 场景加密
  const phases = ["intro", "charge", "reveal", "ceremony", "finale", "summary"];
  for (const ph of phases) {
    matrix(
      out,
      "DRAW-特效音效",
      `相位-${ph}`,
      "revealSequence pacing + overlay controls",
      [
        ["相位音画", `处于${ph}`, "对应层VFX/SFX触发", "有效"],
        ["相位单击", `tap@${ph}`, "按guard策略pause或skip", "判定表"],
        ["相位长按加速", `longPress@${ph}`, "速率提升且音画同步", "有效"],
        ["相位切后台", `background@${ph}`, "恢复策略符合resume-max", "边界"],
        ["相位来电打断", `interrupt@${ph}`, "恢复不叠音不花屏", "边界"],
      ],
      { type: "UI", prio: "P0" }
    );
  }

  // 本地设置正交：动画×声音×粒子×震动
  const bools = [true, false];
  for (const anim of bools) {
    for (const sound of bools) {
      for (const particles of bools) {
        push(out, {
          ...base("DRAW-特效音效", "设置正交组合", "revealSettings", {
            type: "UI",
            prio: "P1",
            technique: "判定表",
            class: "判定表-设置",
          }),
          title: `settings-anim=${anim},sound=${sound},particles=${particles}`,
          steps: `animations=${anim};masterSound=${sound};particles=${particles};完成一次开盒`,
          expect: "结果完整；关闭项不出现对应刺激；开启项可感知",
        });
      }
    }
  }

  // pack 数量边界
  for (const n of [1, 2, 3, 5, 10, 20]) {
    matrix(
      out,
      "DRAW-下单",
      `连抽数量-${n}`,
      "DrawPackModal / create quantity",
      [
        ["选数量下单", `数量=${n}`, "计价×n且开出n件", "有效"],
        ["动画序列长度", `揭示序列`, `展示${n}次或批量摘要`, "有效"],
        ["中途跳过", `第1次后skip`, "仍结算n件", "场景"],
      ],
      { type: "UI", prio: "P0" }
    );
  }

  matrix(
    out,
    "DRAW-特效音效",
    "开盒动画主路径",
    "OpenBoxRevealOverlay / OrderResultRevealPhase / revealOrchestrator",
    [
      ["支付成功自动播", "入账后enqueueRevealTask", "自动播放仪式", "有效"],
      ["手动重播", "tryAcquireManualReplay", "受日限额replay-daily-cap", "边界"],
      ["重播超日限", "超过replayDailyCap", "拒绝或降级", "边界"],
      ["重播降级阈值", "replay-degrade-after", "特效降级仍可播", "边界"],
      ["多抽序列", "RevealVirtualizedSequence N>1", "逐个展示不丢奖", "有效"],
      ["批量阈值", "batch-reveal-threshold", "批量摘要+逐条", "场景"],
      ["短抽慢放", "short-draw-slow-scale", "时长被拉长", "有效"],
      ["长抽前后缩放", "long-draw-front/finale-scale", "节奏符合配置", "有效"],
      ["ExpoGo降级驱动", "Expo Go环境", "ExpoGoRevealOverlay可用", "场景"],
      ["Reanimated驱动", "正式构建", "usePrizeRevealReanimated", "有效"],
      ["会话互斥", "订单详情与弹层同时", "session stack防重叠", "边界-并发"],
      ["待支付阻断", "setRevealPendingPaymentBlocked", "不播未入账动画", "无效"],
      ["动作锁", "revealActionLockMs内连点", "忽略误触", "边界"],
      ["退出结算窗", "exit-settle-ms", "结算页稳定展示", "有效"],
    ],
    { type: "UI", prio: "P0" }
  );

  const tiers = ["NORMAL", "RARE", "HIDDEN", "TREASURE_LEGEND", "TREASURE_PEERLESS", "PEERLESS"];
  const templates = ["lively", "minimal", "turbo", "eyeCare", "collectMinimal"];
  const rhythms = ["immersive", "standard", "rapid"];

  for (const tier of tiers) {
    matrix(
      out,
      "DRAW-特效音效",
      `稀有度特效-${tier}`,
      "ceremonyTier / burstParticles / playTierSound",
      [
        ["粒子与光效", `${tier}开出`, "粒子/闪烁/光泽匹配稀有度", "有效"],
        ["呼吸周期", `breathPeriod(${tier})`, "周期符合resolveRevealBreathPeriodMs", "有效"],
        ["层级音效", `playTierSound(${tier})`, "对应tier音可听", "有效"],
        ["终结仪式", "finale相位", "Ultimate时guarded跳过策略", "有效"],
        ["关闭粒子", "particles=off", "无粒子仍有结果卡", "边界"],
        ["关闭闪屏", "flash=off", "无闪屏", "边界"],
        ["关闭震动", "shake/haptic=off", "无触觉", "边界"],
      ],
      { type: "UI", prio: "P0" }
    );
  }

  for (const tpl of templates) {
    matrix(
      out,
      "DRAW-特效音效",
      `仪式模板-${tpl}`,
      "AppRevealConfig ceremonyTemplate / revealSettings",
      [
        ["模板应用", `选${tpl}`, "时长/粒子/音量符合模板", "有效"],
        ["远程覆盖本地", "ops发布新版本", "客户端拉取后生效", "场景"],
        ["回滚版本", "rollout回滚", "特效回退上一版", "场景"],
      ],
      { type: "UI", prio: "P1" }
    );
  }

  for (const r of rhythms) {
    matrix(
      out,
      "DRAW-特效音效",
      `节奏预设-${r}`,
      "revealSettings rhythmPreset",
      [
        ["切换节奏", `rhythm=${r}`, "整体时长缩放(immersive1.18/standard1/rapid0.82)", "有效"],
        ["与加速叠加", `${r}+accelerate`, "播放速率复合正确", "边界"],
      ],
      { type: "UI", prio: "P1" }
    );
  }

  matrix(
    out,
    "DRAW-特效音效",
    "音效分层",
    "effects/sound.ts + revealSettings layers",
    [
      ["主开关开", "masterSound=on", "charge/reveal/finale可播", "有效"],
      ["主开关关", "masterSound=off", "全部静音且telemetry skipped_muted", "有效"],
      ["仅环境音关", "ambient=off", "其他层仍播", "判定表"],
      ["仅蓄力关", "charge=off", "无蓄力音", "判定表"],
      ["仅揭示关", "reveal层=off", "无揭示音", "判定表"],
      ["仅终章关", "finale=off", "无终章音", "判定表"],
      ["音效包切换", "soundPack更换", "资源热切换成功", "有效"],
      ["warmup预热", "warmupTierSounds", "首帧不卡顿", "性能"],
      ["取消已排程音", "cancelScheduledRevealSounds", "跳过时无残留音", "有效"],
      ["finale teaser音", "revealFinaleTeaserSoundEnabled", "按远程开关", "判定表"],
      ["voice line", "voice-line-uris配置", "播报对应线路", "有效"],
      ["录制安全模式", "recording-safe", "降低突发音量/闪屏", "场景"],
      ["未成年人全静音", "muteAllCeremonyAudio", "仪式全静音", "无效-合规"],
      ["隐藏BGM静音", "muteHiddenBgm", "仅隐BGM静", "无效-合规"],
      ["系统静音键", "设备静音", "遵守系统静音", "场景"],
      ["蓝牙断连中", "播放中断蓝牙", "优雅降级无崩溃", "边界"],
      ["音频焦点丢失", "来电打断", "恢复后续不叠音", "边界"],
    ],
    { type: "UI", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-特效音效",
    "跳过策略",
    "revealSkipPolicy.resolveSkipTapAction",
    [
      ["普通相位单击跳过", "guard=normal tap", "action=skip", "有效"],
      ["终极首击暂停", "guarded+未暂停+单击", "action=pause", "有效"],
      ["终极暂停后再击", "guarded+已暂停", "action=skip", "有效"],
      ["终极连点两次", "consecutiveTaps>=2", "action=skip", "有效"],
      ["长按跳过", "isLongPress", "action=skip忽略guard", "有效"],
      ["finale相位guard", "pacing=finale", "guarded", "有效"],
      ["ceremony相位guard", "pacing=ceremony", "guarded", "有效"],
      ["跳过后音效取消", "skip中", "cancelScheduledRevealSounds", "有效"],
      ["跳过后结果仍展示", "skip到结算", "奖品列表完整", "有效"],
      ["动作锁内跳过无效", "lock未解除", "noop/忽略", "边界"],
      ["多抽跳过当前", "序列中skip", "进入下一抽或摘要", "场景"],
      ["跳过不丢服务端结果", "仅客户端动画", "订单items不变", "有效"],
    ],
    { type: "UI", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-特效音效",
    "加速与Turbo",
    "revealSkipPolicy accelerate + revealTemporaryTurbo",
    [
      ["单击加速tier1", "resolveAccelerateTier(false)=1", "时长×0.67 速率×1.5", "有效"],
      ["长按加速tier2", "longPress→tier2", "时长×0.4 速率×2.5", "有效"],
      ["UI显示1.5x", "accelerateSpeedLabel", "展示1.5x", "有效"],
      ["UI显示2.5x", "tier2", "展示2.5x", "有效"],
      ["进度条同步", "accelerateProgress", "与播放同步", "有效"],
      ["临时turbo订单", "enableTemporaryTurboForOrder", "scale≈0.72叠加", "有效"],
      ["turbo与rapid叠加", "rapid+turbo", "不过度快到不可读", "边界"],
      ["加速中跳过", "加速时skip", "立即到结果", "场景"],
      ["松手恢复", "取消长按", "速率回落策略符合实现", "边界"],
      ["减弱动效下加速", "reduceMotion+accelerate", "仍可读不花屏", "场景"],
    ],
    { type: "UI", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-特效音效",
    "减弱动效与降级",
    "reduceMotion / getEffectProfile / text-only heal",
    [
      ["系统reduceMotion", "AccessibilityInfo", "粒子/闪屏降级", "有效"],
      ["远程light", "reduceMotionLevel=light", "轻度降级", "有效"],
      ["远程medium", "medium", "中度降级", "有效"],
      ["远程heavy", "heavy", "跳过初始仪式", "有效"],
      ["低端机降级", "device degrade", "text-only可完成", "场景"],
      ["弱网降级", "network tier低", "预取限制仍可播本地", "场景"],
      ["OOM自愈", "render-heal", "回退文本揭示", "边界"],
      ["省电路径", "power adapt", "降粒子", "场景"],
      ["后台超限恢复", "background-resume-max-ms超时", "会话重置策略", "边界"],
      ["动画总开关关", "animationsEnabled=false", "纯结果卡", "有效"],
      ["纯文本模式", "text-only", "无VFX有结果", "有效"],
    ],
    { type: "UI", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-特效音效",
    "离线与预取",
    "revealOfflineMode / revealPrefetchGate",
    [
      ["离线包可用", "已prefetch", "断网可播本地动画", "有效"],
      ["离线包不可用", "未prefetch断网", "isOfflineRevealBlocked提示", "无效"],
      ["离线队列补播", "revealOfflineQueue积压", "联网后补揭示", "场景"],
      ["仅WiFi预取", "蜂窝网", "shouldAllowRevealPrefetch=false", "边界"],
      ["低FPS禁预取", "帧率差", "不预取", "边界"],
      ["配置缓存", "appPublicConfigCache", "冷启动可用缓存特效配置", "有效"],
    ],
    { type: "UI", prio: "P1" }
  );

  matrix(
    out,
    "DRAW-特效音效",
    "特效中心与设置",
    "effects-center / SettingsView / front/app/config",
    [
      ["拉取远程配置", "GET front/app/config", "setRevealRemoteConfig", "有效"],
      ["本地偏好持久化", "改音效开关杀进程", "AsyncStorage恢复", "有效"],
      ["focus mode", "开启专注", "降干扰元素", "场景"],
      ["feed ticker开关", "feed-ticker-enabled", "Ticker显隐", "判定表"],
      ["box tap交互", "box-tap-interaction-enabled", "点箱反馈", "判定表"],
      ["彩蛋收集", "collection-easter-egg", "触发条件正确", "场景"],
      ["管理员发布模板", "admin/ops/app-config", "灰度rollout生效", "场景"],
      ["非法配置钳制", "超MAX_REVEAL_*", "服务端/客户端钳制", "边界-安全"],
    ],
    { type: "UI", prio: "P1" }
  );

  // ========== C. 结算 / 仓库 ==========
  matrix(
    out,
    "DRAW-结算",
    "开盒结果结算",
    "OrderResultModal / OrderDetailsView / WarehouseView",
    [
      ["结果列表完整", "N连开完", "N条奖品与服务端一致", "有效"],
      ["稀有度排序/高亮", "含高稀有", "高亮正确", "有效"],
      ["摘要爆发", "RevealSummaryBurst", "摘要动画后可操作", "有效"],
      ["去仓库", "结算CTA", "Warehouse可见新赏", "有效"],
      ["中途杀进程", "动画中杀App", "重进订单详情可看结果", "场景"],
      ["完整性校验入口", "draw-integrity", "校验通过展示", "有效"],
      ["兑换余额", "redeem/balance", "余额入账item核销", "有效"],
      ["部分兑换", "多item兑部分", "状态正确", "场景"],
      ["发货申请", "仓库发起ship", "物流状态更新", "有效"],
      ["中奖记录弹窗", "WinRecordModal", "历史可查", "有效"],
      ["放弃加价购", "abandon-offer", "按策略关闭offer", "场景"],
    ],
    { type: "UI", prio: "P0" }
  );

  // ========== D. 概率 / 保底 / 公平 ==========
  matrix(
    out,
    "DRAW-概率公平",
    "概率公示",
    "GET front/mystery-box/{id}/probability + ProbabilityDisclosureView",
    [
      ["概率页展示", "打开probability", "各档概率和≈100%", "有效"],
      ["历史概率", "probability/history", "变更可追溯", "有效"],
      ["详情页概率帮助", "BoxDetailsProbHelpModal", "文案合规", "有效"],
      ["信任条", "TrustComplianceStrip", "展示必要披露", "有效"],
      ["系列统计", "series draw-statistics", "样本数与分布", "有效"],
      ["概率为0档", "配置0", "不展示或标明", "边界"],
      ["概率被篡改客户端", "改本地展示", "以服务端为准", "无效-安全"],
      ["未上架箱", "disable box", "不可见或404", "无效"],
    ],
    { type: "UI", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-概率公平",
    "保底pity",
    "pity-progress / pity-compensate / MysteryBoxUserPityService",
    [
      ["进度展示", "fetchPityProgress", "计数正确", "有效"],
      ["触达阈值", "达pity-threshold", "强制高稀有或补偿入口", "有效"],
      ["补偿积分", "submitPityCompensate POINTS", "积分到账", "有效"],
      ["补偿等待", "WAIT策略", "状态可查", "场景"],
      ["高库存为空fail-closed", "forceHigh无库存", "退款或补偿不吞款", "无效-资金"],
      ["预支付pity校验", "prepay fail-fast", "明确错误", "无效"],
      ["并发计数", "两单同时", "原子upsert不丢次数", "边界-并发"],
      ["管理员改阈值", "PUT pity-threshold", "前端进度按新阈", "场景"],
    ],
    { type: "API", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-概率公平",
    "公平性验证",
    "front/fairness/* + FairnessVerifyView",
    [
      ["日beacon", "GET daily-beacon", "可获取", "有效"],
      ["按订单验证", "verifyFairnessByOrder", "commit/reveal匹配", "有效"],
      ["commit查询", "order/{id}/commit", "承诺可见", "有效"],
      ["draw-log", "draw-log/{id}", "日志可审计", "有效"],
      ["越权查他人订单公平", "A查B orderId", "拒绝", "无效-越权"],
      ["win-rule覆盖关闭", "allow-win-rule-override=false", "覆盖无效", "无效-安全"],
      ["EV门禁拦保存", "BoxExpectedValueGuard", "低margin拒保存", "无效-资金"],
    ],
    { type: "API", prio: "P0" }
  );

  // ========== E. 队列 / 实时 / 观战 ==========
  matrix(
    out,
    "DRAW-队列观战",
    "抽赏队列",
    "front/mystery-box/{id}/draw-queue/*",
    [
      ["加入队列", "POST join", "获得位次", "有效"],
      ["查询状态", "GET status", "与SSE一致", "有效"],
      ["续期", "POST renew", "TTL延长", "有效"],
      ["离开", "DELETE leave", "释放", "有效"],
      ["买断锁获取", "POST buyout-lock", "成功", "有效"],
      ["买断锁冲突", "他人已锁", "失败", "无效"],
      ["买断续期", "持有者renew", "成功", "有效"],
      ["非持有续期", "他人", "拒绝", "无效-越权"],
      ["解锁", "DELETE buyout-lock", "释放", "有效"],
      ["SSE队列流", "draw-queue/stream", "推送位次变化", "有效"],
      ["SSE鉴权失败", "无token", "拒绝", "无效-鉴权"],
      ["全局队列特效", "GlobalQueueEffects", "到号提示/音效", "有效"],
      ["到号通知", "queueTurnNotification", "本地通知可选", "场景"],
      ["断线重连SSE", "中途断网", "续订不丢关键事件", "边界"],
    ],
    { type: "API", prio: "P0" }
  );

  matrix(
    out,
    "DRAW-队列观战",
    "观战房与弹幕",
    "reveal room WS + spectator token",
    [
      ["房主开房", "支付后room state", "可分享", "有效"],
      ["申请spectator token", "POST spectator-token", "一单一活跃token", "有效"],
      ["重复申请", "再申请", "旧token失效或复用策略", "边界"],
      ["观众加入", "WS join", "看进度", "有效"],
      ["进度同步", "publish progress", "观众UI同步", "有效"],
      ["反应/弹幕", "reaction + LocalDanmaku", "展示限流", "有效"],
      ["非房主PATCH", "观众改状态", "拒绝", "无效-越权"],
      ["token过期", "过期访问", "拒绝", "无效-鉴权"],
      ["feed ticker", "draw-feed/stream", "动态流", "有效"],
      ["pool-stream", "库存池流", "变化可观测", "有效"],
    ],
    { type: "API", prio: "P1" }
  );

  // ========== F. 市集全量 ==========
  const mpStatuses = ["ON_SALE", "COOLING", "SOLD", "CANCELLED"];
  const tradeStatuses = ["PENDING_COOLING", "SETTLING", "COMPLETED", "PENDING_EXTERNAL", "CANCELLED"];

  matrix(
    out,
    "MP-市集",
    "列表浏览",
    "GET front/marketplace/listings + MarketplaceView",
    [
      ["未登录浏览", "GET listings", "可浏览", "有效"],
      ["筛选排序", "市集Tab", "列表刷新", "有效"],
      ["空态", "无上架", "空态文案", "有效-空"],
      ["分页尾页", "翻到末页", "无报错", "边界"],
      ["功能开关关", "mobile.marketplace.enabled=false", "入口隐藏", "无效-开关"],
      ["下拉刷新", "用户刷新", "数据更新", "有效"],
    ],
    { type: "UI", prio: "P0" }
  );

  matrix(
    out,
    "MP-市集",
    "上架出售",
    "POST front/marketplace/listings + WarehouseView.listToMarket",
    [
      ["仓库赏品上架", "选item+标价", "ON_SALE且仓库锁定", "有效"],
      ["价格=0", "price=0", "拒绝", "边界"],
      ["价格负", "price<0", "拒绝", "无效"],
      ["价格超大", "极大值", "拒绝或限额", "边界"],
      ["信用分不足", "credit<3.0", "拒绝上架", "无效"],
      ["年龄未确认", "compliance", "拒绝", "无效-合规"],
      ["iOS门禁", "AppStore client", "拒绝", "无效-合规"],
      ["重复上架同item", "已锁定再上架", "拒绝", "无效"],
      ["取消上架", "POST cancel", "回仓库可售", "有效"],
      ["非卖家取消", "他人cancel", "拒绝", "无效-越权"],
      ["我的上架列表", "GET my-listings", "仅自己", "有效"],
      ["离线队列上架", "offline marketplaceList", "联网补发幂等", "边界-幂等"],
    ],
    { type: "API", prio: "P0" }
  );

  matrix(
    out,
    "MP-市集",
    "购买与冷静期",
    "POST listings/{id}/buy + cancel-trade",
    [
      ["余额充足购买", "buy+idempotency-key", "HOLD扣款进入COOLING", "有效"],
      ["缺幂等键", "无Idempotency-Key", "拒绝", "无效-安全"],
      ["重复幂等键", "同键重放", "同一贸易", "边界-幂等"],
      ["余额不足", "钱包不够", "拒绝", "无效"],
      ["信用不足购买", "credit低", "拒绝", "无效"],
      ["买自己的货", "卖家自购", "拒绝", "无效"],
      ["非ON_SALE购买", "SOLD/CANCELLED", "拒绝", "无效"],
      ["并发抢购", "两人同点买", "仅一人成功", "边界-并发"],
      ["冷静期取消", "cancel-trade", "HOLD退回列表恢复", "有效"],
      ["非买家取消交易", "卖家cancel-trade", "拒绝", "无效-越权"],
      ["冷静期结束结算", "MarketplaceCoolingJob 24h", "SETTLING→完成或外部", "有效"],
      ["手续费5%", "fee-rate默认0.05", "seller_proceeds正确", "有效"],
      ["费率配置变更", "改marketplaceFeeRate", "新单按新费率", "场景"],
      ["已购列表", "GET purchased", "含buyerShipStatus", "有效"],
      ["离线购买补发", "offline marketplaceBuy", "幂等", "边界-幂等"],
    ],
    { type: "API", prio: "P0" }
  );

  for (const st of mpStatuses) {
    matrix(
      out,
      "MP-市集",
      `上架状态-${st}`,
      "MarketplaceService status transitions",
      [
        ["买", `status=${st} buy`, st === "ON_SALE" ? "成功" : "拒绝", "判定表"],
        ["卖家取消", `status=${st} cancel`, st === "ON_SALE" ? "成功" : "拒绝", "判定表"],
      ],
      { type: "API", prio: "P0", technique: "判定表" }
    );
  }

  for (const st of tradeStatuses) {
    matrix(
      out,
      "MP-市集",
      `交易状态-${st}`,
      "marketplace_trade",
      [
        ["买家取消", `trade=${st} cancel-trade`, st === "PENDING_COOLING" ? "退款成功" : "拒绝", "判定表"],
        ["外部完成", `admin complete-external @${st}`, st === "PENDING_EXTERNAL" ? "COMPLETED" : "拒绝", "判定表"],
        ["外部失败", `admin fail-external @${st}`, st === "PENDING_EXTERNAL" ? "退款+恢复上架" : "拒绝", "判定表"],
        ["评价", `rate @${st}`, st === "COMPLETED" ? "评分写入信用" : "拒绝或按规则", "判定表"],
      ],
      { type: "API", prio: "P0", technique: "判定表" }
    );
  }

  matrix(
    out,
    "MP-市集",
    "聊天SSE",
    "front/marketplace/listings/{id}/chat(+stream)",
    [
      ["卖家发消息", "POST chat", "落库可拉取", "有效"],
      ["买家发消息", "POST chat", "成功", "有效"],
      ["第三人发消息", "路人", "MARKETPLACE_CHAT_FORBIDDEN", "无效-越权"],
      ["历史拉取", "GET chat", "分页有序", "有效"],
      ["SSE推送", "chat/stream", "实时到达", "有效"],
      ["SSE断线重连", "断网恢复", "补历史不丢", "边界"],
      ["空消息", "content空", "拒绝", "无效"],
      ["超长消息", "超max", "拒绝", "边界"],
      ["XSS内容", "<script>", "存储转义/过滤", "无效-安全"],
      ["未成交仅卖家", "无买家时买家接口", "按规则拒绝", "无效"],
    ],
    { type: "API", prio: "P0" }
  );

  matrix(
    out,
    "MP-市集",
    "信用证书评价打款",
    "credit / certificate / rate / admin external",
    [
      ["查信用", "GET credit", "分数展示", "有效"],
      ["成交后评价", "POST rate", "信用更新", "有效"],
      ["重复评价", "再rate", "拒绝或幂等", "边界"],
      ["提交证书", "POST certificate", "PENDING", "有效"],
      ["查证书", "GET certificate", "可公开查", "有效"],
      ["管理员通过证书", "approve+OTP", "APPROVED", "有效"],
      ["管理员驳回证书", "reject+OTP", "REJECTED", "有效"],
      ["无OTP审核", "缺x-admin-action-otp", "拒绝", "无效-安全"],
      ["钱包打款成功", "payout=wallet", "MARKETPLACE_IN到账", "有效"],
      ["MoMo外部待处理", "payout=momo", "PENDING_EXTERNAL", "场景"],
      ["ZaloPay外部", "zalopay", "PENDING_EXTERNAL", "场景"],
      ["外部超时巡检", "MarketplaceExternalPayoutWatchJob", "告警或失败路径", "场景-任务"],
      ["支付市场健康", "GET admin/ops/payment/market", "健康可见", "有效"],
      ["发货状态同步", "warehouse ship MARKETPLACE", "buyer_ship_status=SHIPPED", "有效"],
      ["费率预估UI", "marketplaceProceeds", "与后端computeFee一致", "有效"],
    ],
    { type: "API", prio: "P0" }
  );

  // ========== G. 性能测试 ==========
  matrix(
    out,
    "PERF-性能",
    "开盒动画性能",
    "OpenBoxRevealOverlay FPS/内存",
    [
      ["单抽流畅度", "中端机单抽", "平均FPS>=45无明显卡顿", "性能"],
      ["10连流畅度", "10连序列", "可接受掉帧<10%时长", "性能"],
      ["20连批处理", "超batch阈值", "虚拟列表不OOM", "性能"],
      ["终极特效峰值", "PEERLESS+全特效", "峰值内存可控可降级", "性能"],
      ["加速不增负载异常", "2.5x播放", "CPU升高但可完成", "性能"],
      ["跳过释放资源", "中途skip", "音效/定时器释放无泄漏", "性能"],
      ["连续开5单", "连续enqueue", "会话栈不泄漏", "性能"],
      ["SSE长连接", "queue stream 30min", "心跳稳定无疯涨内存", "性能"],
      ["弱网开盒", "3G限速", "超时提示可重试", "性能"],
      ["冷启动到可开盒", "杀进程冷启", "关键路径<目标阈值", "性能"],
      ["预取不影响滚动", "列表滚动时prefetch", "滚动不严重掉帧", "性能"],
      ["市集列表首屏", "GET listings", "P95延迟达标", "性能"],
      ["市集聊天SSE", "高频消息", "UI不失控", "性能"],
      ["对账Job耗时", "PaymentReconciliationJob", "持锁时间可接受", "性能"],
      ["库存并发压测", "最后100库存200并发下单", "无超卖P99可接受", "性能"],
    ],
    { type: "PERF", prio: "P1", technique: "性能", class: "性能" }
  );

  matrix(
    out,
    "PERF-性能",
    "接口与网关压测",
    "create/prepay/notify/buy",
    [
      ["下单接口吞吐", "create压测", "错误率<1%无双占库存", "性能"],
      ["支付回调洪峰", "notify突发", "幂等入账正确", "性能"],
      ["市集抢购", "同listing并发buy", "仅1成功其余明确失败", "性能"],
      ["幂等键冲突", "同键并发", "409或同结果", "性能"],
      ["管理端发货批量", "deliver/batch大包", "部分失败可识别", "性能"],
    ],
    { type: "PERF", prio: "P1", technique: "性能", class: "性能" }
  );

  // ========== H. 安全测试 ==========
  matrix(
    out,
    "SEC-安全",
    "开盒链路安全",
    "order/draw/reveal/fairness",
    [
      ["篡改客户端概率展示", "改本地odds", "服务端抽赏不受影响", "安全"],
      ["伪造支付回调", "无签/错签", "拒绝不入账", "安全"],
      ["重放支付回调", "历史包重放", "幂等", "安全"],
      ["越权查看订单", "A获取B order", "拒绝", "安全"],
      ["越权redeem", "兑他人item", "拒绝", "安全"],
      ["篡改create金额", "低于计价", "拒绝", "安全"],
      ["伪造fairness结果", "改commit", "校验失败", "安全"],
      ["spectator token暴力", "随机token", "不可枚举/限流", "安全"],
      ["SSE未授权订阅", "无登录订阅私有流", "拒绝", "安全"],
      ["Win-rule非法覆盖", "覆盖关闭时注入", "无效", "安全"],
      ["特效配置注入", "远程JSON恶意字段", "忽略未知/钳制", "安全"],
      ["未成年人绕过静音", "改本地settings", "服务端合规仍约束关键路径", "安全"],
      ["IDOR purchase-limit", "查他人box越权数据", "仅公开限购信息", "安全"],
      ["mockPay生产开启", "prod mock", "必须关闭", "安全"],
    ],
    { type: "SEC", prio: "P0", technique: "安全", class: "安全" }
  );

  matrix(
    out,
    "SEC-安全",
    "市集安全",
    "front/admin marketplace",
    [
      ["买自己listing", "自购", "拒绝", "安全"],
      ["篡改买价", "客户端改价", "以服务端标价HOLD", "安全"],
      ["无幂等键购买", "缺键", "拒绝", "安全"],
      ["重放购买键", "同键", "不双扣", "安全"],
      ["聊天越权", "第三人SSE", "拒绝", "安全"],
      ["聊天XSS", "脚本消息", "转义", "安全"],
      ["取消他人上架", "IDOR cancel", "拒绝", "安全"],
      ["取消他人交易", "IDOR cancel-trade", "拒绝", "安全"],
      ["伪造评价刷信用", "非当事人rate", "拒绝", "安全"],
      ["管理员无OTP打款", "complete-external无OTP", "拒绝", "安全"],
      ["OTP重放", "旧OTP", "拒绝", "安全"],
      ["证书越权approve", "非管理员", "403", "安全"],
      ["钱包流水伪造MARKETPLACE_IN", "直接调内部", "无暴露接口", "安全"],
      ["费率为负配置", "fee-rate<0", "拒绝启动或钳制", "安全"],
      ["冷却未到提前结算", "调Job/改时间", "仅授权任务可跑", "安全"],
    ],
    { type: "SEC", prio: "P0", technique: "安全", class: "安全" }
  );

  matrix(
    out,
    "SEC-安全",
    "通用安全",
    "全站",
    [
      ["SQL注入参数", "关键词' OR 1=1", "参数化无注入", "安全"],
      ["水平越权通用", "替换资源ID", "拒绝", "安全"],
      ["垂直越权", "C端调admin", "403", "安全"],
      ["超大JSON body", "数MB", "拒绝", "安全"],
      ["速率限制短信/登录", "爆破", "限流", "安全"],
      ["敏感信息日志", "支付回调日志", "无完整卡密/签名泄露", "安全"],
      ["HTTPS强制", "明文", "升级或拒绝", "安全"],
    ],
    { type: "SEC", prio: "P0", technique: "安全", class: "安全" }
  );

  // 市集标价/手续费边界加密
  for (const price of ["0.01", "1", "10", "100", "999", "10000", "999999"]) {
    matrix(
      out,
      "MP-市集",
      `标价-${price}`,
      "POST front/marketplace/listings + computeFee",
      [
        ["上架", `price=${price}`, "ON_SALE或拒超限", "边界"],
        ["购买HOLD", `buy@${price}`, "扣款=标价", "有效"],
        ["手续费", `fee=rate*${price}`, "seller_proceeds=price-fee", "有效"],
        ["UI预估一致", "marketplaceProceeds", "与后端一致", "有效"],
      ],
      { type: "API", prio: "P0", technique: "边界值" }
    );
  }

  // 信用分边界
  for (const score of ["2.9", "3.0", "3.1", "5.0", "0", "10"]) {
    matrix(
      out,
      "MP-市集",
      `信用-${score}`,
      "GET credit + list/buy gate",
      [
        ["上架门禁", `credit=${score}`, Number(score) >= 3 ? "允许上架" : "拒绝上架", "判定表"],
        ["购买门禁", `credit=${score}`, Number(score) >= 3 ? "允许购买" : "拒绝购买", "判定表"],
      ],
      { type: "API", prio: "P0", technique: "边界值" }
    );
  }

  // E2E journeys draw + marketplace
  const e2es = [
    ["单抽全特效", "下单→支付→全VFX/SFX→结算→仓库", "音画同步结果正确"],
    ["十连加速跳过", "10连→加速→中途skip→结算", "奖品数=10"],
    ["减弱动效开盒", "reduceMotion→支付→文本揭示", "结果完整"],
    ["静音开盒", "masterSound=off→开盒", "无音有动画有结果"],
    ["未成年静音开盒", "muteAllCeremony→开盒", "全静音合规"],
    ["排队买断开盒", "join/buyout→下单支付→开盒", "锁与支付一致"],
    ["保底触发", "pity达阈→开出高稀有或补偿", "资金不失"],
    ["公平验证闭环", "开盒→fairness verify", "通过"],
    ["观战同步", "房主开盒观众观看", "进度一致"],
    ["离线补揭示", "入账后离线→联网补动画", "不丢结果"],
    ["市集卖出闭环", "开盒入仓→上架→他买→冷静→结算打款", "账实一致"],
    ["市集冷静取消", "买→cancel-trade", "退款上架恢复"],
    ["市集外部打款", "PENDING_EXTERNAL→admin complete", "完成"],
    ["市集外部失败", "fail-external", "买家退款货回架"],
    ["市集聊天促成", "上架→聊→买", "消息与交易关联正确"],
  ];
  for (const [t, s, e] of e2es) {
    push(out, {
      ...base("DRAW-MP-E2E", t, "E2E", { type: "E2E", prio: "P0", class: "有效-旅程" }),
      title: `e2e-${t}`,
      steps: s,
      expect: e,
    });
  }

  return out;
}

function generateWhitebox() {
  const units = [
    {
      m: "DRAW-WB-跳过加速",
      u: "resolveSkipTapAction",
      conds: ["guardTier=guarded", "isPaused", "isLongPress", "consecutiveTaps>=2"],
    },
    {
      m: "DRAW-WB-跳过加速",
      u: "resolveSkipGuardTier",
      conds: ["ceremonyTier存在", "isUltimateCeremony", "pacing=finale", "pacing=ceremony"],
    },
    {
      m: "DRAW-WB-跳过加速",
      u: "accelerateDurationScale/PlaybackRate",
      conds: ["tier=0", "tier=1", "tier=2"],
    },
    {
      m: "DRAW-WB-编排",
      u: "revealOrchestrator.enqueueRevealTask",
      conds: ["支付已入账", "未pendingPaymentBlock", "会话可获取", "日重播未超限", "资源预热成功"],
    },
    {
      m: "DRAW-WB-音效",
      u: "playRevealSoundArc",
      conds: ["masterSound", "层开关", "非未成年全静音", "非skipped_muted", "资源存在"],
    },
    {
      m: "DRAW-WB-降级",
      u: "getEffectProfile/reduceMotion",
      conds: ["系统reduceMotion", "remoteLevel", "deviceDegrade", "weakNetwork", "textOnly"],
    },
    {
      m: "DRAW-WB-抽赏",
      u: "MysteryBoxOrderDrawService.drawPaidOrderItems",
      conds: ["claimPaid成功", "pity forceHigh", "高库存可用", "stock.drawAndConsume成功", "fairness meta写入", "空抽fail-closed"],
    },
    {
      m: "DRAW-WB-保底",
      u: "MysteryBoxUserPityService",
      conds: ["达阈值", "补偿类型POINTS", "补偿WAIT", "并发upsert", "阈值配置变更"],
    },
    {
      m: "DRAW-WB-EV",
      u: "BoxExpectedValueGuard.check",
      conds: ["EV配置存在", "margin>=min", "discount<=max", "违规拒绝保存"],
    },
    {
      m: "DRAW-WB-队列",
      u: "MysteryBoxDrawQueueService",
      conds: ["join成功", "renew持有者", "buyout无冲突", "leave释放", "TTL过期"],
    },
    {
      m: "MP-WB-买卖",
      u: "MarketplaceService.buy",
      conds: ["ON_SALE", "非自购", "信用>=3", "余额足", "幂等键", "年龄确认", "iOS门禁通过", "网关ready"],
    },
    {
      m: "MP-WB-买卖",
      u: "MarketplaceService.cancelTrade",
      conds: ["买家本人", "PENDING_COOLING", "HOLD退款成功", "listing恢复ON_SALE"],
    },
    {
      m: "MP-WB-结算",
      u: "MarketplaceCoolingJob/settle",
      conds: ["冷却满24h", "扣费计算正确", "钱包打款", "外部PENDING", "失败回滚路径"],
    },
    {
      m: "MP-WB-聊天",
      u: "MarketplaceChatService",
      conds: ["卖方或买方", "内容非空", "长度合法", "SSE分发成功"],
    },
    {
      m: "MP-WB-管理",
      u: "completeExternal/failExternal",
      conds: ["管理员角色", "OTP有效", "PENDING_EXTERNAL", "complete入账", "fail退款恢复"],
    },
  ];

  const wb = [];
  for (const u of units) {
    u.conds.forEach((cond, idx) => {
      wb.push({
        m: u.m,
        u: u.u,
        title: `${cond}=T`,
        cond: `${cond}=TRUE;其余默认T`,
        path: `C${idx + 1}T`,
        crit: "条件覆盖",
        expect: "真分支",
      });
      wb.push({
        m: u.m,
        u: u.u,
        title: `${cond}=F`,
        cond: `${cond}=FALSE;其余尽量T`,
        path: `C${idx + 1}F`,
        crit: "条件覆盖",
        expect: "假分支/拒绝无脏写",
      });
    });
    wb.push({
      m: u.m,
      u: u.u,
      title: "全真主路径",
      cond: u.conds.map((c) => `${c}=T`).join(" && "),
      path: "MAIN",
      crit: "判定覆盖",
      expect: "成功",
    });
    wb.push({
      m: u.m,
      u: u.u,
      title: "短路",
      cond: `${u.conds[0]}=F`,
      path: "SHORT",
      crit: "条件判定",
      expect: "无后续副作用",
    });
    wb.push({
      m: u.m,
      u: u.u,
      title: "并发双入",
      cond: "双线程",
      path: "CONCURRENT",
      crit: "并发",
      expect: "幂等/锁正确",
    });
  }

  // Explicit skip decision table
  const guards = ["normal", "guarded"];
  const paused = [false, true];
  const longPress = [false, true];
  const taps = [0, 1, 2];
  for (const g of guards) {
    for (const p of paused) {
      for (const lp of longPress) {
        for (const t of taps) {
          let expect = "skip";
          if (g === "guarded" && !lp && t < 2 && !p) expect = "pause";
          if (g === "guarded" && !lp && t < 2 && p) expect = "skip";
          wb.push({
            m: "DRAW-WB-跳过加速",
            u: "resolveSkipTapAction/decisionTable",
            title: `g=${g},paused=${p},long=${lp},taps=${t}`,
            cond: `guard=${g};paused=${p};longPress=${lp};taps=${t}`,
            path: expect.toUpperCase(),
            crit: "判定表全覆盖",
            expect,
          });
        }
      }
    }
  }

  return wb;
}

function readCsvRows(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return text.split(/\r?\n/).filter(Boolean).slice(1);
}

function isAddonLine(line) {
  return (
    line.includes(",\"DRAW-") ||
    line.includes(",\"MP-") ||
    line.includes(",\"PERF-") ||
    line.includes(",\"SEC-") ||
    line.includes(",\"DRAW-MP-") ||
    line.includes(",\"DRAW-WB-") ||
    line.includes(",\"MP-WB-")
  );
}

function main() {
  // Ensure base+HV exist
  const thousands = path.join(ROOT, "_generate_thousands.js");
  const hv = path.join(ROOT, "_generate_high_value.js");
  if (fs.existsSync(thousands)) require("child_process").execSync(`node "${thousands}"`, { stdio: "inherit" });
  if (fs.existsSync(hv)) require("child_process").execSync(`node "${hv}"`, { stdio: "inherit" });

  const bb = generateBlackbox();
  const wb = generateWhitebox();
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

  const bbN = bb.map((c, i) => ({ ...c, id: `DM-BB-${String(i + 1).padStart(5, "0")}` }));
  const wbN = wb.map((c, i) => ({ ...c, id: `DM-WB-${String(i + 1).padStart(5, "0")}` }));

  fs.writeFileSync(
    path.join(BB, "DRAW_MARKETPLACE_PERF_SEC_BLACKBOX.csv"),
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
    path.join(WB, "DRAW_MARKETPLACE_PERF_SEC_WHITEBOX.csv"),
    "\uFEFF" +
      [
        row(wbHeader),
        ...wbN.map((c) => row([c.id, c.m, c.u, c.title, c.cond, c.path, c.crit, c.expect, ""])),
      ].join("\n"),
    "utf8"
  );

  const allBbPath = path.join(BB, "ALL_BLACKBOX_CASES.csv");
  const allWbPath = path.join(WB, "ALL_WHITEBOX_CASES.csv");
  const existingBb = readCsvRows(allBbPath).filter((l) => !isAddonLine(l));
  const existingWb = readCsvRows(allWbPath).filter((l) => !isAddonLine(l));

  const mergedBb = [];
  let i = 0;
  for (const line of existingBb) {
    i += 1;
    mergedBb.push(line.replace(/^"BB-\d+"/, `"BB-${String(i).padStart(5, "0")}"`));
  }
  for (const c of bbN) {
    i += 1;
    mergedBb.push(
      row([`BB-${String(i).padStart(5, "0")}`, c.module, c.feature, c.title, c.type, c.prio, c.pre, c.entry, c.steps, c.expect, c.technique, c.class, c.id])
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

  // per-module extracts for new modules
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

  const summary = {
    drawMpBlackbox: bbN.length,
    drawMpWhitebox: wbN.length,
    allBlackbox: mergedBb.length,
    allWhitebox: mergedWb.length,
    modules: Object.keys(byMod).sort(),
  };

  const md = `# 开盒链路 × 市集 × 性能 × 安全 — 全量补齐

> ${new Date().toISOString()}

## 覆盖范围（对照真实实现）

### 开盒链路
- 下单/pack/支付回跳、结果结算、仓库
- 特效：稀有度仪式、模板(lively/minimal/turbo/eyeCare/collectMinimal)、节奏、粒子/闪屏/震动
- 音效：主开关与分层、未成年静音、录制安全、warmup/取消排程
- 跳过：\`revealSkipPolicy\` guarded 首击暂停 / 连点或长按跳过
- 加速：1.5x / 2.5x + temporaryTurbo
- 降级：reduceMotion、弱网、离线包、ExpoGo
- 概率公示、pity保底、公平性、EV门禁
- 队列/买断锁、SSE、观战房

### 市集
- 上架/取消/购买/冷静期取消/结算打款/外部打款
- 状态机 listing + trade 判定表
- 聊天 SSE、信用、证书、评价、仓库发货同步
- 费率、幂等键、iOS/年龄/信用门禁

### 性能 / 安全
- 动画 FPS/内存、连开、SSE长连、抢购压测
- 回调伪造/重放、越权、XSS、OTP、mockPay 生产关闭等

## 数量

| 指标 | 数量 |
|---|---:|
| 本包黑盒 | ${summary.drawMpBlackbox} |
| 本包白盒 | ${summary.drawMpWhitebox} |
| 合并全量黑盒 | ${summary.allBlackbox} |
| 合并全量白盒 | ${summary.allWhitebox} |

## 文件
- \`BLACKBOX/DRAW_MARKETPLACE_PERF_SEC_BLACKBOX.csv\`
- \`WHITEBOX/DRAW_MARKETPLACE_PERF_SEC_WHITEBOX.csv\`
- 已合并 \`ALL_*\`

## 再生
\`\`\`bash
node docs/TEST_CASES/_generate_draw_marketplace.js
\`\`\`
（内部会先跑 thousands + high_value 再叠加本包）
`;
  fs.writeFileSync(path.join(ROOT, "DRAW_MARKETPLACE_COVERAGE.md"), md, "utf8");

  const readme =
    `# 测试用例包（黑盒 / 白盒）\n\n` +
    `| 指标 | 数量 |\n|---|---:|\n` +
    `| 黑盒全量 | ${summary.allBlackbox} |\n` +
    `| 白盒全量 | ${summary.allWhitebox} |\n` +
    `| 开盒+市集+性能+安全包 | ${summary.drawMpBlackbox} / ${summary.drawMpWhitebox} |\n\n` +
    `详见 \`DRAW_MARKETPLACE_COVERAGE.md\`、\`HIGH_VALUE_PRIORITY.md\`。\n\n` +
    `## 再生\n\n\`\`\`bash\nnode docs/TEST_CASES/_generate_draw_marketplace.js\n\`\`\`\n`;
  fs.writeFileSync(path.join(ROOT, "README.md"), readme, "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main();
