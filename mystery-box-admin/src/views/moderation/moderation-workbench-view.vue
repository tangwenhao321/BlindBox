<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { request } from '@/utils/request'

type Report = {
  id: string
  targetType: string
  targetId: string
  reason: string
  status: string
  remark: string
  updatedAt: string
}

const loading = ref(false)
const reports = ref<Report[]>([])
const remark = ref('审核通过')
const postStatus = ref('APPROVED')
const reportStatusFilter = ref('ALL')

const loadReports = async () => {
  loading.value = true
  try {
    const params = reportStatusFilter.value === 'ALL' ? '' : `?status=${reportStatusFilter.value}`
    const response = (await request({
      url: `/admin/moderation/reports${params}`,
      method: 'get'
    })) as Report[]
    reports.value = response || []
  } finally {
    loading.value = false
  }
}

const updateStatus = async (row: Report, status: string) => {
  await request({
    url: `/admin/moderation/reports/${row.id}/status`,
    method: 'post',
    data: { status, remark: remark.value || (status === 'REJECTED' ? '违反社区规范' : '审核通过') }
  })
  ElMessage.success('举报处理完成')
  await loadReports()
}

const moderatePost = async (postId: string) => {
  await request({
    url: `/admin/moderation/posts/${postId}/status`,
    method: 'post',
    data: { status: postStatus.value }
  })
  ElMessage.success('帖子状态已更新')
}

onMounted(loadReports)
</script>

<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span>内容审核工作台</span>
        <el-button type="primary" @click="loadReports">刷新</el-button>
      </div>
    </template>
    <el-form inline>
      <el-form-item label="举报状态">
        <el-select v-model="reportStatusFilter" style="width: 140px" @change="loadReports">
          <el-option label="全部" value="ALL" />
          <el-option label="待处理" value="PENDING" />
          <el-option label="已通过" value="APPROVED" />
          <el-option label="已驳回" value="REJECTED" />
        </el-select>
      </el-form-item>
      <el-form-item label="审核备注">
        <el-input v-model="remark" placeholder="填写审核备注" style="width: 260px" />
      </el-form-item>
      <el-form-item label="帖子状态">
        <el-select v-model="postStatus" style="width: 140px">
          <el-option label="通过" value="APPROVED" />
          <el-option label="驳回" value="REJECTED" />
          <el-option label="待审" value="PENDING" />
        </el-select>
      </el-form-item>
    </el-form>
    <el-table :data="reports" v-loading="loading" stripe>
      <el-table-column prop="id" label="举报ID" min-width="180" />
      <el-table-column prop="targetType" label="对象类型" width="120" />
      <el-table-column prop="targetId" label="对象ID" min-width="180" />
      <el-table-column prop="reason" label="举报原因" min-width="180" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" type="success" @click="updateStatus(row, 'APPROVED')"
            >通过举报</el-button
          >
          <el-button size="small" type="danger" @click="updateStatus(row, 'REJECTED')"
            >驳回举报</el-button
          >
          <el-button
            v-if="row.targetType === 'post'"
            size="small"
            @click="moderatePost(row.targetId)"
          >
            更新帖子
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
