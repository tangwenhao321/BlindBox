<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import request from '@/utils/request'

type HistoryRow = {
  legendaryRate: number
  hiddenRate: number
  generalRate: number
  effectiveTime: string
  operatorId?: string | null
}

const props = defineProps<{ mysteryBoxId: string }>()
const rows = ref<HistoryRow[]>([])
const loading = ref(false)

const load = async () => {
  if (!props.mysteryBoxId) return
  loading.value = true
  try {
    rows.value = (await request({
      url: `/admin/mystery-box/${props.mysteryBoxId}/probability/history`,
      method: 'get',
      params: { limit: 20 }
    })) as HistoryRow[]
  } finally {
    loading.value = false
  }
}

const pct = (rate: number) => `${(rate / 100).toFixed(2)}%`

onMounted(load)
watch(() => props.mysteryBoxId, load)
</script>

<template>
  <div>
    <p class="hint">盲盒概率变更审计（万分比换算为百分比展示）</p>
    <el-table v-loading="loading" :data="rows" border size="small">
      <el-table-column label="生效时间" prop="effectiveTime" width="180" />
      <el-table-column label="传说" width="100">
        <template #default="{ row }">{{ pct(row.legendaryRate) }}</template>
      </el-table-column>
      <el-table-column label="隐藏" width="100">
        <template #default="{ row }">{{ pct(row.hiddenRate) }}</template>
      </el-table-column>
      <el-table-column label="普通" width="100">
        <template #default="{ row }">{{ pct(row.generalRate) }}</template>
      </el-table-column>
      <el-table-column label="操作人" prop="operatorId" show-overflow-tooltip />
    </el-table>
    <el-empty v-if="!loading && !rows.length" description="暂无变更记录" />
  </div>
</template>

<style scoped>
.hint {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 12px;
}
</style>
