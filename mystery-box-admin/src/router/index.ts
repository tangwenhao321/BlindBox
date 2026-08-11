import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

import { useHomeStore } from '@/stores/home-store'
import { isAdminAuthenticated } from '@/utils/admin-auth-token'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'layout-view',
      component: () => import('@/layout/layout-view.vue'),
      children: [
        { path: '/user', component: () => import('@/views/user/user-view.vue') },
        {
          path: '/role',
          name: 'role',
          component: () => import('@/views/role/role-view.vue')
        },
        {
          path: '/menu',
          name: 'menu',
          component: () => import('@/views/menu/menu-view.vue')
        },
        {
          path: '/dict',
          name: 'dict',
          component: () => import('@/views/dict/dict-view.vue')
        },
        {
          path: '/product',
          component: () => import('@/views/product/product-view.vue')
        },
        {
          path: '/product-details',
          component: () => import('@/views/product/product-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/product-category',
          component: () => import('@/views/product-category/product-category-view.vue')
        },
        {
          path: '/product-category-details',
          component: () => import('@/views/product-category/product-category-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/mystery-box',
          component: () => import('@/views/mystery-box/mystery-box-view.vue')
        },
        {
          path: '/mystery-box-details',
          component: () => import('@/views/mystery-box/mystery-box-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/mystery-box-order',
          component: () => import('@/views/mystery-box-order/mystery-box-order-view.vue')
        },
        {
          path: '/mystery-box-category',
          component: () => import('@/views/mystery-box-category/mystery-box-category-view.vue')
        },
        {
          path: '/mystery-box-category-details',
          component: () =>
            import('@/views/mystery-box-category/mystery-box-category-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/draw-pack-config',
          component: () => import('@/views/mystery-box/draw-pack-config-view.vue')
        },
        {
          path: '/mystery-box-activity',
          component: () => import('@/views/mystery-box/mystery-box-activity-view.vue')
        },
        {
          path: '/ops-home-hot-box',
          component: () => import('@/views/mystery-box/ops-home-hot-box-view.vue')
        },
        {
          path: '/search-hot-keywords',
          component: () => import('@/views/search/search-hot-keywords-view.vue')
        },
        {
          path: '/newcomer-missions-template',
          component: () => import('@/views/newcomer/newcomer-missions-template-view.vue')
        },
        {
          path: '/hint-policy',
          component: () => import('@/views/ops/hint-policy-view.vue')
        },
        {
          path: '/payment-market-health',
          component: () => import('@/views/ops/payment-market-health-view.vue')
        },
        {
          path: '/marketplace-pending-external',
          component: () => import('@/views/ops/marketplace-pending-external-view.vue')
        },
        {
          path: '/feature-flag',
          component: () => import('@/views/ops/feature-flag-view.vue')
        },
        {
          path: '/app-version',
          component: () => import('@/views/ops/app-version-view.vue')
        },
        {
          path: '/fragment-exchange-sku',
          component: () => import('@/views/mystery-box/fragment-exchange-sku-view.vue')
        },
        {
          path: '/slideshow',
          component: () => import('@/views/slideshow/slideshow-view.vue')
        },
        {
          path: '/slideshow-details',
          component: () => import('@/views/slideshow/slideshow-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/coupon',
          component: () => import('@/views/coupon/coupon-view.vue')
        },
        {
          path: '/coupon-details',
          component: () => import('@/views/coupon/coupon-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/coupon-user-rel',
          component: () => import('@/views/coupon-user-rel/coupon-user-rel-view.vue')
        },
        {
          path: '/coupon-user-rel-details',
          component: () => import('@/views/coupon-user-rel/coupon-user-rel-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/coupon-box-rel',
          component: () => import('@/views/coupon-box-rel/coupon-box-rel-view.vue')
        },
        {
          path: '/coupon-box-rel-details',
          component: () => import('@/views/coupon-box-rel/coupon-box-rel-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/payment',
          component: () => import('@/views/payment/payment-view.vue')
        },
        {
          path: '/address',
          component: () => import('@/views/address/address-view.vue')
        },
        {
          path: '/vip-package',
          component: () => import('@/views/vip-package/vip-package-view.vue')
        },
        {
          path: '/vip-package-details',
          component: () => import('@/views/vip-package/vip-package-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/vip',
          component: () => import('@/views/vip/vip-view.vue')
        },
        {
          path: '/vip-config',
          component: () => import('@/views/vip/vip-config-view.vue')
        },

        {
          path: '/vip-details',
          component: () => import('@/views/vip/vip-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/vip-order',
          component: () => import('@/views/vip-order/vip-order-view.vue')
        },
        {
          path: '/carriage-template',
          component: () => import('@/views/carriage-template/carriage-template-view.vue')
        },
        {
          path: '/carriage-template-details',
          component: () => import('@/views/carriage-template/carriage-template-details-view.vue'),
          props(to) {
            return { id: to.query.id }
          }
        },
        {
          path: '/feedback',
          component: () => import('@/views/feedback/feedback-view.vue')
        },
        {
          path: '/moderation-workbench',
          component: () => import('@/views/moderation/moderation-workbench-view.vue')
        },
        {
          path: '/ops-platform',
          component: () => import('@/views/ops/ops-platform-view.vue')
        },
        {
          path: '/refund-record',
          component: () => import('@/views/refund-record/refund-record-view.vue')
        },
        {
          path: '/warehouse-ship-request',
          component: () => import('@/views/warehouse-ship-request/warehouse-ship-request-view.vue')
        },
        {
          path: '/order-id-migration',
          component: () => import('@/views/mystery-box-order/order-id-migration-view.vue')
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/login-view.vue')
    }
  ]
})
// 路由拦截：无会话时跳转登录。
// 默认：token 存于 memory + sessionStorage；cookie 模式：HttpOnly cookie + 非密钥 tab 标记（见 docs/ADMIN_SECURITY.md）。
// eslint-disable-next-line no-sparse-arrays
const whiteList = ['/login', '/']
router.beforeEach(async (to, from, next) => {
  const authenticated = isAdminAuthenticated()
  if (to.path === '/login') {
    return authenticated ? next('/') : next()
  }
  if (!authenticated) {
    return next('/login')
  }
  const homeStore = useHomeStore()
  if (
    whiteList.includes(to.path) ||
    (await homeStore.getMenuList()).findIndex((menu) => menu.path === to.path) >= 0
  ) {
    next()
  } else {
    return next('/')
  }
})
export default router
