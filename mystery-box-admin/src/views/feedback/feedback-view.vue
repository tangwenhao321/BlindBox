<script lang="ts" setup>
import FeedbackTable from './components/feedback-table.vue'
import FeedbackQuery from './components/feedback-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { FeedbackSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: FeedbackSpec = {}
const tableHelper = useTableHelper(
  api.feedbackForAdminController.query,
  api.feedbackForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<FeedbackSpec>(initQuery)
provide('feedbackTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <feedback-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></feedback-query>
    </template>
    <template #table>
      <feedback-table></feedback-table>
    </template>
  </list-page-shell>
</template>
