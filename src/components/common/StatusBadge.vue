<template>
  <span :class="badgeClass" class="status-badge">
    <span v-if="showDot" class="status-dot"></span>
    <span class="badge-text">{{ formattedLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'condition', // 'condition' | 'priority' | 'ticket'
    validator: (v) => ['condition', 'priority', 'ticket', 'data_status'].includes(v)
  },
  showDot: {
    type: Boolean,
    default: true
  }
})

const normalizedValue = computed(() => (props.value || '').trim().toUpperCase())

const formattedLabel = computed(() => {
  if (!normalizedValue.value) return 'UNKNOWN'
  return normalizedValue.value
})

const badgeClass = computed(() => {
  const val = normalizedValue.value

  if (props.type === 'priority' || ['P1', 'P2', 'P3', 'P4'].includes(val)) {
    switch (val) {
      case 'P1': return 'badge badge-p1'
      case 'P2': return 'badge badge-p2'
      case 'P3': return 'badge badge-p3'
      case 'P4': return 'badge badge-p4'
      default: return 'badge badge-p4'
    }
  }

  if (props.type === 'ticket') {
    switch (val) {
      case 'OPEN': return 'badge badge-alarm'
      case 'IN_PROGRESS': return 'badge badge-watch'
      case 'CLOSED':
      case 'RESOLVED': return 'badge badge-normal'
      default: return 'badge badge-gap'
    }
  }

  if (props.type === 'data_status') {
    if (val === 'PASS' || val === 'HEALTHY' || val === 'OK') return 'badge badge-normal'
    if (val === 'WARNING' || val === 'STALE') return 'badge badge-watch'
    return 'badge badge-alarm'
  }

  // Default: condition state
  switch (val) {
    case 'NORMAL': return 'badge badge-normal'
    case 'WATCH': return 'badge badge-watch'
    case 'ALARM':
    case 'WARNING':
    case 'ANOMALY': return 'badge badge-alarm'
    case 'TRIP': return 'badge badge-trip'
    case 'DATA GAP':
    case 'NOT OBSERVABLE':
    case 'GAP': return 'badge badge-gap'
    default: return 'badge badge-gap'
  }
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.badge-text {
  line-height: 1;
}
</style>
