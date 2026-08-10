<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/utils/api-instance'
import type { MysteryBoxProductRelInput } from '@/apis/__generated/model/static'

type RelRow = {
  id: string
  productId: string
  mysteryBoxId: string
  stockTotal: number
  stockRemaining: number
  sortOrder: number
  isLastOne: boolean
  product?: { id: string; name: string }
}

const props = defineProps<{ mysteryBoxId: string }>()

const rows = ref<RelRow[]>([])
const loading = ref(false)

const load = async () => {
  if (!props.mysteryBoxId) return
  loading.value = true
  try {
    const page = await api.mysteryBoxProductRelForAdminController.query({
      body: { pageNum: 1, pageSize: 500, query: { mysteryBoxId: props.mysteryBoxId } }
    })
    rows.value = (page.content || []).map((r) => {
      const row = r as unknown as RelRow & { product?: { id: string; name?: string } }
      return {
        id: row.id,
        mysteryBoxId: row.mysteryBoxId || props.mysteryBoxId,
        productId: row.productId || row.product?.id || '',
        stockTotal: row.stockTotal ?? 10,
        stockRemaining: row.stockRemaining ?? 10,
        sortOrder: row.sortOrder ?? 0,
        isLastOne: !!row.isLastOne,
        product: row.product
      }
    })
  } finally {
    loading.value = false
  }
}

const validateLastOne = async () => {
  if (rows.value.length === 0) return true
  if (rows.value.some((r) => r.isLastOne)) return true
  try {
    await ElMessageBox.confirm(
      '当前未勾选任何终赏（Last One），奖池清空后不会额外发放终赏。是否仍要保存？',
      '终赏提示',
      { type: 'warning', confirmButtonText: '仍要保存', cancelButtonText: '返回修改' }
    )
    return true
  } catch {
    return false
  }
}

const toInput = (row: RelRow): MysteryBoxProductRelInput => ({
  id: row.id,
  mysteryBoxId: row.mysteryBoxId || props.mysteryBoxId,
  productId: row.productId,
  stockTotal: row.stockTotal,
  stockRemaining: row.stockRemaining,
  sortOrder: row.sortOrder,
  isLastOne: row.isLastOne
})

const saveRow = async (row: RelRow) => {
  if (row.stockRemaining > row.stockTotal) {
    ElMessage.error('剩余库存不能大于总库存')
    return
  }
  await api.mysteryBoxProductRelForAdminController.save({ body: toInput(row) })
  ElMessage.success('赏品库存已保存')
}

const saveAll = async () => {
  for (const row of rows.value) {
    if (row.stockRemaining > row.stockTotal) {
      ElMessage.error(`${row.product?.name || row.productId}：剩余不能大于总量`)
      return
    }
  }
  if (!(await validateLastOne())) return
  await Promise.all(
    rows.value.map((row) => api.mysteryBoxProductRelForAdminController.save({ body: toInput(row) }))
  )
  ElMessage.success('全部保存完成')
  await load()
}

const exportCsv = () => {
  const header = 'productId,stockTotal,stockRemaining,sortOrder,isLastOne'
  const lines = rows.value.map(
    (r) =>
      `${r.productId},${r.stockTotal},${r.stockRemaining},${r.sortOrder},${r.isLastOne ? 1 : 0}`
  )
  const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prize-stock-${props.mysteryBoxId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const importCsv = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv,text/csv'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('productId'))
    let skipped = 0
    let updated = 0
    for (const line of lines) {
      const parts = line.split(',')
      if (parts.length < 5) {
        skipped++
        continue
      }
      const [productId, stockTotal, stockRemaining, sortOrder, isLastOne] = parts
      const row = rows.value.find((r) => r.productId === productId.trim())
      if (!row) {
        skipped++
        continue
      }
      const total = Number(stockTotal)
      const remaining = Number(stockRemaining)
      if (Number.isNaN(total) || Number.isNaN(remaining) || remaining > total) {
        ElMessage.error(`${productId}：库存数值无效（剩余不能大于总量）`)
        return
      }
      row.stockTotal = total
      row.stockRemaining = remaining
      row.sortOrder = Number(sortOrder) || row.sortOrder
      row.isLastOne = isLastOne?.trim() === '1'
      updated++
    }
    ElMessage.success(
      `已导入 ${updated} 行${skipped ? `，跳过 ${skipped} 行` : ''}，请核对后点「保存全部」`
    )
  }
  input.click()
}

onMounted(load)
</script>

<template>
  <div class="prize-stock">
    <p class="hint">
      配置每个赏品的总库存、剩余、排序与终赏（Last One）。保存后 App 端余量表与开奖逻辑立即生效。
    </p>
    <el-table v-loading="loading" :data="rows" border size="small">
      <el-table-column label="赏品" min-width="120">
        <template #default="{ row }">{{ row.product?.name || row.productId }}</template>
      </el-table-column>
      <el-table-column label="总库存" width="110">
        <template #default="{ row }">
          <el-input-number v-model="row.stockTotal" :min="0" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="剩余" width="110">
        <template #default="{ row }">
          <el-input-number v-model="row.stockRemaining" :min="0" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="排序" width="90">
        <template #default="{ row }">
          <el-input-number v-model="row.sortOrder" :min="0" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="终赏" width="80">
        <template #default="{ row }">
          <el-switch v-model="row.isLastOne" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="saveRow(row)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button type="primary" style="margin-top: 12px" @click="saveAll">保存全部赏品库存</el-button>
    <el-button style="margin-top: 12px; margin-left: 8px" @click="exportCsv">导出 CSV</el-button>
    <el-button style="margin-top: 12px; margin-left: 8px" @click="importCsv">导入 CSV</el-button>
  </div>
</template>

<style scoped>
.hint {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 12px;
}
</style>
