<template>
  <div class="reliability-view">
    <!-- View Header -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Reliability</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">{{ activeModule === 'incidents' ? 'Incident Register' : 'RCA Investigations' }}</span>
        </div>
        <h1 class="view-title">Reliability Knowledge Base & Investigation</h1>
        <p class="view-subtitle">
          Historical equipment failure incidents, root-cause analyses (4P / 4M), and corrective action tracking.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="header-actions">
        <button class="btn btn-outline" @click="refreshData" :disabled="loadingData">
          <span v-if="loadingData">Refreshing...</span>
          <span v-else>↻ Refresh</span>
        </button>
        <button v-if="activeModule === 'incidents'" class="btn btn-primary" @click="openNewIncidentModal">
          <span>+ New Incident</span>
        </button>
        <button v-else class="btn btn-primary" @click="openNewRcaModal">
          <span>+ New RCA Header</span>
        </button>
      </div>
    </header>

    <!-- Top Navigation Switcher -->
    <div class="module-switcher">
      <button
        class="switcher-tab"
        :class="{ active: activeModule === 'incidents' }"
        @click="switchModule('incidents')"
      >
        <span class="tab-icon">📋</span>
        <span class="tab-text">Incident Register</span>
        <span class="tab-counter">{{ incidents.length }}</span>
      </button>

      <button
        class="switcher-tab"
        :class="{ active: activeModule === 'rca' }"
        @click="switchModule('rca')"
      >
        <span class="tab-icon">🔍</span>
        <span class="tab-text">RCA Investigations</span>
        <span class="tab-counter">{{ rcaHeaders.length }}</span>
      </button>
    </div>

    <!-- Alert Banners -->
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

    <!-- MODULE 1: INCIDENT REGISTER -->
    <div v-if="activeModule === 'incidents'" class="incidents-container">
      <!-- Filter Bar -->
      <div class="card filter-card">
        <div class="filter-row">
          <div class="filter-item search-item">
            <label class="filter-label">Search</label>
            <input
              v-model="incidentSearch"
              type="text"
              placeholder="Search AR No, equipment, failure mechanism..."
              class="filter-control"
            />
          </div>

          <div class="filter-item">
            <label class="filter-label">Plant</label>
            <select v-model="filterPlant" class="filter-control">
              <option value="">All Plants</option>
              <option v-for="p in uniquePlants" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Status</label>
            <select v-model="filterIncidentStatus" class="filter-control">
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div class="filter-actions-col">
            <button class="btn btn-outline btn-reset" @click="resetIncidentFilters">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Incident Table -->
      <div class="table-section">
        <div class="section-meta">
          <span>Showing {{ paginatedIncidents.length }} of {{ filteredIncidents.length }} incidents ({{ incidents.length }} total)</span>
          <span class="sort-notice">Ordered by incident_id</span>
        </div>

        <DataTable
          :columns="incidentTableColumns"
          :rows="paginatedIncidents"
          :loading="loadingData"
          empty-message="No incident records found matching filter criteria."
        >
          <template #item-ar_no="{ item }">
            <span class="mono-ar" @click="viewIncidentDetail(item)">{{ item.ar_no }}</span>
          </template>

          <template #item-plant="{ item }">
            <span class="plant-badge">{{ item.plant || '—' }}</span>
          </template>

          <template #item-equipment="{ item }">
            <div class="equip-cell">
              <span class="equip-type">{{ item.equipment_type || item.equipment_class || '—' }}</span>
              <span v-if="item.component" class="equip-component">{{ item.component }}</span>
            </div>
          </template>

          <template #item-date_of_occurrence="{ item }">
            <span>{{ formatDate(item.date_of_occurrence) }}</span>
          </template>

          <template #item-downtime_hours="{ item }">
            <span class="num-cell">{{ item.downtime_hours !== null && item.downtime_hours !== undefined ? `${item.downtime_hours} h` : '—' }}</span>
          </template>

          <template #item-total_loss_kusd="{ item }">
            <span class="num-cell loss-val">{{ item.total_loss_kusd !== null && item.total_loss_kusd !== undefined ? `$${item.total_loss_kusd}k` : '—' }}</span>
          </template>

          <template #item-overall_status="{ item }">
            <span :class="['status-pill', `status-${(item.overall_status || 'OPEN').toLowerCase()}`]">
              {{ item.overall_status || 'OPEN' }}
            </span>
          </template>

          <template #item-actions="{ item }">
            <div class="actions-cell">
              <button class="btn btn-outline btn-sm" @click="viewIncidentDetail(item)">
                Detail
              </button>
              <button class="btn btn-primary btn-sm" @click="inspectRcaForAr(item.ar_no)">
                RCA
              </button>
            </div>
          </template>
        </DataTable>

        <!-- Incident Pagination -->
        <div v-if="incidentTotalPages > 1" class="pagination-bar">
          <button class="btn btn-outline btn-sm" :disabled="incidentPage <= 1" @click="incidentPage--">← Prev</button>
          <span class="page-info">Page {{ incidentPage }} of {{ incidentTotalPages }}</span>
          <button class="btn btn-outline btn-sm" :disabled="incidentPage >= incidentTotalPages" @click="incidentPage++">Next →</button>
        </div>
      </div>
    </div>

    <!-- MODULE 2: RCA INVESTIGATIONS -->
    <div v-else class="rca-container">
      <div class="rca-layout-split">
        <!-- RCA List Table -->
        <div class="rca-list-pane">
          <div class="card filter-card">
            <div class="filter-row">
              <div class="filter-item search-item">
                <label class="filter-label">Search RCA</label>
                <input
                  v-model="rcaSearch"
                  type="text"
                  placeholder="Search AR No, Tag Number, Problem Statement..."
                  class="filter-control"
                />
              </div>
            </div>
          </div>

          <DataTable
            :columns="rcaTableColumns"
            :rows="paginatedRcaHeaders"
            :loading="loadingData"
            empty-message="No RCA header records found."
          >
            <template #item-ar_no="{ item }">
              <div
                class="rca-ar-cell"
                :class="{ 'is-selected': selectedRca?.ar_no === item.ar_no }"
                @click="selectRca(item.ar_no)"
              >
                <span class="mono-ar">{{ item.ar_no }}</span>
                <span class="rca-tag">{{ item.tag_number || 'No Tag' }}</span>
              </div>
            </template>

            <template #item-problem_statement="{ item }">
              <span class="statement-snippet" :title="item.problem_statement">
                {{ item.problem_statement || '—' }}
              </span>
            </template>

            <template #item-pre_risk="{ item }">
              <span :class="['risk-pill', `risk-${(item.pre_risk || 'MEDIUM').toLowerCase()}`]">
                {{ item.pre_risk || '—' }}
              </span>
            </template>

            <template #item-actions="{ item }">
              <button
                class="btn btn-sm"
                :class="selectedRca?.ar_no === item.ar_no ? 'btn-primary' : 'btn-outline'"
                @click.stop="selectRca(item.ar_no)"
              >
                {{ selectedRca?.ar_no === item.ar_no ? 'Viewing' : 'Inspect' }}
              </button>
            </template>
          </DataTable>

          <!-- RCA Pagination -->
          <div v-if="rcaTotalPages > 1" class="pagination-bar">
            <button class="btn btn-outline btn-sm" :disabled="rcaPage <= 1" @click="rcaPage--">← Prev</button>
            <span class="page-info">Page {{ rcaPage }} of {{ rcaTotalPages }}</span>
            <button class="btn btn-outline btn-sm" :disabled="rcaPage >= rcaTotalPages" @click="rcaPage++">Next →</button>
          </div>
        </div>

        <!-- RCA Detailed Workspace Pane -->
        <div class="rca-detail-pane">
          <div v-if="!selectedRca && !loadingRcaDetail" class="card empty-rca-workspace">
            <span class="empty-icon-large">🔬</span>
            <h3>No RCA Investigation Selected</h3>
            <p>Select an RCA record from the table on the left to review Root Cause Analysis, 4P/4M verification, and CAPA actions.</p>
          </div>

          <div v-else-if="loadingRcaDetail" class="card loading-rca-workspace">
            <div class="spinner"></div>
            <span>Fetching RCA investigation details...</span>
          </div>

          <div v-else-if="selectedRca" class="card rca-workspace-card">
            <!-- RCA Detail Header -->
            <div class="rca-detail-header">
              <div class="rca-header-top">
                <span class="mono-ar-large">{{ selectedRca.ar_no }}</span>
                <span class="risk-pill" :class="`risk-${(selectedRca.pre_risk || 'MEDIUM').toLowerCase()}`">
                  Risk: {{ selectedRca.pre_risk || '—' }} ({{ selectedRca.risk_score ?? '—' }})
                </span>
              </div>
              <div class="rca-header-meta">
                <span><strong>Tag:</strong> {{ selectedRca.tag_number || '—' }}</span>
                <span class="meta-dot">•</span>
                <span><strong>Plant:</strong> {{ selectedRca.plant || '—' }}</span>
                <span class="meta-dot">•</span>
                <span><strong>PIC:</strong> {{ selectedRca.pic_rca || '—' }}</span>
              </div>
            </div>

            <!-- RCA Tabs -->
            <div class="rca-detail-tabs">
              <button
                class="rca-tab-btn"
                :class="{ active: rcaTab === 'statements' }"
                @click="rcaTab = 'statements'"
              >
                Problem & Root Cause
              </button>
              <button
                class="rca-tab-btn"
                :class="{ active: rcaTab === 'priority_matrix' }"
                @click="rcaTab = 'priority_matrix'"
              >
                Priority Matrix ({{ priorityMatrixList.length }})
              </button>
              <button
                class="rca-tab-btn"
                :class="{ active: rcaTab === '4p' }"
                @click="rcaTab = '4p'"
              >
                4P Verification ({{ list4P.length }})
              </button>
              <button
                class="rca-tab-btn"
                :class="{ active: rcaTab === '4m' }"
                @click="rcaTab = '4m'"
              >
                4M Verification ({{ list4M.length }})
              </button>
              <button
                class="rca-tab-btn"
                :class="{ active: rcaTab === 'capa' }"
                @click="rcaTab = 'capa'"
              >
                CAPA Actions ({{ capaList.length }})
              </button>
            </div>

            <!-- Tab 1: Statements -->
            <div v-show="rcaTab === 'statements'" class="rca-tab-body">
              <div class="statement-card">
                <span class="st-label">Problem Statement</span>
                <p class="st-text">{{ selectedRca.problem_statement || 'No problem statement recorded.' }}</p>
              </div>

              <div class="statement-card mt-3">
                <span class="st-label">Root Cause Statement</span>
                <p class="st-text">{{ selectedRca.root_cause_statement || 'No root cause statement recorded.' }}</p>
              </div>

              <div class="rca-meta-box mt-3">
                <div class="meta-field">
                  <span class="mf-label">Procedure / SOP:</span>
                  <span class="mf-val">{{ selectedRca.procedure_no || '—' }}</span>
                </div>
                <div class="meta-field">
                  <span class="mf-label">Date Occurrence:</span>
                  <span class="mf-val">{{ formatDate(selectedRca.date_occurrence) }}</span>
                </div>
              </div>
            </div>

            <!-- Tab 2: Priority Matrix -->
            <div v-show="rcaTab === 'priority_matrix'" class="rca-tab-body">
              <div v-if="priorityMatrixList.length === 0" class="sub-empty">
                No root cause priority matrix rows registered.
              </div>
              <div v-else class="sub-list">
                <div v-for="pm in priorityMatrixList" :key="pm.priority_matrix_id" class="sub-card">
                  <div class="sub-card-header">
                    <span class="badge badge-p3">{{ pm.root_cause_id }}</span>
                    <span class="pm-rank">Rank #{{ pm.priority_rank }}</span>
                  </div>
                  <p class="sub-desc">{{ pm.description_short }}</p>
                  <div class="sub-meta-row">
                    <span>Impact: <strong>{{ pm.impact_level }}</strong></span>
                    <span class="meta-dot">•</span>
                    <span>Control: <strong>{{ pm.control_level }}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab 3: 4P Verification -->
            <div v-show="rcaTab === '4p'" class="rca-tab-body">
              <div v-if="list4P.length === 0" class="sub-empty">
                No 4P verification items recorded.
              </div>
              <div v-else class="sub-list">
                <div v-for="p in list4P" :key="p.verification_id" class="sub-card">
                  <div class="sub-card-header">
                    <span class="badge badge-normal">{{ p.parameter_id }}</span>
                    <span class="result-tag">{{ p.result }}</span>
                  </div>
                  <strong class="sub-item-title">{{ p.problem_phenomenon_parameter }}</strong>
                  <p class="sub-desc">{{ p.evidence_finding }}</p>
                </div>
              </div>
            </div>

            <!-- Tab 4: 4M Verification -->
            <div v-show="rcaTab === '4m'" class="rca-tab-body">
              <div v-if="list4M.length === 0" class="sub-empty">
                No 4M verification items recorded.
              </div>
              <div v-else class="sub-list">
                <div v-for="m in list4M" :key="m.verification_id" class="sub-card">
                  <div class="sub-card-header">
                    <span class="badge badge-watch">{{ m.factor_category }} ({{ m.factor_id }})</span>
                    <span class="result-tag">{{ m.result }}</span>
                  </div>
                  <p class="sub-desc">{{ m.evidence_finding }}</p>
                </div>
              </div>
            </div>

            <!-- Tab 5: CAPA Actions -->
            <div v-show="rcaTab === 'capa'" class="rca-tab-body">
              <div v-if="capaList.length === 0" class="sub-empty">
                No CAPA action plans recorded for this AR.
              </div>
              <div v-else class="sub-list">
                <div v-for="c in capaList" :key="c.capa_id" class="sub-card">
                  <div class="sub-card-header">
                    <span class="badge badge-p1">{{ c.action_type }}</span>
                    <span :class="['status-pill', `status-${(c.status || 'OPEN').toLowerCase()}`]">{{ c.status }}</span>
                  </div>
                  <p class="sub-desc"><strong>Action:</strong> {{ c.action_plan }}</p>
                  <div class="sub-meta-row">
                    <span>PIC: <strong>{{ c.pic || 'Unassigned' }}</strong></span>
                    <span class="meta-dot">•</span>
                    <span>Target Date: <strong>{{ formatDate(c.target_date) }}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Incident Detail -->
    <div v-if="showIncidentModal" class="modal-backdrop" @click.self="showIncidentModal = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">Incident Details — {{ currentIncident?.ar_no }}</h2>
          <button class="modal-close-btn" @click="showIncidentModal = false">×</button>
        </div>
        <div v-if="currentIncident" class="modal-body">
          <div class="incident-detail-grid">
            <div class="detail-item">
              <span class="di-label">AR Number:</span>
              <span class="di-val mono-ar">{{ currentIncident.ar_no }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Plant:</span>
              <span class="di-val">{{ currentIncident.plant }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Equipment Class / Type:</span>
              <span class="di-val">{{ currentIncident.equipment_class }} — {{ currentIncident.equipment_type }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Component:</span>
              <span class="di-val">{{ currentIncident.component || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Discipline:</span>
              <span class="di-val">{{ currentIncident.discipline || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Failure Mechanism:</span>
              <span class="di-val">{{ currentIncident.failure_mechanism || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Occurrence Date:</span>
              <span class="di-val">{{ formatDate(currentIncident.date_of_occurrence) }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Risk Score:</span>
              <span class="di-val">{{ currentIncident.risk_score ?? '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Downtime:</span>
              <span class="di-val">{{ currentIncident.downtime_hours != null ? `${currentIncident.downtime_hours} hours` : '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Actual Loss (kUSD):</span>
              <span class="di-val loss-val">{{ currentIncident.actual_loss_kusd != null ? `$${currentIncident.actual_loss_kusd}k` : '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Potential Loss (kUSD):</span>
              <span class="di-val loss-val">{{ currentIncident.potential_loss_kusd != null ? `$${currentIncident.potential_loss_kusd}k` : '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Total Loss (kUSD):</span>
              <span class="di-val loss-val">{{ currentIncident.total_loss_kusd != null ? `$${currentIncident.total_loss_kusd}k` : '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">PIC RCA:</span>
              <span class="di-val">{{ currentIncident.pic_rca || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">RCA Due Date:</span>
              <span class="di-val">{{ formatDate(currentIncident.rca_due_date) }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Overall Status:</span>
              <span :class="['status-pill', `status-${(currentIncident.overall_status || 'OPEN').toLowerCase()}`]">
                {{ currentIncident.overall_status }}
              </span>
            </div>
            <div class="detail-item">
              <span class="di-label">Source:</span>
              <span class="di-val">{{ currentIncident.source_type || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Created:</span>
              <span class="di-val">{{ formatDate(currentIncident.created_at) }}</span>
            </div>
            <div class="detail-item">
              <span class="di-label">Updated:</span>
              <span class="di-val">{{ formatDate(currentIncident.updated_at) }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showIncidentModal = false">Close</button>
          <button class="btn btn-primary" @click="inspectRcaForAr(currentIncident.ar_no)">Open RCA</button>
        </div>
      </div>
    </div>

    <!-- Modal: + New Incident -->
    <div v-if="showNewIncidentModal" class="modal-backdrop" @click.self="showNewIncidentModal = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">Create Incident Record</h2>
          <button class="modal-close-btn" @click="showNewIncidentModal = false">×</button>
        </div>
        <form @submit.prevent="submitCreateIncident">
          <div class="modal-body">
            <div v-if="incidentFormError" class="modal-error-alert">
              <span>⚠ {{ incidentFormError }}</span>
            </div>

            <!-- Case Identification -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label required">AR Number</label>
                <input
                  v-model="newIncident.ar_no"
                  type="text"
                  placeholder="e.g. AR-2026-095"
                  class="form-control"
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label required">Plant</label>
                <input
                  v-model="newIncident.plant"
                  type="text"
                  placeholder="e.g. PL01"
                  class="form-control"
                  required
                />
              </div>
            </div>

            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label required">Equipment Class</label>
                <input
                  v-model="newIncident.equipment_class"
                  type="text"
                  placeholder="e.g. Rotary"
                  class="form-control"
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label required">Equipment Type</label>
                <input
                  v-model="newIncident.equipment_type"
                  type="text"
                  placeholder="e.g. Centrifugal Pump"
                  class="form-control"
                  required
                />
              </div>
            </div>

            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label">Component</label>
                <input
                  v-model="newIncident.component"
                  type="text"
                  placeholder="e.g. Mechanical Seal"
                  class="form-control"
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Discipline</label>
                <input
                  v-model="newIncident.discipline"
                  type="text"
                  placeholder="e.g. Mechanical"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Failure Mechanism</label>
              <input
                v-model="newIncident.failure_mechanism"
                type="text"
                placeholder="e.g. Seal Face Wear / Excessive Heat"
                class="form-control"
              />
            </div>

            <!-- Losses & Dates -->
            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label required">Date of Occurrence</label>
                <input
                  v-model="newIncident.date_of_occurrence"
                  type="datetime-local"
                  class="form-control"
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Downtime (hours)</label>
                <input
                  v-model.number="newIncident.downtime_hours"
                  type="number"
                  step="any"
                  placeholder="e.g. 6.5"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label">Total Loss (kUSD)</label>
                <input
                  v-model.number="newIncident.total_loss_kusd"
                  type="number"
                  step="any"
                  placeholder="e.g. 68.4"
                  class="form-control"
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">PIC RCA</label>
                <input
                  v-model="newIncident.pic_rca"
                  type="text"
                  placeholder="e.g. Budi Santoso"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label required">Overall Status</label>
                <select v-model="newIncident.overall_status" class="form-control" required>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="showNewIncidentModal = false" :disabled="submittingIncident">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submittingIncident">
              <span v-if="submittingIncident">Saving Incident...</span>
              <span v-else>Save Incident</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: + New RCA Header -->
    <div v-if="showNewRcaModal" class="modal-backdrop" @click.self="showNewRcaModal = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">Create RCA Header Record</h2>
          <button class="modal-close-btn" @click="showNewRcaModal = false">×</button>
        </div>
        <form @submit.prevent="submitCreateRca">
          <div class="modal-body">
            <div v-if="rcaFormError" class="modal-error-alert">
              <span>⚠ {{ rcaFormError }}</span>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label required">AR Number</label>
                <input
                  v-model="newRca.ar_no"
                  type="text"
                  placeholder="e.g. AR-2026-089"
                  class="form-control"
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label required">Tag Number</label>
                <input
                  v-model="newRca.tag_number"
                  type="text"
                  placeholder="e.g. 31-PM-01A"
                  class="form-control"
                  required
                />
              </div>
            </div>

            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label required">Plant</label>
                <input
                  v-model="newRca.plant"
                  type="text"
                  placeholder="e.g. PL01"
                  class="form-control"
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Pre-Risk</label>
                <select v-model="newRca.pre_risk" class="form-control">
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label required">Date of Occurrence</label>
                <input
                  v-model="newRca.date_occurrence"
                  type="datetime-local"
                  class="form-control"
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Risk Score</label>
                <input
                  v-model.number="newRca.risk_score"
                  type="number"
                  step="any"
                  placeholder="e.g. 12.0 (optional)"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-group mt-3">
              <label class="form-label required">Problem Statement</label>
              <textarea
                v-model="newRca.problem_statement"
                rows="2"
                placeholder="Concise problem statement..."
                class="form-control"
                required
              ></textarea>
            </div>

            <div class="form-group mt-3">
              <label class="form-label required">Root Cause Statement</label>
              <textarea
                v-model="newRca.root_cause_statement"
                rows="2"
                placeholder="Verified root cause..."
                class="form-control"
                required
              ></textarea>
            </div>

            <div class="form-row mt-3">
              <div class="form-group flex-1">
                <label class="form-label">Procedure / SOP</label>
                <input
                  v-model="newRca.procedure_no"
                  type="text"
                  placeholder="e.g. SOP-MEC-31-01"
                  class="form-control"
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">PIC RCA</label>
                <input
                  v-model="newRca.pic_rca"
                  type="text"
                  placeholder="e.g. Budi Santoso"
                  class="form-control"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="showNewRcaModal = false" :disabled="submittingRca">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submittingRca">
              <span v-if="submittingRca">Saving RCA...</span>
              <span v-else>Save RCA Header</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'
import DataTable from '@/components/common/DataTable.vue'

// State
const activeModule = ref('incidents') // 'incidents' | 'rca'
const loadingData = ref(false)
const loadingRcaDetail = ref(false)
const submittingIncident = ref(false)
const submittingRca = ref(false)

const incidents = ref([])
const rcaHeaders = ref([])
const selectedRca = ref(null)
const currentIncident = ref(null)
const showIncidentModal = ref(false)
const showNewIncidentModal = ref(false)
const showNewRcaModal = ref(false)

// RCA Sub-resources
const priorityMatrixList = ref([])
const list4P = ref([])
const list4M = ref([])
const capaList = ref([])
const rcaTab = ref('statements')

// Banners & Errors
const successBanner = ref('')
const errorBanner = ref('')
const incidentFormError = ref('')
const rcaFormError = ref('')

// Filters
const incidentSearch = ref('')
const filterPlant = ref('')
const filterIncidentStatus = ref('')
const rcaSearch = ref('')

// Pagination
const PAGE_SIZE = 25
const incidentPage = ref(1)
const rcaPage = ref(1)

// New Incident Form
const newIncident = ref({
  ar_no: '',
  plant: 'PL01',
  equipment_class: 'Rotary',
  equipment_type: 'Centrifugal Pump',
  component: 'Mechanical Seal',
  discipline: 'Mechanical',
  failure_mechanism: '',
  date_of_occurrence: '',
  downtime_hours: null,
  total_loss_kusd: null,
  pic_rca: '',
  overall_status: 'OPEN'
})

// New RCA Header Form
const newRca = ref({
  ar_no: '',
  tag_number: '',
  plant: 'PL01',
  pre_risk: 'HIGH',
  date_occurrence: '',
  risk_score: null,
  problem_statement: '',
  root_cause_statement: '',
  procedure_no: '',
  pic_rca: ''
})

// Columns
const incidentTableColumns = [
  { key: 'ar_no', label: 'AR Number', width: '15%' },
  { key: 'plant', label: 'Plant', width: '9%' },
  { key: 'equipment', label: 'Equipment / Component', width: '22%' },
  { key: 'date_of_occurrence', label: 'Date', width: '13%' },
  { key: 'downtime_hours', label: 'Downtime', align: 'right', width: '10%' },
  { key: 'total_loss_kusd', label: 'Loss', align: 'right', width: '10%' },
  { key: 'overall_status', label: 'Status', align: 'center', width: '10%' },
  { key: 'actions', label: '', align: 'right', width: '11%' }
]

const rcaTableColumns = [
  { key: 'ar_no', label: 'AR / Tag', width: '24%' },
  { key: 'problem_statement', label: 'Problem Statement', width: '48%' },
  { key: 'pre_risk', label: 'Risk', width: '14%' },
  { key: 'actions', label: '', align: 'right', width: '14%' }
]

// Computed
const uniquePlants = computed(() => {
  const set = new Set(incidents.value.map(i => i.plant).filter(Boolean))
  return Array.from(set)
})

const filteredIncidents = computed(() => {
  return incidents.value.filter(i => {
    if (filterPlant.value && i.plant !== filterPlant.value) return false
    if (filterIncidentStatus.value && (i.overall_status || '').toUpperCase() !== filterIncidentStatus.value) return false
    if (incidentSearch.value) {
      const q = incidentSearch.value.toLowerCase()
      const match = (i.ar_no || '').toLowerCase().includes(q) ||
        (i.equipment_type || '').toLowerCase().includes(q) ||
        (i.failure_mechanism || '').toLowerCase().includes(q) ||
        (i.component || '').toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
})

const filteredRcaHeaders = computed(() => {
  return rcaHeaders.value.filter(r => {
    if (!rcaSearch.value) return true
    const q = rcaSearch.value.toLowerCase()
    return (r.ar_no || '').toLowerCase().includes(q) ||
      (r.tag_number || '').toLowerCase().includes(q) ||
      (r.problem_statement || '').toLowerCase().includes(q)
  })
})

// Paginated slices
const incidentTotalPages = computed(() => Math.max(1, Math.ceil(filteredIncidents.value.length / PAGE_SIZE)))
const paginatedIncidents = computed(() => {
  const start = (incidentPage.value - 1) * PAGE_SIZE
  return filteredIncidents.value.slice(start, start + PAGE_SIZE)
})

const rcaTotalPages = computed(() => Math.max(1, Math.ceil(filteredRcaHeaders.value.length / PAGE_SIZE)))
const paginatedRcaHeaders = computed(() => {
  const start = (rcaPage.value - 1) * PAGE_SIZE
  return filteredRcaHeaders.value.slice(start, start + PAGE_SIZE)
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

const resetIncidentFilters = () => {
  incidentSearch.value = ''
  filterPlant.value = ''
  filterIncidentStatus.value = ''
  incidentPage.value = 1
}

const switchModule = (mod) => {
  activeModule.value = mod
  successBanner.value = ''
  errorBanner.value = ''
  if (mod === 'rca' && rcaHeaders.value.length === 0) {
    fetchRcaHeaders()
  }
}

// Data Fetching
const fetchIncidents = async () => {
  loadingData.value = true
  errorBanner.value = ''
  try {
    const res = await apiClient.get(ENDPOINTS.INCIDENTS)
    incidents.value = res.data?.data || []
  } catch (err) {
    errorBanner.value = err.message || 'Failed to fetch incident register.'
  } finally {
    loadingData.value = false
  }
}

const fetchRcaHeaders = async () => {
  loadingData.value = true
  errorBanner.value = ''
  try {
    const res = await apiClient.get(ENDPOINTS.RCA)
    rcaHeaders.value = res.data?.data || []
    if (rcaHeaders.value.length > 0 && !selectedRca.value) {
      selectRca(rcaHeaders.value[0].ar_no)
    }
  } catch (err) {
    errorBanner.value = err.message || 'Failed to fetch RCA investigations.'
  } finally {
    loadingData.value = false
  }
}

const refreshData = async () => {
  if (activeModule.value === 'incidents') {
    await fetchIncidents()
  } else {
    await fetchRcaHeaders()
  }
}

const selectRca = async (arNo) => {
  loadingRcaDetail.value = true
  try {
    const resHeader = await apiClient.get(ENDPOINTS.RCA_BY_AR(arNo))
    selectedRca.value = resHeader.data?.data || resHeader.data || {}

    // Fetch related RCA sub-resources in parallel
    const [pmRes, p4Res, m4Res, capaRes] = await Promise.allSettled([
      apiClient.get(ENDPOINTS.RCA_PRIORITY_MATRIX(arNo)),
      apiClient.get(ENDPOINTS.RCA_4P(arNo)),
      apiClient.get(ENDPOINTS.RCA_4M(arNo)),
      apiClient.get(ENDPOINTS.RCA_CAPA(arNo))
    ])

    priorityMatrixList.value = pmRes.status === 'fulfilled' ? (pmRes.value.data?.data || []) : []
    list4P.value = p4Res.status === 'fulfilled' ? (p4Res.value.data?.data || []) : []
    list4M.value = m4Res.status === 'fulfilled' ? (m4Res.value.data?.data || []) : []
    capaList.value = capaRes.status === 'fulfilled' ? (capaRes.value.data?.data || []) : []
  } catch (err) {
    errorBanner.value = err.message || `Failed to fetch RCA details for ${arNo}`
  } finally {
    loadingRcaDetail.value = false
  }
}

const viewIncidentDetail = (inc) => {
  currentIncident.value = inc
  showIncidentModal.value = true
}

const inspectRcaForAr = async (arNo) => {
  showIncidentModal.value = false
  activeModule.value = 'rca'
  if (rcaHeaders.value.length === 0) {
    await fetchRcaHeaders()
  }
  await selectRca(arNo)
}

// Modal Handlers: + New Incident
const openNewIncidentModal = () => {
  incidentFormError.value = ''
  const localIso = new Date().toISOString().slice(0, 16)
  newIncident.value = {
    ar_no: `AR-${new Date().getFullYear()}-${String(incidents.value.length + 101).padStart(3, '0')}`,
    plant: 'PL01',
    equipment_class: 'Rotary',
    equipment_type: 'Centrifugal Pump',
    component: 'Mechanical Seal',
    discipline: 'Mechanical',
    failure_mechanism: 'Seal Face Wear / Excessive Heat',
    date_of_occurrence: localIso,
    downtime_hours: 4.0,
    total_loss_kusd: 15.0,
    pic_rca: '',
    overall_status: 'OPEN'
  }
  showNewIncidentModal.value = true
}

const submitCreateIncident = async () => {
  incidentFormError.value = ''
  if (!newIncident.value.ar_no || !newIncident.value.date_of_occurrence) {
    incidentFormError.value = 'AR Number and Occurrence Date are required.'
    return
  }

  submittingIncident.value = true
  try {
    const payload = [
      {
        ar_no: newIncident.value.ar_no,
        plant: newIncident.value.plant,
        equipment_class: newIncident.value.equipment_class,
        equipment_type: newIncident.value.equipment_type,
        component: newIncident.value.component || null,
        discipline: newIncident.value.discipline || null,
        failure_mechanism: newIncident.value.failure_mechanism || null,
        date_of_occurrence: new Date(newIncident.value.date_of_occurrence).toISOString(),
        downtime_hours: newIncident.value.downtime_hours !== null && newIncident.value.downtime_hours !== '' ? Number(newIncident.value.downtime_hours) : null,
        total_loss_kusd: newIncident.value.total_loss_kusd !== null && newIncident.value.total_loss_kusd !== '' ? Number(newIncident.value.total_loss_kusd) : null,
        pic_rca: newIncident.value.pic_rca || null,
        overall_status: newIncident.value.overall_status || 'OPEN',
        source_type: 'MANUAL'
      }
    ]

    await apiClient.post(ENDPOINTS.INCIDENTS, payload)
    successBanner.value = `Incident ${newIncident.value.ar_no} successfully saved.`
    showNewIncidentModal.value = false
    await fetchIncidents()
  } catch (err) {
    incidentFormError.value = err.message || 'Failed to create incident record.'
  } finally {
    submittingIncident.value = false
  }
}

// Modal Handlers: + New RCA
const openNewRcaModal = () => {
  rcaFormError.value = ''
  const localIso = new Date().toISOString().slice(0, 16)
  newRca.value = {
    ar_no: `AR-${new Date().getFullYear()}-${String(rcaHeaders.value.length + 101).padStart(3, '0')}`,
    tag_number: '31-PM-01A',
    plant: 'PL01',
    pre_risk: 'HIGH',
    date_occurrence: localIso,
    risk_score: null,
    problem_statement: '',
    root_cause_statement: '',
    procedure_no: 'SOP-MEC-31-01',
    pic_rca: ''
  }
  showNewRcaModal.value = true
}

const submitCreateRca = async () => {
  rcaFormError.value = ''
  if (!newRca.value.ar_no || !newRca.value.problem_statement || !newRca.value.root_cause_statement) {
    rcaFormError.value = 'AR Number, Problem Statement, and Root Cause Statement are required.'
    return
  }

  submittingRca.value = true
  try {
    const payload = [
      {
        ar_no: newRca.value.ar_no,
        tag_number: newRca.value.tag_number,
        plant: newRca.value.plant,
        date_occurrence: newRca.value.date_occurrence ? new Date(newRca.value.date_occurrence).toISOString() : new Date().toISOString(),
        pre_risk: newRca.value.pre_risk,
        ...(newRca.value.risk_score != null ? { risk_score: Number(newRca.value.risk_score) } : {}),
        procedure_no: newRca.value.procedure_no || null,
        problem_statement: newRca.value.problem_statement,
        root_cause_statement: newRca.value.root_cause_statement,
        pic_rca: newRca.value.pic_rca || null,
        source_type: 'MANUAL'
      }
    ]

    await apiClient.post(ENDPOINTS.RCA, payload)
    successBanner.value = `RCA Header ${newRca.value.ar_no} created successfully.`
    showNewRcaModal.value = false
    await fetchRcaHeaders()
    selectRca(newRca.value.ar_no)
  } catch (err) {
    rcaFormError.value = err.message || 'Failed to create RCA header.'
  } finally {
    submittingRca.value = false
  }
}

onMounted(() => {
  fetchIncidents()
  fetchRcaHeaders()
})
</script>

<style scoped>
.reliability-view {
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

/* Module Switcher Tabs */
.module-switcher {
  display: flex;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.switcher-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.switcher-tab:hover {
  background: var(--surface-alt);
  color: var(--primary-dark);
}

.switcher-tab.active {
  background: var(--surface);
  border-color: var(--border);
  color: var(--primary-blue);
  box-shadow: var(--shadow-sm);
}

.tab-counter {
  background: var(--surface-alt);
  border: 1px solid var(--border-subtle);
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
}

.switcher-tab.active .tab-counter {
  background: #EBF3FC;
  color: var(--primary-blue);
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
  padding: 14px 18px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-item {
  flex: 1;
  min-width: 240px;
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

.sort-notice {
  font-style: italic;
}

.mono-ar {
  font-family: monospace;
  font-weight: 700;
  color: var(--primary-blue);
  cursor: pointer;
}

.mono-ar:hover {
  text-decoration: underline;
}

.plant-badge {
  font-weight: 600;
  font-size: 12px;
  background: var(--surface-alt);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.equip-cell {
  display: flex;
  flex-direction: column;
}

.equip-type {
  font-weight: 600;
  color: var(--text-primary);
}

.equip-component {
  font-size: 11px;
  color: var(--text-muted);
}

.num-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.loss-val {
  color: var(--primary-navy);
  font-weight: 600;
}

.status-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.status-open {
  background-color: var(--status-alarm-bg);
  color: var(--status-alarm-text);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-in_progress {
  background-color: var(--status-watch-bg);
  color: var(--status-watch-text);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-closed {
  background-color: var(--status-normal-bg);
  color: var(--status-normal-text);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.actions-cell {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

/* RCA Split View */
.rca-layout-split {
  display: grid;
  grid-template-columns: 45% 55%;
  gap: 20px;
  align-items: flex-start;
}

@media (max-width: 1050px) {
  .rca-layout-split {
    grid-template-columns: 1fr;
  }
}

.rca-ar-cell {
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.rca-tag {
  font-size: 11px;
  color: var(--text-muted);
}

.statement-snippet {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
  color: var(--text-secondary);
}

.risk-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.risk-high {
  background-color: var(--status-alarm-bg);
  color: var(--status-alarm-text);
}

.risk-medium {
  background-color: var(--status-watch-bg);
  color: var(--status-watch-text);
}

.risk-low {
  background-color: var(--status-normal-bg);
  color: var(--status-normal-text);
}

/* RCA Workspace */
.rca-detail-pane {
  position: sticky;
  top: calc(var(--header-height) + 16px);
}

.empty-rca-workspace, .loading-rca-workspace {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  gap: 12px;
}

.rca-workspace-card {
  padding: 24px;
}

.rca-detail-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.rca-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.mono-ar-large {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-family: monospace;
  color: var(--primary-dark);
}

.rca-header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.meta-dot {
  color: var(--border);
}

.rca-detail-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 2px;
  margin-bottom: 18px;
  overflow-x: auto;
}

.rca-tab-btn {
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.rca-tab-btn.active {
  color: var(--primary-blue);
  border-bottom-color: var(--primary-blue);
}

.rca-tab-body {
  display: flex;
  flex-direction: column;
}

.statement-card {
  background: var(--surface-alt);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
}

.st-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-navy);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: block;
  margin-bottom: 4px;
}

.st-text {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: 1.4;
}

.rca-meta-box {
  display: flex;
  gap: 20px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.mf-label {
  color: var(--text-muted);
  font-weight: 500;
  margin-right: 4px;
}

.mf-val {
  font-weight: 600;
  color: var(--primary-navy);
}

.sub-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
}

.sub-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pm-rank {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-dark);
}

.sub-desc {
  font-size: var(--font-size-xs);
  color: var(--text-primary);
  line-height: 1.4;
}

.sub-item-title {
  font-size: var(--font-size-xs);
  color: var(--primary-dark);
}

.result-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-blue);
}

.sub-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.sub-empty {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

/* Modals */
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
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.incident-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.di-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.di-val {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: 500;
}

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

.btn-sm {
  padding: 4px 10px;
  font-size: var(--font-size-xs);
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
</style>
