<script lang="ts" setup>
import { inject, onMounted } from 'vue'
import { api } from '@/utils/api-instance'
import type { Scope } from '@/typings'
import type { AddressDto } from '@/apis/__generated/model/dto'
import { useTableHelper } from '@/components/base/table/table-helper'
import { userLabelProp } from '@/views/user/store/user-store'

type AddressScope = Scope<AddressDto['AddressRepository/COMPLEX_FETCHER_FOR_ADMIN']>
const addressTableHelper = inject(
  'addressTableHelper',
  useTableHelper(api.addressForAdminController.query, api.addressForAdminController, {})
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
} = addressTableHelper
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
      <el-table-column label="姓名" prop="realName" sortable="custom" width="100">
        <template v-slot:default="{ row }: AddressScope">
          {{ row.realName }}
        </template>
      </el-table-column>
      <el-table-column label="手机号" prop="phoneNumber" sortable="custom" width="120">
        <template v-slot:default="{ row }: AddressScope">
          {{ row.phoneNumber }}
        </template>
      </el-table-column>
      <el-table-column label="省市区" min-width="180" show-overflow-tooltip>
        <template v-slot:default="{ row }: AddressScope">
          {{ row.province }}{{ row.city }}{{ row.district }}
        </template>
      </el-table-column>
      <el-table-column label="详细地址" prop="details" sortable="custom" min-width="160" show-overflow-tooltip>
        <template v-slot:default="{ row }: AddressScope">
          {{ row.details }}
        </template>
      </el-table-column>
      <el-table-column label="门牌号" prop="houseNumber" sortable="custom" width="100">
        <template v-slot:default="{ row }: AddressScope">
          {{ row.houseNumber }}
        </template>
      </el-table-column>
      <el-table-column label="置顶" prop="top" sortable="custom" width="70">
        <template v-slot:default="{ row }: AddressScope">
          {{ row.top ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createdTime" sortable="custom" width="170">
        <template v-slot:default="{ row }: AddressScope">
          {{ row.createdTime }}
        </template>
      </el-table-column>
      <el-table-column label="创建人" prop="creator.phone" sortable="custom" width="140">
        <template v-slot:default="{ row }: AddressScope">
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
