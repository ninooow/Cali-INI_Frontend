<template>
  <div class="dashboard-container">
    <!-- Loading State -->
    <div v-if="loading" class="dashboard-loading">
      <div class="spinner"></div>
      <p class="loading-message">Fetching operational dashboard analytics from backend...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="dashboard-error">
      <div class="error-card">
        <div class="error-header">
          <span class="error-icon">⚠</span>
          <h3>Dashboard Data Unavailable</h3>
        </div>
        <p class="error-body">{{ error }}</p>
        <button class="btn btn-primary" @click="fetchDashboardData">
          Retry Request
        </button>
      </div>
    </div>

    <!-- Dashboard Content (WHAT → WHY → HOW hierarchy) -->
    <div v-else class="dashboard-content">
      <!-- DASHBOARD HEADER: Monitoring Context (Level 1 & 2) -->
      <header class="dashboard-header">
        <div class="header-left">
          <h1 class="page-title">Plant Overview Dashboard</h1>
          <p class="page-subtitle">Intelligent Manufacturing Decision Support</p>
        </div>
        <div class="header-right">
          <div class="context-pill">
            <span class="pill-label">Scope:</span>
            <span class="pill-value">{{ dashboardData.scope || 'All assets' }}</span>
          </div>
          <div class="context-pill">
            <span class="pill-label">As of:</span>
            <span class="pill-value">{{ formattedAsOf }}</span>
          </div>
          <div class="context-pill">
            <span class="pill-label">Data status:</span>
            <StatusBadge :value="dashboardData.data_status || 'PASS'" type="data_status" />
          </div>
        </div>
      </header>

      <!-- 1. WHAT: ATTENTION REQUIRED -->
      <section class="dashboard-section section-attention">
        <div class="section-title-row">
          <div>
            <h2 class="section-heading">ATTENTION REQUIRED</h2>
            <p class="section-subtext">
              {{ attentionCount }} {{ attentionCount === 1 ? 'item requires' : 'items require' }} attention
            </p>
          </div>
          <!-- Priority Summary -->
          <div class="priority-summary">
            <div class="priority-count-pill p1">
              <span class="p-label">P1</span>
              <span class="p-val">{{ priorityCounts.p1 }}</span>
            </div>
            <div class="priority-count-pill p2">
              <span class="p-label">P2</span>
              <span class="p-val">{{ priorityCounts.p2 }}</span>
            </div>
            <div class="priority-count-pill p3">
              <span class="p-label">P3</span>
              <span class="p-val">{{ priorityCounts.p3 }}</span>
            </div>
            <div class="priority-count-pill p4">
              <span class="p-label">P4</span>
              <span class="p-val">{{ priorityCounts.p4 }}</span>
            </div>
          </div>
        </div>

        <!-- Attention Cards List -->
        <div v-if="visibleAttentionItems.length > 0" class="attention-cards-grid">
          <article
            v-for="(item, idx) in visibleAttentionItems"
            :key="item.ticket_id || item.id || idx"
            class="attention-card"
            :class="[`border-p-${(item.priority || 'p4').toLowerCase()}`]"
          >
            <div class="attention-col-priority">
              <StatusBadge :value="item.priority || 'P1'" type="priority" />
            </div>

            <div class="attention-col-issue">
              <div class="asset-line">
                <span class="asset-tag">{{ item.asset_tag || item.tag_number || item.asset_name || `Asset #${item.asset_id || idx + 1}` }}</span>
              </div>
              <h3 class="problem-trigger">{{ item.problem || item.trigger || item.title || 'Condition deviation requiring inspection' }}</h3>
              <div class="status-row">
                <StatusBadge :value="item.condition || item.condition_state || 'ALARM'" type="condition" />
                <span class="ticket-state-tag">Ticket: {{ item.ticket_state || 'OPEN' }}</span>
              </div>
            </div>

            <div class="attention-col-action">
              <div class="action-label">NEXT ACTION</div>
              <div class="action-desc">
                {{ item.next_action || item.recommended_action || 'Inspect operating parameters and conduct physical verification.' }}
              </div>
            </div>

            <div class="attention-col-cta">
              <router-link
                :to="{ path: '/operations/problem-verification', query: { ticket_id: item.ticket_id } }"
                class="btn btn-outline btn-sm"
              >
                View problem
              </router-link>
            </div>
          </article>

          <!-- Continuation footer if > 3 items -->
          <div v-if="totalAttentionCount > 3" class="attention-continuation">
            <span>Showing 3 of {{ totalAttentionCount }} active problems</span>
            <router-link to="/operations/problem-verification" class="link-bold">
              View all problems →
            </router-link>
          </div>
        </div>

        <!-- Empty Attention State -->
        <div v-else class="attention-empty-state">
          <span class="check-icon">✓</span>
          <span>No active problem matches the current filters.</span>
        </div>
      </section>

      <!-- 2. WHAT: CURRENT PLANT CONDITION (Tier 1 KPI) -->
      <section class="dashboard-section">
        <div class="section-title-row">
          <div>
            <h2 class="section-heading">CURRENT PLANT CONDITION</h2>
            <p class="section-subtext">Scope: {{ dashboardData.scope || 'All assets' }}</p>
          </div>
        </div>

        <div class="kpi-grid-tier-1">
          <MetricCard
            title="Asset Health Score"
            :value="null"
            unit="/ 100"
            interpretation="Current asset condition"
            tooltip="Composite condition score derived from current equipment condition. Higher values represent healthier current condition."
            :tier="1"
            :unsupported="true"
          />
          <MetricCard
            title="Operating Performance"
            :value="null"
            unit="/ 100"
            interpretation="Relative to healthy baseline"
            tooltip="Normalized operating-performance indicator relative to the asset's healthy baseline."
            :tier="1"
            :unsupported="true"
          />
          <MetricCard
            title="Reliability & Consequence"
            :value="null"
            unit="/ 100"
            interpretation="Current reliability context"
            tooltip="Decision indicator combining current reliability context and historical consequence information."
            :tier="1"
            :unsupported="true"
          />
        </div>
      </section>

      <!-- 3. WHAT: OPERATIONAL CONTEXT (Tier 2 KPI) -->
      <section class="dashboard-section">
        <div class="section-title-row">
          <div>
            <h2 class="section-heading">OPERATIONAL CONTEXT</h2>
            <p class="section-subtext">Operating context indicators relative to baseline reference</p>
          </div>
        </div>

        <div class="kpi-grid-tier-2">
          <MetricCard
            title="Load Index"
            :value="null"
            interpretation="Relative operating load"
            tooltip="Relative operating-load indicator. A value near 100 represents the reference load level."
            :tier="2"
            :unsupported="true"
          />
          <MetricCard
            title="Production Index"
            :value="null"
            interpretation="100 = healthy-running baseline"
            tooltip="Current production relative to the measured healthy-running baseline. A value near 100 represents the reference production level."
            :tier="2"
            :unsupported="true"
          />
          <MetricCard
            title="Downtime — Last 30 Days"
            :value="null"
            unit="h"
            interpretation="Observed downtime"
            tooltip="Downtime calculated from observed running-status data in the 30-day window."
            :tier="2"
            :unsupported="true"
          />
          <MetricCard
            title="Emission Intensity Proxy"
            :value="null"
            interpretation="Relative electricity-related proxy"
            tooltip="Relative electricity-related emission-intensity proxy. This is not a direct emissions measurement."
            :tier="2"
            :unsupported="true"
          />
        </div>
      </section>

      <!-- 4. WHY: ASSET STATUS (Which assets explain the condition?) -->
      <section class="dashboard-section">
        <div class="section-title-row">
          <div>
            <h2 class="section-heading">ASSET STATUS</h2>
            <p class="section-subtext">
              Quick comparison of current condition, health, priority, and forecast risk by asset.
            </p>
          </div>
          <div v-if="dashboardData.active_assets_count" class="badge badge-normal">
            {{ dashboardData.active_assets_count }} Active Assets Monitored
          </div>
        </div>

        <DataTable
          :columns="assetTableColumns"
          :rows="assetRows"
          :loading="loadingAssets"
          empty-message="No monitored asset condition records available."
        >
          <template #item-asset="{ item }">
            <div class="asset-cell">
              <span class="asset-tag-link">{{ item.tag_number || item.asset_tag || `Asset #${item.asset_id}` }}</span>
              <span v-if="item.asset_name" class="asset-subname">{{ item.asset_name }}</span>
            </div>
          </template>

          <template #item-condition="{ item }">
            <StatusBadge :value="item.condition || item.condition_state || 'NORMAL'" type="condition" />
          </template>

          <template #item-health="{ item }">
            <span class="health-number">
              {{ item.health !== null && item.health !== undefined ? item.health : '—' }}
            </span>
          </template>

          <template #item-priority="{ item }">
            <StatusBadge :value="item.priority || 'P4'" type="priority" />
          </template>

          <template #item-forecast="{ item }">
            <span :class="item.forecast === 'Attention' ? 'forecast-warn' : 'forecast-muted'">
              {{ item.forecast || '—' }}
            </span>
          </template>

          <template #item-actions="{ item }">
            <router-link
              :to="{ path: '/assets', query: { asset_id: item.asset_id } }"
              class="action-table-link"
            >
              Investigate
            </router-link>
          </template>
        </DataTable>
      </section>

      <!-- 5. HOW: TREND ANALYSIS (How are the indicators changing over time?) -->
      <section class="dashboard-section section-trends">
        <div class="section-title-row">
          <div>
            <h2 class="section-heading">TREND ANALYSIS</h2>
            <p class="section-subtext">
              Longitudinal condition indicators and model parameter forecasts
            </p>
          </div>
          <div class="trend-controls">
            <div class="trend-group-tabs">
              <button
                class="tab-btn"
                :class="{ active: selectedTrendGroup === 'condition' }"
                @click="selectedTrendGroup = 'condition'"
              >
                Condition & Reliability
              </button>
              <button
                class="tab-btn"
                :class="{ active: selectedTrendGroup === 'operations' }"
                @click="selectedTrendGroup = 'operations'"
              >
                Operations
              </button>
            </div>
          </div>
        </div>

        <div class="trend-card">
          <div class="trend-card-header">
            <span class="trend-indicator-label">Monitored Parameter:</span>
            <select v-model="selectedIndicator" class="select-indicator">
              <option value="vibration">Vibration Amplitude (vib) — mm/s RMS</option>
              <option value="temperature">Bearing Temperature (temp) — °C</option>
              <option value="discharge">Discharge Pressure (disp) — bar</option>
              <option value="current">Motor Current (amp) — A</option>
            </select>
          </div>

          <div class="trend-viewport">
            <div class="trend-provenance-info">
              <span class="info-tag">Telemetry API</span>
              <span>Raw traces sourced from <code>/api/v1/telemetry/hourly</code></span>
              <span class="divider">•</span>
              <span class="info-tag">Forecast API</span>
              <span>Projections sourced from <code>/api/v1/analytics/parameter-forecasts</code></span>
            </div>
            <div class="trend-placeholder-canvas">
              <div class="trend-grid-lines"></div>
              <div class="trend-message">
                <span class="trend-icon">📈</span>
                <p class="trend-title">Telemetry & Forecast Trend Viewport</p>
                <p class="trend-sub">
                  Select an asset in the Asset Status table or access
                  <router-link to="/operations/data-input" class="link-bold">Operations → Data Input</router-link>
                  to inspect exact time-series records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'
import StatusBadge from '@/components/common/StatusBadge.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import DataTable from '@/components/common/DataTable.vue'

// State
const loading = ref(true)
const loadingAssets = ref(false)
const error = ref(null)

const dashboardData = ref({
  scope: 'All assets',
  as_of: null,
  data_status: 'PASS',
  active_assets_count: 0,
  attention_summary: {},
  attention_items: []
})

const assetRows = ref([])
const selectedTrendGroup = ref('condition')
const selectedIndicator = ref('vibration')

// Formatters
const formattedAsOf = computed(() => {
  if (!dashboardData.value.as_of) {
    return '03 Oct 2026, 12:00'
  }
  try {
    const d = new Date(dashboardData.value.as_of)
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dashboardData.value.as_of
  }
})

// Priority Summary counts
const priorityCounts = computed(() => {
  const summary = dashboardData.value.attention_summary || {}
  const items = dashboardData.value.attention_items || []

  // Count from items if summary is not populated
  let p1 = summary.p1 ?? 0
  let p2 = summary.p2 ?? 0
  let p3 = summary.p3 ?? 0
  let p4 = summary.p4 ?? 0

  if (!summary.p1 && items.length > 0) {
    p1 = items.filter(i => (i.priority || '').toUpperCase() === 'P1').length
    p2 = items.filter(i => (i.priority || '').toUpperCase() === 'P2').length
    p3 = items.filter(i => (i.priority || '').toUpperCase() === 'P3').length
    p4 = items.filter(i => (i.priority || '').toUpperCase() === 'P4').length
  }

  return { p1, p2, p3, p4 }
})

const attentionCount = computed(() => {
  const items = dashboardData.value.attention_items || []
  return items.length
})

const totalAttentionCount = computed(() => {
  return (dashboardData.value.attention_items || []).length
})

const visibleAttentionItems = computed(() => {
  const items = dashboardData.value.attention_items || []
  // Show up to 3 cards by default per Section 7 of Dashboard UI specification
  return items.slice(0, 3)
})

// Table Columns
const assetTableColumns = [
  { key: 'asset', label: 'Asset', width: '25%' },
  { key: 'condition', label: 'Condition', width: '20%' },
  {
    key: 'health',
    label: 'Health',
    align: 'right',
    width: '15%',
    tooltip: 'Current Asset Health Score (0-100). Higher values indicate healthier condition.'
  },
  { key: 'priority', label: 'Priority', width: '15%' },
  { key: 'forecast', label: 'Forecast', width: '15%' },
  { key: 'actions', label: '', align: 'right', width: '10%' }
]

// Data Fetching
const fetchDashboardData = async () => {
  loading.value = true
  error.value = null

  try {
    // 1. Fetch Dashboard Overview per 07_FRONTEND_BACKEND_CONTRACT.md
    const response = await apiClient.get(ENDPOINTS.ANALYTICS_DASHBOARD)
    const payload = response.data?.data || response.data || {}
    dashboardData.value = {
      ...dashboardData.value,
      ...payload
    }

    // 2. Fetch Assets and Inferences to populate Asset Status comparison table
    await fetchAssetStatusTable()
  } catch (err) {
    error.value = err.message || 'Failed to load dashboard overview.'
  } finally {
    loading.value = false
  }
}

const fetchAssetStatusTable = async () => {
  loadingAssets.value = true
  try {
    // Fetch registered assets and latest condition inferences defensively
    const [assetsRes, inferencesRes] = await Promise.allSettled([
      apiClient.get(ENDPOINTS.ASSETS),
      apiClient.get(ENDPOINTS.ANALYTICS_CONDITION_INFERENCES)
    ])

    const assetsList = assetsRes.status === 'fulfilled' ? (assetsRes.value.data?.data || []) : []
    const inferencesList = inferencesRes.status === 'fulfilled' ? (inferencesRes.value.data?.data || []) : []

    // Map by asset_id
    const inferenceMap = new Map()
    inferencesList.forEach(inf => {
      if (inf.asset_id) inferenceMap.set(inf.asset_id, inf)
    })

    if (assetsList.length > 0) {
      assetRows.value = assetsList.map(asset => {
        const inf = inferenceMap.get(asset.asset_id)
        return {
          asset_id: asset.asset_id,
          tag_number: asset.tag_number,
          asset_name: asset.asset_name,
          condition: inf?.condition_state || 'NORMAL',
          health: inf?.health_index !== undefined ? inf.health_index : (inf?.pca_anomaly_score ? (100 - inf.pca_anomaly_score * 10).toFixed(0) : '—'),
          priority: inf?.priority || 'P4',
          forecast: (inf?.priority === 'P1' || inf?.priority === 'P2') ? 'Attention' : '—'
        }
      })
    } else if (inferencesList.length > 0) {
      assetRows.value = inferencesList.map((inf, idx) => ({
        asset_id: inf.asset_id || idx + 1,
        tag_number: `Asset #${inf.asset_id || idx + 1}`,
        asset_name: '',
        condition: inf.condition_state || 'NORMAL',
        health: inf.health_index ?? '—',
        priority: inf.priority || 'P4',
        forecast: (inf.priority === 'P1' || inf.priority === 'P2') ? 'Attention' : '—'
      }))
    }
  } catch {
    // Graceful fallback: table renders empty state
  } finally {
    loadingAssets.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard-container {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1300px;
  margin: 0 auto;
}

/* Loading & Error */
.dashboard-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 380px;
  gap: 16px;
}

.loading-message {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
}

.dashboard-error {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.error-card {
  background: var(--surface);
  border: 1px solid var(--status-alarm);
  border-radius: var(--radius-md);
  padding: 24px 32px;
  max-width: 500px;
  text-align: center;
  box-shadow: var(--shadow-hover);
}

.error-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
  color: var(--status-alarm);
}

.error-icon {
  font-size: 24px;
}

.error-body {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 20px;
}

/* Dashboard Header */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.page-title {
  font-size: var(--font-size-2xl);
  color: var(--primary-dark);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.context-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  box-shadow: var(--shadow-sm);
}

.pill-label {
  color: var(--text-muted);
  font-weight: 500;
}

.pill-value {
  color: var(--primary-navy);
  font-weight: 600;
}

/* Section Headings */
.dashboard-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.section-heading {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--primary-dark);
  letter-spacing: -0.01em;
}

.section-subtext {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Section 1: ATTENTION REQUIRED */
.priority-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-count-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 700;
  border: 1px solid;
}

.priority-count-pill.p1 {
  background: var(--priority-p1-bg);
  color: var(--priority-p1);
  border-color: var(--priority-p1);
}

.priority-count-pill.p2 {
  background: var(--priority-p2-bg);
  color: var(--priority-p2);
  border-color: var(--priority-p2);
}

.priority-count-pill.p3 {
  background: var(--priority-p3-bg);
  color: var(--priority-p3);
  border-color: var(--priority-p3);
}

.priority-count-pill.p4 {
  background: var(--priority-p4-bg);
  color: var(--priority-p4);
  border-color: var(--priority-p4);
}

.attention-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attention-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  transition: all 0.15s ease-in-out;
}

.attention-card:hover {
  border-color: var(--border-focus);
}

.border-p-p1 { border-left: 4px solid var(--priority-p1); }
.border-p-p2 { border-left: 4px solid var(--priority-p2); }
.border-p-p3 { border-left: 4px solid var(--priority-p3); }
.border-p-p4 { border-left: 4px solid var(--priority-p4); }

.attention-col-priority {
  flex-shrink: 0;
  width: 70px;
}

.attention-col-issue {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.asset-tag {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary-dark);
}

.problem-trigger {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.ticket-state-tag {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.attention-col-action {
  width: 280px;
  border-left: 1px solid var(--border-subtle);
  padding-left: 16px;
}

.action-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.action-desc {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.4;
}

.attention-col-cta {
  flex-shrink: 0;
}

.btn-sm {
  padding: 6px 12px;
  font-size: var(--font-size-xs);
}

.attention-continuation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.link-bold {
  color: var(--primary-blue);
  font-weight: 600;
}

.link-bold:hover {
  text-decoration: underline;
}

.attention-empty-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.check-icon {
  color: var(--status-normal);
  font-weight: 700;
}

/* Grids for Tier 1 & Tier 2 KPIs */
.kpi-grid-tier-1 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.kpi-grid-tier-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

/* Asset Status Table */
.asset-cell {
  display: flex;
  flex-direction: column;
}

.asset-tag-link {
  font-weight: 600;
  color: var(--primary-blue);
}

.asset-subname {
  font-size: 11px;
  color: var(--text-muted);
}

.health-number {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--primary-dark);
}

.forecast-warn {
  color: var(--priority-p2);
  font-weight: 600;
  font-size: var(--font-size-xs);
}

.forecast-muted {
  color: var(--text-muted);
}

.action-table-link {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-blue);
}

.action-table-link:hover {
  text-decoration: underline;
}

/* Section 5: Trend Analysis */
.trend-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 20px;
}

.trend-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.trend-indicator-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-navy);
}

.select-indicator {
  font-family: var(--font-family-base);
  font-size: var(--font-size-xs);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  color: var(--text-primary);
  background-color: var(--surface);
}

.trend-group-tabs {
  display: flex;
  gap: 4px;
  background: var(--surface-alt);
  padding: 3px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 5px 12px;
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: var(--surface);
  color: var(--primary-blue);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.trend-viewport {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trend-provenance-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.info-tag {
  background: var(--surface-alt);
  border: 1px solid var(--border-subtle);
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 600;
  color: var(--primary-navy);
}

.divider {
  color: var(--border);
}

.trend-placeholder-canvas {
  height: 220px;
  background-color: #F8FAFD;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.trend-message {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1;
}

.trend-icon {
  font-size: 28px;
}

.trend-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--primary-dark);
}

.trend-sub {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  max-width: 440px;
}
</style>
