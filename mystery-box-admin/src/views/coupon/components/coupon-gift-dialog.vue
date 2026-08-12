<script setup lang="ts">
import UserChooseTable from '@/views/user/components/user-choose-table.vue'
import { Present } from '@element-plus/icons-vue'
import { provide, ref } from 'vue'
import { api } from '@/utils/api-instance'
import { useTableHelper } from '@/components/base/table/table-helper'
import { ElMessage } from 'element-plus'
import { promptAndArmAdminActionOtp } from '@/utils/admin-action-otp'

const userTableHelper = useTableHelper(
  api.userForAdminController.query,
  api.userForAdminController,
  {}
)
provide('userTableHelper', userTableHelper)
const props = defineProps<{ couponId: string }>()
const visible = ref(false)
const handleConfirm = async () => {
  const ids = userTableHelper.getTableSelectedRows().map((row) => row.id)
  if (!ids.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  if (!(await promptAndArmAdminActionOtp('赠送优惠券'))) return
  await api.couponForAdminController.gift({
    body: {
      userIds: ids,
      id: props.couponId
    }
  })
  ElMessage.success('赠送成功')
  visible.value = false
}
const handleOpen = () => {
  visible.value = true
  userTableHelper.reloadTableData()
}
</script>

<template>
  <el-button type="primary" link size="small" @click="handleOpen">
    <el-icon>
      <present></present>
    </el-icon>
  </el-button>
  <el-dialog append-to-body v-model="visible">
    <user-choose-table></user-choose-table>
    <template #footer>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss"></style>
