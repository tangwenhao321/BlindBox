<script setup lang="ts">
import { onMounted, ref } from 'vue'
import request from '@/utils/request'

type AuditRow = {
  id: string
  rel_id: string
  mystery_box_id: string
  product_id: string
  stock_total_before: number | null
  stock_remaining_before: number | null
  stock_total_after: number
  stock_remaining_after: number
  is_last_one_after: number
  operator_id: string | null
  created_time: string
}

const props = defineProps<{ mysteryBoxId?: string }>()
const rows = ref<AuditRow[]>([])
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    const params = props.mysteryBoxId
      ? { mysteryBoxId: props.mysteryBoxId, limit: 200 }
      : { limit: 200 }
    rows.value = (await request({
      url: '/admin/prize-stock-audit',
      method: 'get',
      params
    })) as AuditRow[]
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <p class="hint">库存变更审计：保存赏品库存时自动记录前后余量与操作人。</p>
    <el-table v-loading="loading" :data="rows" border size="small">
      <el-table-column prop="created_time" label="时间" width="170" />
      <el-table-column prop="product_id" label="赏品ID" min-width="120" />
      <el-table-column label="余量变更" min-width="160">
        <template #default="{ row }">
          {{ row.stock_remaining_before ?? '?' }} → {{ row.stock_remaining_after }} /
          {{ row.stock_total_after }}
        </template>
      </el-table-column>
      <el-table-column label="终赏" width="70">
        <template #default="{ row }">{{ row.is_last_one_after ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column prop="operator_id" label="操作人" width="120" />
    </el-table>
  </div>
</template>

<style scoped>
.hint {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 12px;
}
</style>
