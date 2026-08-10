<script lang="ts" setup>
import MysteryBoxCategoryTable from './components/mystery-box-category-table.vue'
import MysteryBoxCategoryQuery from './components/mystery-box-category-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { MysteryBoxCategorySpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: MysteryBoxCategorySpec = {}
const tableHelper = useTableHelper(
  api.mysteryBoxCategoryForAdminController.query,
  api.mysteryBoxCategoryForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<MysteryBoxCategorySpec>(initQuery)
provide('mysteryBoxCategoryTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <mystery-box-category-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></mystery-box-category-query>
    </template>
    <template #table>
      <mystery-box-category-table></mystery-box-category-table>
    </template>
  </list-page-shell>
</template>
