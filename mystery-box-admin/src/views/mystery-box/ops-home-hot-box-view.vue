<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank, View } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { api } from '@/utils/api-instance'
import ImageUpload from '@/components/image/image-upload.vue'
import { extractApiErrorMessage } from '@/utils/api-error'
import { resolveMediaUrl } from '@/utils/media-url'

const MAX_HOT_BOX = 6
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewSummary = ref<{
  todayDrawCount: number
  todayLegendaryCount: number
  hotBoxes: Array<{
    id: string
    name: string
    cover: string
    poolRemaining: number
    drawCount7d: number
  }>
} | null>(null)

type HotBoxRow = {
  id: string
  mystery_box_id: string
  box_name: string | null
  box_cover: string | null
  sort_order: number
  enabled: number
  created_time: string
}

type BoxOption = { id: string; name: string; cover?: string | null }

const rows = ref<HotBoxRow[]>([])
const boxOptions = ref<BoxOption[]>([])
const loading = ref(false)
const togglingId = ref<string | null>(null)
const updatingCoverId = ref<string | null>(null)
const sortDialogVisible = ref(false)
const sortDraft = ref<HotBoxRow[]>([])
const dragFromIndex = ref<number | null>(null)
const form = reactive({
  mysteryBoxId: '',
  cover: '',
  enabled: true
})

const sortedRows = computed(() =>
  [...rows.value].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_time.localeCompare(b.created_time)
  )
)

const atMaxHotBox = computed(() => sortedRows.value.length >= MAX_HOT_BOX)

const rowIndex = (id: string) => sortedRows.value.findIndex((r) => r.id === id)

const isRowEnabled = (row: HotBoxRow) => Number(row.enabled) === 1

const loadBoxes = async () => {
  const page = await api.mysteryBoxForAdminController.query({
    body: { pageNum: 1, pageSize: 500, query: {} }
  })
  boxOptions.value = (page.content || []).map((b) => ({
    id: b.id,
    name: b.name,
    cover: b.cover
  }))
}

const syncCoverFromSelectedBox = () => {
  const hit = boxOptions.value.find((b) => b.id === form.mysteryBoxId)
  form.cover = hit?.cover || ''
}

watch(
  () => form.mysteryBoxId,
  () => syncCoverFromSelectedBox()
)

const normalizeRow = (row: HotBoxRow): HotBoxRow => ({
  ...row,
  sort_order: Number(row.sort_order ?? 0),
  enabled: Number(row.enabled ?? 0) === 1 ? 1 : 0
})

const load = async () => {
  loading.value = true
  try {
    const data = (await request({ url: '/admin/ops-home-hot-box', method: 'get' })) as HotBoxRow[]
    rows.value = data.map(normalizeRow)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.mysteryBoxId = ''
  form.cover = ''
  form.enabled = true
}

const save = async () => {
  if (atMaxHotBox.value) {
    ElMessage.warning(`首页热盒最多 ${MAX_HOT_BOX} 个`)
    return
  }
  if (!form.mysteryBoxId) {
    ElMessage.warning('请选择盲盒')
    return
  }
  if (!form.cover) {
    ElMessage.warning('请上传封面')
    return
  }
  try {
    await request({
      url: '/admin/ops-home-hot-box/save',
      method: 'post',
      data: {
        mysteryBoxId: form.mysteryBoxId,
        cover: form.cover || null,
        enabled: form.enabled,
        sortOrder: 0
      }
    })
    ElMessage.success('已保存')
    resetForm()
    await Promise.all([loadBoxes(), load()])
  } catch (err) {
    ElMessage.error(extractApiErrorMessage(err, '保存失败'))
  }
}

const updateCover = async (row: HotBoxRow, cover: string) => {
  if (!cover || cover === row.box_cover) {
    return
  }
  const prev = row.box_cover
  row.box_cover = cover
  updatingCoverId.value = row.id
  try {
    await request({
      url: `/admin/ops-home-hot-box/${encodeURIComponent(row.id)}/cover`,
      method: 'post',
      data: { cover }
    })
    ElMessage.success('封面已更新')
  } catch (err) {
    row.box_cover = prev
    ElMessage.error(extractApiErrorMessage(err, '封面更新失败'))
  } finally {
    updatingCoverId.value = null
  }
}

const toggleEnabled = async (row: HotBoxRow, enabled: boolean) => {
  const prev = row.enabled
  row.enabled = enabled ? 1 : 0
  togglingId.value = row.id
  try {
    await request({
      url: `/admin/ops-home-hot-box/${encodeURIComponent(row.id)}/enabled`,
      method: 'post',
      params: { enabled }
    })
    ElMessage.success(enabled ? '已启用，首页将展示' : '已停用，首页不再展示')
  } catch (err) {
    row.enabled = prev
    ElMessage.error(extractApiErrorMessage(err, '操作失败'))
  } finally {
    togglingId.value = null
  }
}

const remove = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除该热盒配置？', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await request({ url: `/admin/ops-home-hot-box/${id}`, method: 'delete' })
    ElMessage.success('已删除')
    await load()
  } catch (err) {
    ElMessage.error(extractApiErrorMessage(err, '删除失败'))
  }
}

const moveRow = async (row: HotBoxRow, direction: 'up' | 'down') => {
  const idx = rowIndex(row.id)
  if (direction === 'up' && idx <= 0) {
    return
  }
  if (direction === 'down' && (idx < 0 || idx >= sortedRows.value.length - 1)) {
    return
  }
  try {
    await request({
      url: `/admin/ops-home-hot-box/${encodeURIComponent(row.id)}/move`,
      method: 'post',
      params: { direction }
    })
    ElMessage.success(direction === 'up' ? '已上移' : '已下移')
    await load()
  } catch (err) {
    ElMessage.error(extractApiErrorMessage(err, '排序失败'))
  }
}

const openSortDialog = () => {
  sortDraft.value = sortedRows.value.map((r) => ({ ...r }))
  sortDialogVisible.value = true
}

const onDragStart = (index: number) => {
  dragFromIndex.value = index
}

const onDrop = (toIndex: number) => {
  const from = dragFromIndex.value
  dragFromIndex.value = null
  if (from === null || from === toIndex) {
    return
  }
  const list = [...sortDraft.value]
  const [item] = list.splice(from, 1)
  list.splice(toIndex, 0, item)
  sortDraft.value = list
}

const applySort = async () => {
  try {
    await request({
      url: '/admin/ops-home-hot-box/reorder',
      method: 'post',
      data: { ids: sortDraft.value.map((r) => r.id) }
    })
    ElMessage.success('排序已保存')
    sortDialogVisible.value = false
    await load()
  } catch (err) {
    ElMessage.error(extractApiErrorMessage(err, '保存排序失败'))
  }
}

const previewFront = async () => {
  previewVisible.value = true
  previewLoading.value = true
  try {
    previewSummary.value = (await request({
      url: '/front/home/summary',
      method: 'get'
    })) as typeof previewSummary.value
  } catch (err) {
    previewVisible.value = false
    ElMessage.error(extractApiErrorMessage(err, '加载首页预览失败'))
  } finally {
    previewLoading.value = false
  }
}

const repairAllCoverUrls = async () => {
  try {
    const count = (await request({
      url: '/admin/ops-home-hot-box/repair-cover-urls',
      method: 'post'
    })) as number
    ElMessage.success(`已修复 ${count} 条封面地址`)
    await load()
  } catch (err) {
    ElMessage.error(extractApiErrorMessage(err, '修复失败'))
  }
}

const resetRowCover = async (row: HotBoxRow) => {
  try {
    await request({
      url: `/admin/ops-home-hot-box/${encodeURIComponent(row.id)}/reset-cover`,
      method: 'post'
    })
    ElMessage.success('已恢复盲盒封面')
    await load()
  } catch (err) {
    ElMessage.error(extractApiErrorMessage(err, '恢复封面失败'))
  }
}

onMounted(async () => {
  resetForm()
  await loadBoxes()
  await load()
})
</script>

<template>
  <div class="surface-card page">
    <div class="page-head">
      <div>
        <h2>首页热盒配置</h2>
        <p class="hint">
          配置 App 首页「本周热盒」轮播（最多 {{ MAX_HOT_BOX }} 个）；仅「启用」项会出现在前台
          home/summary。
        </p>
      </div>
      <div class="head-actions">
        <el-button :icon="View" @click="previewFront">预览首页数据</el-button>
        <el-button @click="repairAllCoverUrls">修复封面 URL</el-button>
        <el-button :icon="Rank" :disabled="sortedRows.length < 2" @click="openSortDialog">
          拖拽排序
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="sortedRows"
      row-key="id"
      border
      style="width: 100%; margin-bottom: 16px"
    >
      <el-table-column prop="sort_order" label="序号" width="70" />
      <el-table-column label="封面" width="100">
        <template #default="{ row }">
          <div class="cover-cell" :class="{ 'is-uploading': updatingCoverId === row.id }">
            <image-upload
              :model-value="row.box_cover || ''"
              :size="56"
              @update:model-value="(url: string) => updateCover(row, url)"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="box_name" label="盲盒名称" min-width="160" />
      <el-table-column label="启用" width="90" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="isRowEnabled(row)"
            :loading="togglingId === row.id"
            @change="(val: boolean) => toggleEnabled(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :disabled="rowIndex(row.id) <= 0"
            @click="moveRow(row, 'up')"
          >
            上移
          </el-button>
          <el-button
            link
            type="primary"
            :disabled="rowIndex(row.id) < 0 || rowIndex(row.id) >= sortedRows.length - 1"
            @click="moveRow(row, 'down')"
          >
            下移
          </el-button>
          <el-button link type="primary" @click="resetRowCover(row)">恢复封面</el-button>
          <el-button link type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <h3 class="section-title">新增热盒</h3>
    <el-alert
      v-if="atMaxHotBox"
      type="warning"
      :closable="false"
      show-icon
      title="已达上限，请删除或停用后再新增"
      style="margin-bottom: 12px; max-width: 720px"
    />
    <el-form label-width="100px" class="form-grid">
      <el-form-item label="盲盒">
        <el-select
          v-model="form.mysteryBoxId"
          filterable
          placeholder="选择盲盒"
          style="width: 100%"
          :disabled="atMaxHotBox"
          @change="syncCoverFromSelectedBox"
        >
          <el-option v-for="b in boxOptions" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="封面">
        <image-upload v-model="form.cover" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" :disabled="atMaxHotBox" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :disabled="atMaxHotBox" @click="save">保存</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>

    <el-dialog v-model="previewVisible" title="App 首页热盒预览" width="640px">
      <div v-loading="previewLoading">
        <p v-if="previewSummary" class="hint">
          今日抽赏 {{ previewSummary.todayDrawCount }} 次 · 传说
          {{ previewSummary.todayLegendaryCount }} 次
        </p>
        <el-empty
          v-if="!previewLoading && !previewSummary?.hotBoxes?.length"
          description="暂无启用热盒"
        />
        <div v-else class="preview-grid">
          <div v-for="box in previewSummary?.hotBoxes ?? []" :key="box.id" class="preview-card">
            <el-image
              v-if="box.cover"
              :src="resolveMediaUrl(box.cover)"
              fit="cover"
              lazy
              class="preview-cover"
            />
            <div v-else class="preview-cover preview-cover--empty">无封面</div>
            <div class="preview-name">{{ box.name }}</div>
            <div class="preview-meta">
              余量 {{ box.poolRemaining }} · 7日 {{ box.drawCount7d }} 抽
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="sortDialogVisible" title="拖拽调整热盒顺序" width="480px">
      <p class="hint dialog-hint">拖动条目后点击「保存排序」。</p>
      <ul class="sort-list">
        <li
          v-for="(row, index) in sortDraft"
          :key="row.id"
          class="sort-item"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover.prevent
          @drop="onDrop(index)"
        >
          <span class="sort-handle">⋮⋮</span>
          <span>{{ row.box_name || row.mystery_box_id }}</span>
        </li>
      </ul>
      <template #footer>
        <el-button @click="sortDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applySort">保存排序</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  padding: 20px;
}
.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.page-head h2 {
  margin: 0 0 4px;
}
.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hint {
  color: #64748b;
  margin: 0;
}
.dialog-hint {
  margin-bottom: 12px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px;
}
.form-grid {
  max-width: 720px;
}
.cover-cell {
  display: inline-flex;
  line-height: 0;
}
.cover-cell :deep(.image-uploader) {
  vertical-align: top;
}
.cover-cell.is-uploading {
  opacity: 0.6;
  pointer-events: none;
}
.sort-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.sort-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  cursor: grab;
  background: var(--el-fill-color-blank);
}
.sort-item:active {
  cursor: grabbing;
}
.sort-handle {
  color: #94a3b8;
  user-select: none;
}
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.preview-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}
.preview-cover {
  width: 100%;
  height: 88px;
  display: block;
}
.preview-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #94a3b8;
  background: #f1f5f9;
}
.preview-name {
  padding: 6px 8px 0;
  font-size: 13px;
  font-weight: 600;
}
.preview-meta {
  padding: 2px 8px 8px;
  font-size: 11px;
  color: #64748b;
}
</style>
