<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

type FeatureFlagRow = {
  flagKey: string
  enabled: boolean
  description: string
}

const loading = ref(false)
const rows = ref<FeatureFlagRow[]>([])

const reload = async () => {
  loading.value = true
  try {
    rows.value = (await request({ url: '/admin/ops/feature-flag', method: 'get' })) as FeatureFlagRow[]
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

const toggle = async (row: FeatureFlagRow) => {
  try {
    await request({
      url: `/admin/ops/feature-flag/${encodeURIComponent(row.flagKey)}`,
      method: 'put',
      data: { enabled: row.enabled, description: row.description }
    })
    ElMessage.success('已保存')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
    await reload()
  }
}

onMounted(() => void reload())
</script>

<template>
  <list-page-shell>
    <template #query>
      <p class="hint">运行时 Feature Flag（移动端通过 /front/app/config 下发）</p>
      <el-button type="primary" :loading="loading" @click="reload">刷新</el-button>
    </template>
    <el-table v-loading="loading" :data="rows" border>
      <el-table-column prop="flagKey" label="Key" min-width="180" />
      <el-table-column prop="description" label="说明" min-width="220" />
      <el-table-column label="启用" width="120">
        <template #default="{ row }">
          <el-switch v-model="row.enabled" @change="() => toggle(row)" />
        </template>
      </el-table-column>
    </el-table>
  </list-page-shell>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  color: #666;
}
</style>
