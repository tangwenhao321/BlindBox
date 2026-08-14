<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/utils/api-instance'
import type { MysteryBoxDto, ProductDto, UserDto } from '@/apis/__generated/model/dto'
import {
  ADMIN_ACTION_GRANT_TOKEN,
  promptAndArmAdminActionOtp
} from '@/utils/admin-action-otp'

type AdminUser = UserDto['UserRepository/COMPLEX_FETCHER_FOR_ADMIN']
type AdminMysteryBox = MysteryBoxDto['MysteryBoxRepository/COMPLEX_FETCHER_FOR_ADMIN']
type AdminProduct = ProductDto['ProductRepository/COMPLEX_FETCHER_FOR_ADMIN']
type SelectOption = { id: string; label: string }

type WinRule = {
  id: string
  userId: string
  mysteryBoxId: string
  productId: string
  remainingCount: number
  enabled: boolean
  approved: boolean
  approvedById?: string
  approvedTime?: string
  remark: string
  createdTime?: string
}

type WinHitLog = {
  createdTime?: string
  ruleId?: string
  userId?: string
  mysteryBoxOrderId?: string
  mysteryBoxId?: string
  originalProductId?: string
  designatedProductId?: string
  remark?: string
}

type WinOpLog = {
  createdTime?: string
  ruleId?: string
  action?: string
  operatorId?: string
  detail?: string
}

const OTP_REQUIRED_HINT = '请先填写高危操作口令'

const isOtpRequiredError = (e: unknown): boolean => {
  if (e instanceof Error) return e.message.includes(OTP_REQUIRED_HINT)
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message?: unknown }).message || '').includes(OTP_REQUIRED_HINT)
  }
  return false
}

const isMessageBoxDismiss = (e: unknown): boolean => e === 'cancel' || e === 'close'

const loading = ref(false)
const logLoading = ref(false)
const opLogLoading = ref(false)
const submitting = ref(false)
const rules = ref<WinRule[]>([])
const hitLogs = ref<WinHitLog[]>([])
const opLogs = ref<WinOpLog[]>([])
const metrics = ref<Record<string, number>>({})
const logQuery = reactive({
  userId: '',
  mysteryBoxOrderId: '',
  startTime: '',
  endTime: ''
})
const opLogQuery = reactive({
  ruleId: '',
  action: '',
  operatorId: '',
  startTime: '',
  endTime: ''
})

const formatDateTime = (value: string) => {
  if (!value) return ''
  // Element Plus outputs "YYYY-MM-DD HH:mm:ss", backend expects ISO_LOCAL_DATE_TIME.
  return value.replace(' ', 'T')
}
const userOptions = ref<SelectOption[]>([])
const boxOptions = ref<SelectOption[]>([])
const productOptions = ref<SelectOption[]>([])

const form = reactive({
  userId: '',
  mysteryBoxId: '',
  productId: '',
  remainingCount: 1,
  remark: ''
})
const adminOtp = ref('')

const securedHeaders = () => {
  if (!adminOtp.value.trim()) {
    throw new Error(`${OTP_REQUIRED_HINT}，或点击「解锁 5 分钟」`)
  }
  return {
    'x-admin-action-otp': adminOtp.value.trim()
  }
}

const unlockHighRisk = async () => {
  if (!(await promptAndArmAdminActionOtp('解锁指定中奖高危操作'))) return
  adminOtp.value = ADMIN_ACTION_GRANT_TOKEN
  ElMessage.success('已解锁约 5 分钟（后续请求可使用 GRANT）')
}

const exportAuditCsv = async () => {
  try {
    const csv = await request({
      url: '/admin/mystery-box-win-rule/export-audit.csv?limit=500',
      method: 'get'
    })
    const text = typeof csv === 'string' ? csv : String(csv ?? '')
    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `win-rule-audit-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('审计 CSV 已下载')
  } catch {
    ElMessage.error('导出失败')
  }
}

const resetForm = () => {
  form.userId = ''
  form.mysteryBoxId = ''
  form.productId = ''
  form.remainingCount = 1
  form.remark = ''
  productOptions.value = []
}

const searchUsers = async (keyword: string) => {
  const res = await api.userForAdminController.query({
    body: {
      pageNum: 1,
      pageSize: 20,
      query: {
        phone: keyword || undefined,
        nickname: keyword || undefined
      }
    }
  })
  userOptions.value = (res.content || []).map((it: AdminUser) => ({
    id: it.id,
    label: `${it.nickname || '-'} (${it.phone || '-'})`
  }))
}

const searchBoxes = async (keyword: string) => {
  const res = await api.mysteryBoxForAdminController.query({
    body: {
      pageNum: 1,
      pageSize: 20,
      query: {
        name: keyword || undefined
      }
    }
  })
  boxOptions.value = (res.content || []).map((it: AdminMysteryBox) => ({
    id: it.id,
    label: `${it.name || '-'} (${it.id})`
  }))
}

const onBoxChange = async (boxId: string) => {
  form.productId = ''
  if (!boxId) {
    productOptions.value = []
    return
  }
  const detail = await api.mysteryBoxForAdminController.findById({ id: boxId })
  const products = detail.products || []
  productOptions.value = products.map((it) => ({
    id: it.id,
    label: `${it.name || '-'} (${it.id})`
  }))
}

const searchProducts = async (keyword: string) => {
  if (!form.mysteryBoxId) {
    const res = await api.productForAdminController.query({
      body: {
        pageNum: 1,
        pageSize: 20,
        query: {
          name: keyword || undefined
        }
      }
    })
    productOptions.value = (res.content || []).map((it: AdminProduct) => ({
      id: it.id,
      label: `${it.name || '-'} (${it.id})`
    }))
    return
  }
  const key = (keyword || '').trim().toLowerCase()
  if (!key) {
    await onBoxChange(form.mysteryBoxId)
    return
  }
  productOptions.value = productOptions.value.filter((it) => it.label.toLowerCase().includes(key))
}

const loadRules = async () => {
  loading.value = true
  try {
    const res = await request({
      url: '/admin/mystery-box-win-rule/query',
      method: 'get'
    })
    rules.value = Array.isArray(res) ? res : []
  } finally {
    loading.value = false
  }
}

const loadHitLogs = async () => {
  logLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('limit', '100')
    if (logQuery.userId) params.set('userId', logQuery.userId)
    if (logQuery.mysteryBoxOrderId) params.set('mysteryBoxOrderId', logQuery.mysteryBoxOrderId)
    if (logQuery.startTime) params.set('createdTimeStart', formatDateTime(logQuery.startTime))
    if (logQuery.endTime) params.set('createdTimeEnd', formatDateTime(logQuery.endTime))
    const res = await request({
      url: `/admin/mystery-box-win-rule/hit-log?${params.toString()}`,
      method: 'get'
    })
    hitLogs.value = Array.isArray(res) ? (res as WinHitLog[]) : []
  } finally {
    logLoading.value = false
  }
}

const loadOpLogs = async () => {
  opLogLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('limit', '100')
    if (opLogQuery.ruleId) params.set('ruleId', opLogQuery.ruleId)
    if (opLogQuery.action) params.set('action', opLogQuery.action)
    if (opLogQuery.operatorId) params.set('operatorId', opLogQuery.operatorId)
    if (opLogQuery.startTime) params.set('createdTimeStart', formatDateTime(opLogQuery.startTime))
    if (opLogQuery.endTime) params.set('createdTimeEnd', formatDateTime(opLogQuery.endTime))
    const res = await request({
      url: `/admin/mystery-box-win-rule/op-log?${params.toString()}`,
      method: 'get'
    })
    opLogs.value = Array.isArray(res) ? (res as WinOpLog[]) : []
  } finally {
    opLogLoading.value = false
  }
}

const loadMetrics = async () => {
  const res = await request({
    url: '/admin/mystery-box-win-rule/metrics',
    method: 'get'
  })
  metrics.value = (res as unknown as Record<string, number>) || {}
}

const resetLogQuery = async () => {
  logQuery.userId = ''
  logQuery.mysteryBoxOrderId = ''
  logQuery.startTime = ''
  logQuery.endTime = ''
  await loadHitLogs()
}

const resetOpLogQuery = async () => {
  opLogQuery.ruleId = ''
  opLogQuery.action = ''
  opLogQuery.operatorId = ''
  opLogQuery.startTime = ''
  opLogQuery.endTime = ''
  await loadOpLogs()
}

const createRule = async () => {
  if (!form.userId || !form.mysteryBoxId || !form.productId || form.remainingCount <= 0) {
    ElMessage.warning('请完整填写 userId / mysteryBoxId / productId 且次数大于 0')
    return
  }
  if (!form.remark.trim() || form.remark.trim().length < 8) {
    ElMessage.warning('合规披露备注至少 8 字（说明控奖用途与授权依据）')
    return
  }
  const userLabel = userOptions.value.find((it) => it.id === form.userId)?.label || form.userId
  const boxLabel =
    boxOptions.value.find((it) => it.id === form.mysteryBoxId)?.label || form.mysteryBoxId
  const productLabel =
    productOptions.value.find((it) => it.id === form.productId)?.label || form.productId
  await ElMessageBox.confirm(
    `请确认创建指定中奖规则（将改变抽赏结果，需合规披露）：\n\n用户：${userLabel}\n盲盒：${boxLabel}\n商品：${productLabel}\n生效次数：${form.remainingCount}\n备注：${form.remark.trim()}\n\n创建后为「待审批 / 停用」，审批通过后才会启用并生效。`,
    '确认创建规则',
    { type: 'warning', confirmButtonText: '确认创建', cancelButtonText: '取消' }
  )
  submitting.value = true
  try {
    await request({
      url: '/admin/mystery-box-win-rule/create',
      method: 'post',
      headers: securedHeaders(),
      data: {
        userId: form.userId,
        mysteryBoxId: form.mysteryBoxId,
        productId: form.productId,
        remainingCount: form.remainingCount,
        remark: form.remark
      }
    })
    ElMessage.success('规则已创建（待审批，审批后才会启用）')
    resetForm()
    await Promise.all([loadRules(), loadOpLogs()])
  } catch (e: unknown) {
    if (isOtpRequiredError(e)) {
      ElMessage.warning(OTP_REQUIRED_HINT)
    }
  } finally {
    submitting.value = false
  }
}

const toggleEnabled = async (row: WinRule) => {
  if (!row.approved) {
    ElMessage.warning('规则尚未审批，不能启用；请先点击「审批」')
    return
  }
  try {
    await request({
      url: `/admin/mystery-box-win-rule/${row.id}/enable?enabled=${!row.enabled}`,
      method: 'post',
      headers: securedHeaders()
    })
    ElMessage.success('状态更新成功')
    await Promise.all([loadRules(), loadOpLogs()])
  } catch (e: unknown) {
    if (isOtpRequiredError(e)) {
      ElMessage.warning(OTP_REQUIRED_HINT)
    }
  }
}

const approveRule = async (row: WinRule) => {
  try {
    await ElMessageBox.confirm(
      `审批通过后规则将自动启用并可能改变抽赏结果。\n\n规则ID：${row.id}\n用户：${row.userId}\n备注：${row.remark || '-'}`,
      '确认审批启用',
      { type: 'warning', confirmButtonText: '审批并启用', cancelButtonText: '取消' }
    )
    await request({
      url: `/admin/mystery-box-win-rule/${row.id}/approve`,
      method: 'post',
      headers: securedHeaders()
    })
    ElMessage.success('规则已审批并启用')
    await Promise.all([loadRules(), loadOpLogs()])
  } catch (e: unknown) {
    if (isMessageBoxDismiss(e)) return
    if (isOtpRequiredError(e)) {
      ElMessage.warning(OTP_REQUIRED_HINT)
    }
  }
}

const deleteRule = async (row: WinRule) => {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确认继续？', '提示', { type: 'warning' })
    await request({
      url: `/admin/mystery-box-win-rule/${row.id}`,
      method: 'delete',
      headers: securedHeaders()
    })
    ElMessage.success('删除成功')
    await Promise.all([loadRules(), loadOpLogs()])
  } catch (e: unknown) {
    if (isMessageBoxDismiss(e)) return
    if (isOtpRequiredError(e)) {
      ElMessage.warning(OTP_REQUIRED_HINT)
    }
  }
}

onMounted(async () => {
  try {
    await Promise.all([searchUsers(''), searchBoxes('')])
    await Promise.all([loadRules(), loadHitLogs(), loadOpLogs(), loadMetrics()])
  } catch {
    /* 规则面板加载失败不影响订单列表 */
  }
})
</script>

<template>
  <div class="win-rule-panel">
    <div class="panel-title">指定中奖规则</div>
    <el-form :inline="true" class="rule-form">
      <el-form-item label="用户">
        <el-select
          v-model="form.userId"
          filterable
          remote
          clearable
          placeholder="搜索手机号/昵称"
          :remote-method="searchUsers"
          style="width: 260px"
        >
          <el-option
            v-for="item in userOptions"
            :key="item.id"
            :label="item.label"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="盲盒">
        <el-select
          v-model="form.mysteryBoxId"
          filterable
          remote
          clearable
          placeholder="搜索盲盒名称"
          :remote-method="searchBoxes"
          style="width: 260px"
          @change="onBoxChange"
        >
          <el-option
            v-for="item in boxOptions"
            :key="item.id"
            :label="item.label"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="商品">
        <el-select
          v-model="form.productId"
          filterable
          remote
          clearable
          placeholder="先选盲盒再选商品"
          :remote-method="searchProducts"
          style="width: 280px"
        >
          <el-option
            v-for="item in productOptions"
            :key="item.id"
            :label="item.label"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="次数">
        <el-input-number v-model="form.remainingCount" :min="1" :max="9999" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="必填：合规披露备注（≥8字）" clearable />
      </el-form-item>
      <el-form-item label="管理口令">
        <el-input
          v-model="adminOtp"
          placeholder="高危操作口令 / GRANT"
          show-password
          clearable
          style="width: 180px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="warning" @click="unlockHighRisk">解锁 5 分钟</el-button>
        <el-button type="primary" :loading="submitting" @click="createRule">新增规则</el-button>
        <el-button @click="loadRules">刷新</el-button>
        <el-button @click="loadHitLogs">刷新命中记录</el-button>
        <el-button @click="loadOpLogs">刷新操作日志</el-button>
        <el-button @click="loadMetrics">刷新指标</el-button>
        <el-button @click="exportAuditCsv">导出审计 CSV</el-button>
      </el-form-item>
    </el-form>
    <el-alert
      title="合规流程：新建规则默认为「待审批 / 停用」→ 审批通过后自动启用；未审批不能启用。生产默认 app.fairness.allow-win-rule-override=false；备注≥8字；操作/命中日志可筛选查询并可导出 CSV。"
      type="warning"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    />

    <el-table v-loading="loading" :data="rules" border>
      <el-table-column prop="id" label="规则ID" min-width="220" />
      <el-table-column prop="userId" label="用户ID" min-width="180" />
      <el-table-column prop="mysteryBoxId" label="盲盒ID" min-width="180" />
      <el-table-column prop="productId" label="商品ID" min-width="180" />
      <el-table-column prop="remainingCount" label="剩余次数" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审批" width="200">
        <template #default="{ row }">
          <el-tag :type="row.approved ? 'success' : 'warning'">
            {{ row.approved ? '已审批' : '待审批' }}
          </el-tag>
          <div v-if="row.approved && (row.approvedById || row.approvedTime)" class="approve-meta">
            {{ row.approvedById || '-' }}
            <span v-if="row.approvedTime"> · {{ row.approvedTime }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="140" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button v-if="!row.approved" link type="success" @click="approveRule(row)"
            >审批并启用</el-button
          >
          <el-button
            link
            type="primary"
            :disabled="!row.approved"
            :title="row.approved ? '' : '须先审批'"
            @click="toggleEnabled(row)"
          >
            {{ row.enabled ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="deleteRule(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="panel-title" style="margin-top: 18px">运营指标</div>
    <el-descriptions :column="4" border>
      <el-descriptions-item v-for="(value, key) in metrics" :key="key" :label="key">
        {{ value }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="panel-title" style="margin-top: 18px">命中记录（最近 100 条）</div>
    <el-form :inline="true" class="rule-form">
      <el-form-item label="用户ID">
        <el-input
          v-model="logQuery.userId"
          clearable
          placeholder="按用户ID筛选"
          style="width: 180px"
        />
      </el-form-item>
      <el-form-item label="订单ID">
        <el-input
          v-model="logQuery.mysteryBoxOrderId"
          clearable
          placeholder="按订单ID筛选"
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item label="开始时间">
        <el-date-picker
          v-model="logQuery.startTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
          placeholder="开始时间"
          clearable
          style="width: 220px"
        />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker
          v-model="logQuery.endTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
          placeholder="结束时间"
          clearable
          style="width: 220px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadHitLogs">查询</el-button>
        <el-button @click="resetLogQuery">重置</el-button>
      </el-form-item>
    </el-form>
    <el-table v-loading="logLoading" :data="hitLogs" border>
      <el-table-column prop="createdTime" label="命中时间" min-width="170" />
      <el-table-column prop="ruleId" label="规则ID" min-width="180" />
      <el-table-column prop="userId" label="用户ID" min-width="160" />
      <el-table-column prop="mysteryBoxOrderId" label="订单ID" min-width="180" />
      <el-table-column prop="mysteryBoxId" label="盲盒ID" min-width="160" />
      <el-table-column prop="originalProductId" label="原商品ID" min-width="160" />
      <el-table-column prop="designatedProductId" label="指定商品ID" min-width="160" />
      <el-table-column prop="remark" label="备注" min-width="120" />
    </el-table>

    <div class="panel-title" style="margin-top: 18px">规则操作日志（最近 100 条）</div>
    <el-form :inline="true" class="rule-form">
      <el-form-item label="规则ID">
        <el-input
          v-model="opLogQuery.ruleId"
          clearable
          placeholder="按规则ID筛选"
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item label="动作">
        <el-select
          v-model="opLogQuery.action"
          clearable
          placeholder="动作"
          style="width: 160px"
        >
          <el-option label="CREATE_PENDING" value="CREATE_PENDING" />
          <el-option label="APPROVE" value="APPROVE" />
          <el-option label="ENABLE" value="ENABLE" />
          <el-option label="DISABLE" value="DISABLE" />
          <el-option label="DELETE" value="DELETE" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作人">
        <el-input
          v-model="opLogQuery.operatorId"
          clearable
          placeholder="操作人ID"
          style="width: 160px"
        />
      </el-form-item>
      <el-form-item label="开始时间">
        <el-date-picker
          v-model="opLogQuery.startTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
          placeholder="开始时间"
          clearable
          style="width: 220px"
        />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker
          v-model="opLogQuery.endTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
          placeholder="结束时间"
          clearable
          style="width: 220px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadOpLogs">查询</el-button>
        <el-button @click="resetOpLogQuery">重置</el-button>
      </el-form-item>
    </el-form>
    <el-table v-loading="opLogLoading" :data="opLogs" border>
      <el-table-column prop="createdTime" label="时间" min-width="170" />
      <el-table-column prop="ruleId" label="规则ID" min-width="180" />
      <el-table-column prop="action" label="动作" min-width="120" />
      <el-table-column prop="operatorId" label="操作人" min-width="160" />
      <el-table-column prop="detail" label="详情" min-width="180" />
    </el-table>
  </div>
</template>

<style scoped lang="scss">
.win-rule-panel {
  margin-top: 20px;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.panel-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.rule-form {
  margin-bottom: 12px;
}

.approve-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.3;
  word-break: break-all;
}
</style>
