<script lang="ts" setup>
import UserTable from './components/user-table.vue'
import UserQuery from './components/user-query.vue'
import UserDialog from './components/user-dialog.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
</script>
<template>
  <list-page-shell>
    <template #query>
      <user-query></user-query>
      <user-dialog></user-dialog>
    </template>
    <template #table>
      <user-table></user-table>
    </template>
  </list-page-shell>
</template>
