<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'

type HintPolicyRow = {
  id: string
  config_key: string
  config_value: number
  description?: string
  updated_time?: string
}

const rows = ref<HintPolicyRow[]>([])
const loading = ref(false)
const form = reactive({
  config_key: '',
  config_value: 0,
  description: ''
})

const load = async () => {
  loading.value = true
  try {
    rows.value =
      ((await request({ url: '/admin/hint-policy', method: 'get' })) as HintPolicyRow[]) || []
  } finally {
    loading.value = false
  }
}

const editRow = (row: HintPolicyRow) => {
  Object.assign(form, {
    config_key: row.config_key,
    config_value: Number(row.config_value),
    description: row.description ?? ''
  })
}

const save = async () => {
  if (!form.config_key) {
    ElMessage.warning('请选择配置项')
    return
  }
  await request({
    url: '/admin/hint-policy/save',
    method: 'post',
    data: {
      configKey: form.config_key,
      configValue: form.config_value,
      description: form.description || undefined
    }
  })
  ElMessage.success('已保存')
  await load()
}

onMounted(() => void load())
</script>

<template>
  <list-page-shell>
    <template #query>
      <p class="hint">
        提示卡策略：每日 hint 上限、单盒 session 上限、新用户默认发放量。修改后 App 端下次请求 hint
        时生效。
      </p>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe @row-click="editRow">
      <el-table-column prop="config_key" label="配置键" width="180" />
      <el-table-column prop="config_value" label="数值" width="100" />
      <el-table-column prop="description" label="说明" min-width="220" />
      <el-table-column prop="updated_time" label="更新时间" width="180" />
    </el-table>

    <el-form label-width="120px" class="form">
      <el-form-item label="配置键">
        <el-input v-model="form.config_key" disabled />
      </el-form-item>
      <el-form-item label="数值">
        <el-input-number v-model="form.config_value" :min="0" :max="999" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="form.description" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :disabled="!form.config_key" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </list-page-shell>
</template>

<style scoped>
.hint {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}
.form {
  margin-top: 24px;
  max-width: 520px;
}
</style>
