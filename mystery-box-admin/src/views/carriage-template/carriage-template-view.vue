<script lang="ts" setup>
import CarriageTemplateTable from './components/carriage-template-table.vue'
import CarriageTemplateQuery from './components/carriage-template-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { CarriageTemplateSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: CarriageTemplateSpec = {}
const tableHelper = useTableHelper(
  api.carriageTemplateForAdminController.query,
  api.carriageTemplateForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<CarriageTemplateSpec>(initQuery)
provide('carriageTemplateTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <carriage-template-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></carriage-template-query>
    </template>
    <template #table>
      <carriage-template-table></carriage-template-table>
    </template>
  </list-page-shell>
</template>
