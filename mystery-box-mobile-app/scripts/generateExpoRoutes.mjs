/**
 * Generates expo-router screen stubs under app/(shell)/.
 * Run: node scripts/generateExpoRoutes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..", "app", "(shell)");

const TAB_VIEWS = ["home", "mall", "warehouse", "profile"];

const STACK_VIEWS = [
  "orders",
  "balanceLogs",
  "addressManage",
  "addressForm",
  "messages",
  "feedback",
  "settings",
  "promotion",
  "commission",
  "team",
  "favorites",
  "coupons",
  "welfare",
  "luckyCoins",
  "starStones",
  "privacy",
  "levelGift",
  "inviteCenter",
  "ipTheme",
  "probability",
  "exchangeMall",
  "leaderboard",
  "community",
  "activityDetail",
  "marketplace",
  "refunds",
  "shipRequests",
  "fairnessVerify",
  "catalogSearch",
  "playGuide",
];

const SEGMENT_BY_VIEW = {
  exchangeMall: "exchange-mall",
  shipRequests: "ship-requests",
  balanceLogs: "balance-logs",
  addressManage: "addresses",
  addressForm: "address-form",
  luckyCoins: "lucky-coins",
  starStones: "star-stones",
  levelGift: "level-gift",
  inviteCenter: "invite",
  ipTheme: "ip-theme",
  fairnessVerify: "fairness",
  activityDetail: "activity",
  catalogSearch: "search",
  playGuide: "play-guide",
};

function segmentFor(view) {
  return SEGMENT_BY_VIEW[view] ?? view;
}

function write(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

for (const tab of TAB_VIEWS) {
  write(
    path.join(appRoot, "(tabs)", `${tab}.tsx`),
    `import { createAppViewRoute } from "../../../src/navigation/createAppViewRoute";

export default createAppViewRoute("${tab}");
`,
  );
}

for (const view of STACK_VIEWS) {
  const fileName = `${segmentFor(view)}.tsx`;
  write(
    path.join(appRoot, fileName),
    `import { createAppViewRoute } from "../../src/navigation/createAppViewRoute";

export default createAppViewRoute("${view}");
`,
  );
}

write(
  path.join(appRoot, "order", "[id].tsx"),
  `import { createOrderDetailsRoute } from "../../../src/navigation/createAppViewRoute";

export default createOrderDetailsRoute();
`,
);

write(
  path.join(appRoot, "box", "[id].tsx"),
  `import { createBoxDetailsRoute } from "../../../src/navigation/createAppViewRoute";

export default createBoxDetailsRoute();
`,
);

console.log(`Generated ${TAB_VIEWS.length} tab routes, ${STACK_VIEWS.length} stack routes, and 2 dynamic routes.`);
