<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

type DrawPackRow = {
  id: string
  drawCount: number
  label: string
  discountRate: number
  enabled: boolean
  sortOrder: number
}

const rows = ref<DrawPackRow[]>([])
const loading = ref(false)
const form = reactive<DrawPackRow>({
  id: '',
  drawCount: 1,
  label: '',
  discountRate: 10000,
  enabled: true,
  sortOrder: 0
})

const load = async () => {
  loading.value = true
  try {
    rows.value = (await request({
      url: '/admin/mystery-box/draw-pack-configs',
      method: 'get'
    })) as DrawPackRow[]
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = ''
  form.drawCount = 1
  form.label = ''
  form.discountRate = 10000
  form.enabled = true
  form.sortOrder = rows.value.length + 1
}

const editRow = (row: DrawPackRow) => {
  Object.assign(form, row)
}

const save = async () => {
  await request({ url: '/admin/mystery-box/draw-pack-configs', method: 'post', data: form })
  ElMessage.success('已保存')
  resetForm()
  await load()
}

const remove = async (id: string) => {
  await request({ url: `/admin/mystery-box/draw-pack-configs/${id}`, method: 'delete' })
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  resetForm()
  await load()
})
</script>

<template>
  <div class="surface-card draw-pack-view">
    <h2>连拍优惠配置</h2>
    <p class="hint">折扣率为万分比：10000=无折扣，9850=98.5 折。保存后 App 端立即生效。</p>

    <el-table v-loading="loading" :data="rows" border style="width: 100%; margin-bottom: 16px">
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column prop="label" label="名称" />
      <el-table-column prop="drawCount" label="连抽数" width="100" />
      <el-table-column prop="discountRate" label="折扣率(‱)" width="120" />
      <el-table-column label="启用" width="90">
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
      <el-form-item label="名称"><el-input v-model="form.label" /></el-form-item>
      <el-form-item label="连抽数"
        ><el-input-number v-model="form.drawCount" :min="1"
      /></el-form-item>
      <el-form-item label="折扣率"
        ><el-input-number v-model="form.discountRate" :min="1" :max="10000"
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
.draw-pack-view {
  padding: 20px;
}
.hint {
  color: #64748b;
  margin-bottom: 16px;
}
</style>
