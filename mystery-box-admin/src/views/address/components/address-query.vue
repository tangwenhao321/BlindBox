<script lang="ts" setup>
import RemoteSelect from '@/components/base/form/remote-select.vue'
import type { AddressSpec } from '@/apis/__generated/model/static'
import { userQueryOptions } from '@/views/user/store/user-store'

const emit = defineEmits<{ search: [value: AddressSpec]; reset: [] }>()
const query = defineModel<AddressSpec>('query', { required: true })
</script>
<template>
  <div class="search">
    <el-form inline label-width="80" size="small">
      <el-form-item label="姓名">
        <el-input v-model="query.realName" clearable />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="query.phoneNumber" clearable />
      </el-form-item>
      <el-form-item label="省">
        <el-input v-model="query.province" clearable />
      </el-form-item>
      <el-form-item label="市">
        <el-input v-model="query.city" clearable />
      </el-form-item>
      <el-form-item label="创建人">
        <remote-select
          label-prop="nickname"
          :query-options="userQueryOptions"
          v-model="query.creatorId"
        ></remote-select>
      </el-form-item>
      <el-form-item label=" ">
        <div class="btn-wrapper">
          <el-button type="primary" size="small" @click="() => emit('search', query)">
            查询
          </el-button>
          <el-button type="warning" size="small" @click="() => emit('reset')"> 重置</el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-form-item) {
  margin-bottom: 5px;
}

.search {
  display: flex;
  flex-flow: column nowrap;
  width: 100%;

  .btn-wrapper {
    margin-left: 20px;
  }
}
</style>
