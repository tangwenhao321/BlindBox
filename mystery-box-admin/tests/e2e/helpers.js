/* eslint-env node */
/** @typedef {import('@playwright/test').APIRequestContext} APIRequestContext */

export const API_BASE = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:9912'
export const USE_BACKEND = process.env.E2E_USE_BACKEND === '1'

export const ADMIN_ACCOUNT = process.env.E2E_ADMIN_PHONE || 'admin'
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin@123456'
export const ADMIN_OTP = process.env.E2E_ADMIN_OTP || 'ci-test-otp'

/**
 * @param {import('@playwright/test').APIResponse} response
 */
export async function unwrapApi(response) {
  const body = await response.json()
  if (body?.code !== 1) {
    throw new Error(body?.msg || `API failed: ${response.status()} ${response.url()}`)
  }
  return body.result
}

/**
 * @param {APIRequestContext} request
 * @param {string} path
 * @param {Record<string, unknown>} [data]
 * @param {string} [token]
 * @param {Record<string, string>} [headers]
 */
export async function apiPost(request, path, data, token, headers = {}) {
  const response = await request.post(`${API_BASE}${path}`, {
    data,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { token } : {}),
      ...headers
    }
  })
  if (!response.ok()) {
    const text = await response.text()
    throw new Error(`POST ${path} failed (${response.status()}): ${text}`)
  }
  return unwrapApi(response)
}

/**
 * @param {APIRequestContext} request
 * @param {string} path
 * @param {string} [token]
 */
export async function apiGet(request, path, token) {
  const response = await request.get(`${API_BASE}${path}`, {
    headers: token ? { token } : {}
  })
  if (!response.ok()) {
    const text = await response.text()
    throw new Error(`GET ${path} failed (${response.status()}): ${text}`)
  }
  return unwrapApi(response)
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function loginViaUi(page) {
  await page.goto('/login')
  await page.getByLabel('账号').fill(ADMIN_ACCOUNT)
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 })
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function readToken(page) {
  return page.evaluate(() => sessionStorage.getItem('token') || localStorage.getItem('token'))
}

/**
 * @param {APIRequestContext} request
 * @param {string} token
 * @param {string} boxName
 */
export async function createBlindBoxViaApi(request, token, boxName) {
  const categories = await apiPost(
    request,
    '/admin/mystery-box-category/query',
    { pageNum: 1, pageSize: 1, query: {} },
    token
  )
  const categoryId = categories?.content?.[0]?.id
  if (!categoryId) {
    throw new Error('No mystery box category available for e2e create')
  }
  return apiPost(
    request,
    '/admin/mystery-box/save',
    {
      name: boxName,
      details: 'E2E blind box',
      tips: 'E2E',
      price: 9.9,
      cover: 'https://example.com/e2e-cover.png',
      categoryId,
      productIds: [],
      legendaryRate: 100,
      hiddenRate: 500,
      generalRate: 9400
    },
    token
  )
}

/**
 * @param {APIRequestContext} request
 */
export async function seedPendingRefund(request) {
  const suffix = Date.now()
  const phone = `139${String(suffix).slice(-8)}`
  const register = await apiPost(request, '/front/user/register', {
    phone,
    password: 'Test@123456',
    nickname: 'E2E Buyer'
  })
  const userToken = register.tokenValue

  await apiPost(request, '/front/user/compliance/confirm-age', {}, userToken)

  const adminLogin = await apiPost(request, '/admin/auth/login', {
    phone: ADMIN_ACCOUNT,
    password: ADMIN_PASSWORD
  })
  const adminToken = adminLogin.tokenValue

  const boxes = await apiPost(
    request,
    '/admin/mystery-box/query',
    { pageNum: 1, pageSize: 1, query: {} },
    adminToken
  )
  let boxId = boxes?.content?.[0]?.id
  if (!boxId) {
    boxId = await createBlindBoxViaApi(request, adminToken, `E2E-Refund-${suffix}`)
  }

  const orderId = await apiPost(
    request,
    '/front/mystery-box-order/create',
    { items: [{ mysteryBoxId: boxId, mysteryBoxCount: 1 }] },
    userToken,
    { 'x-risk-confirm': 'CONFIRM', 'x-device-id': `e2e-${suffix}` }
  )
  await apiPost(request, `/front/mystery-box-order/${orderId}/pay/mock`, {}, userToken, {
    'x-risk-confirm': 'CONFIRM',
    'x-device-id': `e2e-${suffix}`
  })
  const refundId = await apiPost(
    request,
    '/front/refund-record/save',
    { orderId, reason: 'E2E refund', amount: 9.9 },
    userToken
  )
  return { refundId, orderId, boxId }
}

/**
 * @param {APIRequestContext} request
 * @param {string} token
 */
export async function seedAnalyticsFunnel(request, token) {
  const deviceId = `e2e-device-${Date.now()}`
  await apiPost(request, '/front/analytics/events/guest', [
    { name: 'box_exposure', payload: { deviceId, boxId: 'e2e-box' } },
    { name: 'box_click', payload: { deviceId, boxId: 'e2e-box' } },
    { name: 'create_order', payload: { deviceId, boxId: 'e2e-box' } },
    { name: 'pay', payload: { deviceId, boxId: 'e2e-box' } }
  ])
  if (token) {
    await apiPost(
      request,
      '/front/analytics/events',
      [{ name: 'share', payload: { boxId: 'e2e-box' } }],
      token
    )
  }
}
