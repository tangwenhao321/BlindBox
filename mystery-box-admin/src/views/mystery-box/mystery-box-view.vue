<script lang="ts" setup>
import MysteryBoxTable from './components/mystery-box-table.vue'
import MysteryBoxQuery from './components/mystery-box-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { MysteryBoxSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: MysteryBoxSpec = {}
const tableHelper = useTableHelper(
  api.mysteryBoxForAdminController.query,
  api.mysteryBoxForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<MysteryBoxSpec>(initQuery)
provide('mysteryBoxTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <mystery-box-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></mystery-box-query>
    </template>
    <template #table>
      <mystery-box-table></mystery-box-table>
    </template>
  </list-page-shell>
</template>
