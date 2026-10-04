<template>
  <div class="equipment-directory-view">
    <!-- WHAT: View Header -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Asset Management</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">Equipment Directory</span>
        </div>
        <h1 class="view-title">Equipment Directory</h1>
        <p class="view-subtitle">
          Master register of plant equipment with taxonomy, discipline, and criticality classification.
          Read-only — asset data is managed by the backend system.
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-outline" @click="fetchAssets" :disabled="loading">
          <span v-if="loading">Refreshing...</span>
          <span v-else>↻ Refresh</span>
        </button>
      </div>
    </header>

    <!-- WHY: Filter Bar -->
    <div class="card filter-card">
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Search Tag</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="e.g. 31-PM-01A"
            class="filter-control"
            @input="debouncedFetch"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label">Plant</label>
          <select v-model="filters.plant" class="filter-control" @change="fetchAssets">
            <option value="">All Plants</option>
            <option v-for="p in plantOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Equipment Type</label>
          <select v-model="filters.equipment_type" class="filter-control" @change="fetchAssets">
            <option value="">All Types</option>
            <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Criticality</label>
          <select v-model="filters.criticality" class="filter-control" @change="fetchAssets">
            <option value="">All</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Status</label>
          <select v-model="filters.is_active" class="filter-control" @change="fetchAssets">
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div class="filter-group filter-actions">
          <button class="btn btn-sm btn-outline" @click="clearFilters">Clear Filters</button>
        </div>
      </div>
    </div>

    <!-- HOW: Asset Table -->
    <div class="card table-card">
      <div class="card-header-row">
        <h2 class="card-section-title">
          Equipment Register
          <span v-if="!loading && assets.length" class="record-count">({{ assets.length }} assets)</span>
        </h2>
      </div>

      <div v-if="error" class="error-banner">
        <span>⚠ {{ error }}</span>
        <button class="btn btn-sm btn-outline" @click="fetchAssets">Retry</button>
      </div>

      <DataTable
        :columns="assetColumns"
        :rows="paginatedAssets"
        :loading="loading"
        emptyMessage="No equipment found matching filters."
      >
        <template #item-tag_number="{ item }">
          <button class="link-btn" @click="openDetailModal(item.asset_id)">
            {{ item.tag_number }}
          </button>
        </template>

        <template #item-criticality="{ item }">
          <span :class="['criticality-badge', `crit-${(item.criticality || 'LOW').toLowerCase()}`]">
            {{ item.criticality || '—' }}
          </span>
        </template>

        <template #item-is_active="{ item }">
          <span :class="['status-dot', item.is_active ? 'dot-active' : 'dot-inactive']">
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </span>
        </template>
      </DataTable>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-bar">
        <button class="btn btn-outline btn-sm" :disabled="page <= 1" @click="page--">← Prev</button>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button class="btn btn-outline btn-sm" :disabled="page >= totalPages" @click="page++">Next →</button>
      </div>
    </div>

    <!-- Modal: Asset Detail -->
    <div v-if="showDetailModal" class="modal-backdrop" @click.self="showDetailModal = false">
      <div class="modal-container modal-lg">
        <div class="modal-header">
          <h2 class="modal-title">
            Equipment Detail
            <span v-if="detailAsset" class="modal-subtitle">— {{ detailAsset.tag_number }}</span>
          </h2>
          <button class="modal-close-btn" @click="showDetailModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="detailLoading" class="modal-loading">
            <div class="spinner"></div>
            <span>Loading asset profile...</span>
          </div>

          <div v-else-if="detailError" class="modal-error-alert">
            <span>⚠ {{ detailError }}</span>
          </div>

          <div v-else-if="detailAsset" class="detail-grid">
            <div class="detail-field">
              <label class="detail-label">Asset ID</label>
              <span class="detail-value mono-code">{{ detailAsset.asset_id }}</span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Tag Number</label>
              <span class="detail-value mono-code">{{ detailAsset.tag_number }}</span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Asset Name</label>
              <span class="detail-value">{{ detailAsset.asset_name || '—' }}</span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Equipment Type</label>
              <span class="detail-value">{{ detailAsset.equipment_type || '—' }}</span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Equipment Class</label>
              <span class="detail-value">{{ detailAsset.equipment_class || '—' }}</span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Plant Code</label>
              <span class="detail-value mono-code">{{ detailAsset.plant_code || '—' }}</span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Discipline</label>
              <span class="detail-value">{{ detailAsset.discipline || '—' }}</span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Criticality</label>
              <span :class="['criticality-badge', `crit-${(detailAsset.criticality || 'LOW').toLowerCase()}`]">
                {{ detailAsset.criticality || '—' }}
              </span>
            </div>
            <div class="detail-field">
              <label class="detail-label">Status</label>
              <span :class="['status-dot', detailAsset.is_active ? 'dot-active' : 'dot-inactive']">
                {{ detailAsset.is_active ? 'Active' : 'Inactive' }}
              </span>
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
const assets = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const PAGE_SIZE = 25

// Filters (contract §4.1: search, plant, equipment_type, criticality, is_active)
const filters = ref({
  search: '',
  plant: '',
  equipment_type: '',
  criticality: '',
  is_active: ''
})

// Derived filter options populated from first unfiltered load
const plantOptions = ref([])
const typeOptions = ref([])

// Detail modal
const showDetailModal = ref(false)
const detailAsset = ref(null)
const detailLoading = ref(false)
const detailError = ref('')

// Table columns — contracted AssetResponse fields
const assetColumns = [
  { key: 'tag_number', label: 'Tag Number', width: '140px' },
  { key: 'asset_name', label: 'Asset Name' },
  { key: 'equipment_type', label: 'Type', width: '120px' },
  { key: 'equipment_class', label: 'Class', width: '100px' },
  { key: 'plant_code', label: 'Plant', width: '80px' },
  { key: 'discipline', label: 'Discipline', width: '110px' },
  { key: 'criticality', label: 'Criticality', width: '100px' },
  { key: 'is_active', label: 'Status', width: '90px' }
]

// Pagination (client-side per contract §11)
const totalPages = computed(() => Math.max(1, Math.ceil(assets.value.length / PAGE_SIZE)))
const paginatedAssets = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return assets.value.slice(start, start + PAGE_SIZE)
})

// Debounce timer for search
let searchTimer = null
const debouncedFetch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchAssets()
  }, 350)
}

// Fetch assets with filters — GET /api/v1/assets
const fetchAssets = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.plant) params.plant = filters.value.plant
    if (filters.value.equipment_type) params.equipment_type = filters.value.equipment_type
    if (filters.value.criticality) params.criticality = filters.value.criticality
    if (filters.value.is_active !== '') params.is_active = filters.value.is_active

    const { data } = await apiClient.get(ENDPOINTS.ASSETS, { params })
    assets.value = data.data || []
    page.value = 1

    // Populate filter dropdowns from full data on first load
    if (!plantOptions.value.length) {
      populateFilterOptions(assets.value)
    }
  } catch (err) {
    error.value = err.message || 'Failed to load equipment register.'
    assets.value = []
  } finally {
    loading.value = false
  }
}

const populateFilterOptions = (list) => {
  const plants = new Set()
  const types = new Set()
  list.forEach(a => {
    if (a.plant_code) plants.add(a.plant_code)
    if (a.equipment_type) types.add(a.equipment_type)
  })
  plantOptions.value = [...plants].sort()
  typeOptions.value = [...types].sort()
}

// Fetch single asset detail — GET /api/v1/assets/{asset_id}
const openDetailModal = async (assetId) => {
  showDetailModal.value = true
  detailLoading.value = true
  detailError.value = ''
  detailAsset.value = null

  try {
    const { data } = await apiClient.get(ENDPOINTS.ASSET_BY_ID(assetId))
    detailAsset.value = data
  } catch (err) {
    detailError.value = err.message || 'Failed to load asset detail.'
  } finally {
    detailLoading.value = false
  }
}

const clearFilters = () => {
  filters.value = { search: '', plant: '', equipment_type: '', criticality: '', is_active: '' }
  fetchAssets()
}

onMounted(fetchAssets)
</script>

<style scoped>
.equipment-directory-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5, 20px);
}

/* View Header */
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4, 16px);
  flex-wrap: wrap;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-tertiary, #8b8fa3);
  margin-bottom: 4px;
}
.crumb-separator { opacity: 0.5; }
.crumb-active { color: var(--text-secondary, #c1c4d0); }
.view-title {
  font-size: 1.65rem;
  font-weight: 700;
  color: var(--text-primary, #e8eaf0);
  margin: 0;
}
.view-subtitle {
  font-size: 0.88rem;
  color: var(--text-tertiary, #8b8fa3);
  margin: 4px 0 0 0;
  max-width: 640px;
  line-height: 1.4;
}
.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  align-items: flex-start;
  padding-top: 18px;
}

/* Cards */
.card {
  background: var(--surface-card, #1a1c2e);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-5, 20px);
}

/* Filter Bar */
.filter-card {
  padding: var(--space-4, 16px) var(--space-5, 20px);
}
.filter-bar {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 130px;
  flex: 1;
}
.filter-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-tertiary, #8b8fa3);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.filter-control {
  padding: 8px 12px;
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-md, 8px);
  background: var(--surface-inset, #12131f);
  color: var(--text-primary, #e8eaf0);
  font-size: 0.85rem;
  transition: border-color 0.2s;
}
.filter-control:focus {
  outline: none;
  border-color: var(--primary-500, #4f8cff);
}
.filter-actions {
  justify-content: flex-end;
  min-width: auto;
  flex: 0 0 auto;
}

/* Table Card */
.table-card { padding: 0; overflow: hidden; }
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4, 16px) var(--space-5, 20px);
  border-bottom: 1px solid var(--border-default, #2a2d42);
}
.card-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #e8eaf0);
  margin: 0;
}
.record-count {
  font-weight: 400;
  font-size: 0.82rem;
  color: var(--text-tertiary, #8b8fa3);
}

/* Error Banner */
.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px var(--space-5, 20px);
  background: rgba(255, 80, 80, 0.08);
  color: var(--danger, #ff5050);
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255, 80, 80, 0.15);
}

/* Criticality Badges */
.criticality-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.4px;
}
.crit-high {
  background: rgba(255, 80, 80, 0.12);
  color: #ff6b6b;
}
.crit-medium {
  background: rgba(255, 176, 46, 0.12);
  color: #ffb02e;
}
.crit-low {
  background: rgba(75, 210, 143, 0.12);
  color: #4bd28f;
}

/* Status Dots */
.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
}
.status-dot::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot-active::before { background: #4bd28f; }
.dot-inactive::before { background: #8b8fa3; }

/* Link Button */
.link-btn {
  background: none;
  border: none;
  color: var(--primary-400, #6ba3ff);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.83rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.15s;
}
.link-btn:hover {
  text-decoration-color: var(--primary-400, #6ba3ff);
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px var(--space-5, 20px);
  border-top: 1px solid var(--border-default, #2a2d42);
}
.page-info {
  font-size: 0.82rem;
  color: var(--text-tertiary, #8b8fa3);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-md, 8px);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  transition: background 0.2s, opacity 0.2s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary {
  background: var(--primary-500, #4f8cff);
  color: #fff;
}
.btn-primary:hover:not(:disabled) { background: var(--primary-600, #3a75e0); }
.btn-outline {
  background: transparent;
  border: 1px solid var(--border-default, #2a2d42);
  color: var(--text-secondary, #c1c4d0);
}
.btn-outline:hover:not(:disabled) { border-color: var(--text-tertiary, #8b8fa3); }
.btn-sm { padding: 5px 12px; font-size: 0.78rem; }

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}
.modal-container {
  background: var(--surface-card, #1a1c2e);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-lg, 12px);
  width: 90%;
  max-width: 540px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}
.modal-lg { max-width: 600px; }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5, 20px);
  border-bottom: 1px solid var(--border-default, #2a2d42);
}
.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary, #e8eaf0);
  margin: 0;
}
.modal-subtitle {
  font-weight: 400;
  font-size: 0.9rem;
  color: var(--text-tertiary, #8b8fa3);
}
.modal-close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary, #8b8fa3);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.modal-close-btn:hover { color: var(--text-primary, #e8eaf0); }
.modal-body {
  padding: var(--space-5, 20px);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: var(--space-4, 16px) var(--space-5, 20px);
  border-top: 1px solid var(--border-default, #2a2d42);
}
.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--text-tertiary, #8b8fa3);
}
.modal-error-alert {
  padding: 12px 16px;
  border-radius: var(--radius-md, 8px);
  background: rgba(255, 80, 80, 0.08);
  border: 1px solid rgba(255, 80, 80, 0.15);
  color: var(--danger, #ff5050);
  font-size: 0.85rem;
}

/* Spinner */
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-default, #2a2d42);
  border-top-color: var(--primary-500, #4f8cff);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Detail Grid */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
}
.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-tertiary, #8b8fa3);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.detail-value {
  font-size: 0.92rem;
  color: var(--text-primary, #e8eaf0);
}
.mono-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}
</style>
