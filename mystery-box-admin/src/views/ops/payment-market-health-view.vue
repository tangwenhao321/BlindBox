<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'

type MarketPaymentHealth = {
  paymentProvider: string
  currency: string
  vnpayConfigured: boolean
  vnpaySandbox: boolean
  vnpayIpnConfigured?: boolean
  momoEnabled?: boolean
  momoConfigured?: boolean
  mockPaymentEnabled: boolean
}

const loading = ref(false)
const health = ref<MarketPaymentHealth | null>(null)
const error = ref<string | null>(null)

const reload = async () => {
  loading.value = true
  error.value = null
  try {
    health.value = (await request({
      url: '/admin/ops/payment/market',
      method: 'get'
    })) as MarketPaymentHealth
  } catch (e: unknown) {
    health.value = null
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => void reload())
</script>

<template>
  <list-page-shell>
    <template #query>
      <p class="hint">
        市场/支付健康（只读）：展示当前部署的支付渠道、货币与 VNPay 配置状态。数据来自
        <code>GET /admin/ops/payment/market</code>。
      </p>
      <el-button type="primary" :loading="loading" @click="reload">刷新</el-button>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon class="section" />

    <el-descriptions v-if="health" v-loading="loading" :column="2" border class="section">
      <el-descriptions-item label="支付渠道">{{ health.paymentProvider || '—' }}</el-descriptions-item>
      <el-descriptions-item label="货币">{{ health.currency || '—' }}</el-descriptions-item>
      <el-descriptions-item label="VNPay 已配置">
        <el-tag :type="health.vnpayConfigured ? 'success' : 'warning'">
          {{ health.vnpayConfigured ? '是' : '否' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="VNPay Sandbox">
        <el-tag :type="health.vnpaySandbox ? 'info' : 'success'">
          {{ health.vnpaySandbox ? '是' : '否' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="Mock 支付">
        <el-tag :type="health.mockPaymentEnabled ? 'warning' : 'success'">
          {{ health.mockPaymentEnabled ? '启用' : '关闭' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item v-if="health.paymentProvider === 'vnpay'" label="IPN 公网 URL">
        <el-tag :type="health.vnpayIpnConfigured ? 'success' : 'danger'">
          {{ health.vnpayIpnConfigured ? '已配置' : '未配置/占位' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item v-if="health.paymentProvider === 'vnpay'" label="MoMo 已启用">
        <el-tag :type="health.momoEnabled ? 'success' : 'info'">
          {{ health.momoEnabled ? '是' : '否' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item v-if="health.paymentProvider === 'vnpay'" label="MoMo 凭证">
        <el-tag :type="health.momoConfigured ? 'success' : 'warning'">
          {{ health.momoConfigured ? '已配置' : '未配置' }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <el-alert
      v-if="health?.paymentProvider === 'vnpay' && health.vnpaySandbox"
      type="warning"
      show-icon
      class="section"
      title="VNPay 仍为 Sandbox，生产环境请关闭 sandbox 并配置公网 IPN"
    />
    <el-alert
      v-if="health?.paymentProvider === 'vnpay' && health.vnpayIpnConfigured === false"
      type="error"
      show-icon
      class="section"
      title="VNPay IPN 未配置，支付回调将无法入账"
    />
  </list-page-shell>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  color: #666;
  line-height: 1.6;
}
.section {
  margin-top: 12px;
}
</style>
