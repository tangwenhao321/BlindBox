<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import request from '@/utils/request'

type MissionTemplateRow = {
  dayIndex: number
  missionKey: string
  title: string
  target: number
  rewardCoins: number
  rewardHintCards: number
}

const rows = ref<MissionTemplateRow[]>([])
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    rows.value =
      ((await request({
        url: '/admin/newcomer/missions/template',
        method: 'get'
      })) as MissionTemplateRow[]) || []
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <list-page-shell>
    <template #query>
      <p class="hint">新人任务模板（只读），与 App 端 `/front/newcomer/missions` 展示规则一致。</p>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="dayIndex" label="天数" width="80" />
      <el-table-column prop="missionKey" label="任务键" width="140" />
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="target" label="目标" width="90" />
      <el-table-column prop="rewardCoins" label="金币奖励" width="100" />
      <el-table-column prop="rewardHintCards" label="提示卡奖励" width="110" />
    </el-table>
  </list-page-shell>
</template>

<style scoped>
.hint {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}
</style>
