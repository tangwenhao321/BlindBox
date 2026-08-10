<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { api } from '@/utils/api-instance'

type ActivityRow = {
  id: string
  title: string
  banner: string | null
  subtitle: string | null
  end_time: string
  box_ids: string
  enabled: number
  sort_order: number
  view_count?: number
}

type BoxOption = { id: string; name: string }

const rows = ref<ActivityRow[]>([])
const boxOptions = ref<BoxOption[]>([])
const loading = ref(false)
const form = reactive({
  id: '',
  title: '',
  banner: '',
  subtitle: '',
  endTime: '',
  boxIds: [] as string[],
  enabled: true,
  sortOrder: 0
})

const parseBoxIds = (raw: string) => {
  try {
    return JSON.parse(raw || '[]') as string[]
  } catch {
    return []
  }
}

const loadBoxes = async () => {
  const page = await api.mysteryBoxForAdminController.query({
    body: { pageNum: 1, pageSize: 500, query: {} }
  })
  boxOptions.value = (page.content || []).map((b) => ({ id: b.id, name: b.name }))
}

const load = async () => {
  loading.value = true
  try {
    rows.value = (await request({
      url: '/admin/mystery-box-activity',
      method: 'get'
    })) as ActivityRow[]
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = ''
  form.title = ''
  form.banner = ''
  form.subtitle = ''
  form.endTime = ''
  form.boxIds = []
  form.enabled = true
  form.sortOrder = rows.value.length + 1
}

const editRow = (row: ActivityRow) => {
  form.id = row.id
  form.title = row.title
  form.banner = row.banner || ''
  form.subtitle = row.subtitle || ''
  form.endTime = row.end_time?.replace(' ', 'T').slice(0, 16) || ''
  form.boxIds = parseBoxIds(row.box_ids)
  form.enabled = row.enabled === 1
  form.sortOrder = row.sort_order
}

const save = async () => {
  await request({
    url: '/admin/mystery-box-activity/save',
    method: 'post',
    data: {
      id: form.id || undefined,
      title: form.title,
      banner: form.banner || null,
      subtitle: form.subtitle || null,
      endTime: form.endTime ? form.endTime.replace('T', ' ') + ':00' : null,
      boxIds: form.boxIds,
      enabled: form.enabled,
      sortOrder: form.sortOrder
    }
  })
  ElMessage.success('已保存')
  resetForm()
  await load()
}

const remove = async (id: string) => {
  await request({ url: `/admin/mystery-box-activity/${id}`, method: 'delete' })
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  resetForm()
  await loadBoxes()
  await load()
})
</script>

<template>
  <div class="surface-card page">
    <h2>限时活动</h2>
    <p class="hint">配置首页限时活动模块，boxIds 为关联盲盒 ID 列表。</p>

    <el-table v-loading="loading" :data="rows" border style="width: 100%; margin-bottom: 16px">
      <el-table-column prop="sort_order" label="排序" width="70" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="view_count" label="曝光" width="90" />
      <el-table-column prop="end_time" label="结束时间" width="170" />
      <el-table-column label="盲盒数" width="90">
        <template #default="{ row }">{{ parseBoxIds(row.box_ids).length }}</template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">{{ row.enabled ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="editRow(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-form label-width="100px" class="form-grid">
      <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
      <el-form-item label="副标题"><el-input v-model="form.subtitle" /></el-form-item>
      <el-form-item label="Banner URL"><el-input v-model="form.banner" /></el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm" />
      </el-form-item>
      <el-form-item label="关联盲盒">
        <el-select v-model="form.boxIds" multiple filterable style="width: 100%">
          <el-option v-for="b in boxOptions" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="排序"
        ><el-input-number v-model="form.sortOrder" :min="0"
      /></el-form-item>
      <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      <el-form-item>
        <el-button type="primary" @click="save">保存</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.page {
  padding: 20px;
}
.hint {
  color: #64748b;
  margin-bottom: 16px;
}
.form-grid {
  max-width: 720px;
}
</style>
