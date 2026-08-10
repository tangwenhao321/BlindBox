<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { request } from '@/utils/request'

const loading = ref(false)
const campaigns = ref<any[]>([])
const segments = ref<any[]>([])
const messageTasks = ref<any[]>([])
const tickets = ref<any[]>([])
const jobRuns = ref<any[]>([])
const auditEntries = ref<any[]>([])
const funnel = ref<any | null>(null)
const funnelError = ref<string | null>(null)
const analyticsPanelError = ref<string | null>(null)
const analyticsEvents = ref<any[]>([])
const trendPoints = ref<any[]>([])
const topEvents = ref<any[]>([])
const retention = ref<any | null>(null)
const paymentHealth = ref<any | null>(null)
const lowStockAlerts = ref<any[]>([])
const lowStockThreshold = ref(5)
const eventFilter = ref('')
const guestOnly = ref(false)
const windowMinutes = ref<number | ''>(60)
const autoRefresh = ref(true)
const refreshSeconds = ref(20)
const payAlertThreshold = ref(35)
const payFailAlertThreshold = ref(25)
const traceActor = ref('')
const traceEventName = ref('')
const traceBoxId = ref('')
const traceEvents = ref<any[]>([])
const traceLoading = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const forms = reactive({
  campaignName: '',
  segmentName: '',
  segmentRule: '{"vip":true}',
  templateName: '',
  segmentId: '',
  ticketTitle: '',
  ticketContent: ''
})

const reload = async () => {
  loading.value = true
  funnelError.value = null
  try {
    const [cRes, sRes, mRes, tRes, jRes, aRes] = await Promise.all([
      request({ url: '/admin/ops/campaigns', method: 'get' }),
      request({ url: '/admin/ops/segments', method: 'get' }),
      request({ url: '/admin/ops/message-tasks', method: 'get' }),
      request({ url: '/admin/ops/tickets', method: 'get' }),
      request({ url: '/admin/ops/jobs/recent?limit=20', method: 'get' }),
      request({ url: '/admin/ops/audit/latest?limit=15', method: 'get' })
    ])
    campaigns.value = (cRes as unknown as any[]) || []
    segments.value = (sRes as unknown as any[]) || []
    messageTasks.value = (mRes as unknown as any[]) || []
    tickets.value = (tRes as unknown as any[]) || []
    jobRuns.value = (jRes as unknown as any[]) || []
    auditEntries.value = (aRes as unknown as any[]) || []
    const query = windowMinutes.value ? `?recentMinutes=${windowMinutes.value}` : ''
    try {
      funnel.value = await request({ url: `/admin/ops/analytics/funnel${query}`, method: 'get' })
    } catch (error: any) {
      funnel.value = null
      funnelError.value = error?.message || '漏斗数据加载失败'
    }
    try {
      trendPoints.value =
        ((await request({
          url: `/admin/ops/analytics/trend${query}`,
          method: 'get'
        })) as unknown as any[]) || []
      topEvents.value =
        ((await request({
          url: `/admin/ops/analytics/top?limit=10${
            windowMinutes.value ? `&recentMinutes=${windowMinutes.value}` : ''
          }`,
          method: 'get'
        })) as unknown as any[]) || []
      retention.value = (await request({
        url: '/admin/ops/analytics/retention',
        method: 'get'
      })) as any
      paymentHealth.value = (await request({
        url: `/admin/ops/payment/health${query}`,
        method: 'get'
      })) as any
      analyticsEvents.value =
        ((await request({
          url: `/admin/ops/analytics/events?limit=200${
            windowMinutes.value ? `&recentMinutes=${windowMinutes.value}` : ''
          }`,
          method: 'get'
        })) as unknown as any[]) || []
    } catch (error: any) {
      analyticsPanelError.value = error?.message || '分析面板数据加载失败'
    }
    lowStockAlerts.value =
      ((await request({
        url: `/admin/mystery-box/low-stock-alerts?threshold=${lowStockThreshold.value}`,
        method: 'get'
      })) as unknown as any[]) || []
  } finally {
    loading.value = false
  }
}
const filteredAnalyticsEvents = computed(() => {
  const keyword = eventFilter.value.trim().toLowerCase()
  let list = analyticsEvents.value
  if (guestOnly.value) {
    list = list.filter((item) => String(item?.actorId || '').startsWith('guest:'))
  }
  if (!keyword) return list
  return list.filter((item) => {
    const name = String(item?.name || '').toLowerCase()
    const payload = JSON.stringify(item?.payload || {}).toLowerCase()
    return name.includes(keyword) || payload.includes(keyword)
  })
})
const funnelSteps = computed(() => {
  if (!funnel.value) return []
  const f = funnel.value
  return [
    { label: '曝光', value: Number(f.exposure || 0), color: '#8b5cf6' },
    { label: '点击', value: Number(f.clicks || 0), color: '#6366f1' },
    { label: '下单', value: Number(f.createOrder || 0), color: '#3b82f6' },
    { label: '去支付', value: Number(f.pay || 0), color: '#10b981' },
    { label: '分享', value: Number(f.share || 0), color: '#f59e0b' },
    { label: '支付失败', value: Number(f.paymentFail || 0), color: '#ef4444' },
    { label: '支付取消', value: Number(f.paymentCancel || 0), color: '#94a3b8' }
  ]
})
const funnelBarMax = computed(() => Math.max(1, ...funnelSteps.value.map((s) => s.value)))
const trendMax = computed(() =>
  Math.max(1, ...trendPoints.value.map((p) => Number(p.count || 0)), 1)
)
const topMax = computed(() => Math.max(1, ...topEvents.value.map((p) => Number(p.count || 0)), 1))
const funnelRate = computed(() => {
  const data = funnel.value
  if (!data) return { clickRate: 0, orderRate: 0, payRate: 0, shareRate: 0, paymentFailRate: 0 }
  const exposure = Math.max(1, Number(data.exposure || 0))
  const clicks = Math.max(1, Number(data.clicks || 0))
  const createOrder = Math.max(1, Number(data.createOrder || 0))
  const pay = Math.max(1, Number(data.pay || 0))
  const paymentFail = Number(data.paymentFail || 0)
  const paymentCancel = Number(data.paymentCancel || 0)
  const payAttempts = Math.max(1, Number(data.pay || 0) + paymentFail + paymentCancel)
  return {
    clickRate: Math.round((Number(data.clicks || 0) / exposure) * 100),
    orderRate: Math.round((Number(data.createOrder || 0) / clicks) * 100),
    payRate: Math.round((Number(data.pay || 0) / createOrder) * 100),
    shareRate: Math.round((Number(data.share || 0) / pay) * 100),
    paymentFailRate: Math.round((paymentFail / payAttempts) * 100)
  }
})
const payRateWarning = computed(() => funnelRate.value.payRate < payAlertThreshold.value)
const payFailRateWarning = computed(
  () => funnelRate.value.paymentFailRate > payFailAlertThreshold.value
)

const loadTrace = async () => {
  const raw = traceActor.value.trim()
  if (!raw) return
  traceLoading.value = true
  try {
    const params = new URLSearchParams({
      actor: raw,
      limit: '80'
    })
    if (windowMinutes.value) params.set('recentMinutes', String(windowMinutes.value))
    if (traceEventName.value.trim()) params.set('eventName', traceEventName.value.trim())
    if (traceBoxId.value.trim()) params.set('boxId', traceBoxId.value.trim())
    traceEvents.value =
      ((await request({
        url: `/admin/ops/analytics/trace?${params.toString()}`,
        method: 'get'
      })) as unknown as any[]) || []
  } finally {
    traceLoading.value = false
  }
}
const exportTraceCsv = () => {
  const rows = [['at', 'name', 'actorId', 'payload']]
  traceEvents.value.forEach((item) => {
    rows.push([
      String(item?.at || ''),
      String(item?.name || ''),
      String(item?.actorId || ''),
      JSON.stringify(item?.payload || {})
    ])
  })
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `analytics-trace-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const exportCsv = () => {
  const rows = [['at', 'name', 'actorId', 'payload']]
  filteredAnalyticsEvents.value.forEach((item) => {
    rows.push([
      String(item?.at || ''),
      String(item?.name || ''),
      String(item?.actorId || ''),
      JSON.stringify(item?.payload || {})
    ])
  })
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analytics-events-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const setupAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (!autoRefresh.value) {
    return
  }
  const nextSeconds = Math.max(5, Number(refreshSeconds.value || 20))
  refreshTimer = setInterval(() => {
    reload()
  }, nextSeconds * 1000)
}

const createCampaign = async () => {
  await request({
    url: '/admin/ops/campaigns',
    method: 'post',
    data: { name: forms.campaignName || '新活动' }
  })
  forms.campaignName = ''
  await reload()
}

const createSegment = async () => {
  await request({
    url: '/admin/ops/segments',
    method: 'post',
    data: { name: forms.segmentName || '新分群', rule: forms.segmentRule || '{}' }
  })
  forms.segmentName = ''
  await reload()
}

const createMessageTask = async () => {
  await request({
    url: '/admin/ops/message-tasks',
    method: 'post',
    data: { templateName: forms.templateName || '默认模板', segmentId: forms.segmentId }
  })
  forms.templateName = ''
  await reload()
}

const runTask = async (taskId: string) => {
  await request({ url: `/admin/ops/message-tasks/${taskId}/run`, method: 'post' })
  await reload()
}

const createTicket = async () => {
  await request({
    url: '/admin/ops/tickets',
    method: 'post',
    data: { title: forms.ticketTitle || '客服工单', content: forms.ticketContent || '' }
  })
  forms.ticketTitle = ''
  forms.ticketContent = ''
  await reload()
}

const closeTicket = async (ticketId: string) => {
  await request({
    url: `/admin/ops/tickets/${ticketId}/status`,
    method: 'post',
    data: { status: 'CLOSED' }
  })
  await reload()
}

onMounted(reload)
watch([autoRefresh, refreshSeconds], setupAutoRefresh, { immediate: true })
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<template>
  <el-space direction="vertical" style="width: 100%" :size="16">
    <el-card>
      <template #header>活动编排 / 用户分层</template>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
        title="营销类消息任务（消息模板、分群触达等）会尊重用户通知偏好中的 marketingEnabled；关闭营销通知的用户不会收到此类推送。"
      />
      <el-row :gutter="12">
        <el-col :span="8">
          <el-input v-model="forms.campaignName" placeholder="活动名"></el-input>
          <el-button type="primary" style="margin-top: 8px" @click="createCampaign"
            >创建活动</el-button
          >
          <el-table :data="campaigns" v-loading="loading" size="small" style="margin-top: 8px">
            <el-table-column prop="name" label="活动"></el-table-column>
            <el-table-column prop="status" label="状态" width="120"></el-table-column>
          </el-table>
        </el-col>
        <el-col :span="8">
          <el-input v-model="forms.segmentName" placeholder="分群名"></el-input>
          <el-input
            v-model="forms.segmentRule"
            style="margin-top: 8px"
            placeholder="规则JSON"
          ></el-input>
          <el-button type="primary" style="margin-top: 8px" @click="createSegment"
            >创建分群</el-button
          >
          <el-table :data="segments" v-loading="loading" size="small" style="margin-top: 8px">
            <el-table-column prop="name" label="分群"></el-table-column>
          </el-table>
        </el-col>
        <el-col :span="8">
          <el-input v-model="forms.templateName" placeholder="消息模板名"></el-input>
          <el-input
            v-model="forms.segmentId"
            style="margin-top: 8px"
            placeholder="目标分群ID"
          ></el-input>
          <el-button type="primary" style="margin-top: 8px" @click="createMessageTask"
            >创建消息任务</el-button
          >
          <el-table :data="messageTasks" v-loading="loading" size="small" style="margin-top: 8px">
            <el-table-column prop="templateName" label="模板"></el-table-column>
            <el-table-column prop="status" label="状态" width="90"></el-table-column>
            <el-table-column label="执行" width="90">
              <template #default="{ row }">
                <el-button size="small" @click="runTask(row.id)">运行</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <el-card>
      <template #header>经营指标（留存）</template>
      <el-row :gutter="12" v-if="retention">
        <el-col :span="4"><el-statistic title="DAU" :value="retention.dau || 0" /></el-col>
        <el-col :span="4"><el-statistic title="WAU" :value="retention.wau || 0" /></el-col>
        <el-col :span="4"><el-statistic title="MAU" :value="retention.mau || 0" /></el-col>
        <el-col :span="6"
          ><el-statistic title="D1回访用户" :value="retention.day1RetainedUsers || 0"
        /></el-col>
        <el-col :span="6"
          ><el-tag size="large" type="success"
            >D1留存率 {{ retention.day1RetentionRate || 0 }}%</el-tag
          ></el-col
        >
      </el-row>
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>支付健康度</span>
          <el-tag
            v-if="paymentHealth"
            :type="(paymentHealth.successRate || 0) >= 85 ? 'success' : 'warning'"
            size="small"
          >
            {{ paymentHealth.successRate || 0 }}% 成功率
          </el-tag>
        </div>
      </template>
      <el-row :gutter="12" v-if="paymentHealth">
        <el-col :span="4"
          ><el-statistic title="尝试次数" :value="paymentHealth.attempts || 0"
        /></el-col>
        <el-col :span="4"
          ><el-statistic title="成功次数" :value="paymentHealth.success || 0"
        /></el-col>
        <el-col :span="4"
          ><el-statistic title="失败次数" :value="paymentHealth.fail || 0"
        /></el-col>
        <el-col :span="6">
          <el-tag
            :type="(paymentHealth.successRate || 0) >= 85 ? 'success' : 'danger'"
            size="large"
          >
            成功率 {{ paymentHealth.successRate || 0 }}%
          </el-tag>
        </el-col>
        <el-col :span="6">统计窗口 {{ paymentHealth.windowMinutes || 0 }} 分钟</el-col>
      </el-row>
      <el-table :data="paymentHealth?.failReasons || []" size="small" style="margin-top: 10px">
        <el-table-column prop="reason" label="失败原因" />
        <el-table-column prop="count" label="次数" width="120" />
      </el-table>
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>转化漏斗（埋点看板）</span>
          <el-space>
            <el-switch v-model="autoRefresh" active-text="自动刷新" inactive-text="手动刷新" />
            <el-input-number v-model="refreshSeconds" :min="5" :max="120" :step="5" />
            <el-select v-model="windowMinutes" style="width: 140px" @change="reload">
              <el-option :value="15" label="最近15分钟" />
              <el-option :value="60" label="最近1小时" />
              <el-option :value="360" label="最近6小时" />
              <el-option :value="1440" label="最近24小时" />
              <el-option :value="''" label="全部时间" />
            </el-select>
            <el-input-number v-model="payAlertThreshold" :min="1" :max="100" :step="1" />
            <el-button @click="reload">刷新</el-button>
          </el-space>
        </div>
      </template>
      <el-alert
        v-if="funnelError"
        type="error"
        :closable="false"
        show-icon
        style="margin-bottom: 10px"
        :title="funnelError"
      />
      <div v-if="funnelSteps.length" style="margin-bottom: 14px">
        <div style="margin-bottom: 8px; font-weight: 700">漏斗示意（相对曝光）</div>
        <div
          v-for="step in funnelSteps"
          :key="step.label"
          style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px"
        >
          <div style="width: 56px; font-size: 12px; color: #555">{{ step.label }}</div>
          <div
            style="flex: 1; background: #f1f5f9; border-radius: 8px; height: 22px; overflow: hidden"
          >
            <div
              :style="{
                width: `${Math.round((step.value / funnelBarMax) * 100)}%`,
                height: '22px',
                background: step.color,
                minWidth: step.value > 0 ? '4px' : '0'
              }"
            />
          </div>
          <div style="width: 48px; text-align: right; font-weight: 700; font-size: 13px">
            {{ step.value }}
          </div>
        </div>
      </div>
      <el-row :gutter="12" v-if="funnel">
        <el-col :span="4"><el-statistic title="曝光" :value="funnel.exposure || 0" /></el-col>
        <el-col :span="4"><el-statistic title="点击" :value="funnel.clicks || 0" /></el-col>
        <el-col :span="4"><el-statistic title="下单" :value="funnel.createOrder || 0" /></el-col>
        <el-col :span="4"><el-statistic title="去支付" :value="funnel.pay || 0" /></el-col>
        <el-col :span="4"><el-statistic title="分享" :value="funnel.share || 0" /></el-col>
        <el-col :span="4"><el-statistic title="总事件" :value="funnel.totalEvents || 0" /></el-col>
      </el-row>
      <el-row :gutter="12" style="margin-top: 8px" v-if="funnel">
        <el-col :span="6"
          ><el-statistic title="支付失败" :value="funnel.paymentFail || 0"
        /></el-col>
        <el-col :span="6"
          ><el-statistic title="支付取消" :value="funnel.paymentCancel || 0"
        /></el-col>
        <el-col :span="6"
          ><el-statistic title="微信发起支付" :value="funnel.payWechatRequested || 0"
        /></el-col>
        <el-col :span="6"
          ><el-statistic title="VNPay 发起支付" :value="funnel.payVnpayRequested || 0"
        /></el-col>
      </el-row>
      <el-row :gutter="12" style="margin-top: 8px" v-if="funnel">
        <el-col :span="6"
          ><el-tag type="info">点击率 {{ funnelRate.clickRate }}%</el-tag></el-col
        >
        <el-col :span="6"
          ><el-tag type="warning">下单转化 {{ funnelRate.orderRate }}%</el-tag></el-col
        >
        <el-col :span="6"
          ><el-tag :type="payRateWarning ? 'danger' : 'success'"
            >支付转化 {{ funnelRate.payRate }}%</el-tag
          ></el-col
        >
        <el-col :span="6"
          ><el-tag>分享率 {{ funnelRate.shareRate }}%</el-tag></el-col
        >
        <el-col :span="6">
          <el-tag :type="payFailRateWarning ? 'danger' : 'success'"
            >支付失败率 {{ funnelRate.paymentFailRate }}%</el-tag
          >
        </el-col>
      </el-row>
      <el-row :gutter="12" style="margin-top: 8px" v-if="funnel">
        <el-col :span="8">
          <el-statistic title="游客事件" :value="funnel.guestEventCount || 0" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="游客设备（去重）" :value="funnel.guestUniqueDevices || 0" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="登录用户（去重）" :value="funnel.registeredUniqueActors || 0" />
        </el-col>
      </el-row>
      <el-alert
        v-if="payRateWarning"
        type="warning"
        :closable="false"
        show-icon
        style="margin-top: 10px"
        :title="`支付转化率 ${funnelRate.payRate}% 低于告警阈值 ${payAlertThreshold}%`"
      />
      <el-alert
        v-if="payFailRateWarning"
        type="error"
        :closable="false"
        show-icon
        style="margin-top: 10px"
        :title="`支付失败率 ${funnelRate.paymentFailRate}% 高于告警阈值 ${payFailAlertThreshold}%`"
      />
    </el-card>

    <el-card>
      <template #header>事件趋势（按小时）与 Top 事件</template>
      <el-alert
        v-if="analyticsPanelError"
        type="error"
        :closable="false"
        show-icon
        style="margin-bottom: 10px"
        :title="analyticsPanelError"
      />
      <el-row :gutter="12">
        <el-col :span="12">
          <div style="margin-bottom: 8px; font-weight: 700">小时趋势图（简化）</div>
          <div
            v-for="item in trendPoints"
            :key="item.hour"
            style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px"
          >
            <div style="width: 90px; color: #666; font-size: 12px">{{ item.hour }}</div>
            <div
              style="
                flex: 1;
                background: #eef2ff;
                border-radius: 6px;
                height: 10px;
                overflow: hidden;
              "
            >
              <div
                :style="{
                  width: `${Math.round((item.count / trendMax) * 100)}%`,
                  height: '10px',
                  background: '#6c5ce7'
                }"
              ></div>
            </div>
            <div style="width: 40px; text-align: right; font-size: 12px">{{ item.count }}</div>
          </div>
          <el-table :data="trendPoints" size="small" max-height="260">
            <el-table-column prop="hour" label="小时" width="160" />
            <el-table-column prop="count" label="事件数" />
          </el-table>
        </el-col>
        <el-col :span="12">
          <div style="margin-bottom: 8px; font-weight: 700">Top事件占比（简化）</div>
          <div
            v-for="item in topEvents"
            :key="item.name"
            style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px"
          >
            <div
              style="
                width: 180px;
                color: #666;
                font-size: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              "
            >
              {{ item.name }}
            </div>
            <div
              style="
                flex: 1;
                background: #ecfdf5;
                border-radius: 6px;
                height: 10px;
                overflow: hidden;
              "
            >
              <div
                :style="{
                  width: `${Math.round((item.count / topMax) * 100)}%`,
                  height: '10px',
                  background: '#10b981'
                }"
              ></div>
            </div>
            <div style="width: 40px; text-align: right; font-size: 12px">{{ item.count }}</div>
          </div>
          <el-table :data="topEvents" size="small" max-height="260">
            <el-table-column prop="name" label="事件名" />
            <el-table-column prop="count" label="次数" width="120" />
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>用户/设备事件下钻</span>
          <el-space wrap>
            <el-input
              v-model="traceActor"
              placeholder="用户ID 或 deviceId"
              style="width: 200px"
              clearable
            />
            <el-input
              v-model="traceEventName"
              placeholder="事件名（可选）"
              style="width: 160px"
              clearable
            />
            <el-input
              v-model="traceBoxId"
              placeholder="boxId（可选）"
              style="width: 160px"
              clearable
            />
            <el-button type="primary" :loading="traceLoading" @click="loadTrace"
              >查询轨迹</el-button
            >
            <el-button plain :disabled="!traceEvents.length" @click="exportTraceCsv">
              导出轨迹 CSV
            </el-button>
          </el-space>
        </div>
      </template>
      <el-table v-if="traceEvents.length" :data="traceEvents" size="small" stripe max-height="240">
        <el-table-column prop="at" label="时间" width="180" />
        <el-table-column prop="name" label="事件" width="180" />
        <el-table-column prop="actorId" label="actor" width="140" show-overflow-tooltip />
        <el-table-column label="payload">
          <template #default="{ row }">
            <pre style="margin: 0; white-space: pre-wrap">{{
              JSON.stringify(row.payload || {}, null, 0)
            }}</pre>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="输入用户ID或 deviceId 后查询" />
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>埋点事件明细</span>
          <el-space>
            <el-input
              v-model="eventFilter"
              placeholder="按事件名/字段筛选"
              style="width: 260px"
              clearable
            />
            <el-button type="primary" plain @click="exportCsv">导出 CSV</el-button>
          </el-space>
        </div>
      </template>
      <el-table :data="filteredAnalyticsEvents" v-loading="loading" stripe height="320">
        <el-table-column prop="at" label="时间" width="200" />
        <el-table-column prop="name" label="事件名" width="200" />
        <el-table-column prop="actorId" label="用户/设备" width="160" show-overflow-tooltip />
        <el-table-column label="payload">
          <template #default="{ row }">
            <pre style="margin: 0; white-space: pre-wrap">{{
              JSON.stringify(row.payload || {}, null, 0)
            }}</pre>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>低库存预警</span>
          <el-space>
            <span style="font-size: 12px; color: #666">余量 ≤</span>
            <el-input-number v-model="lowStockThreshold" :min="1" :max="50" size="small" />
            <el-button size="small" @click="reload">刷新</el-button>
          </el-space>
        </div>
      </template>
      <el-table
        :data="lowStockAlerts"
        v-loading="loading"
        stripe
        max-height="240"
        empty-text="暂无低库存赏品"
      >
        <el-table-column prop="boxName" label="盲盒" min-width="140" />
        <el-table-column prop="productName" label="赏品" min-width="140" />
        <el-table-column prop="stockRemaining" label="剩余" width="80" />
        <el-table-column prop="stockTotal" label="总量" width="80" />
      </el-table>
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>定时任务运行记录</span>
          <el-space>
            <el-tag type="info" size="small">最近 {{ jobRuns.length }} 条</el-tag>
            <el-button size="small" @click="reload">刷新</el-button>
          </el-space>
        </div>
      </template>
      <el-table
        :data="jobRuns"
        v-loading="loading"
        stripe
        max-height="280"
        empty-text="暂无任务运行记录"
      >
        <el-table-column prop="job_name" label="任务" min-width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="
                row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'info'
              "
              size="small"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration_ms" label="耗时(ms)" width="100" />
        <el-table-column prop="started_at" label="开始时间" width="180" />
        <el-table-column prop="finished_at" label="结束时间" width="180" />
        <el-table-column prop="message" label="消息" min-width="160" show-overflow-tooltip />
      </el-table>
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>审计记录</span>
          <el-space>
            <router-link to="/moderation-workbench">
              <el-button link type="primary">内容审核工作台</el-button>
            </router-link>
            <el-button size="small" @click="reload">刷新</el-button>
          </el-space>
        </div>
      </template>
      <el-table
        :data="auditEntries"
        v-loading="loading"
        stripe
        max-height="240"
        empty-text="暂无审计记录"
      >
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="action" label="动作" min-width="160" show-overflow-tooltip />
        <el-table-column prop="actorId" label="操作人" width="120" show-overflow-tooltip />
        <el-table-column prop="objectType" label="对象类型" width="100" />
        <el-table-column prop="objectId" label="对象ID" min-width="120" show-overflow-tooltip />
        <el-table-column prop="traceId" label="traceId" min-width="120" show-overflow-tooltip />
      </el-table>
    </el-card>

    <el-card>
      <template #header>客服工单</template>
      <el-row :gutter="12">
        <el-col :span="10">
          <el-input v-model="forms.ticketTitle" placeholder="工单标题"></el-input>
        </el-col>
        <el-col :span="10">
          <el-input v-model="forms.ticketContent" placeholder="工单内容"></el-input>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="createTicket">创建工单</el-button>
        </el-col>
      </el-row>
      <el-table :data="tickets" v-loading="loading" stripe style="margin-top: 10px">
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" width="220" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'CLOSED'"
              size="small"
              type="warning"
              @click="closeTicket(row.id)"
            >
              关闭
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </el-space>
</template>
