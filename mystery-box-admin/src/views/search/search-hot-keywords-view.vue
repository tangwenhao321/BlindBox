<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'

type HotKeywordRow = {
  id: string
  keyword: string
  sort_order: number
  enabled: number
  created_time?: string
}

const rows = ref<HotKeywordRow[]>([])
const loading = ref(false)
const form = reactive({
  id: '',
  keyword: '',
  enabled: true
})

const load = async () => {
  loading.value = true
  try {
    rows.value =
      ((await request({ url: '/admin/search/hot-keywords', method: 'get' })) as HotKeywordRow[]) ||
      []
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = ''
  form.keyword = ''
  form.enabled = true
}

const editRow = (row: HotKeywordRow) => {
  Object.assign(form, {
    id: row.id,
    keyword: row.keyword,
    enabled: Number(row.enabled) === 1
  })
}

const save = async () => {
  if (!form.keyword.trim()) {
    ElMessage.warning('请输入关键词')
    return
  }
  await request({
    url: '/admin/search/hot-keywords/save',
    method: 'post',
    data: {
      id: form.id || undefined,
      keyword: form.keyword.trim(),
      enabled: form.enabled
    }
  })
  ElMessage.success('已保存')
  resetForm()
  await load()
}

const toggleEnabled = async (row: HotKeywordRow) => {
  const next = Number(row.enabled) !== 1
  await request({
    url: `/admin/search/hot-keywords/${row.id}/enabled`,
    method: 'post',
    params: { enabled: next }
  })
  ElMessage.success(next ? '已启用' : '已停用')
  await load()
}

const remove = async (row: HotKeywordRow) => {
  await ElMessageBox.confirm(`删除关键词「${row.keyword}」？`, '确认删除', { type: 'warning' })
  await request({ url: `/admin/search/hot-keywords/${row.id}`, method: 'delete' })
  ElMessage.success('已删除')
  await load()
}

const move = async (index: number, delta: number) => {
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= rows.value.length) return
  const ids = rows.value.map((row) => row.id)
  const [moved] = ids.splice(index, 1)
  ids.splice(nextIndex, 0, moved)
  await request({
    url: '/admin/search/hot-keywords/reorder',
    method: 'post',
    data: { ids }
  })
  await load()
}

onMounted(() => {
  resetForm()
  void load()
})
</script>

<template>
  <list-page-shell>
    <template #query>
      <el-space wrap>
        <el-input v-model="form.keyword" placeholder="热搜关键词" clearable style="width: 220px" />
        <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        <el-button type="primary" @click="save">{{ form.id ? '更新' : '新增' }}</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-space>
      <p class="hint">配置 App 搜索页热搜词，按排序展示；停用后不会出现在客户端。</p>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="sort_order" label="排序" width="70" />
      <el-table-column prop="keyword" label="关键词" min-width="160" />
      <el-table-column label="启用" width="90">
        <template #default="{ row }">
          <el-tag :type="Number(row.enabled) === 1 ? 'success' : 'info'" size="small">
            {{ Number(row.enabled) === 1 ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_time" label="创建时间" width="180" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row, $index }">
          <el-button link type="primary" @click="editRow(row)">编辑</el-button>
          <el-button link @click="move($index, -1)">上移</el-button>
          <el-button link @click="move($index, 1)">下移</el-button>
          <el-button link type="warning" @click="toggleEnabled(row)">
            {{ Number(row.enabled) === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </list-page-shell>
</template>

<style scoped>
.hint {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
}
</style>
