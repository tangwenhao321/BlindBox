<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

type SkuRow = {
  id: string
  name: string
  cover: string | null
  fragment_cost: number
  stock_remaining: number
  enabled: number
  sort_order: number
}

const rows = ref<SkuRow[]>([])
const loading = ref(false)
const form = reactive({
  id: '',
  name: '',
  cover: '',
  fragmentCost: 50,
  stockRemaining: 999,
  enabled: true,
  sortOrder: 0
})

const load = async () => {
  loading.value = true
  try {
    rows.value = (await request({ url: '/admin/fragment-exchange-sku', method: 'get' })) as SkuRow[]
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = ''
  form.name = ''
  form.cover = ''
  form.fragmentCost = 50
  form.stockRemaining = 999
  form.enabled = true
  form.sortOrder = rows.value.length + 1
}

const editRow = (row: SkuRow) => {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    cover: row.cover || '',
    fragmentCost: row.fragment_cost,
    stockRemaining: row.stock_remaining,
    enabled: row.enabled === 1,
    sortOrder: row.sort_order
  })
}

const save = async () => {
  await request({
    url: '/admin/fragment-exchange-sku/save',
    method: 'post',
    data: {
      id: form.id || undefined,
      name: form.name,
      cover: form.cover || null,
      fragmentCost: form.fragmentCost,
      stockRemaining: form.stockRemaining,
      enabled: form.enabled,
      sortOrder: form.sortOrder
    }
  })
  ElMessage.success('已保存')
  resetForm()
  await load()
}

const remove = async (id: string) => {
  await request({ url: `/admin/fragment-exchange-sku/${id}`, method: 'delete' })
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  resetForm()
  await load()
})
</script>

<template>
  <div class="surface-card page">
    <h2>碎片兑换 SKU</h2>
    <p class="hint">配置进阶商城可兑换商品及碎片消耗、库存。</p>

    <el-table v-loading="loading" :data="rows" border style="width: 100%; margin-bottom: 16px">
      <el-table-column prop="sort_order" label="排序" width="70" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="fragment_cost" label="碎片消耗" width="100" />
      <el-table-column prop="stock_remaining" label="库存" width="90" />
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

    <el-form label-width="100px" inline>
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="封面 URL"><el-input v-model="form.cover" /></el-form-item>
      <el-form-item label="碎片消耗"
        ><el-input-number v-model="form.fragmentCost" :min="1"
      /></el-form-item>
      <el-form-item label="库存"
        ><el-input-number v-model="form.stockRemaining" :min="0"
      /></el-form-item>
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
</style>
