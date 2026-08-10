<script lang="ts" setup>
import CouponTable from './components/coupon-table.vue'
import CouponQuery from './components/coupon-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { CouponSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: CouponSpec = {}
const tableHelper = useTableHelper(
  api.couponForAdminController.query,
  api.couponForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<CouponSpec>(initQuery)
provide('couponTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <coupon-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></coupon-query>
    </template>
    <template #table>
      <coupon-table></coupon-table>
    </template>
  </list-page-shell>
</template>
