<template>
  <div class="capa-view">
    <!-- WHAT: View Header -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Reliability</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">CAPA Tracking</span>
        </div>
        <h1 class="view-title">Corrective &amp; Preventive Action Tracking</h1>
        <p class="view-subtitle">
          Track and review CAPA actions linked to RCA investigations. Each action is scoped to an AR Number.
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-outline" @click="refreshCapa" :disabled="loadingCapa">
          <span v-if="loadingCapa">Refreshing...</span>
          <span v-else>↻ Refresh</span>
        </button>
      </div>
    </header>

    <!-- RCA Worklist: visible immediately -->
    <div class="card rca-list-card">
      <div class="section-header-bar">
        <div>
          <h2 class="section-title">RCA Investigations</h2>
          <span class="section-count">{{ filteredRcaList.length }} records</span>
        </div>
        <div class="rca-filter-row">
          <input
            v-model="rcaSearch"
            type="text"
            placeholder="Search AR No or Tag Number..."
            class="filter-control rca-search-control"
          />
          <button v-if="rcaSearch" class="btn btn-outline btn-reset" @click="rcaSearch = ''">Reset</button>
        </div>
      </div>

      <div v-if="loadingRcaList" class="inline-loading">
        <div class="spinner-sm"></div>
        <span>Loading RCA headers...</span>
      </div>

      <div v-if="rcaListError" class="inline-error">
        <span>⚠ {{ rcaListError }}</span>
      </div>

      <DataTable
        v-if="!loadingRcaList"
        :columns="rcaColumns"
        :rows="paginatedRcaList"
        :loading="loadingRcaList"
        empty-message="No RCA investigations found."
      >
        <template #item-ar_no="{ item }">
          <span class="mono-code">{{ item.ar_no }}</span>
        </template>

        <template #item-tag_number="{ item }">
          <span>{{ item.tag_number || '—' }}</span>
        </template>

        <template #item-pre_risk="{ item }">
          <span :class="['risk-pill', `risk-${(item.pre_risk || 'MEDIUM').toLowerCase()}`]">
            {{ item.pre_risk || '—' }}
          </span>
        </template>

        <template #item-actions="{ item }">
          <button
            class="btn btn-sm"
            :class="selectedArNo === item.ar_no ? 'btn-primary' : 'btn-outline'"
            @click="selectRca(item)"
          >
            {{ selectedArNo === item.ar_no ? 'Selected' : 'View CAPA' }}
          </button>
        </template>
      </DataTable>

      <div class="pagination-bar" v-if="filteredRcaList.length">
        <label class="page-size-control">
          Rows
          <select v-model.number="rcaPageSize" class="filter-control page-size-select">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
        <button class="btn btn-outline btn-sm" :disabled="rcaPage <= 1" @click="rcaPage--">← Prev</button>
        <span class="page-info">Page {{ rcaPage }} of {{ rcaTotalPages }}</span>
        <button class="btn btn-outline btn-sm" :disabled="rcaPage >= rcaTotalPages" @click="rcaPage++">Next →</button>
      </div>
    </div>

    <!-- Banners -->
    <div v-if="successBanner" class="banner banner-success">
      <span class="banner-icon">✓</span>
      <span>{{ successBanner }}</span>
      <button class="banner-close" @click="successBanner = ''">×</button>
    </div>

    <div v-if="errorBanner" class="banner banner-error">
      <span class="banner-icon">⚠</span>
      <span>{{ errorBanner }}</span>
      <button class="banner-close" @click="errorBanner = ''">×</button>
    </div>

        <!-- Combined Problem → RCA → CAPA modal -->
    <div v-if="showDetailModal" class="modal-backdrop detail-backdrop" @click.self="closeRcaSelection">
      <div class="modal-container capa-detail-modal">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Problem, RCA &amp; CAPA</h2>
            <span class="modal-subtitle">{{ selectedArNo }}</span>
          </div>
          <button class="modal-close-btn" @click="closeRcaSelection">×</button>
        </div>
        <div class="modal-body capa-detail-body">
<!-- HOW: RCA Context Summary -->
    <div v-if="selectedRcaHeader && !loadingRcaDetail" class="card rca-context-card">
      <div class="context-header">
        <div class="context-left">
          <span class="mono-ar-large">{{ selectedRcaHeader.ar_no }}</span>
          <span :class="['risk-pill', `risk-${(selectedRcaHeader.pre_risk || 'MEDIUM').toLowerCase()}`]">
            {{ selectedRcaHeader.pre_risk || '—' }}
          </span>
        </div>
        <div class="context-meta">
          <span><strong>Tag:</strong> {{ selectedRcaHeader.tag_number || '—' }}</span>
          <span class="meta-dot">•</span>
          <span><strong>Plant:</strong> {{ selectedRcaHeader.plant || '—' }}</span>
          <span class="meta-dot">•</span>
          <span><strong>PIC:</strong> {{ selectedRcaHeader.pic_rca || '—' }}</span>
        </div>
      </div>
      <div class="context-statements">
        <div class="context-stmt">
          <span class="stmt-label">1 · Problem</span>
          <p>{{ selectedRcaHeader.problem_statement || 'No problem statement recorded.' }}</p>
        </div>
        <div class="context-stmt">
          <span class="stmt-label">2 · RCA — Root Cause</span>
          <p>{{ selectedRcaHeader.root_cause_statement || 'No root cause statement recorded.' }}</p>
        </div>
      </div>
    </div>

    <div v-if="loadingRcaDetail" class="card loading-card">
      <div class="spinner"></div>
      <span>Loading RCA header details...</span>
    </div>

    <!-- HOW: CAPA Actions Table -->
    <div v-if="selectedArNo" class="capa-table-section">
      <div class="section-header-bar">
        <div>
          <h2 class="section-title">3 · CAPA Actions — {{ selectedArNo }}</h2>
          <span class="section-count">{{ paginatedCapas.length }} of {{ capaList.length }} actions</span>
        </div>
      </div>

      <DataTable
        :columns="capaColumns"
        :rows="paginatedCapas"
        :loading="loadingCapa"
        empty-message="No CAPA actions registered for this AR."
      >
        <template #item-rc="{ item }">
          <span class="mono-code">{{ item.rc || '—' }}</span>
        </template>

        <template #item-action_type="{ item }">
          <span :class="['type-badge', `type-${(item.action_type || '').toLowerCase()}`]">
            {{ item.action_type || '—' }}
          </span>
        </template>

        <template #item-action_plan="{ item }">
          <span class="plan-text" :title="item.action_plan">{{ item.action_plan || '—' }}</span>
        </template>

        <template #item-pic="{ item }">
          <span>{{ item.pic || 'Unassigned' }}</span>
        </template>

        <template #item-target_date="{ item }">
          <span>{{ formatDate(item.target_date) }}</span>
        </template>

        <template #item-status="{ item }">
          <span :class="['status-pill', `status-${(item.status || 'OPEN').toLowerCase()}`]">
            {{ item.status || 'OPEN' }}
          </span>
        </template>

        <template #item-created_at="{ item }">
          <span class="date-muted">{{ formatDate(item.created_at) }}</span>
        </template>
      </DataTable>

      <!-- Pagination -->
      <div v-if="capaList.length" class="pagination-bar">
        <label class="page-size-control">
          Rows
          <select v-model.number="capaPageSize" class="filter-control page-size-select">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
        <button class="btn btn-outline btn-sm" :disabled="capaPage <= 1" @click="capaPage--">← Prev</button>
        <span class="page-info">Page {{ capaPage }} of {{ capaTotalPages }}</span>
        <button class="btn btn-outline btn-sm" :disabled="capaPage >= capaTotalPages" @click="capaPage++">Next →</button>
      </div>
    </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'
import DataTable from '@/components/common/DataTable.vue'

const route = useRoute()
const router = useRouter()

// State
const loadingRcaList = ref(false)
const loadingRcaDetail = ref(false)
const loadingCapa = ref(false)

const rcaList = ref([])
const selectedArNo = ref('')
const selectedRcaHeader = ref(null)
const capaList = ref([])
const showDetailModal = ref(false)


// Banners & Errors
const successBanner = ref('')
const errorBanner = ref('')
const rcaListError = ref('')

// Filters & Pagination
const rcaSearch = ref('')
const rcaPage = ref(1)
const rcaPageSize = ref(10)
const capaPage = ref(1)
const capaPageSize = ref(10)


// Table Columns
const rcaColumns = [
  { key: 'ar_no', label: 'AR Number', width: '18%' },
  { key: 'tag_number', label: 'Tag Number', width: '18%' },
  { key: 'plant', label: 'Plant', width: '14%' },
  { key: 'problem_statement', label: 'Problem Statement', width: '30%' },
  { key: 'pre_risk', label: 'Risk', width: '10%' },
  { key: 'actions', label: '', align: 'right', width: '10%' }
]

const capaColumns = [
  { key: 'rc', label: 'Root Cause', width: '10%' },
  { key: 'action_type', label: 'Type', width: '12%' },
  { key: 'action_plan', label: 'Action Plan', width: '32%' },
  { key: 'pic', label: 'PIC', width: '13%' },
  { key: 'target_date', label: 'Target Date', width: '12%' },
  { key: 'status', label: 'Status', align: 'center', width: '11%' },
  { key: 'created_at', label: 'Created', width: '10%' }
]

// Computed
const filteredRcaList = computed(() => {
  if (!rcaSearch.value) return rcaList.value
  const q = rcaSearch.value.toLowerCase()
  return rcaList.value.filter(r =>
    (r.ar_no || '').toLowerCase().includes(q) ||
    (r.tag_number || '').toLowerCase().includes(q)
  )
})

const rcaTotalPages = computed(() => Math.max(1, Math.ceil(filteredRcaList.value.length / rcaPageSize.value)))
const paginatedRcaList = computed(() => {
  const start = (rcaPage.value - 1) * rcaPageSize.value
  return filteredRcaList.value.slice(start, start + rcaPageSize.value)
})

const capaTotalPages = computed(() => Math.max(1, Math.ceil(capaList.value.length / capaPageSize.value)))
const paginatedCapas = computed(() => {
  const start = (capaPage.value - 1) * capaPageSize.value
  return capaList.value.slice(start, start + capaPageSize.value)
})


// Helpers
const formatDate = (isoString) => {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return isoString
  }
}


// Data Fetching
const fetchRcaList = async () => {
  loadingRcaList.value = true
  rcaListError.value = ''
  try {
    const res = await apiClient.get(ENDPOINTS.RCA)
    rcaList.value = res.data?.data || []
  } catch (err) {
    rcaListError.value = err.message || 'Failed to fetch RCA headers.'
  } finally {
    loadingRcaList.value = false
  }
}

const fetchRcaHeader = async (arNo) => {
  loadingRcaDetail.value = true
  try {
    const res = await apiClient.get(ENDPOINTS.RCA_BY_AR(arNo))
    selectedRcaHeader.value = res.data || {}
  } catch (err) {
    errorBanner.value = err.message || `Failed to fetch RCA header for ${arNo}.`
    selectedRcaHeader.value = null
  } finally {
    loadingRcaDetail.value = false
  }
}

const fetchCapaList = async (arNo) => {
  loadingCapa.value = true
  errorBanner.value = ''
  capaPage.value = 1
  try {
    const res = await apiClient.get(ENDPOINTS.RCA_CAPA(arNo))
    capaList.value = res.data?.data || []
  } catch (err) {
    errorBanner.value = err.message || `Failed to fetch CAPA actions for ${arNo}.`
    capaList.value = []
  } finally {
    loadingCapa.value = false
  }
}

const selectRca = (rca) => {
  showDetailModal.value = true
  selectedArNo.value = rca.ar_no
  successBanner.value = ''
  errorBanner.value = ''
  selectedRcaHeader.value = null
  capaList.value = []
  fetchRcaHeader(rca.ar_no)
  fetchCapaList(rca.ar_no)
}

const closeRcaSelection = () => {
  showDetailModal.value = false
  selectedArNo.value = ''
  selectedRcaHeader.value = null
  capaList.value = []
  capaPage.value = 1

  if (route.query.ar_no) {
    const query = { ...route.query }
    delete query.ar_no
    router.replace({ query })
  }
}

const refreshCapa = () => {
  if (selectedArNo.value) {
    fetchRcaHeader(selectedArNo.value)
    fetchCapaList(selectedArNo.value)
  } else {
    fetchRcaList()
  }
}


watch(rcaSearch, () => {
  rcaPage.value = 1
})

watch(rcaPageSize, () => {
  rcaPage.value = 1
})

watch(capaPageSize, () => {
  capaPage.value = 1
})

onMounted(async () => {
  await fetchRcaList()

  const targetArNo = String(route.query.ar_no || '').trim()
  if (!targetArNo) return

  const matchedRca = rcaList.value.find(
    r => String(r.ar_no || '').toLowerCase() === targetArNo.toLowerCase()
  )

  if (matchedRca) {
    selectRca(matchedRca)
  } else {
    errorBanner.value = `RCA ${targetArNo} was not found.`
  }
})
</script>

<style scoped>
.capa-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.view-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.breadcrumbs {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: 4px;
}

.crumb-separator {
  margin: 0 6px;
  color: var(--border);
}

.crumb-active {
  color: var(--primary-blue);
  font-weight: 600;
}

.view-title {
  font-size: var(--font-size-xl);
  color: var(--primary-navy);
  font-weight: 700;
  margin: 0;
}

.view-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--primary-blue);
  color: var(--text-inverse);
  border-color: var(--primary-blue);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  background: var(--surface);
  color: var(--primary-blue);
  border-color: var(--border);
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--primary-blue);
  background: var(--surface-alt);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 10px;
  font-size: var(--font-size-xs);
}

/* Card */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-card);
}

/* Selector Card */
.selector-card {
  padding: 18px 20px;
}

.selector-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.selector-label {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--primary-navy);
}

.selector-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-style: italic;
}

.selector-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.selector-search {
  flex: 1;
  min-width: 200px;
}

.selector-dropdown {
  flex: 1.5;
  min-width: 280px;
}

.filter-label {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-navy);
  margin-bottom: 6px;
}

.filter-control {
  width: 100%;
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--surface);
  color: var(--text-primary);
  outline: none;
}

.filter-control:focus {
  border-color: var(--primary-blue);
}

.inline-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.inline-error {
  margin-top: 12px;
  font-size: var(--font-size-sm);
  color: var(--status-alarm);
}

/* Spinner */
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--primary-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--primary-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Banners */
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.banner-success {
  background: var(--status-normal-bg);
  border: 1px solid var(--status-normal);
  color: var(--status-normal-text);
}

.banner-error {
  background: var(--status-alarm-bg);
  border: 1px solid var(--status-alarm);
  color: var(--status-alarm-text);
}

.banner-icon {
  font-size: 16px;
  font-weight: 700;
}

.banner-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
  padding: 0 4px;
}

/* RCA Context Card */
.rca-context-card {
  border-left: 4px solid var(--primary-blue);
}

.context-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.context-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mono-ar-large {
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--primary-dark);
}

.context-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.meta-dot {
  color: var(--border);
}

.context-statements {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.context-stmt {
  background: var(--surface-alt);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}

.stmt-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--primary-blue);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 6px;
}

.context-stmt p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: 1.5;
}

/* Loading Card */
.loading-card {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: center;
  padding: 32px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

/* Risk Pills */
.risk-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.risk-high {
  background: var(--priority-p1-bg);
  color: var(--priority-p1);
}

.risk-medium {
  background: var(--priority-p2-bg);
  color: var(--priority-p2);
}

.risk-low {
  background: var(--priority-p3-bg);
  color: var(--priority-p3);
}

/* CAPA Table Section */
.capa-table-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.section-header-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--primary-navy);
  margin: 0;
}

.section-count {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* Table cell helpers */
.mono-code {
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-dark);
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.type-corrective {
  background: var(--priority-p1-bg);
  color: var(--priority-p1);
}

.type-preventive {
  background: var(--priority-p3-bg);
  color: var(--priority-p3);
}

.plan-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: var(--font-size-sm);
  line-height: 1.4;
}

.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.status-open {
  background: var(--status-watch-bg);
  color: var(--status-watch-text);
}

.status-in_progress {
  background: var(--priority-p3-bg);
  color: var(--priority-p3);
}

.status-closed {
  background: var(--status-normal-bg);
  color: var(--status-normal-text);
}

.date-muted {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* Empty State */
.empty-state-card {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon-large {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-state-card h3 {
  font-size: var(--font-size-lg);
  color: var(--primary-navy);
  margin: 0 0 8px;
}

.empty-state-card p {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin: 0;
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px 0 4px;
}

.page-info {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: 500;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 47, 122, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-container {
  background: var(--surface);
  border-radius: var(--radius-lg);
  width: 600px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(12, 47, 122, 0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--primary-navy);
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
}

.modal-body {
  padding: 22px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--border);
}

.modal-error-alert {
  background: var(--status-alarm-bg);
  color: var(--status-alarm-text);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  margin-bottom: 14px;
}

/* Form */
.form-row {
  display: flex;
  gap: 14px;
}

.flex-1 {
  flex: 1;
}

.mt-3 {
  margin-top: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-navy);
}

.required::after {
  content: ' *';
  color: var(--priority-p1);
}

.form-control {
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--surface);
  color: var(--text-primary);
  outline: none;
}

.form-control:focus {
  border-color: var(--primary-blue);
}

/* Fingerprint info */
.fingerprint-info {
  background: var(--surface-alt);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.fp-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.fp-value {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  word-break: break-all;
}

/* Responsive */
@media (max-width: 768px) {
  .context-statements {
    grid-template-columns: 1fr;
  }
  .selector-row {
    flex-direction: column;
  }
  .form-row {
    flex-direction: column;
  }
}

/* RCA worklist */
.rca-list-card {
  padding: 18px 20px;
}

.rca-filter-row {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.rca-search-control {
  min-width: 280px;
}

.btn-reset {
  white-space: nowrap;
}

.detail-close-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 22px;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.page-size-select {
  width: auto;
  min-width: 70px;
  padding: 5px 8px;
}

@media (max-width: 768px) {
  .rca-filter-row {
    width: 100%;
    margin-left: 0;
  }

  .rca-search-control {
    min-width: 0;
  }
}


/* Combined read-only Problem → RCA → CAPA modal */
.detail-backdrop { padding: 24px; z-index: 1000; }
.capa-detail-modal { width: min(1100px, 96vw); max-width: 96vw; max-height: 90vh; overflow: hidden; }
.capa-detail-body { max-height: calc(90vh - 72px); overflow-y: auto; }
.modal-subtitle { display:block; margin-top:3px; color:var(--text-muted); font-size:var(--font-size-xs); }
@media (max-width: 768px) {
  .detail-backdrop { padding: 10px; }
  .capa-detail-modal { width:100%; max-width:100%; }
}
</style>
