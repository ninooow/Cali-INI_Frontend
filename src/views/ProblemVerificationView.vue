<template>
  <div class="problem-verification-view">
    <!-- Header with Breadcrumbs & Action -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Operations</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">Problem Verification</span>
        </div>
        <h1 class="view-title">Problem Verification</h1>
        <p class="view-subtitle">
          Human-in-the-loop engineering verification of analytical condition detections and RCA hypotheses.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" @click="fetchTickets" :disabled="loadingTickets">
          <span v-if="loadingTickets">Refreshing...</span>
          <span v-else>↻ Refresh</span>
        </button>
      </div>
    </header>

    <!-- Top Alert Banners -->
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

    <!-- Hierarchy 1: WHAT — Operational Problem Worklist -->
    <div class="workspace-grid" :class="{ 'has-selection': selectedTicket }">
      <!-- Left Column: Tickets Worklist & Filters -->
      <section class="worklist-pane">
        <!-- Filter Bar -->
        <div class="card filter-card">
          <div class="filter-header">
            <span class="filter-title">FILTER TICKETS</span>
            <button class="btn btn-outline btn-reset" @click="resetFilters">Reset</button>
          </div>
          <div class="filter-controls-row">
            <select v-model="filterAssetId" class="filter-select">
              <option value="">All Assets</option>
              <option v-for="asset in assets" :key="asset.asset_id" :value="asset.asset_id">
                {{ asset.tag_number }}
              </option>
            </select>

            <select v-model="filterPriority" class="filter-select">
              <option value="">All Priorities</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>

            <select v-model="filterTicketState" class="filter-select">
              <option value="">All States</option>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>

        <!-- Tickets Table Card -->
        <div class="tickets-table-card">
          <DataTable
            :columns="ticketTableColumns"
            :rows="paginatedTickets"
            :loading="loadingTickets"
            empty-message="No problem tickets match the current filters."
          >
            <template #item-ticket_id="{ item }">
              <div
                class="ticket-id-cell"
                :class="{ 'is-selected': selectedTicket?.ticket_id === item.ticket_id }"
                @click="selectTicket(item.ticket_id)"
              >
                <span class="ticket-key">{{ item.ticket_id }}</span>
                <span class="ticket-open-time">{{ formatTime(item.opened_at) }}</span>
              </div>
            </template>

            <template #item-asset="{ item }">
              <span class="asset-tag">{{ getAssetTag(item.asset_id) }}</span>
            </template>

            <template #item-condition_state="{ item }">
              <StatusBadge :value="item.condition_state || 'NORMAL'" type="condition" />
            </template>

            <template #item-priority="{ item }">
              <StatusBadge :value="item.priority || 'P4'" type="priority" />
            </template>

            <template #item-ticket_state="{ item }">
              <StatusBadge :value="item.ticket_state || 'OPEN'" type="ticket" />
            </template>

            <template #item-actions="{ item }">
              <button
                class="btn btn-sm"
                :class="selectedTicket?.ticket_id === item.ticket_id ? 'btn-primary' : 'btn-outline'"
                @click.stop="selectTicket(item.ticket_id)"
              >
                {{ (item.ticket_state || 'OPEN').toUpperCase() === 'CLOSED' ? 'View' : (selectedTicket?.ticket_id === item.ticket_id ? 'Selected' : 'Review') }}
              </button>
            </template>
          </DataTable>

          <div v-if="filteredTickets.length" class="pagination-bar">
            <div class="page-size">
              <span>Rows per page</span>
              <select v-model.number="pageSize" class="filter-select page-size-select" @change="currentPage = 1">
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
            <div class="page-nav">
              <button class="btn btn-outline page-btn" :disabled="currentPage <= 1" @click="currentPage--">Previous</button>
              <span>Page {{ currentPage }} of {{ totalPages }} · {{ filteredTickets.length }} records</span>
              <button class="btn btn-outline page-btn" :disabled="currentPage >= totalPages" @click="currentPage++">Next</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: WHY & HOW — Problem Workspace (Detail, Verification, History) -->
      <section v-if="selectedTicket || loadingDetail" class="detail-pane">

        <!-- Detail Loading State -->
        <div v-if="loadingDetail" class="card loading-workspace">
          <div class="spinner"></div>
          <span>Loading ticket details...</span>
        </div>

        <!-- Selected Ticket Workspace -->
        <div v-else class="workspace-card card">
          <!-- Workspace Header -->
          <div class="workspace-header">
            <div class="workspace-header-top">
              <div class="ws-badges">
                <StatusBadge :value="selectedTicket.priority" type="priority" />
                <StatusBadge :value="selectedTicket.condition_state" type="condition" />
                <StatusBadge :value="selectedTicket.ticket_state" type="ticket" />
              </div>
              <div class="workspace-header-actions">
                <span class="source-stamp">Origin: {{ selectedTicket.update_source || 'ENGINE' }}</span>
                <button type="button" class="workspace-close" title="Close detail" @click="closeTicket">×</button>
              </div>
            </div>
            <h2 class="ws-ticket-id">{{ selectedTicket.ticket_id }}</h2>
            <div class="ws-meta-row">
              <span class="ws-meta-item">
                <strong>Asset:</strong> {{ getAssetTag(selectedTicket.asset_id) }} (ID #{{ selectedTicket.asset_id }})
              </span>
              <span class="ws-meta-divider">•</span>
              <span class="ws-meta-item">
                <strong>Opened At:</strong> {{ formatTime(selectedTicket.opened_at) }}
              </span>
              <span class="ws-meta-divider">•</span>
              <span class="ws-meta-item">
                <strong>Role:</strong> {{ selectedTicket.owner_role || 'Operator' }}
              </span>
            </div>
          </div>

          <!-- Evidence first, then Verification -->
          <div class="workspace-tabs">
            <button
              class="ws-tab-btn"
              :class="{ active: activeTab === 'evidence' }"
              @click="activeTab = 'evidence'"
            >
              1. Analytical Evidence
            </button>
            <button
              class="ws-tab-btn"
              :class="{ active: activeTab === 'verification' }"
              @click="activeTab = 'verification'"
            >
              2. Verification & Action
            </button>
          </div>

          <!-- TAB 1: Analytical Evidence -->
          <div v-show="activeTab === 'evidence'" class="tab-panel">
            <div class="evidence-box">
              <div class="evidence-banner">
                <span class="info-label">Read-Only Engine Provenance</span>
                <span class="info-sub">Generated by analytical engine; immutable via frontend</span>
              </div>
              <div class="evidence-grid">
                <div class="evidence-item">
                  <span class="ev-label">Condition State</span>
                  <StatusBadge :value="selectedTicket.condition_state" type="condition" />
                </div>
                <div class="evidence-item">
                  <span class="ev-label">Analytical Priority</span>
                  <StatusBadge :value="selectedTicket.priority" type="priority" />
                </div>
                <div class="evidence-item">
                  <span class="ev-label">Matched RCA AR Number</span>
                  <button
                    v-if="selectedTicket.matched_rca_ar"
                    type="button"
                    class="rca-link-btn"
                    @click="goToCapa(selectedTicket.matched_rca_ar)"
                  >
                    {{ selectedTicket.matched_rca_ar }} →
                  </button>
                  <span v-else class="ev-value">None</span>
                </div>
                <div class="evidence-item">
                  <span class="ev-label">Evidence Strength</span>
                  <span class="badge badge-watch">{{ selectedTicket.evidence_strength || 'MODERATE' }}</span>
                </div>
                <div class="evidence-item evidence-item-wide">
                  <span class="ev-label">Why was this problem raised? (Problem)</span>
                  <span class="ev-value evidence-text">{{ problemReason }}</span>
                </div>
                <div class="evidence-item evidence-item-wide">
                  <span class="ev-label">Root-cause analysis indication (RCA)</span>
                  <span class="ev-value evidence-text">{{ rcaIndication }}</span>
                </div>
                <div class="evidence-item evidence-item-wide">
                  <span class="ev-label">Last Observation Time</span>
                  <span class="ev-value">{{ formatTime(selectedTicket.last_observation_time) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: Verification & Action -->
          <div v-show="activeTab === 'verification'" class="tab-panel">
            <form @submit.prevent="submitVerification">
              <div class="action-grid">
                <div class="form-group">
                  <label class="form-label required">Operator Decision</label>
                  <select v-model="actionForm.operator_decision" class="form-control" :disabled="isClosed" required>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option v-if="isClosed && actionForm.operator_decision === 'MONITOR'" value="MONITOR">MONITOR</option>
                    <option value="FALSE_ALARM">FALSE ALARM</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label required">Reviewer Name</label>
                  <input
                    v-model="actionForm.last_operator_name"
                    type="text"
                    :disabled="isClosed"
                    class="form-control"
                    placeholder="Reviewer name"
                    required
                  />
                </div>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Field Observation & Physical Symptoms</label>
                <textarea
                  v-model="actionForm.field_observation"
                  :disabled="isClosed"
                  rows="3"
                  class="form-control"
                  placeholder="Record field observations and physical symptoms..."
                ></textarea>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Operator Notes</label>
                <textarea
                  v-model="actionForm.operator_comment"
                  :disabled="isClosed"
                  rows="2"
                  class="form-control"
                  placeholder="Additional operator notes..."
                ></textarea>
              </div>

              <div class="automatic-state-note">
                Ticket state is managed automatically: OPEN before review, CLOSED after verification is submitted.
              </div>

              <div v-if="!isClosed" class="form-actions mt-4">
                <button type="submit" class="btn btn-primary" :disabled="submittingAction">
                  <span v-if="submittingAction">Saving Verification...</span>
                  <span v-else>Submit Verification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'
import StatusBadge from '@/components/common/StatusBadge.vue'
import DataTable from '@/components/common/DataTable.vue'

const route = useRoute()
const router = useRouter()

// State
const assets = ref([])
const tickets = ref([])
const loadingTickets = ref(false)
const loadingDetail = ref(false)
const submittingAction = ref(false)

const selectedTicket = ref(null)
const selectedRcaEvidence = ref(null)
const activeTab = ref('evidence')

const successBanner = ref('')
const errorBanner = ref('')

// Filters
const filterAssetId = ref('')
const filterPriority = ref('')
const filterTicketState = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// Verification form state
const actionForm = ref({
  operator_decision: 'CONFIRMED',
  last_operator_name: '',
  field_observation: '',
  operator_comment: ''
})

// Table Columns
const ticketTableColumns = [
  { key: 'ticket_id', label: 'Problem ID / Time', width: '22%' },
  { key: 'asset', label: 'Asset', width: '15%' },
  { key: 'condition_state', label: 'Condition', width: '15%' },
  { key: 'priority', label: 'Priority', width: '12%' },
  { key: 'ticket_state', label: 'State', width: '12%' },
  { key: 'actions', label: '', align: 'right', width: '10%' }
]

const isClosed = computed(() =>
  (selectedTicket.value?.ticket_state || '').toUpperCase() === 'CLOSED'
)

const problemReason = computed(() =>
  selectedRcaEvidence.value?.problem_statement || 'Not available'
)

const rcaIndication = computed(() =>
  selectedRcaEvidence.value?.root_cause_statement || 'Not available'
)

const fetchMatchedRcaEvidence = async (arNo) => {
  selectedRcaEvidence.value = null
  if (!arNo) return
  try {
    const res = await apiClient.get(ENDPOINTS.RCA_BY_AR(arNo))
    selectedRcaEvidence.value = res.data?.data || res.data || null
  } catch (err) {
    console.error(`Failed to load matched RCA ${arNo}:`, err)
  }
}

const goToCapa = (arNo) => {
  if (!arNo) return
  router.push({ path: '/reliability/capa', query: { ar_no: arNo } })
}

// Filtered Tickets
const filteredTickets = computed(() => {
  return tickets.value.filter(t => {
    if (filterAssetId.value && t.asset_id !== Number(filterAssetId.value)) return false
    if (filterPriority.value && (t.priority || '').toUpperCase() !== filterPriority.value) return false
    if (filterTicketState.value && (t.ticket_state || '').toUpperCase() !== filterTicketState.value) return false
    return true
  })
})


const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTickets.value.length / pageSize.value))
)

const paginatedTickets = computed(() => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  const start = (currentPage.value - 1) * pageSize.value
  return filteredTickets.value.slice(start, start + pageSize.value)
})

// Helpers
const getAssetTag = (assetId) => {
  const match = assets.value.find(a => a.asset_id === assetId)
  return match ? match.tag_number : `Asset #${assetId}`
}

const formatTime = (isoString) => {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return isoString
  }
}

const formatActionStatus = (status) => {
  return (status || 'NOT_STARTED').replace(/_/g, ' ')
}

const resetFilters = () => {
  filterAssetId.value = ''
  filterPriority.value = ''
  filterTicketState.value = ''
  currentPage.value = 1
}

// Data Fetching
const fetchAssets = async () => {
  try {
    const res = await apiClient.get(ENDPOINTS.ASSETS)
    assets.value = res.data?.data || []
  } catch (err) {
    console.error('Failed to load assets:', err)
  }
}

const fetchTickets = async () => {
  loadingTickets.value = true
  errorBanner.value = ''
  try {
    const res = await apiClient.get(ENDPOINTS.WORKFLOW_TICKETS)
    tickets.value = res.data?.data || []

    // Do not auto-open a ticket. Only honor an explicit route ticket_id.
    const targetId = route.query.ticket_id
    if (targetId && !selectedTicket.value) {
      const match = tickets.value.find(t => t.ticket_id === targetId)
      if (match) await selectTicket(targetId)
    }
  } catch (err) {
    errorBanner.value = err.message || 'Failed to retrieve workflow problem tickets.'
  } finally {
    loadingTickets.value = false
  }
}

const selectTicket = async (ticketId) => {
  loadingDetail.value = true
  try {
    // 1. Fetch ticket detail
    const resTicket = await apiClient.get(ENDPOINTS.WORKFLOW_TICKET_BY_ID(ticketId))
    const ticketObj = resTicket.data?.data || resTicket.data || {}
    selectedTicket.value = ticketObj
    await fetchMatchedRcaEvidence(ticketObj.matched_rca_ar)

    actionForm.value = {
      operator_decision: ticketObj.operator_decision || 'CONFIRMED',
      last_operator_name: ticketObj.last_operator_name || '',
      field_observation: ticketObj.field_observation || '',
      operator_comment: ticketObj.operator_comment || ''
    }
    activeTab.value = 'evidence'
  } catch (err) {
    errorBanner.value = err.message || `Failed to load details for ticket ${ticketId}`
  } finally {
    loadingDetail.value = false
  }
}

const closeTicket = () => {
  selectedTicket.value = null
  selectedRcaEvidence.value = null
  activeTab.value = 'evidence'
}

// Verification Action Submission (PATCH)
const submitVerification = async () => {
  if (!selectedTicket.value || isClosed.value) return
  submittingAction.value = true
  errorBanner.value = ''
  successBanner.value = ''

  try {
    const payload = {
      ticket_state: 'CLOSED',
      action_status: 'COMPLETED',
      operator_decision: actionForm.value.operator_decision,
      last_operator_name: actionForm.value.last_operator_name,
      operator_comment: actionForm.value.operator_comment || null,
      field_observation: actionForm.value.field_observation || null,
      last_observation_time: new Date().toISOString()
    }

    await apiClient.patch(ENDPOINTS.WORKFLOW_TICKET_BY_ID(selectedTicket.value.ticket_id), payload)

    successBanner.value = `Verification update successfully submitted for ticket ${selectedTicket.value.ticket_id}.`
    // Refresh ticket detail and audit log
    await selectTicket(selectedTicket.value.ticket_id)
    // Refresh list in background
    const listRes = await apiClient.get(ENDPOINTS.WORKFLOW_TICKETS)
    tickets.value = listRes.data?.data || []
  } catch (err) {
    errorBanner.value = err.message || 'Failed to submit verification action.'
  } finally {
    submittingAction.value = false
  }
}


onMounted(async () => {
  await fetchAssets()
  await fetchTickets()
})
</script>

<style scoped>
.problem-verification-view {
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

/* 2-Column Split Workspace */
.workspace-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: flex-start;
}

.workspace-grid.has-selection {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

/* Left Pane */
.worklist-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  padding: 14px 18px;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.filter-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.btn-link {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--primary-blue);
  cursor: pointer;
}

.btn-link:hover {
  text-decoration: underline;
}

.filter-controls-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.filter-select {
  font-family: var(--font-family-base);
  font-size: var(--font-size-xs);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
}

.filter-select:focus {
  border-color: var(--primary-blue);
}

.tickets-table-card {
  overflow: hidden;
}

.ticket-id-cell {
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.ticket-key {
  font-weight: 700;
  font-family: monospace;
  font-size: 12px;
  color: var(--primary-blue);
}

.ticket-open-time {
  font-size: 11px;
  color: var(--text-muted);
}

.asset-tag {
  font-weight: 600;
  color: var(--primary-dark);
}

.action-status-tag {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Right Pane: Workspace */
.detail-pane {
  position: sticky;
  top: calc(var(--header-height) + 16px);
}

.empty-workspace {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
}

.empty-workspace-content {
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
}

.empty-icon-large {
  font-size: 40px;
}

.loading-workspace {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.workspace-card {
  padding: 24px;
}

.workspace-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.workspace-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ws-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-stamp {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
}

.ws-ticket-id {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-dark);
  font-family: monospace;
  margin-bottom: 6px;
}

.ws-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.ws-meta-divider {
  color: var(--border);
}

/* Tabs */
.workspace-tabs {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 2px;
  margin-bottom: 20px;
}

.ws-tab-btn {
  border: none;
  background: transparent;
  padding: 8px 14px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ws-tab-btn.active {
  color: var(--primary-blue);
  border-bottom-color: var(--primary-blue);
}

.tab-panel {
  display: flex;
  flex-direction: column;
}

/* Form */
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }

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

.form-actions {
  display: flex;
  justify-content: flex-end;
}

/* Evidence Tab */
.evidence-banner {
  background: var(--surface-alt);
  border: 1px solid var(--border-subtle);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.info-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-navy);
  text-transform: uppercase;
}

.info-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.evidence-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.ev-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

.ev-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--primary-dark);
}

.mono-val {
  font-family: monospace;
}

.observation-record {
  background: #F8FAFD;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
}

.obs-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary-dark);
  margin-bottom: 6px;
}

.obs-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
}

/* History / Audit Timeline */
.audit-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
}

.audit-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--brand-blue);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.audit-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.actor-source {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-dark);
  text-transform: uppercase;
}

.actor-name {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.audit-time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: monospace;
}

.audit-transitions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 4px 0;
}

.transition-pill {
  font-size: 11px;
  background: var(--surface-alt);
  border: 1px solid var(--border-subtle);
  padding: 2px 8px;
  border-radius: 3px;
  color: var(--text-secondary);
}

.decision-pill {
  border-color: rgba(36, 119, 185, 0.3);
  color: var(--brand-blue);
}

.audit-detail-text {
  font-size: var(--font-size-xs);
  color: var(--text-primary);
  line-height: 1.4;
}

.audit-empty {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
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
  max-width: 600px;
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
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-error-alert {
  background-color: var(--status-alarm-bg);
  color: var(--status-alarm-text);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  border: 1px solid rgba(239, 68, 68, 0.3);
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

.form-row {
  display: flex;
  gap: 14px;
}

.flex-1 {
  flex: 1;
}

.btn-sm {
  padding: 4px 10px;
  font-size: var(--font-size-xs);
}

.workspace-header-actions { display: flex; align-items: center; gap: 10px; }
.workspace-close {
  width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 20px; line-height: 1;
}
.workspace-close:hover { color: var(--primary-dark); background: var(--surface-alt); }
.automatic-state-note {
  margin-top: 14px; padding: 9px 12px; border-radius: var(--radius-sm);
  background: var(--surface-alt); color: var(--text-muted); font-size: 11px;
  border: 1px solid var(--border-subtle);
}


.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}
.page-size, .page-nav { display: flex; align-items: center; gap: 8px; }
.page-size-select { min-width: 68px; }
.page-btn { padding: 5px 10px; }
.page-btn:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 760px) {
  .pagination-bar { flex-direction: column; align-items: flex-start; }
}


.evidence-item-wide { grid-column: 1 / -1; }
.evidence-text { line-height: 1.45; white-space: pre-wrap; }
.rca-link-btn {
  width: fit-content; border: 1px solid var(--primary-blue); background: var(--surface);
  color: var(--primary-blue); border-radius: var(--radius-sm); padding: 5px 9px;
  font: inherit; font-weight: 700; cursor: pointer;
}
.rca-link-btn:hover { background: var(--surface-alt); }

</style>
