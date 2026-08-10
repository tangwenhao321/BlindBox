<script lang="ts" setup>
import RemoteSelect from '@/components/base/form/remote-select.vue'
import type { CouponBoxRelSpec } from '@/apis/__generated/model/static'
import { couponQueryOptions } from '@/views/coupon/coupon'
import { mysteryBoxQueryOptions } from '@/views/mystery-box/mystery-box'

const emit = defineEmits<{ search: [value: CouponBoxRelSpec]; reset: [] }>()
const query = defineModel<CouponBoxRelSpec>('query', { required: true })
</script>
<template>
  <div class="search">
    <el-form inline label-width="80" size="small">
      <el-form-item label="优惠券">
        <remote-select
          label-prop="name"
          :query-options="couponQueryOptions"
          v-model="query.couponId"
        ></remote-select>
      </el-form-item>
      <el-form-item label="盲盒">
        <remote-select
          label-prop="name"
          :query-options="mysteryBoxQueryOptions"
          v-model="query.boxId"
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
