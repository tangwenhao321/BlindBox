<script lang="ts" setup>
import VipPackageTable from './components/vip-package-table.vue'
import VipPackageQuery from './components/vip-package-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { VipPackageSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: VipPackageSpec = {}
const tableHelper = useTableHelper(
  api.vipPackageForAdminController.query,
  api.vipPackageForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<VipPackageSpec>(initQuery)
provide('vipPackageTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <vip-package-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></vip-package-query>
    </template>
    <template #table>
      <vip-package-table></vip-package-table>
    </template>
  </list-page-shell>
</template>
