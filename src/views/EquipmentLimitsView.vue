<template>
  <div class="equipment-limits-view">
    <!-- WHAT: View Header -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Asset Management</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">Equipment Limits</span>
        </div>
        <h1 class="view-title">Equipment Limits</h1>
        <p class="view-subtitle">
          Engineering thresholds, baseline limits, and operational setpoints across plant equipment.
          Read-only — limits are managed by engineering and backend systems.
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-outline" @click="fetchLimits" :disabled="loading">
          <span v-if="loading">Refreshing...</span>
          <span v-else>↻ Refresh</span>
        </button>
      </div>
    </header>

    <!-- WHY: Filter Bar -->
    <div class="card filter-card">
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Filter by Asset</label>
          <select v-model="filters.asset_id" class="filter-control" @change="fetchLimits">
            <option value="">All Assets</option>
            <option v-for="asset in assetOptions" :key="asset.asset_id" :value="asset.asset_id">
              {{ asset.tag_number ? `${asset.tag_number} - ${asset.asset_name || ''}` : `Asset #${asset.asset_id}` }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Parameter</label>
          <input
            v-model="filters.parameter"
            type="text"
            placeholder="e.g. vib, temp, amp, pressure"
            class="filter-control"
            @input="debouncedFetch"
          />
        </div>

        <div class="filter-actions">
          <button class="btn btn-outline btn-sm" @click="resetFilters">Reset</button>
        </div>
      </div>
    </div>

    <!-- HOW: Limits List / Table -->
    <div class="card limits-card">
      <!-- Loading State -->
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p>Loading equipment limits...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="state-container error-state">
        <p class="error-msg">⚠ {{ error }}</p>
        <button class="btn btn-outline btn-sm" @click="fetchLimits">Try Again</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="limits.length === 0" class="state-container empty-state">
        <p>No equipment limits found matching current criteria.</p>
      </div>

      <!-- Data Table -->
      <div v-else>
        <DataTable
          :columns="limitColumns"
          :data="paginatedLimits"
          :empty-message="'No equipment limits available.'"
        >
          <template #cell-actions="{ row }">
            <button class="btn btn-outline btn-xs" @click="openDetail(row)">
              View Details
            </button>
          </template>
        </DataTable>

        <!-- Pagination -->
        <div class="pagination-bar" v-if="totalPages > 1">
          <span class="pagination-info">
            Showing {{ ((page - 1) * PAGE_SIZE) + 1 }}–{{ Math.min(page * PAGE_SIZE, limits.length) }} of {{ limits.length }} records
          </span>
          <div class="pagination-controls">
            <button
              class="btn btn-outline btn-xs"
              :disabled="page <= 1"
              @click="page--"
            >
              ‹ Prev
            </button>
            <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
            <button
              class="btn btn-outline btn-xs"
              :disabled="page >= totalPages"
              @click="page++"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-backdrop" @click.self="showDetailModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Equipment Limit Details</h3>
            <span class="modal-subtitle">Limit Specification Record</span>
          </div>
          <button class="modal-close-btn" @click="showDetailModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="selectedLimit" class="detail-grid">
            <div v-for="(val, key) in selectedLimit" :key="key" class="detail-item">
              <span class="detail-label">{{ formatKey(key) }}</span>
              <span class="detail-value">{{ val !== null && val !== undefined && val !== '' ? val : '—' }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" @click="showDetailModal = false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiClient from '../api/client.js'
import { ENDPOINTS } from '../api/endpoints.js'
import DataTable from '../components/common/DataTable.vue'

// State
const limits = ref([])
const assetOptions = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const PAGE_SIZE = 25

// Contracted Filters: asset_id, parameter
const filters = ref({
  asset_id: '',
  parameter: ''
})

// Modal Detail State
const showDetailModal = ref(false)
const selectedLimit = ref(null)

// Dynamic columns inferred safely from response data
const baseColumns = [
  { key: 'limit_id', label: 'Limit ID', width: '90px' },
  { key: 'asset_id', label: 'Asset ID', width: '90px' },
  { key: 'parameter', label: 'Parameter' },
  { key: 'unit', label: 'Unit', width: '80px' },
  { key: 'actions', label: 'Action', width: '110px' }
]

const limitColumns = computed(() => {
  if (limits.value.length === 0) return baseColumns
  const firstItem = limits.value[0]
  const keys = Object.keys(firstItem)
  const cols = []

  const priorityOrder = [
    'limit_id', 'id', 'asset_id', 'parameter', 'param_name', 'canonical_param',
    'alarm_low', 'warning_low', 'normal_min', 'normal_max', 'warning_high', 'alarm_high',
    'trip_low', 'trip_high', 'unit', 'description'
  ]

  priorityOrder.forEach(k => {
    if (keys.includes(k) && !cols.some(c => c.key === k)) {
      cols.push({
        key: k,
        label: formatKey(k),
        width: k.endsWith('_id') || k === 'id' ? '90px' : k === 'unit' ? '80px' : undefined
      })
    }
  })

  // Append other scalar fields not in priority list
  keys.forEach(k => {
    if (!cols.some(c => c.key === k) && typeof firstItem[k] !== 'object') {
      cols.push({ key: k, label: formatKey(k) })
    }
  })

  // Action column at end
  cols.push({ key: 'actions', label: 'Action', width: '110px' })
  return cols
})

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(limits.value.length / PAGE_SIZE)))
const paginatedLimits = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return limits.value.slice(start, start + PAGE_SIZE)
})

// Debounce helper
let searchTimer = null
const debouncedFetch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchLimits()
  }, 350)
}

const resetFilters = () => {
  filters.value.asset_id = ''
  filters.value.parameter = ''
  page.value = 1
  fetchLimits()
}

// Fetch Assets for dropdown selector
const fetchAssetsList = async () => {
  try {
    const { data } = await apiClient.get(ENDPOINTS.ASSETS)
    assetOptions.value = data.data || []
  } catch (e) {
    console.error('Failed to load asset list for limits filter:', e)
  }
}

// Fetch Equipment Limits
const fetchLimits = async () => {
  loading.value = true
  error.value = ''
  try {
    let url = ENDPOINTS.EQUIPMENT_LIMITS
    const params = {}

    if (filters.value.asset_id) {
      url = ENDPOINTS.ASSET_LIMITS(filters.value.asset_id)
    }

    if (filters.value.parameter) {
      params.parameter = filters.value.parameter.trim()
    }

    const { data } = await apiClient.get(url, { params })
    limits.value = Array.isArray(data) ? data : (data.data || [])
    page.value = 1
  } catch (err) {
    error.value = err.message || 'Failed to load equipment limits.'
    limits.value = []
  } finally {
    loading.value = false
  }
}

const openDetail = (row) => {
  selectedLimit.value = row
  showDetailModal.value = true
}

const formatKey = (key) => {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

onMounted(() => {
  fetchAssetsList()
  fetchLimits()
})
</script>

<style scoped>
.equipment-limits-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5, 20px);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-tertiary, #8b8fa3);
  margin-bottom: 6px;
}

.crumb-separator { color: var(--text-tertiary, #8b8fa3); }
.crumb-active { color: var(--text-secondary, #b4b7c9); }

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #e8eaf0);
  margin: 0 0 6px 0;
}

.view-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #b4b7c9);
  margin: 0;
  max-width: 780px;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.card {
  background: var(--bg-card, #161826);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-4, 16px);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
  flex: 1;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #b4b7c9);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-control {
  padding: 8px 12px;
  background: var(--bg-input, #0f111a);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-md, 8px);
  color: var(--text-primary, #e8eaf0);
  font-size: 0.85rem;
}

.filter-control:focus {
  outline: none;
  border-color: var(--primary-500, #4f8cff);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  padding-bottom: 2px;
}

.limits-card {
  padding: 0;
  overflow: hidden;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 50px 20px;
  color: var(--text-tertiary, #8b8fa3);
}

.state-container.error-state {
  color: var(--danger, #ff5050);
}

.error-msg {
  font-size: 0.9rem;
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-default, #2a2d42);
  color: var(--text-secondary, #b4b7c9);
}

.btn-outline:hover:not(:disabled) {
  background: var(--bg-hover, #1e2133);
  color: var(--text-primary, #e8eaf0);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.btn-xs {
  padding: 4px 10px;
  font-size: 0.75rem;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border-default, #2a2d42);
  flex-wrap: wrap;
  gap: 10px;
}

.pagination-info {
  font-size: 0.8rem;
  color: var(--text-tertiary, #8b8fa3);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  font-size: 0.8rem;
  color: var(--text-secondary, #b4b7c9);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-default, #2a2d42);
  border-top-color: var(--primary-500, #4f8cff);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
}

.modal-dialog {
  background: var(--bg-card, #161826);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-lg, 12px);
  width: 100%;
  max-width: 520px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-default, #2a2d42);
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #e8eaf0);
  margin: 0;
}

.modal-subtitle {
  font-size: 0.78rem;
  color: var(--text-tertiary, #8b8fa3);
}

.modal-close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary, #8b8fa3);
  font-size: 1.3rem;
  cursor: pointer;
  padding: 4px;
}

.modal-close-btn:hover { color: var(--text-primary, #e8eaf0); }

.modal-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--bg-input, #0f111a);
  padding: 10px 12px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-default, #2a2d42);
}

.detail-label {
  font-size: 0.72rem;
  color: var(--text-tertiary, #8b8fa3);
  text-transform: uppercase;
}

.detail-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary, #e8eaf0);
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border-default, #2a2d42);
}
</style>
