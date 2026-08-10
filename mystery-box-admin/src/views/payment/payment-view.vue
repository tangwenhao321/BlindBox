<script lang="ts" setup>
import PaymentTable from './components/payment-table.vue'
import PaymentQuery from './components/payment-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { PaymentSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: PaymentSpec = {}
const tableHelper = useTableHelper(
  api.paymentForAdminController.query,
  api.paymentForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<PaymentSpec>(initQuery)
provide('paymentTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <payment-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></payment-query>
    </template>
    <template #table>
      <payment-table></payment-table>
    </template>
  </list-page-shell>
</template>
