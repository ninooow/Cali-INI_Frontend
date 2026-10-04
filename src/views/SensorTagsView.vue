<template>
  <div class="sensor-tags-view">
    <!-- WHAT: View Header -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Asset Management</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">Sensor &amp; Parameters</span>
        </div>
        <h1 class="view-title">Sensor &amp; Parameter Mapping</h1>
        <p class="view-subtitle">Review sensor mappings and measurement parameters assigned to plant assets.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateNotice">+ Add Sensor Mapping</button>
      </div>
    </header>

    <!-- WHY: Filter Bar -->
    <div class="card filter-card">
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Filter by Asset</label>
          <select v-model="filters.asset_id" class="filter-control" @change="fetchTags">
            <option value="">All Assets</option>
            <option v-for="asset in assetOptions" :key="asset.asset_id" :value="asset.asset_id">
              {{ asset.tag_number ? `${asset.tag_number} - ${asset.asset_name || ''}` : `Asset #${asset.asset_id}` }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Canonical Parameter</label>
          <input
            v-model="filters.canonical_param"
            type="text"
            placeholder="e.g. vib, temp, amp"
            class="filter-control"
            @input="debouncedFetch"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label">Status</label>
          <select v-model="filters.is_active" class="filter-control" @change="fetchTags">
            <option value="">All Statuses</option>
            <option :value="true">Active Only</option>
            <option :value="false">Inactive Only</option>
          </select>
        </div>

        <div class="filter-actions">
          <button class="btn btn-outline btn-sm" @click="resetFilters">Reset</button>
        </div>
      </div>
    </div>

    <div v-if="actionNotice" class="action-notice">
      {{ actionNotice }}
      <button class="notice-close" @click="actionNotice = ''">×</button>
    </div>

    <!-- HOW: Tags List / Table -->
    <div class="card tags-card">
      <!-- Loading State -->
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p>Loading sensor tags...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="state-container error-state">
        <p class="error-msg">⚠ {{ error }}</p>
        <button class="btn btn-outline btn-sm" @click="fetchTags">Try Again</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="tags.length === 0" class="state-container empty-state">
        <p>No sensor tags found matching current criteria.</p>
      </div>

      <!-- Data Table -->
      <div v-else>
        <DataTable
          :columns="tagColumns"
          :rows="paginatedTags"
          :empty-message="'No sensor tags available.'"
        >
          <template #item-asset_id="{ item }">
            <span>{{ assetLabel(item.asset_id) }}</span>
          </template>

          <template #item-is_active="{ item }">
            <span
              v-if="item.is_active !== undefined"
              class="badge"
              :class="item.is_active ? 'badge-active' : 'badge-inactive'"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>

          <template #item-actions="{ item }">
            <div class="row-actions">
              <button class="btn btn-outline btn-xs" @click="openDetail(item)">
              View
            </button>
              <button class="btn btn-primary btn-xs" @click="showUpdateNotice">Edit</button>
            </div>
          </template>
        </DataTable>

        <!-- Pagination -->
        <div class="pagination-bar" v-if="totalPages > 1">
          <div class="pagination-left">
            <span class="pagination-info">
              Showing {{ ((page - 1) * pageSize) + 1 }}–{{ Math.min(page * pageSize, tags.length) }} of {{ tags.length }} records
            </span>
            <label class="page-size-control">
              Rows
              <select v-model.number="pageSize" class="filter-control page-size-select">
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </label>
          </div>
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
            <h3 class="modal-title">Sensor Tag Details</h3>
            <span class="modal-subtitle">Tag Mapping Record</span>
          </div>
          <button class="modal-close-btn" @click="showDetailModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="selectedTag" class="detail-grid">
            <div v-for="(val, key) in selectedTag" :key="key" class="detail-item">
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
import { ref, computed, onMounted, watch } from 'vue'
import apiClient from '../api/client.js'
import { ENDPOINTS } from '../api/endpoints.js'
import DataTable from '../components/common/DataTable.vue'

// State
const tags = ref([])
const assetOptions = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const pageSize = ref(10)
const actionNotice = ref('')

// Contracted Filters: asset_id, canonical_param, is_active
const filters = ref({
  asset_id: '',
  canonical_param: '',
  is_active: ''
})

// Modal Detail State
const showDetailModal = ref(false)
const selectedTag = ref(null)

// Dynamic columns inferred or contracted
const baseColumns = [
  { key: 'tag_id', label: 'Tag ID', width: '90px' },
  { key: 'tag_name', label: 'Tag Name' },
  { key: 'tag_number', label: 'Tag Number' },
  { key: 'canonical_param', label: 'Canonical Param' },
  { key: 'unit', label: 'Unit', width: '90px' },
  { key: 'is_active', label: 'Status', width: '100px' },
  { key: 'actions', label: 'Action', width: '110px' }
]

const tagColumns = computed(() => {
  if (tags.value.length === 0) return baseColumns
  // Check available keys in first record to show what truly exists
  const firstItem = tags.value[0]
  const keys = Object.keys(firstItem)
  const cols = []
  
  // Prefer standard keys in logical order
  const order = ['tag_id', 'id', 'asset_id', 'tag_name', 'tag_number', 'sensor_tag', 'canonical_param', 'parameter', 'unit', 'is_active']
  order.forEach(k => {
    if (keys.includes(k) && !cols.some(c => c.key === k)) {
      cols.push({
        key: k,
        label: k === 'asset_id' ? 'Asset' : formatKey(k),
        width: k === 'is_active' ? '100px' : k.endsWith('_id') || k === 'id' ? '90px' : undefined
      })
    }
  })

  // Append any other unknown returned keys
  keys.forEach(k => {
    if (k !== 'source_sheet' && !cols.some(c => c.key === k) && typeof firstItem[k] !== 'object') {
      cols.push({ key: k, label: formatKey(k) })
    }
  })

  // Always keep action column
  cols.push({ key: 'actions', label: 'Action', width: '110px' })
  return cols
})

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(tags.value.length / pageSize.value)))
const paginatedTags = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return tags.value.slice(start, start + pageSize.value)
})

// Debounce helper
let searchTimer = null
const debouncedFetch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchTags()
  }, 350)
}

const resetFilters = () => {
  filters.value.asset_id = ''
  filters.value.canonical_param = ''
  filters.value.is_active = ''
  page.value = 1
  fetchTags()
}

// Fetch Assets for the dropdown selector
const fetchAssetsList = async () => {
  try {
    const { data } = await apiClient.get(ENDPOINTS.ASSETS)
    assetOptions.value = data.data || []
  } catch (e) {
    // Non-fatal if asset list fails to load
    console.error('Failed to load asset list for filter:', e)
  }
}

// Fetch Sensor Tags
const fetchTags = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (filters.value.asset_id) params.asset_id = filters.value.asset_id
    if (filters.value.canonical_param?.trim()) {
      params.canonical_param = filters.value.canonical_param.trim()
    }
    if (filters.value.is_active !== '') params.is_active = filters.value.is_active

    const { data } = await apiClient.get(ENDPOINTS.SENSOR_TAGS, { params })
    const payload = data?.data ?? data?.items ?? data
    tags.value = Array.isArray(payload) ? payload : []
    page.value = 1
  } catch (err) {
    console.error('Failed to load sensor tags:', err)
    error.value = err.response?.data?.detail || err.message || 'Failed to load sensor tags.'
    tags.value = []
  } finally {
    loading.value = false
  }
}

const assetLabel = (assetId) => {
  const asset = assetOptions.value.find(a => String(a.asset_id) === String(assetId))
  if (!asset) return assetId ?? '—'
  return asset.tag_number
    ? `${asset.tag_number}${asset.asset_name ? ` — ${asset.asset_name}` : ''}`
    : (asset.asset_name || assetId || '—')
}

const openDetail = (row) => {
  selectedTag.value = row
  showDetailModal.value = true
}

const showCreateNotice = () => {
  actionNotice.value = 'Add Sensor Mapping is not available in the current backend API contract yet.'
}

const showUpdateNotice = () => {
  actionNotice.value = 'Update Sensor Mapping is not available in the current backend API contract yet.'
}

const formatKey = (key) => {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

watch(pageSize, () => { page.value = 1 })

onMounted(async () => {
  await fetchAssetsList()
  await fetchTags()
})
</script>

<style scoped>
.sensor-tags-view {
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
  color: var(--text-muted, #64748b);
  margin-bottom: 6px;
}

.crumb-separator { color: var(--text-muted, #64748b); }
.crumb-active { color: var(--text-secondary, #475569); }

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #0f2747);
  margin: 0 0 6px 0;
}

.view-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #475569);
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
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #dbe5f0);
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
  color: var(--text-secondary, #475569);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-control {
  padding: 8px 12px;
  background: var(--surface-alt, #f7faff);
  border: 1px solid var(--border, #dbe5f0);
  border-radius: var(--radius-md, 8px);
  color: var(--text-primary, #0f2747);
  font-size: 0.85rem;
}

.filter-control:focus {
  outline: none;
  border-color: var(--primary-blue, #1677c8);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  padding-bottom: 2px;
}

.tags-card {
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
  color: var(--text-muted, #64748b);
}

.state-container.error-state {
  color: var(--danger, #ff5050);
}

.error-msg {
  font-size: 0.9rem;
  margin: 0;
}

.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-active {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.badge-inactive {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.text-muted {
  color: var(--text-muted, #64748b);
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
  border: 1px solid var(--border, #dbe5f0);
  color: var(--text-secondary, #475569);
}

.btn-outline:hover:not(:disabled) {
  background: var(--surface-alt, #f7faff);
  color: var(--text-primary, #0f2747);
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
  border-top: 1px solid var(--border, #dbe5f0);
  flex-wrap: wrap;
  gap: 10px;
}

.pagination-info {
  font-size: 0.8rem;
  color: var(--text-muted, #64748b);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  font-size: 0.8rem;
  color: var(--text-secondary, #475569);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border, #dbe5f0);
  border-top-color: var(--primary-blue, #1677c8);
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
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #dbe5f0);
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
  border-bottom: 1px solid var(--border, #dbe5f0);
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #0f2747);
  margin: 0;
}

.modal-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted, #64748b);
}

.modal-close-btn {
  background: none;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 1.3rem;
  cursor: pointer;
  padding: 4px;
}

.modal-close-btn:hover { color: var(--text-primary, #0f2747); }

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
  background: var(--surface-alt, #f7faff);
  padding: 10px 12px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border, #dbe5f0);
}

.detail-label {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
}

.detail-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary, #0f2747);
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border, #dbe5f0);
}

.filter-card { background: var(--surface, #fff); }
.filter-bar { gap: 10px; }
.filter-control { background: var(--surface, #fff); color: var(--text-primary,#0f2747); }
.row-actions { display:flex; gap:6px; white-space:nowrap; }
.btn-primary { background:var(--primary-blue,#1677c8); color:#fff; }
.pagination-left { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.page-size-control { display:flex; align-items:center; gap:6px; font-size:.78rem; color:var(--text-muted,#64748b); }
.page-size-select { width:auto; min-width:68px; padding:4px 7px; }
.action-notice { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--surface-alt,#f7faff); border:1px solid var(--border,#dbe5f0); border-radius:8px; color:var(--text-secondary,#475569); font-size:.82rem; }
.notice-close { margin-left:auto; border:0; background:transparent; cursor:pointer; color:inherit; font-size:18px; }
.modal-backdrop { background:rgba(15,39,71,.28); }

</style>
