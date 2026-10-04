<template>
  <div class="data-table-container">
    <div v-if="loading" class="table-loading-overlay">
      <div class="spinner"></div>
      <span class="loading-text">Loading operational data...</span>
    </div>

    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[`text-${col.align || 'left'}`]"
              :style="{ width: col.width || 'auto' }"
            >
              <div class="th-content">
                <span>{{ col.label }}</span>
                <span
                  v-if="col.tooltip"
                  class="th-info"
                  :title="col.tooltip"
                  tabindex="0"
                >
                  ⓘ
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && (!rows || rows.length === 0)">
            <td :colspan="columns.length" class="empty-cell">
              <slot name="empty">
                <div class="default-empty">
                  <span class="empty-icon">✓</span>
                  <span class="empty-text">{{ emptyMessage }}</span>
                </div>
              </slot>
            </td>
          </tr>
          <tr
            v-for="(row, index) in rows"
            :key="row.id || row.asset_id || row.ticket_id || index"
            class="table-row"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[`text-${col.align || 'left'}`]"
            >
              <slot :name="`item-${col.key}`" :item="row" :index="index">
                {{ row[col.key] !== null && row[col.key] !== undefined ? row[col.key] : '—' }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  columns: {
    type: Array,
    required: true
  },
  rows: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  emptyMessage: {
    type: String,
    default: 'No records available.'
  }
})
</script>

<style scoped>
.data-table-container {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
  width: 100%;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  text-align: left;
}

thead {
  background-color: #F8FAFC;
  border-bottom: 1px solid var(--border);
}

th {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-navy);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

.th-content {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.th-info {
  font-size: 12px;
  color: var(--text-muted);
  cursor: help;
  text-transform: none;
}

td {
  padding: 12px 16px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.table-row:last-child td {
  border-bottom: none;
}

.table-row:hover {
  background-color: #F8FAFD;
}

.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

.table-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--primary-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.empty-cell {
  text-align: center;
  padding: 32px 16px;
}

.default-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
}

.empty-icon {
  color: var(--status-normal);
  font-weight: 700;
}

.empty-text {
  font-size: var(--font-size-sm);
}
</style>
