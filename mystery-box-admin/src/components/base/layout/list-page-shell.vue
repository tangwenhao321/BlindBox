<template>
  <div class="surface-card list-page-shell">
    <div class="query-slot">
      <slot name="query"></slot>
    </div>
    <div class="table-slot">
      <slot name="table"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.list-page-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.query-slot,
.table-slot {
  width: 100%;
}
</style>
