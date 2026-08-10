<script lang="ts" setup>
import CouponUserRelTable from './components/coupon-user-rel-table.vue'
import CouponUserRelQuery from './components/coupon-user-rel-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { CouponUserRelSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: CouponUserRelSpec = {}
const tableHelper = useTableHelper(
  api.couponUserRelForAdminController.query,
  api.couponUserRelForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<CouponUserRelSpec>(initQuery)
provide('couponUserRelTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <coupon-user-rel-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></coupon-user-rel-query>
    </template>
    <template #table>
      <coupon-user-rel-table></coupon-user-rel-table>
    </template>
  </list-page-shell>
</template>
