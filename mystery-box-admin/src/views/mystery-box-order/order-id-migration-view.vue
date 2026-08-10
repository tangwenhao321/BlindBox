<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'

const CONFIRM_TOKEN = 'REWRITE_ORDER_IDS'

type AuditView = {
  totalOrders: number
  snowflakeOrders: number
  legacyOrders: number
  mappedLegacyOrders: number
  sampleLegacyIds: string[]
}

type TableImpact = { table: string; column: string; rows: number }

type PkRewritePlan = {
  legacyId: string
  currentId: string
  impacts: TableImpact[]
  totalRows: number
}

type PkRewriteResult = {
  legacyId: string
  currentId: string
  tablesUpdated: number
  rowsUpdated: number
}

type MigrationLogEntry = {
  id: number
  legacyId: string
  currentId: string
  rowsUpdated: number
  operatorId?: string
  createdTime?: string
}

type PreflightView = {
  legacyMapTableReady: boolean
  migrationLogTableReady: boolean
  warehouseIndexesReady: boolean
  ready: boolean
  missingObjects: string[]
}

const loading = ref(false)
const audit = ref<AuditView | null>(null)
const preflight = ref<PreflightView | null>(null)
const pendingIds = ref<string[]>([])
const dryRunPlans = ref<PkRewritePlan[]>([])
const lastResults = ref<PkRewriteResult[]>([])
const migrationLog = ref<MigrationLogEntry[]>([])

const form = reactive({
  prepareBatchSize: 100,
  dryRunBatchSize: 20,
  applyBatchSize: 10,
  manualLegacyId: '',
  manualCurrentId: ''
})

const loadAudit = async () => {
  audit.value = (await request({
    url: '/admin/order-id-migration/audit',
    method: 'get',
    params: { sampleSize: 20 }
  })) as AuditView
}

const loadPending = async () => {
  pendingIds.value =
    ((await request({
      url: '/admin/order-id-migration/pending',
      method: 'get',
      params: { limit: 50 }
    })) as string[]) || []
}

const loadMigrationLog = async () => {
  migrationLog.value =
    ((await request({
      url: '/admin/order-id-migration/rewrite/log',
      method: 'get',
      params: { limit: 30 }
    })) as MigrationLogEntry[]) || []
}

const loadPreflight = async () => {
  preflight.value = (await request({
    url: '/admin/order-id-migration/preflight',
    method: 'get'
  })) as PreflightView
}

const reload = async () => {
  loading.value = true
  try {
    await Promise.all([loadAudit(), loadPending(), loadMigrationLog(), loadPreflight()])
  } finally {
    loading.value = false
  }
}

const prepareMappings = async () => {
  loading.value = true
  try {
    const res = (await request({
      url: '/admin/order-id-migration/prepare-mappings',
      method: 'post',
      params: { batchSize: form.prepareBatchSize }
    })) as { created: number }
    ElMessage.success(`已生成 ${res.created} 条 snowflake 映射`)
    await reload()
  } finally {
    loading.value = false
  }
}

const registerManualMapping = async () => {
  if (!form.manualLegacyId.trim() || !form.manualCurrentId.trim()) {
    ElMessage.warning('请填写 legacyId 与 currentId')
    return
  }
  loading.value = true
  try {
    await request({
      url: '/admin/order-id-migration/mapping',
      method: 'post',
      data: {
        legacyId: form.manualLegacyId.trim(),
        currentId: form.manualCurrentId.trim()
      }
    })
    ElMessage.success('映射已保存')
    form.manualLegacyId = ''
    form.manualCurrentId = ''
    await reload()
  } finally {
    loading.value = false
  }
}

const runDryRun = async () => {
  loading.value = true
  try {
    dryRunPlans.value =
      ((await request({
        url: '/admin/order-id-migration/rewrite/dry-run',
        method: 'get',
        params: { batchSize: form.dryRunBatchSize }
      })) as PkRewritePlan[]) || []
    ElMessage.success(`dry-run 完成，共 ${dryRunPlans.value.length} 笔待改写`)
  } finally {
    loading.value = false
  }
}

const applyBatch = async () => {
  await ElMessageBox.confirm(
    `将改写最多 ${form.applyBatchSize} 笔订单主键，操作不可逆。请确认已在 staging 验证 dry-run 结果。`,
    '确认执行 Step 2 改写',
    {
      type: 'warning',
      confirmButtonText: '确认改写',
      cancelButtonText: '取消',
      inputPlaceholder: `请输入 ${CONFIRM_TOKEN}`,
      showInput: true,
      inputValidator: (value) => value === CONFIRM_TOKEN || `请输入 ${CONFIRM_TOKEN}`
    }
  )
  loading.value = true
  try {
    lastResults.value =
      ((await request({
        url: '/admin/order-id-migration/rewrite/batch',
        method: 'post',
        params: { batchSize: form.applyBatchSize, confirm: CONFIRM_TOKEN }
      })) as PkRewriteResult[]) || []
    ElMessage.success(`已改写 ${lastResults.value.length} 笔订单`)
    dryRunPlans.value = []
    await reload()
  } finally {
    loading.value = false
  }
}

const applyOne = async (legacyId: string) => {
  await ElMessageBox.confirm(
    `将改写订单 ${legacyId} 的主键，操作不可逆。`,
    '确认单笔改写',
    {
      type: 'warning',
      confirmButtonText: '确认改写',
      cancelButtonText: '取消',
      inputPlaceholder: `请输入 ${CONFIRM_TOKEN}`,
      showInput: true,
      inputValidator: (value) => value === CONFIRM_TOKEN || `请输入 ${CONFIRM_TOKEN}`
    }
  )
  loading.value = true
  try {
    const result = (await request({
      url: `/admin/order-id-migration/rewrite/${encodeURIComponent(legacyId)}`,
      method: 'post',
      params: { confirm: CONFIRM_TOKEN }
    })) as PkRewriteResult
    lastResults.value = [result, ...lastResults.value].slice(0, 20)
    dryRunPlans.value = dryRunPlans.value.filter((plan) => plan.legacyId !== legacyId)
    ElMessage.success(`已改写 ${legacyId} → ${result.currentId}`)
    await reload()
  } finally {
    loading.value = false
  }
}

const dryRunOne = async (legacyId: string) => {
  loading.value = true
  try {
    const plan = (await request({
      url: `/admin/order-id-migration/rewrite/dry-run/${encodeURIComponent(legacyId)}`,
      method: 'get'
    })) as PkRewritePlan
    dryRunPlans.value = [plan, ...dryRunPlans.value.filter((item) => item.legacyId !== legacyId)]
    ElMessage.success(`已预览 ${legacyId}`)
  } finally {
    loading.value = false
  }
}

const mappingProgress = computed(() => {
  if (!audit.value || audit.value.legacyOrders <= 0) return 0
  return Math.min(100, Math.round((audit.value.mappedLegacyOrders / audit.value.legacyOrders) * 100))
})

const copyAuditSummary = async () => {
  if (!audit.value) {
    ElMessage.warning('暂无审计数据')
    return
  }
  const summary = {
    ...audit.value,
    pendingRewrite: pendingIds.value.length,
    capturedAt: new Date().toISOString()
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(summary, null, 2))
    ElMessage.success('审计摘要已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const exportAuditCsv = () => {
  if (!audit.value) {
    ElMessage.warning('暂无审计数据')
    return
  }
  const rows = [
    ['metric', 'value'],
    ['totalOrders', String(audit.value.totalOrders)],
    ['snowflakeOrders', String(audit.value.snowflakeOrders)],
    ['legacyOrders', String(audit.value.legacyOrders)],
    ['mappedLegacyOrders', String(audit.value.mappedLegacyOrders)],
    ['pendingRewrite', String(pendingIds.value.length)],
    ['capturedAt', new Date().toISOString()]
  ]
  const csv = rows.map((row) => row.join(',')).join('\n')
  downloadTextFile(`order-id-audit-${Date.now()}.csv`, csv)
  ElMessage.success('审计 CSV 已下载')
}

const exportDryRunCsv = () => {
  if (!dryRunPlans.value.length) {
    ElMessage.warning('请先执行 dry-run')
    return
  }
  const header = ['legacyId', 'currentId', 'totalRows', 'impacts']
  const lines = dryRunPlans.value.map((plan) =>
    [
      plan.legacyId,
      plan.currentId,
      String(plan.totalRows),
      plan.impacts.map((item) => `${item.table}.${item.column}×${item.rows}`).join(';')
    ].join(',')
  )
  downloadTextFile(`order-id-dry-run-${Date.now()}.csv`, [header.join(','), ...lines].join('\n'))
  ElMessage.success('Dry-run CSV 已下载')
}

onMounted(() => void reload())
</script>

<template>
  <list-page-shell>
    <template #query>
      <p class="hint">
        订单 ID 迁移：Step 1 生成 legacy→snowflake 映射；Step 2 dry-run 后执行主键改写。生产环境请先备份数据库。
        部署前确认 Flyway 已执行：V20260550_01（legacy_map）、V20260551_01（菜单）、V20260551_02（仓库索引）、V20260552_01（改写审计）。
        Staging 可用脚本：<code>backend/scripts/staging-order-id-migration.ps1</code>（需 ADMIN_TOKEN）。
      </p>
      <div class="toolbar">
        <el-button type="primary" :loading="loading" @click="reload">刷新</el-button>
        <el-input-number v-model="form.prepareBatchSize" :min="1" :max="500" />
        <el-button :loading="loading" @click="prepareMappings">Step 1：生成映射</el-button>
        <el-input-number v-model="form.dryRunBatchSize" :min="1" :max="100" />
        <el-button :loading="loading" @click="runDryRun">Dry-run 预览</el-button>
        <el-input-number v-model="form.applyBatchSize" :min="1" :max="50" />
        <el-button type="danger" :loading="loading" @click="applyBatch">Step 2：批量改写</el-button>
      </div>
    </template>

    <el-alert
      v-if="preflight"
      :title="preflight.ready ? '迁移前置检查通过' : '迁移前置检查未通过'"
      :type="preflight.ready ? 'success' : 'warning'"
      show-icon
      class="section"
    >
      <p v-if="preflight.ready">legacy_map、migration_log、仓库索引均已就绪，可执行 Step 1 / dry-run。</p>
      <ul v-else class="preflight-missing">
        <li v-for="item in preflight.missingObjects" :key="item">{{ item }}</li>
      </ul>
    </el-alert>

    <el-row :gutter="16" class="section">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>审计概览</span>
              <div class="header-actions">
                <el-button size="small" :disabled="!audit" @click="copyAuditSummary">复制 JSON</el-button>
                <el-button size="small" :disabled="!audit" @click="exportAuditCsv">导出 CSV</el-button>
              </div>
            </div>
          </template>
          <el-descriptions v-if="audit" :column="2" border size="small">
            <el-descriptions-item label="订单总数">{{ audit.totalOrders }}</el-descriptions-item>
            <el-descriptions-item label="Snowflake">{{ audit.snowflakeOrders }}</el-descriptions-item>
            <el-descriptions-item label="Legacy">{{ audit.legacyOrders }}</el-descriptions-item>
            <el-descriptions-item label="已映射">{{ audit.mappedLegacyOrders }}</el-descriptions-item>
            <el-descriptions-item label="待改写">{{ pendingIds.length }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="audit && audit.legacyOrders > 0" class="progress-block">
            <span class="sub-hint">Step 1 映射进度（已映射 / Legacy）</span>
            <el-progress :percentage="mappingProgress" :stroke-width="10" />
          </div>
          <p v-if="audit?.sampleLegacyIds?.length" class="sub-hint">Legacy 样例：{{ audit.sampleLegacyIds.join(', ') }}</p>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>手动映射</template>
          <div class="toolbar vertical">
            <el-input v-model="form.manualLegacyId" placeholder="legacyId" />
            <el-input v-model="form.manualCurrentId" placeholder="currentId (snowflake)" />
            <el-button :loading="loading" @click="registerManualMapping">保存映射</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="section">
      <template #header>待改写 legacyId（{{ pendingIds.length }}）</template>
      <div v-for="id in pendingIds" :key="id" class="pending-row">
        <el-tag class="tag">{{ id }}</el-tag>
        <el-button size="small" :loading="loading" @click="dryRunOne(id)">Dry-run</el-button>
        <el-button size="small" type="danger" :loading="loading" @click="applyOne(id)">改写</el-button>
      </div>
      <p v-if="!pendingIds.length" class="sub-hint">暂无待改写项</p>
    </el-card>

    <el-card v-if="dryRunPlans.length" shadow="never" class="section">
      <template #header>
        <div class="card-header">
          <span>Dry-run 影响预览</span>
          <el-button size="small" @click="exportDryRunCsv">导出 CSV</el-button>
        </div>
      </template>
      <el-table :data="dryRunPlans" border stripe size="small">
        <el-table-column prop="legacyId" label="Legacy ID" min-width="180" />
        <el-table-column prop="currentId" label="目标 Snowflake" min-width="180" />
        <el-table-column prop="totalRows" label="影响行数" width="100" />
        <el-table-column label="明细" min-width="280">
          <template #default="{ row }">
            <span v-for="item in row.impacts" :key="item.table + item.column" class="impact">
              {{ item.table }}.{{ item.column }}×{{ item.rows }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="danger" :loading="loading" @click="applyOne(row.legacyId)">
              改写
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="migrationLog.length" shadow="never" class="section">
      <template #header>改写审计日志（最近 {{ migrationLog.length }} 条）</template>
      <el-table :data="migrationLog" border stripe size="small">
        <el-table-column prop="legacyId" label="Legacy ID" min-width="160" />
        <el-table-column prop="currentId" label="新 ID" min-width="160" />
        <el-table-column prop="rowsUpdated" label="行数" width="80" />
        <el-table-column prop="operatorId" label="操作人" width="120" />
        <el-table-column prop="createdTime" label="时间" min-width="180" />
      </el-table>
    </el-card>

    <el-card v-if="lastResults.length" shadow="never" class="section">
      <template #header>最近改写结果</template>
      <el-table :data="lastResults" border stripe size="small">
        <el-table-column prop="legacyId" label="Legacy ID" min-width="180" />
        <el-table-column prop="currentId" label="新 ID" min-width="180" />
        <el-table-column prop="tablesUpdated" label="表数" width="80" />
        <el-table-column prop="rowsUpdated" label="行数" width="80" />
      </el-table>
    </el-card>
  </list-page-shell>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}
.sub-hint {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 12px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.toolbar.vertical {
  flex-direction: column;
  align-items: stretch;
}
.section {
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.progress-block {
  margin-top: 12px;
}
.tag {
  margin: 0 8px 8px 0;
}
.pending-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.impact {
  display: inline-block;
  margin-right: 8px;
  font-size: 12px;
  color: #475569;
}
</style>
