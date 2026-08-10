<script lang="ts" setup>
import VipOrderTable from './components/vip-order-table.vue'
import VipOrderQuery from './components/vip-order-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { VipOrderSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: VipOrderSpec = {}
const tableHelper = useTableHelper(
  api.vipOrderForAdminController.query,
  api.vipOrderForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<VipOrderSpec>(initQuery)
provide('vipOrderTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <vip-order-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></vip-order-query>
    </template>
    <template #table>
      <vip-order-table></vip-order-table>
    </template>
  </list-page-shell>
</template>
