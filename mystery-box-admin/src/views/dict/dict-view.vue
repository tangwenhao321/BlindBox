<script lang="ts" setup>
import DictTable from './components/dict-table.vue'
import DictQuery from './components/dict-query.vue'
import DictDialog from './components/dict-dialog.vue'
import ListPageShell from '@/components/base/layout/list-page-shell.vue'
</script>
<template>
  <list-page-shell>
    <template #query>
      <dict-query></dict-query>
      <dict-dialog></dict-dialog>
    </template>
    <template #table>
      <dict-table></dict-table>
    </template>
  </list-page-shell>
</template>
