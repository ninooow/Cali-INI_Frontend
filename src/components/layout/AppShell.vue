<template>
  <div class="app-shell">
    <AppHeader />
    <div class="shell-body">
      <AppSidebar />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background);
}

.shell-body {
  display: flex;
  flex: 1;
  min-height: calc(100vh - var(--header-height));
}

.main-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}
</style>
