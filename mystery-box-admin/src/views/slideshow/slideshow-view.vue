<script lang="ts" setup>
import SlideshowTable from './components/slideshow-table.vue'
import SlideshowQuery from './components/slideshow-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { SlideshowSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: SlideshowSpec = {}
const tableHelper = useTableHelper(
  api.slideshowForAdminController.query,
  api.slideshowForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<SlideshowSpec>(initQuery)
provide('slideshowTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <slideshow-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></slideshow-query>
    </template>
    <template #table>
      <slideshow-table></slideshow-table>
    </template>
  </list-page-shell>
</template>
