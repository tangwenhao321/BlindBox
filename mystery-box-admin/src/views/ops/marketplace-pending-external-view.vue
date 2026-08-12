<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'
import { formatAdminMoney } from '@/utils/format-money'
import { promptAndArmAdminActionOtp } from '@/utils/admin-action-otp'

type PendingExternalTrade = {
  id: string
  listingId: string
  sellerId: string
  buyerId: string
  price: number
  fee: number
  sellerProceeds: number
  status: string
  editedTime: string
  productName?: string
}

const loading = ref(false)
const rows = ref<PendingExternalTrade[]>([])
const error = ref<string | null>(null)

const reload = async () => {
  loading.value = true
  error.value = null
  try {
    rows.value =
      ((await request({
        url: '/admin/marketplace/trades/pending-external',
        method: 'get',
        params: { limit: 100 }
      })) as PendingExternalTrade[]) || []
  } catch (e: unknown) {
    rows.value = []
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

const completeTrade = async (row: PendingExternalTrade) => {
  await ElMessageBox.confirm(`确认外部打款已完成？交易 ${row.id}`, '完成打款', { type: 'warning' })
  if (!(await promptAndArmAdminActionOtp('完成外部打款'))) return
  await request({
    url: `/admin/marketplace/trades/${row.id}/complete-external`,
    method: 'post'
  })
  ElMessage.success('已标记完成')
  await reload()
}

const failTrade = async (row: PendingExternalTrade) => {
  await ElMessageBox.confirm(
    `失败并退款买家、恢复挂牌？交易 ${row.id}`,
    '失败退款',
    { type: 'error' }
  )
  if (!(await promptAndArmAdminActionOtp('外部打款失败退款'))) return
  await request({
    url: `/admin/marketplace/trades/${row.id}/fail-external`,
    method: 'post'
  })
  ElMessage.success('已失败退款')
  await reload()
}

onMounted(() => void reload())
</script>

<template>
  <list-page-shell>
    <template #query>
      <p class="hint">
        PENDING_EXTERNAL 集市交易：外部打款（MoMo/ZaloPay）待确认。可手动完成或失败退款；超时由
        MarketplaceExternalPayoutWatchJob 自动失败。
      </p>
      <el-button type="primary" :loading="loading" @click="reload">刷新</el-button>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon class="section" />

    <el-table v-loading="loading" :data="rows" border stripe class="section">
      <el-table-column prop="id" label="交易ID" min-width="160" show-overflow-tooltip />
      <el-table-column prop="productName" label="赏品" min-width="120" show-overflow-tooltip />
      <el-table-column prop="price" label="价格" width="110">
        <template #default="{ row }">
          {{ formatAdminMoney(row.price) }}
        </template>
      </el-table-column>
      <el-table-column prop="sellerProceeds" label="卖家实收" width="120">
        <template #default="{ row }">
          {{ formatAdminMoney(row.sellerProceeds) }}
        </template>
      </el-table-column>
      <el-table-column prop="sellerId" label="卖家" min-width="120" show-overflow-tooltip />
      <el-table-column prop="buyerId" label="买家" min-width="120" show-overflow-tooltip />
      <el-table-column prop="editedTime" label="进入待打款时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="success" size="small" @click="completeTrade(row)">完成</el-button>
          <el-button type="danger" size="small" @click="failTrade(row)">失败退款</el-button>
        </template>
      </el-table-column>
    </el-table>
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
