<script lang="ts" setup>
import AddressTable from './components/address-table.vue'
import AddressQuery from './components/address-query.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
import { useTableHelper } from '@/components/base/table/table-helper'
import { api } from '@/utils/api-instance'
import { provide } from 'vue'
import type { AddressSpec } from '@/apis/__generated/model/static'
import { useQueryHelper } from '@/components/base/query/query-helper'

const initQuery: AddressSpec = {}
const tableHelper = useTableHelper(
  api.addressForAdminController.query,
  api.addressForAdminController,
  initQuery
)
const { query, restQuery } = useQueryHelper<AddressSpec>(initQuery)
provide('addressTableHelper', tableHelper)
</script>
<template>
  <list-page-shell>
    <template #query>
      <address-query
        v-model:query="query"
        @reset="restQuery"
        @search="tableHelper.reloadTableData({ query })"
      ></address-query>
    </template>
    <template #table>
      <address-table></address-table>
    </template>
  </list-page-shell>
</template>
