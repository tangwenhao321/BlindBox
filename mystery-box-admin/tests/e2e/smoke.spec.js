import { expect, test } from '@playwright/test'
import {
  ADMIN_OTP,
  USE_BACKEND,
  apiGet,
  createBlindBoxViaApi,
  loginViaUi,
  readToken,
  seedAnalyticsFunnel,
  seedPendingRefund
} from './helpers.js'

const mockLoginPayload = {
  code: 1,
  result: {
    tokenName: 'token',
    tokenValue: 'e2e-test-token',
    tokenTimeout: 86400
  }
}

const mockUserInfoPayload = {
  code: 1,
  result: {
    id: 'e2e-user',
    phone: '13800138000',
    nickname: 'E2E Admin'
  }
}

const mockMenusPayload = {
  code: 1,
  result: [
    { id: '1', path: '/ops-platform', name: '运营平台' },
    { id: '2', path: '/user', name: '用户管理' },
    { id: '3', path: '/mystery-box', name: '盲盒管理' },
    { id: '4', path: '/mystery-box-order', name: '盲盒订单' },
    { id: '5', path: '/refund-record', name: '退款审核' },
    { id: '6', path: '/payment', name: '支付记录' },
    { id: '7', path: '/address', name: '收货地址' },
    { id: '8', path: '/coupon-box-rel', name: '优惠券盲盒关联' },
    { id: '9', path: '/coupon-box-rel-details', name: '优惠券盲盒关联详情' },
    { id: '10', path: '/newcomer-missions-template', name: '新人任务模板' },
    { id: '11', path: '/order-id-migration', name: '订单 ID 迁移' },
    { id: '12', path: '/warehouse-ship-request', name: '仓库发货' },
    { id: '13', path: '/payment-market-health', name: '市场支付健康' }
  ]
}

const mockMarketPaymentHealth = {
  code: 1,
  result: {
    paymentProvider: 'vnpay',
    currency: 'VND',
    vnpayConfigured: true,
    vnpaySandbox: true,
    mockPaymentEnabled: false
  }
}

/** Wait for post-login menu fetch so route guards allow direct navigation. */
async function loginViaMock(page) {
  await page.goto('/login')
  await expect(page.getByLabel('账号')).toBeVisible({ timeout: 15000 })
  await page.getByLabel('账号').fill('admin')
  await page.locator('input[type="password"]').fill('Admin@123456')
  const menusLoaded = page.waitForResponse(
    (response) => response.url().includes('/front/user/menus') && response.status() === 200
  )
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await menusLoaded
}

async function mockAdminAuth(page) {
  await page.route('**/admin/auth/login', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockLoginPayload)
    })
  })
  await page.route('**/front/user/info**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserInfoPayload)
    })
  })
  await page.route('**/front/user/menus**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMenusPayload)
    })
  })
  const emptyList = { code: 1, result: [] }
  const emptyFunnel = {
    code: 1,
    result: {
      exposure: 0,
      clicks: 0,
      createOrder: 0,
      pay: 0,
      share: 0,
      totalEvents: 0,
      paymentFail: 0,
      paymentCancel: 0
    }
  }
  await page.route('**/admin/ops/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/analytics/funnel') || url.includes('/analytics/retention')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyFunnel)
      })
      return
    }
    if (url.includes('/payment/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 1,
          result: {
            attempts: 0,
            success: 0,
            fail: 0,
            successRate: 100,
            windowMinutes: 60,
            failReasons: []
          }
        })
      })
      return
    }
    if (url.includes('/payment/market')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMarketPaymentHealth)
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyList)
    })
  })
  const emptyPage = { code: 1, result: { content: [], totalElements: 0, totalPages: 0 } }
  await page.route('**/admin/user/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyPage)
    })
  })
  await page.route('**/admin/mystery-box-win-rule/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/metrics')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 1,
          result: { activeRules: 0, pendingApproval: 0, hitsToday: 0 }
        })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyList)
    })
  })
  await page.route('**/admin/search/hot-keywords**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyList)
    })
  })
  await page.route('**/admin/hint-policy**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyList)
    })
  })
  await page.route('**/admin/payment/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyPage)
    })
  })
  await page.route('**/admin/address/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyPage)
    })
  })
  await page.route('**/admin/coupon-box-rel/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyPage)
    })
  })
  await page.route('**/admin/newcomer/missions/template**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyList)
    })
  })
  const emptyShipPage = {
    code: 1,
    result: { content: [], totalElements: 0 }
  }
  await page.route('**/admin/warehouse-ship-request/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/query')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyShipPage)
      })
      return
    }
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 1,
          result: { request: { status: 'PENDING', payAmount: 0 }, items: [] }
        })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 1, result: null })
    })
  })
  const migrationPreflight = {
    code: 1,
    result: {
      legacyMapTableReady: true,
      migrationLogTableReady: true,
      warehouseIndexesReady: true,
      ready: true,
      missingObjects: []
    }
  }
  const migrationAudit = {
    code: 1,
    result: {
      totalOrders: 0,
      snowflakeOrders: 0,
      legacyOrders: 0,
      mappedLegacyOrders: 0,
      sampleLegacyIds: []
    }
  }
  await page.route('**/admin/order-id-migration/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/preflight')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(migrationPreflight)
      })
      return
    }
    if (url.includes('/audit')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(migrationAudit)
      })
      return
    }
    if (url.includes('/pending') || url.includes('/rewrite/log')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 1, result: [] })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 1, result: null })
    })
  })
}

test.describe('admin UI smoke (offline mocks)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('admin login page can render', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('账号')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('serves security response headers', async ({ request }) => {
    const response = await request.get('/login')
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
    expect(response.headers()['x-frame-options']).toBe('DENY')
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('protected route redirects to login without token', async ({ page }) => {
    await page.goto('/ops-platform')
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })

  test('ops page route responds after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/ops-platform')
    await expect(page.getByText('定时任务运行记录')).toBeVisible({ timeout: 15000 })
  })

  test('mystery box list route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/mystery-box')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
  })

  test('user management route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/user')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
  })

  test('win rule panel visible on order page after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/mystery-box-order')
    await expect(page.getByText('指定中奖规则')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: '新增规则' })).toBeVisible()
  })

  test('search hot keywords route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/search-hot-keywords')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
  })

  test('hint policy route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/hint-policy')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
  })

  test('payment route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/payment')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
  })

  test('address route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/address')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
  })

  test('coupon box rel route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/coupon-box-rel')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: '新增' })).toBeVisible()
  })

  test('newcomer missions template route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/newcomer-missions-template')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
  })

  test('order id migration route loads preflight and audit after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/order-id-migration')
    await expect(page.getByText('迁移前置检查通过')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('审计概览')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Step 1：生成映射' })).toBeVisible()
  })

  test('warehouse ship request route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/warehouse-ship-request')
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: '刷新' })).toBeVisible()
  })

  test('payment market health route loads after mock login', async ({ page }) => {
    await mockAdminAuth(page)
    await loginViaMock(page)
    await page.goto('/payment-market-health')
    await expect(page.getByText('支付渠道')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('vnpay')).toBeVisible()
    await expect(page.getByText('VNPay 已配置')).toBeVisible()
    await expect(page.getByText('VNPay Sandbox')).toBeVisible()
  })
})

test.describe('admin critical path (real backend)', () => {
  test.skip(!USE_BACKEND, 'Set E2E_USE_BACKEND=1 to run against live backend')

  test.describe.configure({ mode: 'serial' })

  const boxName = `E2E-Box-${Date.now()}`
  let adminToken = ''
  let refundId = ''

  test('login', async ({ page }) => {
    await loginViaUi(page)
    adminToken = await readToken(page)
    expect(adminToken).toBeTruthy()
  })

  test('create blind box', async ({ page, request }) => {
    expect(adminToken).toBeTruthy()
    const createdId = await createBlindBoxViaApi(request, adminToken, boxName)
    expect(createdId).toBeTruthy()
    await page.goto('/mystery-box')
    await expect(page.getByText(boxName)).toBeVisible({ timeout: 15000 })
  })

  test('order list', async ({ page }) => {
    await page.goto('/mystery-box-order')
    await expect(page.locator('.el-table')).toBeVisible({ timeout: 15000 })
  })

  test('refund approval with OTP', async ({ page, request }) => {
    const seeded = await seedPendingRefund(request)
    refundId = seeded.refundId
    expect(refundId).toBeTruthy()

    await page.goto('/refund-record')
    await expect(page.getByText(seeded.orderId)).toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder('高危操作口令（审批必填）').fill(ADMIN_OTP)
    await page.getByRole('button', { name: '通过' }).first().click()
    await expect(page.getByText('已通过')).toBeVisible({ timeout: 10000 })
  })

  test('ops funnel has data', async ({ page, request }) => {
    await seedAnalyticsFunnel(request, adminToken)
    await page.goto('/ops-platform')
    await expect(page.getByText('转化漏斗（埋点看板）')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('支付健康度')).toBeVisible()
    await expect(page.getByText('审计记录')).toBeVisible()
    await expect(page.getByText('定时任务运行记录')).toBeVisible()
    await page.getByRole('button', { name: '刷新' }).first().click()
    await expect(page.locator('.el-statistic').filter({ hasText: '曝光' }).first()).toBeVisible()
  })

  test('order id migration preflight on live backend', async ({ page, request }) => {
    expect(adminToken).toBeTruthy()
    const preflight = await apiGet(request, '/admin/order-id-migration/preflight', adminToken)
    expect(preflight.ready).toBe(true)
    await page.goto('/order-id-migration')
    await expect(page.getByText('迁移前置检查通过')).toBeVisible({ timeout: 15000 })
  })
})
