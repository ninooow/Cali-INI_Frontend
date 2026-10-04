<template>
  <div class="placeholder-view">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">{{ title }}</h2>
        <span class="badge badge-gap">Foundation Ready</span>
      </div>
      <p class="placeholder-desc">{{ description }}</p>
      <div class="meta-box">
        <span class="meta-label">Route:</span>
        <code>{{ $route.path }}</code>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: 'Page shell mounted. Implementation scheduled for subsequent milestone.'
  }
})
</script>

<style scoped>
.placeholder-view {
  max-width: 900px;
}

.placeholder-desc {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  margin-bottom: 20px;
}

.meta-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: var(--surface-alt);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  font-size: var(--font-size-sm);
}

.meta-label {
  color: var(--text-muted);
  font-weight: 500;
}

code {
  color: var(--primary-blue);
  font-family: monospace;
  font-weight: 600;
}
</style>
