# Automation regression report

- time: 2026-08-14
- result: **PASS** (after fix)

## Classification (6913 blackbox)

| Tier | Count | Meaning |
|---|---:|---|
| AUTO_UNIT | 4995 | Vitest / JUnit Mockito |
| AUTO_IT | 1343 | Spring/DB/Redis IT |
| AUTO_E2E | 540 | Maestro / Playwright |
| MANUAL | 35 | See `MANUAL_CASES.md` |

## Batch run results

| Suite | Result |
|---|---|
| Mobile Vitest (skip/fee/journey automation) | PASS 41 tests |
| Backend focused money/marketplace | PASS (fixed `settleTrade_walletPath_completes` stub) |
| Maestro flow validate (39 flows) | PASS |
| Admin Vitest | PASS 12 tests |

## Fix applied this round

- `MarketplaceServiceTest.settleTrade_walletPath_completes` now stubs `findByIdWithProductsForUpdate` (production API), not `findById`.

## How to re-run

```powershell
pwsh docs/TEST_CASES/AUTOMATION/run-automation.ps1
```

Or stepwise:

```bash
node docs/TEST_CASES/AUTOMATION/classify-cases.js
cd mystery-box-mobile-app && npm test -- --run src/effects/revealSkipPolicy.automation.test.ts src/utils/marketplaceProceeds.automation.test.ts src/utils/journeyScenarioAutomation.test.ts
cd mystery-box-backend && mvn "-Dtest=MarketplaceServiceTest,MysteryBoxOrderServicePaymentNotifyTest,MysteryBoxOrderServiceRefundTest,..." test
cd mystery-box-mobile-app && npm run validate:maestro
cd mystery-box-admin && npm test -- --run
```

## MANUAL residual

Only **35** cases remain non-automatable (visual/audio subjective, real payment certs, device perf lab). Full list: `MANUAL_CASES.md`.
