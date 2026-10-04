<template>
  <div class="data-input-view">
    <!-- Header with Breadcrumbs & Actions -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Operations</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">Hourly Telemetry Input</span>
        </div>
        <h1 class="view-title">Hourly Telemetry Data Input</h1>
        <p class="view-subtitle">
          Manual entry and historical log for critical asset operational measurements.
        </p>
      </div>

      <div class="header-actions">
        <button
          class="btn btn-outline"
          type="button"
          :disabled="runningAnalysis"
          @click="runAnalysis"
        >
          <span v-if="runningAnalysis" class="run-btn-content">
            <span class="run-spinner" aria-hidden="true"></span>
            Running {{ analysisElapsedLabel }}
          </span>
          <span v-else>Run Analysis</span>
        </button>

        <button class="btn btn-primary" @click="openModal" :disabled="runningAnalysis">
          <span>+ Input Data</span>
        </button>
      </div>
    </header>

    <div v-if="runningAnalysis" class="analysis-running-card" role="status" aria-live="polite">
      <div class="analysis-running-top">
        <div class="analysis-running-copy">
          <span class="analysis-pulse" aria-hidden="true"></span>
          <div>
            <strong>Analysis is running</strong>
            <p>Processing telemetry, condition, forecast, RCA, and KPI results. This may take a few minutes.</p>
          </div>
        </div>
        <span class="analysis-timer">{{ analysisElapsedLabel }}</span>
      </div>
      <div class="analysis-progress-track" aria-hidden="true">
        <span class="analysis-progress-bar"></span>
      </div>
      <span class="analysis-running-note">Keep this page open until the analysis finishes.</span>
    </div>

    <!-- Success & Error Banners -->
    <div v-if="successMessage" class="banner banner-success">
      <span class="banner-icon">✓</span>
      <span>{{ successMessage }}</span>
      <button class="banner-close" @click="successMessage = ''">×</button>
    </div>

    <div v-if="errorMessage" class="banner banner-error">
      <span class="banner-icon">⚠</span>
      <span>{{ errorMessage }}</span>
      <button class="banner-close" @click="errorMessage = ''">×</button>
    </div>

    <!-- Compact Filters -->
    <section class="card filter-card">
      <div class="filter-toolbar">
        <select v-model="filterAssetId" class="filter-control" @change="applyFilters">
          <option value="">All Assets</option>
          <option v-for="asset in assets" :key="asset.asset_id" :value="asset.asset_id">
            {{ asset.tag_number }} — {{ asset.asset_name }}
          </option>
        </select>

        <div class="date-range-wrap">
          <button type="button" class="filter-control date-range-trigger" @click="showDateRange = !showDateRange">
            {{ dateRangeLabel }}
          </button>
          <div v-if="showDateRange" class="date-range-popover">
            <div>
              <label class="filter-label">Start</label>
              <input v-model="filterDateFrom" type="datetime-local" class="filter-control" />
            </div>
            <span class="date-arrow">→</span>
            <div>
              <label class="filter-label">End</label>
              <input v-model="filterDateTo" type="datetime-local" class="filter-control" />
            </div>
            <button type="button" class="btn btn-primary" @click="applyDateRange">Apply</button>
          </div>
        </div>

        <select v-model="filterRunStatus" class="filter-control" @change="applyFilters">
          <option value="">All Statuses</option>
          <option value="ON">ON</option>
          <option value="OFF">OFF</option>
        </select>

        <button class="btn btn-outline btn-reset" @click="resetFilters">Reset</button>
      </div>
    </section>

    <!-- Telemetry Table Section -->
    <section class="table-section">
      <div class="section-meta">
        <span class="record-count">
          Showing {{ pageStart + 1 }}–{{ Math.min(pageStart + pageSize, filteredTelemetry.length) }} of {{ filteredTelemetry.length }} records
        </span>
        <span class="sort-notice">Sorted by measured_at (DESC)</span>
      </div>

      <DataTable
        :columns="tableColumns"
        :rows="paginatedTelemetry"
        :loading="loadingTelemetry"
        empty-message="No hourly measurement records found matching the filter criteria."
      >
        <template #item-measured_at="{ item }">
          <span class="mono-text">{{ formatTimestamp(item.measured_at) }}</span>
        </template>

        <template #item-asset="{ item }">
          <div class="asset-column">
            <span class="asset-tag">{{ getAssetTag(item.asset_id) }}</span>
          </div>
        </template>

        <template #item-feed="{ item }">
          <span class="num-cell">{{ formatNumber(item.feed) }}</span>
        </template>

        <template #item-disp="{ item }">
          <span class="num-cell">{{ formatNumber(item.disp) }}</span>
        </template>

        <template #item-vib="{ item }">
          <span class="num-cell">{{ formatNumber(item.vib, 2) }}</span>
        </template>

        <template #item-temp="{ item }">
          <span class="num-cell">{{ formatNumber(item.temp, 1) }}</span>
        </template>

        <template #item-amp="{ item }">
          <span class="num-cell">{{ formatNumber(item.amp, 1) }}</span>
        </template>

        <template #item-plant_rate="{ item }">
          <span class="num-cell">{{ formatNumber(item.plant_rate, 1) }}</span>
        </template>

        <template #item-run_status="{ item }">
          <span :class="['status-pill', `status-${(item.run_status || 'UNKNOWN').toLowerCase()}`]">
            {{ item.run_status || 'UNKNOWN' }}
          </span>
        </template>        <template #item-actions="{ item }">
          <div class="row-actions">
            <button type="button" class="action-btn" @click="showUnavailableAction('Edit', item)">Edit</button>
            <button type="button" class="action-btn action-delete" @click="showUnavailableAction('Delete', item)">Delete</button>
          </div>
        </template>
      </DataTable>

      <div v-if="filteredTelemetry.length" class="pagination-bar">
        <div class="page-size">
          <span>Rows per page</span>
          <select v-model.number="pageSize" class="filter-control page-size-select" @change="currentPage = 1">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
        <div class="page-nav">
          <button class="btn btn-outline page-btn" :disabled="currentPage <= 1" @click="currentPage--">Previous</button>
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <button class="btn btn-outline page-btn" :disabled="currentPage >= totalPages" @click="currentPage++">Next</button>
        </div>
      </div>
    </section>

    <!-- Input Modal / Dialog -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">Input Hourly Operational Data</h2>
          <button class="modal-close-btn" @click="closeModal">×</button>
        </div>

        <form @submit.prevent="submitForm">
          <div class="modal-body">
            <div v-if="formError" class="modal-error-alert">
              <span>⚠ {{ formError }}</span>
            </div>

            <!-- Primary Identifiers -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label required">Asset</label>
                <select v-model="formData.asset_id" class="form-control" required>
                  <option disabled value="">Select monitored asset...</option>
                  <option v-for="asset in assets" :key="asset.asset_id" :value="asset.asset_id">
                    {{ asset.tag_number }} — {{ asset.asset_name }}
                  </option>
                </select>
              </div>

              <div class="form-group flex-1">
                <label class="form-label required">Timestamp (Hourly)</label>
                <input
                  v-model="formData.measured_at"
                  type="datetime-local"
                  class="form-control"
                  required
                />
              </div>
            </div>

            <!-- Operating Parameters -->
            <div class="form-divider">
              <span class="divider-text">Operating Parameters</span>
            </div>

            <div class="form-grid-params">
              <div class="form-group">
                <label class="form-label">FEED (Feed Rate)</label>
                <input
                  v-model.number="formData.feed"
                  type="number"
                  step="any"
                  placeholder="e.g. 125.4"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label">DISP (Discharge)</label>
                <input
                  v-model.number="formData.disp"
                  type="number"
                  step="any"
                  placeholder="e.g. 4.2"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label">VIB (Vibration Amplitude)</label>
                <input
                  v-model.number="formData.vib"
                  type="number"
                  step="any"
                  placeholder="e.g. 2.15"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label">TEMP (Temperature)</label>
                <input
                  v-model.number="formData.temp"
                  type="number"
                  step="any"
                  placeholder="e.g. 68.4"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label">AMP (Motor Current)</label>
                <input
                  v-model.number="formData.amp"
                  type="number"
                  step="any"
                  placeholder="e.g. 142.0"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Plant Rate (%)</label>
                <input
                  v-model.number="formData.plant_rate"
                  type="number"
                  step="any"
                  placeholder="e.g. 98.5"
                  class="form-control"
                />
              </div>
            </div>

            <!-- Run Status -->
            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label required">Run Status</label>
                <select v-model="formData.run_status" class="form-control" required>
                  <option value="ON">ON (Operating)</option>
                  <option value="OFF">OFF (Standby / Tripped)</option>
                </select>
              </div>
              </div>
            </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="closeModal" :disabled="submitting">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting">Saving to Database...</span>
              <span v-else>Save Data</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'
import DataTable from '@/components/common/DataTable.vue'

// State
const assets = ref([])
const telemetryRows = ref([])
const loadingTelemetry = ref(false)
const submitting = ref(false)
const runningAnalysis = ref(false)
const analysisElapsedSeconds = ref(0)
let analysisTimerId = null
const successMessage = ref('')
const errorMessage = ref('')
const formError = ref('')
const showModal = ref(false)
const showDateRange = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

// Filters
const filterAssetId = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterRunStatus = ref('')

// Form state
const formData = ref({
  asset_id: '',
  measured_at: '',
  feed: null,
  disp: null,
  vib: null,
  temp: null,
  amp: null,
  plant_rate: null,
  run_status: 'ON'
})

// Table Columns strictly matching contract
const tableColumns = [
  { key: 'measured_at', label: 'Timestamp', width: '16%' },
  { key: 'asset', label: 'Asset', width: '14%' },
  { key: 'feed', label: 'FEED', align: 'right', width: '9%' },
  { key: 'disp', label: 'DISP', align: 'right', width: '9%' },
  { key: 'vib', label: 'VIB', align: 'right', width: '9%' },
  { key: 'temp', label: 'TEMP', align: 'right', width: '9%' },
  { key: 'amp', label: 'AMP', align: 'right', width: '9%' },
  { key: 'plant_rate', label: 'Plant Rate', align: 'right', width: '10%' },
  { key: 'run_status', label: 'Run Status', align: 'center', width: '10%' },
  { key: 'actions', label: 'Actions', align: 'center', width: '12%' }
]

// Filtered view
const filteredTelemetry = computed(() => {
  return telemetryRows.value.filter(row => {
    if (filterRunStatus.value && (row.run_status || '').toUpperCase() !== filterRunStatus.value) {
      return false
    }
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTelemetry.value.length / pageSize.value)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize.value)
const paginatedTelemetry = computed(() =>
  filteredTelemetry.value.slice(pageStart.value, pageStart.value + pageSize.value)
)
const dateRangeLabel = computed(() => {
  if (!filterDateFrom.value && !filterDateTo.value) return 'Date Range'
  const fmt = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '…'
  return `${fmt(filterDateFrom.value)} → ${fmt(filterDateTo.value)}`
})

const analysisElapsedLabel = computed(() => {
  const minutes = Math.floor(analysisElapsedSeconds.value / 60)
  const seconds = analysisElapsedSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const startAnalysisTimer = () => {
  analysisElapsedSeconds.value = 0
  if (analysisTimerId) clearInterval(analysisTimerId)
  analysisTimerId = setInterval(() => {
    analysisElapsedSeconds.value += 1
  }, 1000)
}

const stopAnalysisTimer = () => {
  if (analysisTimerId) {
    clearInterval(analysisTimerId)
    analysisTimerId = null
  }
}

const applyFilters = () => {
  currentPage.value = 1
  fetchTelemetry()
}

const applyDateRange = () => {
  showDateRange.value = false
  applyFilters()
}

const showUnavailableAction = (action) => {
  successMessage.value = ''
  errorMessage.value = `${action} is not available yet because the telemetry API does not provide an ${action.toLowerCase()} endpoint.`
}

// Helper functions
const getAssetTag = (assetId) => {
  const match = assets.value.find(a => a.asset_id === assetId)
  return match ? match.tag_number : `Asset #${assetId}`
}

const formatTimestamp = (val) => {
  if (!val) return '—'
  try {
    const d = new Date(val)
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return val
  }
}

const formatNumber = (val, decimals = 1) => {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return Number(val).toFixed(decimals)
}

const resetFilters = () => {
  filterAssetId.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterRunStatus.value = ''
  currentPage.value = 1
  showDateRange.value = false
  fetchTelemetry()
}

// Data fetching
const fetchAssets = async () => {
  try {
    const res = await apiClient.get(ENDPOINTS.ASSETS)
    assets.value = res.data?.data || []
  } catch (err) {
    console.error('Failed to load assets list:', err)
  }
}

const fetchTelemetry = async () => {
  loadingTelemetry.value = true
  errorMessage.value = ''
  try {
    const params = {}
    if (filterAssetId.value) params.asset_id = filterAssetId.value
    if (filterDateFrom.value) params.start = new Date(filterDateFrom.value).toISOString()
    if (filterDateTo.value) params.end = new Date(filterDateTo.value).toISOString()

    const res = await apiClient.get(ENDPOINTS.TELEMETRY_HOURLY, { params })
    telemetryRows.value = res.data?.data || []
  } catch (err) {
    errorMessage.value = err.message || 'Failed to retrieve telemetry measurements.'
  } finally {
    loadingTelemetry.value = false
  }
}

// Form Modal Handling
const openModal = () => {
  formError.value = ''
  // Default timestamp: current top of hour in local ISO format (YYYY-MM-DDTHH:mm)
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  formData.value = {
    asset_id: assets.value.length > 0 ? assets.value[0].asset_id : '',
    measured_at: localIso,
    feed: null,
    disp: null,
    vib: null,
    temp: null,
    amp: null,
    plant_rate: null,
    run_status: 'ON'
  }
  showModal.value = true
}

const closeModal = () => {
  if (!submitting.value) {
    showModal.value = false
  }
}

// Analysis execution
const runAnalysis = async () => {
  if (runningAnalysis.value) return

  runningAnalysis.value = true
  startAnalysisTimer()
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const res = await apiClient.post(
      ENDPOINTS.ANALYTICS_RUNS,
      {},
      { timeout: 360000 }
    )

    const run = res.data || {}

    if (run.status === 'COMPLETED') {
      successMessage.value = `Analysis completed successfully (Run #${run.run_id}). Dashboard analytics and forecasts are now updated.`
    } else {
      successMessage.value = `Analysis request finished with status: ${run.status || 'UNKNOWN'}.`
    }
  } catch (err) {
    errorMessage.value =
      err.response?.data?.detail ||
      err.message ||
      'Failed to run analysis.'
  } finally {
    stopAnalysisTimer()
    runningAnalysis.value = false
  }
}

// Submission
const submitForm = async () => {
  formError.value = ''

  if (!formData.value.asset_id) {
    formError.value = 'Please select an asset.'
    return
  }
  if (!formData.value.measured_at) {
    formError.value = 'Please specify the measurement timestamp.'
    return
  }

  submitting.value = true
  try {
    // Construct single item in bulk array strictly matching contract
    const payload = [
      {
        asset_id: Number(formData.value.asset_id),
        measured_at: new Date(formData.value.measured_at).toISOString(),
        feed: formData.value.feed !== null && formData.value.feed !== '' ? Number(formData.value.feed) : null,
        disp: formData.value.disp !== null && formData.value.disp !== '' ? Number(formData.value.disp) : null,
        vib: formData.value.vib !== null && formData.value.vib !== '' ? Number(formData.value.vib) : null,
        temp: formData.value.temp !== null && formData.value.temp !== '' ? Number(formData.value.temp) : null,
        amp: formData.value.amp !== null && formData.value.amp !== '' ? Number(formData.value.amp) : null,
        plant_rate: formData.value.plant_rate !== null && formData.value.plant_rate !== '' ? Number(formData.value.plant_rate) : null,
        run_status: formData.value.run_status || 'ON'
      }
    ]

    await apiClient.post(ENDPOINTS.TELEMETRY_HOURLY, payload)

    successMessage.value = 'Hourly measurement record successfully saved.'
    closeModal()
    await fetchTelemetry()
  } catch (err) {
    formError.value = err.message || 'Failed to submit hourly telemetry.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await fetchAssets()
  await fetchTelemetry()
})

onUnmounted(() => {
  stopAnalysisTimer()
})
</script>

<style scoped>
.data-input-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1300px;
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
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.crumb-separator {
  color: var(--border);
}

.crumb-active {
  color: var(--primary-navy);
  font-weight: 600;
}

.view-title {
  font-size: var(--font-size-2xl);
  color: var(--primary-dark);
  font-weight: 700;
}

.view-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Analysis running feedback */
.run-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.run-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: runSpin .7s linear infinite;
}

.analysis-running-card {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.analysis-running-top,
.analysis-running-copy {
  display: flex;
  align-items: center;
}

.analysis-running-top {
  justify-content: space-between;
  gap: 18px;
}

.analysis-running-copy {
  gap: 12px;
  min-width: 0;
}

.analysis-running-copy strong {
  display: block;
  color: var(--primary-dark);
  font-size: var(--font-size-sm);
}

.analysis-running-copy p,
.analysis-running-note {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.analysis-running-copy p { margin: 2px 0 0; }

.analysis-pulse {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 50%;
  background: var(--primary-blue);
  animation: analysisPulse 1.3s ease-in-out infinite;
}

.analysis-timer {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--primary-blue);
  font-size: var(--font-size-sm);
}

.analysis-progress-track {
  height: 4px;
  margin: 12px 0 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-alt);
}

.analysis-progress-bar {
  display: block;
  width: 34%;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-blue);
  animation: analysisProgress 1.6s ease-in-out infinite;
}

.analysis-running-note { display: block; }

@keyframes runSpin { to { transform: rotate(360deg); } }
@keyframes analysisPulse {
  0%, 100% { opacity: .35; transform: scale(.8); }
  50% { opacity: 1; transform: scale(1.15); }
}
@keyframes analysisProgress {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(300%); }
}

@media (prefers-reduced-motion: reduce) {
  .run-spinner, .analysis-pulse, .analysis-progress-bar { animation: none; }
}

@media (max-width: 640px) {
  .analysis-running-top { align-items: flex-start; }
  .analysis-running-copy p { line-height: 1.4; }
}

/* Banners */
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.banner-success {
  background-color: var(--status-normal-bg);
  color: var(--status-normal-text);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.banner-error {
  background-color: var(--status-alarm-bg);
  color: var(--status-alarm-text);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.banner-icon {
  font-weight: 700;
  font-size: 16px;
}

.banner-close {
  margin-left: auto;
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
}

/* Filter Card */
.filter-card {
  padding: 16px 20px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) auto;
  gap: 16px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-navy);
}

.filter-control {
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--surface);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s ease;
}

.filter-control:focus {
  border-color: var(--primary-blue);
}

.filter-actions-col {
  display: flex;
  align-items: center;
}

.btn-reset {
  padding: 8px 14px;
}

/* Table Section */
.table-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.record-count {
  font-weight: 500;
}

.sort-notice {
  font-style: italic;
}

.mono-text {
  font-family: monospace;
  font-size: 13px;
  color: var(--text-primary);
}

.asset-tag {
  font-weight: 600;
  color: var(--primary-dark);
}

.num-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.status-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.03em;
}

.status-on {
  background-color: var(--status-normal-bg);
  color: var(--status-normal-text);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-off {
  background-color: var(--status-alarm-bg);
  color: var(--status-alarm-text);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-unknown {
  background-color: var(--status-gap-bg);
  color: var(--status-gap-text);
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.source-tag {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(12, 47, 122, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-hover);
  width: 90%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--primary-dark);
}

.modal-close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
}

.modal-close-btn:hover {
  color: var(--primary-dark);
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-error-alert {
  background-color: var(--status-alarm-bg);
  color: var(--status-alarm-text);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.form-row {
  display: flex;
  gap: 16px;
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
  transition: border-color 0.15s ease;
}

.form-control:focus {
  border-color: var(--primary-blue);
}

.bg-readonly {
  background-color: var(--surface-alt);
  color: var(--text-muted);
  cursor: not-allowed;
}

.form-divider {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  margin: 8px 0;
}

.divider-text {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  padding-bottom: 4px;
}

.form-grid-params {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background-color: var(--surface-alt);
}

/* Compact filter toolbar */
.filter-card { padding: 10px 12px; overflow: visible; }
.filter-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-toolbar > .filter-control { width: auto; min-width: 150px; }
.date-range-wrap { position: relative; }
.date-range-trigger { min-width: 190px; text-align: left; cursor: pointer; }
.date-range-popover {
  position: absolute; z-index: 50; top: calc(100% + 8px); left: 0;
  display: flex; align-items: flex-end; gap: 10px;
  padding: 12px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-hover);
  white-space: nowrap;
}
.date-range-popover > div { display: flex; flex-direction: column; gap: 5px; }
.date-arrow { padding-bottom: 9px; color: var(--text-muted); }
.row-actions { display: flex; justify-content: center; gap: 6px; }
.action-btn {
  border: 1px solid var(--border); background: var(--surface); color: var(--primary-blue);
  border-radius: var(--radius-sm); padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: 600;
}
.action-btn:hover { background: var(--surface-alt); }
.action-delete { color: var(--priority-p1); }
.pagination-bar {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding-top: 4px; font-size: var(--font-size-xs); color: var(--text-secondary);
}
.page-size, .page-nav { display: flex; align-items: center; gap: 8px; }
.page-size-select { min-width: 68px; padding: 5px 8px; }
.page-btn { padding: 5px 10px; }
.page-btn:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 760px) {
  .date-range-popover { flex-direction: column; align-items: stretch; white-space: normal; }
  .date-arrow { display: none; }
  .pagination-bar { align-items: flex-start; flex-direction: column; }
}

</style>
