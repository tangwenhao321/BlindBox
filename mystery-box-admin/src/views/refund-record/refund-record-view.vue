<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { request } from '@/utils/request'

type RefundRow = {
  id: string
  orderId: string
  reason: string
  amount: number
  statusKey?: string
  statusName?: string
  payTypeKey?: string
  payTypeName?: string
  refundId?: string
  createdTime?: string
  creatorNickname?: string
  creatorPhone?: string
}

const loading = ref(false)
const rows = ref<RefundRow[]>([])
const adminOtp = ref('')
const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)

const load = async () => {
  loading.value = true
  try {
    const res = (await request({
      url: '/admin/refund-record/query-enriched',
      method: 'post',
      data: { pageNum: pageNum.value, pageSize: pageSize.value, query: {} }
    })) as { content?: RefundRow[]; totalElements?: number }
    rows.value = res.content ?? []
    total.value = res.totalElements ?? rows.value.length
  } finally {
    loading.value = false
  }
}

const approve = async (row: RefundRow) => {
  if (!adminOtp.value.trim()) {
    ElMessage.warning('请先填写高危操作口令')
    return
  }
  await request({
    url: `/admin/refund-record/${row.id}/approve`,
    method: 'post',
    headers: { 'x-admin-action-otp': adminOtp.value.trim() }
  })
  ElMessage.success(row.payTypeKey === 'VN_PAY' ? '已通过：VNPay 退款已发起' : '已通过：模拟/未配微信时退回用户余额')
  await load()
}

const reject = async (row: RefundRow) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回退款', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).catch(() => ({ value: null }))
  if (value == null) return
  await request({
    url: `/admin/refund-record/${row.id}/reject`,
    method: 'post',
    data: { reason: value }
  })
  ElMessage.success('已驳回')
  await load()
}

onMounted(() => void load())
</script>

<template>
  <list-page-shell>
    <template #query>
      <el-space>
        <el-input
          v-model="adminOtp"
          placeholder="高危操作口令（审批必填）"
          show-password
          clearable
          style="width: 220px"
        />
      </el-space>
    </template>
    <template #table>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="orderId" label="订单号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="reason" label="退款原因" min-width="140" show-overflow-tooltip />
        <el-table-column prop="amount" label="金额" width="100" />
        <el-table-column label="支付渠道" width="120">
          <template #default="{ row }">
            <el-tag :type="row.payTypeKey === 'VN_PAY' ? 'success' : 'info'" size="small">
              {{ row.payTypeName || row.payTypeKey || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            {{ row.statusName || row.statusKey || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="refundId" label="退款单号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="createdTime" label="申请时间" width="170" />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            {{ row.creatorNickname || row.creatorPhone || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="approve(row)">通过</el-button>
            <el-button link type="danger" @click="reject(row)">驳回</el-button>
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
</template>
