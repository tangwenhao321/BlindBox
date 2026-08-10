<script lang="ts" setup>
import VipTable from './components/vip-table.vue'
import VipQuery from './components/vip-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { VipSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: VipSpec = {}
const tableHelper = useTableHelper(
  api.vipForAdminController.query,
  api.vipForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<VipSpec>(initQuery)
provide('vipTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <vip-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></vip-query>
    </template>
    <template #table>
      <vip-table></vip-table>
    </template>
  </list-page-shell>
</template>
