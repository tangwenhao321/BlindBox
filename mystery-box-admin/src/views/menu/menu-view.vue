<script lang="ts" setup>
import MenuTable from './components/menu-table.vue'
import MenuQuery from './components/menu-query.vue'
import MenuDialog from './components/menu-dialog.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
</script>
<template>
  <list-page-shell>
    <template #query>
      <menu-query></menu-query>
      <menu-dialog></menu-dialog>
    </template>
    <template #table>
      <menu-table></menu-table>
    </template>
  </list-page-shell>
</template>
