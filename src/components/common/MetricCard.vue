<template>
  <div class="metric-card" :class="[`tier-${tier}`, { 'is-unsupported': isUnsupportedMetric }]">
    <div class="metric-header">
      <span class="metric-title">{{ title }}</span>
      <span
        v-if="tooltip"
        class="metric-info-icon"
        :title="tooltip"
        tabindex="0"
        aria-label="More information"
      >
        ⓘ
      </span>
    </div>

    <div class="metric-body">
      <div class="metric-value-row">
        <span class="metric-value">{{ displayValue }}</span>
        <span v-if="unit && !isUnsupportedMetric" class="metric-unit">{{ unit }}</span>
      </div>
      <div v-if="semanticCue && !isUnsupportedMetric" class="metric-cue">
        <span class="cue-dot"></span>
        <span class="cue-text">{{ semanticCue }}</span>
      </div>
    </div>

    <div class="metric-footer">
      <span class="metric-interpretation">{{ footerText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    default: null
  },
  unit: {
    type: String,
    default: ''
  },
  interpretation: {
    type: String,
    default: ''
  },
  tooltip: {
    type: String,
    default: ''
  },
  tier: {
    type: [Number, String],
    default: 1 // 1 for Core Condition, 2 for Operational Context
  },
  unsupported: {
    type: Boolean,
    default: false
  },
  semanticCue: {
    type: String,
    default: ''
  }
})

const isUnsupportedMetric = computed(() => {
  return props.unsupported || props.value === null || props.value === undefined || props.value === 'N/A'
})

const displayValue = computed(() => {
  if (isUnsupportedMetric.value) {
    return 'N/A'
  }
  if (typeof props.value === 'number') {
    return Number.isInteger(props.value) ? props.value.toString() : props.value.toFixed(1)
  }
  return props.value
})

const footerText = computed(() => {
  if (isUnsupportedMetric.value) {
    return 'Not provided by backend'
  }
  return props.interpretation
})
</script>

<style scoped>
.metric-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: border-color 0.15s ease;
}

.metric-card:hover {
  border-color: var(--border-focus);
}

.tier-1 {
  min-height: 140px;
}

.tier-2 {
  min-height: 120px;
  background: var(--surface);
}

.is-unsupported {
  background: #FAFCFE;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.metric-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--primary-dark);
}

.tier-2 .metric-title {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.metric-info-icon {
  font-size: 13px;
  color: var(--text-muted);
  cursor: help;
  user-select: none;
  line-height: 1;
  padding: 2px;
}

.metric-info-icon:hover {
  color: var(--primary-blue);
}

.metric-body {
  margin-bottom: 8px;
}

.metric-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.metric-value {
  font-size: var(--font-size-kpi);
  font-weight: 700;
  color: var(--primary-dark);
  line-height: 1.1;
  font-feature-settings: "tnum";
}

.tier-2 .metric-value {
  font-size: var(--font-size-xl);
}

.is-unsupported .metric-value {
  color: var(--text-muted);
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.metric-unit {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-muted);
}

.metric-cue {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
}

.cue-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--status-watch);
}

.cue-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.metric-footer {
  border-top: 1px solid var(--border-subtle);
  padding-top: 8px;
}

.metric-interpretation {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.3;
  display: block;
}

.is-unsupported .metric-interpretation {
  color: var(--text-muted);
  font-style: italic;
}
</style>
