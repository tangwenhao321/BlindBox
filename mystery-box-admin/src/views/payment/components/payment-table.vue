<script lang="ts" setup>
import { inject, onMounted } from 'vue'
import { api } from '@/utils/api-instance'
import type { Scope } from '@/typings'
import type { PaymentDto } from '@/apis/__generated/model/dto'
import { useTableHelper } from '@/components/base/table/table-helper'
import { userLabelProp } from '@/views/user/store/user-store'
import { formatAdminMoney } from '@/utils/format-money'

type PaymentScope = Scope<PaymentDto['PaymentRepository/COMPLEX_FETCHER_FOR_ADMIN']>
const paymentTableHelper = inject(
  'paymentTableHelper',
  useTableHelper(api.paymentForAdminController.query, api.paymentForAdminController, {})
)
const {
  loadTableData,
  handleSortChange,
  handleSelectChange,
  reloadTableData,
  pageData,
  loading,
  queryRequest,
  table
} = paymentTableHelper
onMounted(() => {
  reloadTableData()
})
</script>
<template>
  <div>
    <el-table
      ref="table"
      :data="pageData.content"
      :border="true"
      @selection-change="handleSelectChange"
      @sort-change="handleSortChange"
      v-loading="loading"
    >
      <el-table-column type="selection" width="55"></el-table-column>
      <el-table-column label="支付类型" prop="payType" sortable="custom" width="120">
        <template v-slot:default="{ row }: PaymentScope">
          {{ row.payType }}
        </template>
      </el-table-column>
      <el-table-column label="支付时间" prop="payTime" sortable="custom" width="170">
        <template v-slot:default="{ row }: PaymentScope">
          {{ row.payTime || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="实付金额" prop="payAmount" sortable="custom" width="110">
        <template v-slot:default="{ row }: PaymentScope">
          {{ formatAdminMoney(row.payAmount) }}
        </template>
      </el-table-column>
      <el-table-column label="VIP优惠" prop="vipAmount" sortable="custom" width="100">
        <template v-slot:default="{ row }: PaymentScope">
          {{ formatAdminMoney(row.vipAmount) }}
        </template>
      </el-table-column>
      <el-table-column label="优惠券减免" prop="couponAmount" sortable="custom" width="110">
        <template v-slot:default="{ row }: PaymentScope">
          {{ formatAdminMoney(row.couponAmount) }}
        </template>
      </el-table-column>
      <el-table-column label="商品金额" prop="productAmount" sortable="custom" width="110">
        <template v-slot:default="{ row }: PaymentScope">
          {{ formatAdminMoney(row.productAmount) }}
        </template>
      </el-table-column>
      <el-table-column label="配送费" prop="deliveryFee" sortable="custom" width="100">
        <template v-slot:default="{ row }: PaymentScope">
          {{ formatAdminMoney(row.deliveryFee) }}
        </template>
      </el-table-column>
      <el-table-column
        label="外部订单号"
        prop="tradeNo"
        sortable="custom"
        show-overflow-tooltip
        min-width="160"
      >
        <template v-slot:default="{ row }: PaymentScope">
          {{ row.tradeNo || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createdTime" sortable="custom" width="170">
        <template v-slot:default="{ row }: PaymentScope">
          {{ row.createdTime }}
        </template>
      </el-table-column>
      <el-table-column label="创建人" prop="creator.phone" sortable="custom" width="140">
        <template v-slot:default="{ row }: PaymentScope">
          {{ userLabelProp(row.creator) }}
        </template>
      </el-table-column>
    </el-table>
    <div class="page">
      <el-pagination
        style="margin-top: 30px"
        :current-page="queryRequest.pageNum"
        :page-size="queryRequest.pageSize"
        :page-sizes="[10, 20, 30, 40, 50]"
        :total="pageData.totalElements"
        background
        small
        layout="prev, pager, next, jumper, total, sizes"
        @current-change="(pageNum) => loadTableData({ pageNum })"
        @size-change="(pageSize) => loadTableData({ pageSize })"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  justify-content: flex-end;
}
</style>
