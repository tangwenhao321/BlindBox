# Vietnam App Store 全量优化（无 Partner 密钥可交付）

> 2026-08-15 · 目标：越南区 Apple App Store

## 已落地

1. **App Attest 防误开** — `require-header=true` 且未实现校验时 **拒绝启动**
2. **Apple IAP scaffold** — `AppleIapVerifyService` + `POST /front/vip-order/{id}/iap/verify`（fail-closed）；生产禁止 `apple.iap.enabled`
3. **客户端 IAP 脚手架** — `iapService.ts` + `VipBenefitsView`（默认 `EXPO_PUBLIC_IAP_ENABLED=false`）
4. **Attest 客户端** — production / production-vn **不再发送**可伪造静态 `EXPO_PUBLIC_APPLE_APP_ATTEST`
5. **邀请链接** — 纠正 `/invite/invite`；支持 `APP_LINK_DOMAIN` 回退
6. **EAS / `.env.vn.example`** — MoMo/IAP 默认关；`EXPO_PUBLIC_IOS_APP_STORE_URL`；邀请与 EAS project 占位

## App Review 说明（建议）

- iOS 数字 VIP / 余额购 VIP：未开通，符合 3.1.1（外链钱包已拦截）
- 盲盒实物订单：VNPay；MoMo 未上线
- App Attest：未启用 require-header

## 仍需密钥 / Apple Connect

| 项 | 依赖 |
|---|---|
| 真 IAP | ASC 商品 + StoreKit + Server API |
| App Attest 真验 | `.p8` + 原生 DCAppAttest + 服务端验签 |
| MoMo / eSMS / Push | Partner / EAS 真实配置 |
| AASA / 邀请 H5 | 域名托管 |

## 回归

```bash
cd mystery-box-backend && mvn "-Dtest=AppleIapVerifyServiceTest,ProductionSafetyValidatorTest" test
cd mystery-box-mobile-app && npm test -- --run src/utils/inviteUrl.test.ts src/utils/clientAttestation.test.ts
```
