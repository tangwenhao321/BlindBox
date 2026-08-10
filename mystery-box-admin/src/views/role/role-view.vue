<script lang="ts" setup>
import RoleTable from './components/role-table.vue'
import RoleQuery from './components/role-query.vue'
import RoleDialog from './components/role-dialog.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
</script>
<template>
  <list-page-shell>
    <template #query>
      <role-query></role-query>
      <role-dialog></role-dialog>
    </template>
    <template #table>
      <role-table></role-table>
    </template>
  </list-page-shell>
</template>
