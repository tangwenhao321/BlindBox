<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { request } from '@/utils/request'
import { formatAdminMoney } from '@/utils/format-money'

type ShipRow = {
  id: string
  userId: string
  status: string
  itemCount: number
  payAmount: number
  deliveryFee: number
  trackingNumber?: string
  carrierCode?: string
  rejectReason?: string
  addressSnapshot?: string
  createdTime?: string
  userNickname?: string
  userPhone?: string
}

type ShipDetail = {
  request: ShipRow
  items: { productName: string; source: string; orderId: string }[]
}

const CARRIERS = [
  { label: '自动识别', value: 'auto' },
  { label: '圆通', value: 'yuantong' },
  { label: '中通', value: 'zhongtong' },
  { label: '顺丰', value: 'shunfeng' },
  { label: '韵达', value: 'yunda' },
  { label: '申通', value: 'shentong' },
  { label: '极兔', value: 'jtexpress' },
  { label: '京东', value: 'jd' },
  { label: '邮政 EMS', value: 'ems' }
]

const loading = ref(false)
const rows = ref<ShipRow[]>([])
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('PENDING')
const detailVisible = ref(false)
const detail = ref<ShipDetail | null>(null)
const shipVisible = ref(false)
const shipTarget = ref<ShipRow | null>(null)
const shipTracking = ref('')
const shipCarrier = ref('auto')

const load = async () => {
  loading.value = true
  try {
    const res = (await request({
      url: '/admin/warehouse-ship-request/query',
      method: 'post',
      data: {
        pageNum: pageNum.value,
        pageSize: pageSize.value,
        status: statusFilter.value || null
      }
    })) as { content?: ShipRow[]; totalElements?: number }
    rows.value = res.content ?? []
    total.value = res.totalElements ?? rows.value.length
  } finally {
    loading.value = false
  }
}

const openDetail = async (row: ShipRow) => {
  detail.value = (await request({
    url: `/admin/warehouse-ship-request/${row.id}`,
    method: 'get'
  })) as ShipDetail
  detailVisible.value = true
}

const openShip = (row: ShipRow) => {
  shipTarget.value = row
  shipTracking.value = row.trackingNumber ?? ''
  shipCarrier.value = row.carrierCode ?? 'auto'
  shipVisible.value = true
}

const confirmShip = async () => {
  if (!shipTarget.value) return
  const tracking = shipTracking.value.trim()
  if (!tracking) {
    ElMessage.warning('请填写物流单号')
    return
  }
  await request({
    url: `/admin/warehouse-ship-request/${shipTarget.value.id}/ship`,
    method: 'post',
    data: { trackingNumber: tracking, carrierCode: shipCarrier.value || 'auto' }
  })
  ElMessage.success('已发货并同步订单物流')
  shipVisible.value = false
  detailVisible.value = false
  await load()
}

const reject = async (row: ShipRow) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回申请', {
    confirmButtonText: '驳回并退款',
    cancelButtonText: '取消'
  }).catch(() => ({ value: null }))
  if (value == null) return
  await request({
    url: `/admin/warehouse-ship-request/${row.id}/reject`,
    method: 'post',
    data: { reason: value }
  })
  ElMessage.success('已驳回，运费已退回用户余额')
  detailVisible.value = false
  await load()
}

const statusLabel = (s: string) => {
  if (s === 'PENDING') return '待处理'
  if (s === 'SHIPPED') return '已发货'
  if (s === 'REJECTED') return '已驳回'
  if (s === 'CANCELLED') return '已取消'
  return s
}

const carrierLabel = (code?: string) => {
  if (!code || code === 'auto') return '自动'
  return CARRIERS.find((c) => c.value === code)?.label ?? code
}

onMounted(() => void load())
</script>

<template>
  <list-page-shell>
    <template #query>
      <div style="display: flex; gap: 12px; align-items: center">
        <el-select v-model="statusFilter" style="width: 140px" @change="load">
          <el-option label="待处理" value="PENDING" />
          <el-option label="已发货" value="SHIPPED" />
          <el-option label="已驳回" value="REJECTED" />
          <el-option label="已取消" value="CANCELLED" />
          <el-option label="全部" value="" />
        </el-select>
        <el-button type="primary" @click="load">刷新</el-button>
      </div>
    </template>
    <template #table>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="申请号" min-width="160" show-overflow-tooltip />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            {{ row.userNickname || row.userPhone || row.userId?.slice(0, 8) }}
          </template>
        </el-table-column>
        <el-table-column prop="itemCount" label="件数" width="70" />
        <el-table-column prop="payAmount" label="运费" width="110">
          <template #default="{ row }">
            {{ formatAdminMoney(row.payAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">{{ statusLabel(row.status) }}</template>
        </el-table-column>
        <el-table-column label="承运商" width="90">
          <template #default="{ row }">{{ carrierLabel(row.carrierCode) }}</template>
        </el-table-column>
        <el-table-column
          prop="trackingNumber"
          label="物流单号"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="rejectReason"
          label="驳回原因"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column prop="createdTime" label="申请时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">明细</el-button>
            <el-button v-if="row.status === 'PENDING'" link type="success" @click="openShip(row)">
              发货
            </el-button>
            <el-button v-if="row.status === 'PENDING'" link type="danger" @click="reject(row)">
              驳回
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px"
        @current-change="load"
      />
    </template>
  </list-page-shell>

  <el-dialog v-model="detailVisible" title="发货申请明细" width="560px">
    <template v-if="detail">
      <p><strong>地址：</strong>{{ detail.request.addressSnapshot }}</p>
      <p><strong>运费：</strong>{{ formatAdminMoney(detail.request.payAmount) }}</p>
      <p v-if="detail.request.rejectReason">
        <strong>驳回原因：</strong>{{ detail.request.rejectReason }}
      </p>
      <el-table :data="detail.items" size="small" border>
        <el-table-column prop="productName" label="赏品" />
        <el-table-column prop="source" label="来源" width="100" />
        <el-table-column prop="orderId" label="订单" min-width="120" show-overflow-tooltip />
      </el-table>
      <div v-if="detail.request.status === 'PENDING'" style="margin-top: 16px; text-align: right">
        <el-button type="primary" @click="openShip(detail.request)">填写单号并发货</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="shipVisible" title="确认发货" width="420px">
    <el-form label-width="88px">
      <el-form-item label="承运商">
        <el-select v-model="shipCarrier" style="width: 100%">
          <el-option
            v-for="item in CARRIERS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="物流单号">
        <el-input v-model="shipTracking" placeholder="请输入快递单号" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="shipVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmShip">确认发货</el-button>
    </template>
  </el-dialog>
</template>
