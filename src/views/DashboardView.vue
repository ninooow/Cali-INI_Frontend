<template>
  <div class="dashboard-container">
    <!-- Loading State -->
    <div v-if="loading" class="dashboard-loading">
      <div class="dashboard-loader" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <p class="loading-message">Preparing plant insights...</p>
      <p class="loading-submessage">Fetching the latest analytics and asset status</p>
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
      
        <div class="dashboard-top-filters">
          <label class="top-filter">
            <span>Asset Scope</span>
            <select v-model="selectedAssetScope">
              <option value="ALL">All Assets</option>
              <option
                v-for="asset in assetOptions"
                :key="asset.asset_id"
                :value="String(asset.asset_id)"
              >
                {{ asset.tag_number || asset.asset_name || `Asset ${asset.asset_id}` }}
              </option>
            </select>
          </label>

          <label class="top-filter">
            <span>Priority</span>
            <select v-model="attentionPriority">
              <option value="ALL">All</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
          </label>

          <button
            type="button"
            class="top-filter-reset"
            :disabled="!hasActiveDashboardFilters"
            @click="resetDashboardFilters"
          >
            Reset
          </button>
        </div></header>

      <!-- Dashboard-level filters -->


      <!-- 1. WHAT: ATTENTION REQUIRED -->
      <section class="dashboard-section section-attention">
        <div class="section-title-row">
          <div>
            <h2 class="section-heading">ATTENTION REQUIRED</h2>
            <p class="section-subtext">
              {{ attentionCount }} {{ attentionCount === 1 ? 'item requires' : 'items require' }} attention
            </p>
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
                <span class="asset-tag">{{ getAssetLabel(item) }}</span>
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
          <div v-if="filteredAttentionItems.length > 3" class="attention-continuation">
            <span>Showing {{ visibleAttentionItems.length }} of {{ filteredAttentionItems.length }} matching problems</span>
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
            <p class="section-subtext">Scope: {{ selectedScopeLabel }}</p>
          </div>
        </div>

        <div class="kpi-grid-tier-1">
          <MetricCard title="Asset Health Score" :value="selectedAssetScope === 'ALL' ? 'Select an asset to view its score' : (kpiDisplay('asset_health_score') === 'N/A' ? 'N/A' : `${kpiDisplay('asset_health_score')} / 100`)" interpretation="Overall asset health based on current condition and degradation indicators." tooltip="Overall asset health based on current condition and degradation indicators. Score range: 0–100; higher values indicate healthier condition." :tier="1" :unsupported="false" />
          <MetricCard title="Operating Performance Index" :value="selectedAssetScope === 'ALL' ? 'Select an asset to view its index' : kpiDisplay('operating_performance_index')" interpretation="Indicates how effectively the asset is operating relative to its expected performance." tooltip="Indicates how effectively the asset is operating relative to its expected performance." :tier="1" :unsupported="false" />
          <MetricCard title="Reliability & Consequence Index" :value="selectedAssetScope === 'ALL' ? 'Select an asset to view its index' : kpiDisplay('reliability_consequence_index')" interpretation="Represents asset reliability while considering the consequence of potential failure." tooltip="Represents asset reliability while considering the consequence of potential failure." :tier="1" :unsupported="false" />
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
          <MetricCard title="Load Index" :value="selectedAssetScope === 'ALL' ? 'Select an asset to view' : kpiDisplay('load_index')" interpretation="Engine-calculated load index" :tier="2" :unsupported="selectedAssetScope !== 'ALL' && !selectedAssetKpi" />
          <MetricCard title="Production Index" :value="selectedAssetScope === 'ALL' ? 'Select an asset to view' : kpiDisplay('production_index')" interpretation="Engine-calculated production index" :tier="2" :unsupported="selectedAssetScope !== 'ALL' && !selectedAssetKpi" />
          <MetricCard title="Downtime — Last 30 Days" :value="selectedAssetScope === 'ALL' ? 'Select an asset to view' : kpiDisplay('downtime_30d_h')" :unit="selectedAssetScope === 'ALL' ? '' : 'h'" interpretation="Engine-calculated downtime" :tier="2" :unsupported="selectedAssetScope !== 'ALL' && !selectedAssetKpi" />
          <MetricCard title="Emission Intensity Proxy" :value="selectedAssetScope === 'ALL' ? 'Select an asset to view' : kpiDisplay('emission_intensity_proxy')" interpretation="Engine-calculated emission intensity proxy" :tier="2" :unsupported="selectedAssetScope !== 'ALL' && !selectedAssetKpi" />
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
          :rows="filteredAssetRows"
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
            <StatusBadge :value="item.condition || item.condition_state || '—'" type="condition" />
          </template>

          <template #item-health="{ item }">
            <span class="health-number">
              {{ item.health !== null && item.health !== undefined ? item.health : '—' }}
            </span>
          </template>

          <template #item-priority="{ item }">
            <StatusBadge :value="item.priority || '—'" type="priority" />
          </template>

          <template #item-forecast="{ item }">
            <span :class="item.forecast === 'Available' ? 'forecast-available' : 'forecast-muted'">
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

      <!-- 5. HOW: TREND ANALYSIS -->
      <section class="dashboard-section section-trends">
        <div class="section-title-row">
          <div>
            <h2 class="section-heading">TREND ANALYSIS</h2>
            <p class="section-subtext">Historical telemetry and available model forecast for a selected asset.</p>
          </div>
        </div>

        <div v-if="selectedAssetScope === 'ALL'" class="trend-select-asset">
          <span class="trend-icon">📈</span>
          <strong>Pilih asset untuk menampilkan grafik</strong>
        </div>

        <div v-else class="trend-card">
          <div class="trend-card-header">
            <div>
              <h3 class="trend-chart-title">{{ selectedScopeLabel }} — {{ selectedIndicatorLabel }}</h3>
              <span class="trend-chart-unit">{{ selectedIndicatorUnit }}</span>
            </div>
            <select v-model="selectedIndicator" class="select-indicator">
              <option value="vibration">Overall Vibration</option>
              <option value="temperature">Bearing Temperature</option>
              <option value="discharge">Discharge Pressure</option>
              <option value="current">Motor Current</option>
            </select>
          </div>

          <div class="trend-range-controls">
            <label>
              <span>From</span>
              <input type="datetime-local" v-model="trendRangeStart" />
            </label>
            <label>
              <span>To</span>
              <input type="datetime-local" v-model="trendRangeEnd" />
            </label>
            <button type="button" class="range-btn" @click="applyTrendRange">Apply range</button>
            <button type="button" class="range-btn ghost" @click="resetTrendRange">Reset</button>
          </div>

          <div v-if="latestForecast" class="forecast-summary">
            <div>
              <span class="forecast-summary-label">Latest Forecast</span>
              <strong>{{ formatForecastValue(latestForecast.value) }} {{ selectedIndicatorUnit }}</strong>
            </div>
            <div v-if="Number.isFinite(latestForecast.lower) && Number.isFinite(latestForecast.upper)">
              <span class="forecast-summary-label">Forecast Range</span>
              <strong>{{ formatForecastValue(latestForecast.lower) }} – {{ formatForecastValue(latestForecast.upper) }} {{ selectedIndicatorUnit }}</strong>
            </div>
            <div>
              <span class="forecast-summary-label">Forecast Time</span>
              <strong>{{ formatTrendTime(latestForecast.time) }}</strong>
            </div>
          </div>

          <div class="trend-legend">
            <span><i class="legend-line measured"></i>Measured value</span>
            <span v-if="forwardForecastPoints.length"><i class="legend-line forecast"></i>Forward estimate / forecast</span>
            <span v-if="hasForecastBand"><i class="legend-band"></i>Model uncertainty range</span>
            <span v-if="alarmLimit != null"><i class="legend-line alarm"></i>Alarm limit</span>
            <span v-if="tripLimit != null"><i class="legend-line trip"></i>Trip limit</span>
          </div>

          <div v-if="loadingTrend" class="trend-message trend-loading">
            <div class="spinner"></div><p>Loading trend data...</p>
          </div>
          <div v-else-if="trendPoints.length < 2" class="trend-message trend-loading">
            <span class="trend-icon">📈</span>
            <p class="trend-title">No trend data available</p>
          </div>

          <div v-else class="trend-chart-wrap">
            <svg class="trend-svg" viewBox="0 0 1100 390" preserveAspectRatio="none" role="img">
              <line v-for="y in chartGridY" :key="`g${y}`" x1="72" :y1="y" x2="1060" :y2="y" class="chart-grid" />

              <polygon v-if="hasForecastBand" :points="forecastBandPolygon" class="forecast-band" />

              <line v-if="alarmLimit != null" x1="72" :y1="scaleY(alarmLimit)" x2="1060" :y2="scaleY(alarmLimit)" class="limit-line alarm-line" />
              <text v-if="alarmLimit != null" x="1055" :y="scaleY(alarmLimit)-7" text-anchor="end" class="limit-label">Alarm limit</text>
              <line v-if="tripLimit != null" x1="72" :y1="scaleY(tripLimit)" x2="1060" :y2="scaleY(tripLimit)" class="limit-line trip-line" />
              <text v-if="tripLimit != null" x="1055" :y="scaleY(tripLimit)-7" text-anchor="end" class="limit-label">Trip limit</text>

              <template v-if="forecastBoundaryX != null">
                <rect
                  x="72"
                  y="32"
                  :width="Math.max(0, forecastBoundaryX - 72)"
                  height="298"
                  class="historical-zone"
                />
                <rect
                  :x="forecastBoundaryX"
                  y="32"
                  :width="Math.max(0, 1060 - forecastBoundaryX)"
                  height="298"
                  class="forecast-zone"
                />
                <text x="84" y="48" class="zone-label">HISTORICAL / MEASURED</text>
                <text :x="Math.min(forecastBoundaryX + 10, 940)" y="48" class="zone-label forecast-zone-label">FORECAST</text>
                <line :x1="forecastBoundaryX" y1="32" :x2="forecastBoundaryX" y2="330" class="reference-line" />
                <text :x="Math.min(forecastBoundaryX + 7, 900)" y="24" class="reference-label">Forecast boundary</text>
              </template>

              <polyline :points="trendPolyline" class="trend-line measured-line" fill="none" />
              <polyline v-if="forwardForecastPoints.length" :points="forecastPolyline" class="trend-line forecast-line" fill="none" />

              <g v-for="(p,i) in trendChartPoints" :key="`p${i}`">
                <circle :cx="p.x" :cy="p.y" r="4" class="measured-dot">
                  <title>{{ formatTrendTime(p.time) }} — {{ p.value.toFixed(2) }} {{ selectedIndicatorUnit }}</title>
                </circle>
              </g>

              <text v-for="tick in yTicks" :key="`y${tick.value}`" x="58" :y="tick.y+4" text-anchor="end" class="axis-label">{{ tick.label }}</text>
              <text v-for="tick in xTicks" :key="`x${tick.x}`" :x="tick.x" y="355" text-anchor="middle" class="axis-label">{{ tick.label }}</text>
              <text x="566" y="382" text-anchor="middle" class="axis-title">Time</text>
              <text transform="translate(18 190) rotate(-90)" text-anchor="middle" class="axis-title">{{ selectedIndicatorUnit }}</text>
            </svg>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
  data_status: 'UNKNOWN',
  active_assets_count: 0,
  attention_summary: {},
  attention_items: []
})

const assetRows = ref([])
const assetKpiRows = ref([])
const selectedIndicator = ref('vibration')
const attentionPriority = ref('ALL')
const selectedAssetScope = ref('ALL')
const assetOptions = ref([])
const loadingTrend = ref(false)
const telemetryRows = ref([])
const forecastRows = ref([])
const equipmentLimits = ref([])
const trendRangeStart = ref('')
const trendRangeEnd = ref('')
const appliedTrendRangeStart = ref(null)
const appliedTrendRangeEnd = ref(null)

// Formatters
const formattedAsOf = computed(() => {
  if (!dashboardData.value.as_of) {
    return '—'
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
  let items = dashboardData.value.attention_items || []

  if (selectedAssetScope.value !== 'ALL') {
    const selected = assetOptions.value.find(a => String(a.asset_id) === selectedAssetScope.value)
    items = items.filter(i =>
      String(i.asset_id ?? '') === selectedAssetScope.value ||
      (selected?.tag_number && (i.asset_tag === selected.tag_number || i.tag_number === selected.tag_number))
    )
  }

  return {
    p1: items.filter(i => (i.priority || '').toUpperCase() === 'P1').length,
    p2: items.filter(i => (i.priority || '').toUpperCase() === 'P2').length,
    p3: items.filter(i => (i.priority || '').toUpperCase() === 'P3').length,
    p4: items.filter(i => (i.priority || '').toUpperCase() === 'P4').length
  }
})

const attentionCount = computed(() => filteredAttentionItems.value.length)

const totalAttentionCount = computed(() => {
  return (dashboardData.value.attention_items || []).length
})

const getAssetLabel = (item) => {
  const asset = assetOptions.value.find(
    a => String(a.asset_id) === String(item.asset_id)
  )

  return (
    item.asset_tag ||
    item.tag_number ||
    item.asset_name ||
    asset?.tag_number ||
    asset?.asset_name ||
    (item.asset_id ? `Asset #${item.asset_id}` : 'Unknown Asset')
  )
}

const selectedScopeLabel = computed(() => {
  if (selectedAssetScope.value === 'ALL') return 'All assets'
  const asset = assetOptions.value.find(a => String(a.asset_id) === selectedAssetScope.value)
  return asset?.tag_number || asset?.asset_name || `Asset #${selectedAssetScope.value}`
})


const filteredAttentionItems = computed(() => {
  let items = dashboardData.value.attention_items || []

  if (selectedAssetScope.value !== 'ALL') {
    const selected = assetOptions.value.find(a => String(a.asset_id) === selectedAssetScope.value)
    items = items.filter(i =>
      String(i.asset_id ?? '') === selectedAssetScope.value ||
      (selected?.tag_number && (i.asset_tag === selected.tag_number || i.tag_number === selected.tag_number))
    )
  }

  if (attentionPriority.value !== 'ALL') {
    items = items.filter(i => (i.priority || '').toUpperCase() === attentionPriority.value)
  }

  return items
})

const priorityRank = { P1: 1, P2: 2, P3: 3, P4: 4 }
const visibleAttentionItems = computed(() =>
  [...filteredAttentionItems.value]
    .sort((a, b) => (priorityRank[(a.priority || 'P4').toUpperCase()] || 99) - (priorityRank[(b.priority || 'P4').toUpperCase()] || 99))
    .slice(0, 3)
)

const attentionAssetIds = computed(() => new Set(
  filteredAttentionItems.value.map(i => String(i.asset_id ?? '')).filter(Boolean)
))

const filteredAssetRows = computed(() => {
  let rows = assetRows.value

  if (selectedAssetScope.value !== 'ALL') {
    rows = rows.filter(r => String(r.asset_id) === selectedAssetScope.value)
  }

  if (attentionPriority.value !== 'ALL') {
    rows = rows.filter(r => (r.priority || '').toUpperCase() === attentionPriority.value)
  }

  return rows
})

const selectedAssetKpi = computed(() => {
  if (selectedAssetScope.value === 'ALL') return null
  return assetKpiRows.value.find(row => String(row.asset_id) === selectedAssetScope.value) || null
})

const kpiDisplay = (field, digits = 1) => {
  const value = selectedAssetKpi.value?.[field]
  if (value === null || value === undefined) return 'N/A'
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits) : 'N/A'
}

const hasActiveDashboardFilters = computed(() => selectedAssetScope.value !== 'ALL' || attentionPriority.value !== 'ALL')

const resetDashboardFilters = () => {
  selectedAssetScope.value = 'ALL'
  attentionPriority.value = 'ALL'
  fetchTrendData()
}

const indicatorMeta = {
  vibration: {
    field: 'vib',
    forecastNames: ['Overall Vibration', 'DE Radial Vibration', 'Motor Vibration'],
    label: 'Overall Vibration',
    unit: 'mm/s RMS',
    limitKeys: ['VIB', 'VIBRATION']
  },
  temperature: {
    field: 'temp',
    forecastNames: ['Bearing Temp', 'Bearing Metal Temp', 'Motor DE Bearing Temp'],
    label: 'Bearing Temperature',
    unit: '°C',
    limitKeys: ['TEMP', 'TEMPERATURE']
  },
  discharge: {
    field: 'disp',
    forecastNames: ['Discharge Pressure'],
    label: 'Discharge Pressure',
    unit: 'bar',
    limitKeys: ['DISP', 'DISCHARGE', 'PRESSURE']
  },
  current: {
    field: 'amp',
    forecastNames: ['Motor Ampere'],
    label: 'Motor Current',
    unit: 'A',
    limitKeys: ['AMP', 'CURRENT']
  }
}
const selectedMeta = computed(() => indicatorMeta[selectedIndicator.value])
const indicatorField = computed(() => selectedMeta.value.field)
const selectedIndicatorLabel = computed(() => selectedMeta.value.label)
const selectedIndicatorUnit = computed(() => selectedMeta.value.unit)

const scopedTelemetryRows = computed(() =>
  selectedAssetScope.value === 'ALL'
    ? []
    : (telemetryRows.value || []).filter(r => String(r.asset_id) === selectedAssetScope.value)
)
const latestTelemetry = computed(() =>
  [...scopedTelemetryRows.value].filter(r => r.measured_at)
    .sort((a,b) => new Date(b.measured_at) - new Date(a.measured_at))[0] || null
)
const telemetryDisplay = (field, digits = 1) => {
  const value = latestTelemetry.value?.[field]
  if (value === null || value === undefined || value === '') return 'N/A'
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits) : String(value)
}

const inAppliedRange = time => {
  const ms = new Date(time).getTime()
  if (!Number.isFinite(ms)) return false
  if (appliedTrendRangeStart.value && ms < new Date(appliedTrendRangeStart.value).getTime()) return false
  if (appliedTrendRangeEnd.value && ms > new Date(appliedTrendRangeEnd.value).getTime()) return false
  return true
}

const trendPoints = computed(() =>
  scopedTelemetryRows.value.map(row => ({
    time: row.measured_at,
    value: Number(row[indicatorField.value])
  })).filter(p => p.time && Number.isFinite(p.value) && inAppliedRange(p.time))
    .sort((a,b) => new Date(a.time)-new Date(b.time))
    .slice(-240)
)

const forecastPoints = computed(() => {
  const names = (selectedMeta.value.forecastNames || []).map(v => String(v).trim().toUpperCase())
  return (forecastRows.value || [])
    .filter(r => names.includes(String(r.canonical_param || '').trim().toUpperCase()))
    .map(r => ({
      time: r.forecast_at || r.target_time || r.measured_at || r.timestamp,
      value: Number(r.estimate ?? r.forecast_value ?? r.predicted_value),
      lower: Number(r.lower_bound ?? r.forecast_lower ?? r.lower),
      upper: Number(r.upper_bound ?? r.forecast_upper ?? r.upper)
    }))
    .filter(p => p.time && Number.isFinite(p.value) && inAppliedRange(p.time))
    .sort((a,b)=>new Date(a.time)-new Date(b.time))
})

const latestForecast = computed(() => forwardForecastPoints.value.at(-1) || null)
const formatForecastValue = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—'

const applyTrendRange = () => {
  appliedTrendRangeStart.value = trendRangeStart.value || null
  appliedTrendRangeEnd.value = trendRangeEnd.value || null
}
const resetTrendRange = () => {
  trendRangeStart.value = ''
  trendRangeEnd.value = ''
  appliedTrendRangeStart.value = null
  appliedTrendRangeEnd.value = null
}

const selectedLimit = computed(() => {
  const keys=selectedMeta.value.limitKeys
  return (equipmentLimits.value || []).find(l => keys.some(k => String(l.parameter || l.canonical_param || '').toUpperCase().includes(k))) || null
})
const numericLimit = (...keys) => {
  const l=selectedLimit.value
  if (!l) return null
  for (const k of keys) {
    const n=Number(l[k])
    if (Number.isFinite(n)) return n
  }
  return null
}
const alarmLimit = computed(() => numericLimit('alarm_limit','alarm_high','high_alarm','warning_limit'))
const tripLimit = computed(() => numericLimit('trip_limit','trip_high','high_trip'))

const allChartValues = computed(() => [
  ...trendPoints.value.map(p=>p.value),
  ...forwardForecastPoints.value.flatMap(p=>[p.value,p.lower,p.upper]).filter(Number.isFinite),
  alarmLimit.value, tripLimit.value
].filter(Number.isFinite))
const trendExtent = computed(() => {
  if (!allChartValues.value.length) return {min:0,max:1}
  let min=Math.min(...allChartValues.value), max=Math.max(...allChartValues.value)
  const pad=(max-min || 1)*0.12
  return {min:min-pad,max:max+pad}
})
const allTimes = computed(() => [...trendPoints.value,...forwardForecastPoints.value].map(p=>new Date(p.time).getTime()).filter(Number.isFinite))
const timeExtent = computed(() => ({min:Math.min(...allTimes.value),max:Math.max(...allTimes.value)}))
const scaleX = time => {
  const {min,max}=timeExtent.value
  return max===min ? 72 : 72+((new Date(time).getTime()-min)/(max-min))*988
}
const scaleY = value => {
  const {min,max}=trendExtent.value
  return 330-((Number(value)-min)/(max-min))*280
}
// Historical/forecast boundary = last real telemetry timestamp.
// Persisted forecasts can contain historical/backtest points, so only target times
// strictly after the last measured point are rendered as forward forecast.
const forecastBoundaryTime = computed(() => {
  const times = trendPoints.value
    .map(p => new Date(p.time).getTime())
    .filter(Number.isFinite)
  return times.length ? new Date(Math.max(...times)).toISOString() : null
})
const forwardForecastPoints = computed(() => {
  if (!forecastBoundaryTime.value) return []
  const boundaryMs = new Date(forecastBoundaryTime.value).getTime()
  return forecastPoints.value.filter(p => new Date(p.time).getTime() > boundaryMs)
})
const historicalTrendPoints = computed(() => trendPoints.value)
const trendChartPoints = computed(() => historicalTrendPoints.value.map(p=>({...p,x:scaleX(p.time),y:scaleY(p.value)})))
const trendPolyline = computed(() => trendChartPoints.value.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const forecastPolyline = computed(() => forwardForecastPoints.value.map(p=>`${scaleX(p.time).toFixed(1)},${scaleY(p.value).toFixed(1)}`).join(' '))
const hasForecastBand = computed(() => forwardForecastPoints.value.length>1 && forwardForecastPoints.value.every(p=>Number.isFinite(p.lower)&&Number.isFinite(p.upper)))
const forecastBandPolygon = computed(() => {
  if (!hasForecastBand.value) return ''
  const upper=forwardForecastPoints.value.map(p=>`${scaleX(p.time).toFixed(1)},${scaleY(p.upper).toFixed(1)}`)
  const lower=[...forwardForecastPoints.value].reverse().map(p=>`${scaleX(p.time).toFixed(1)},${scaleY(p.lower).toFixed(1)}`)
  return [...upper,...lower].join(' ')
})
const forecastBoundaryX = computed(() =>
  forecastBoundaryTime.value && allTimes.value.length
    ? scaleX(forecastBoundaryTime.value)
    : null
)
const chartGridY=[50,120,190,260,330]
const yTicks=computed(()=>chartGridY.map((y,i)=>({y,value:trendExtent.value.max-(i/4)*(trendExtent.value.max-trendExtent.value.min),label:(trendExtent.value.max-(i/4)*(trendExtent.value.max-trendExtent.value.min)).toFixed(1)})))
const xTicks=computed(()=>{
  if(!allTimes.value.length) return []
  const {min,max}=timeExtent.value
  return [0,.25,.5,.75,1].map(f=>{const ms=min+(max-min)*f;return{x:72+988*f,label:new Date(ms).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}})
})
const formatTrendTime = value => value ? new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

const fetchTrendData = async () => {
  if (selectedAssetScope.value === 'ALL') {
    telemetryRows.value = []
    forecastRows.value = []
    equipmentLimits.value = []
    return
  }
  loadingTrend.value = true
  try {
    const assetId=Number(selectedAssetScope.value)
    const [telemetryRes,forecastRes,limitsRes]=await Promise.allSettled([
      apiClient.get(ENDPOINTS.TELEMETRY_HOURLY,{params:{asset_id:assetId}}),
      apiClient.get(ENDPOINTS.ANALYTICS_PARAMETER_FORECASTS,{params:{asset_id:assetId}}),
      apiClient.get(ENDPOINTS.EQUIPMENT_LIMITS,{params:{asset_id:assetId}})
    ])
    const rows = r => r.status==='fulfilled'
      ? (r.value.data?.data || r.value.data?.items || (Array.isArray(r.value.data)?r.value.data:[]))
      : []
    telemetryRows.value=rows(telemetryRes)
    forecastRows.value=rows(forecastRes)
    equipmentLimits.value=rows(limitsRes)
  } finally {
    loadingTrend.value=false
  }
}

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
      ...payload,
      ...(payload.header || {})
    }

    // 2. Fetch Assets and Inferences to populate Asset Status comparison table
    await Promise.all([fetchAssetStatusTable(), fetchTrendData()])
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
    const [assetsRes, latestRunRes] = await Promise.allSettled([
      apiClient.get(ENDPOINTS.ASSETS),
      apiClient.get(ENDPOINTS.ANALYTICS_RUN_LATEST)
    ])

    const assetsList = assetsRes.status === 'fulfilled'
      ? (assetsRes.value.data?.data || assetsRes.value.data?.items || (Array.isArray(assetsRes.value.data) ? assetsRes.value.data : []))
      : []

    const latestRunPayload = latestRunRes.status === 'fulfilled'
      ? (latestRunRes.value.data?.data || latestRunRes.value.data || {})
      : {}
    const latestRunId = latestRunPayload.run_id ?? null

    if (latestRunId) {
      try {
        const kpiRes = await apiClient.get('/analytics/asset-kpis', { params: { run_id: latestRunId } })
        assetKpiRows.value = kpiRes.data?.data || kpiRes.data?.items || (Array.isArray(kpiRes.data) ? kpiRes.data : [])
      } catch {
        assetKpiRows.value = []
      }
    } else {
      assetKpiRows.value = []
    }

    const inferencesRes = await Promise.allSettled([
      apiClient.get(ENDPOINTS.ANALYTICS_CONDITION_INFERENCES, {
        params: latestRunId ? { run_id: latestRunId } : {}
      })
    ])
    const infResponse = inferencesRes[0]
    const inferencesList = infResponse.status === 'fulfilled'
      ? (infResponse.value.data?.data || infResponse.value.data?.items || (Array.isArray(infResponse.value.data) ? infResponse.value.data : []))
      : []

    // Keep the newest inference per asset from the latest run.
    const inferenceMap = new Map()
    inferencesList.forEach(inf => {
      if (inf.asset_id == null) return
      const key = String(inf.asset_id)
      const previous = inferenceMap.get(key)
      const timeOf = row => new Date(row?.as_of_time || row?.created_at || 0).getTime() || 0
      if (!previous || timeOf(inf) >= timeOf(previous)) inferenceMap.set(key, inf)
    })

    // Forecast column is availability only; no frontend risk formula is invented.
    const forecastAvailability = new Map()
    if (latestRunId && assetsList.length) {
      const checks = await Promise.allSettled(
        assetsList.map(asset =>
          apiClient.get(ENDPOINTS.ANALYTICS_PARAMETER_FORECASTS, {
            params: { run_id: latestRunId, asset_id: asset.asset_id }
          })
        )
      )
      checks.forEach((result, index) => {
        const asset = assetsList[index]
        const rows = result.status === 'fulfilled'
          ? (result.value.data?.data || result.value.data?.items || (Array.isArray(result.value.data) ? result.value.data : []))
          : []
        forecastAvailability.set(String(asset.asset_id), rows.length > 0 ? 'Available' : '—')
      })
    }

    if (assetsList.length > 0) {
      assetOptions.value = assetsList
      assetRows.value = assetsList.map(asset => {
        const inf = inferenceMap.get(String(asset.asset_id))
        const kpi = assetKpiRows.value.find(
          row => String(row.asset_id) === String(asset.asset_id)
        )
        return {
          asset_id: asset.asset_id,
          tag_number: asset.tag_number,
          asset_name: asset.asset_name,
          condition: inf?.overall_state || '—',
          health: kpi?.asset_health_score != null
            ? Number(kpi.asset_health_score).toFixed(1)
            : '—',
          pca_anomaly_score: inf?.pca_anomaly_score ?? null,
          priority: inf?.priority || '—',
          forecast: forecastAvailability.get(String(asset.asset_id)) || '—'
        }
      })
    } else if (inferencesList.length > 0) {
      assetRows.value = inferencesList.map((inf, idx) => ({
        asset_id: inf.asset_id || idx + 1,
        tag_number: `Asset #${inf.asset_id || idx + 1}`,
        asset_name: '',
        condition: inf.overall_state || '—',
        health: (() => {
          const kpi = assetKpiRows.value.find(row => String(row.asset_id) === String(inf.asset_id))
          return kpi?.asset_health_score != null ? Number(kpi.asset_health_score).toFixed(1) : '—'
        })(),
        pca_anomaly_score: inf.pca_anomaly_score ?? null,
        priority: inf.priority || '—',
        forecast: '—'
      }))
    }
  } catch {
    // Graceful fallback: table renders empty state
  } finally {
    loadingAssets.value = false
  }
}

watch(selectedAssetScope, () => {
  resetTrendRange()
  fetchTrendData()
})

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
  color: var(--primary-dark);
  font-weight: 600;
  margin: 0;
}

.loading-submessage {
  margin: -8px 0 0;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.dashboard-loader {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 30px;
}

.dashboard-loader span {
  width: 6px;
  height: 12px;
  border-radius: 999px;
  background: var(--primary-blue);
  animation: dashboardPulse 0.9s ease-in-out infinite;
}

.dashboard-loader span:nth-child(2) { animation-delay: 0.12s; }
.dashboard-loader span:nth-child(3) { animation-delay: 0.24s; }

@keyframes dashboardPulse {
  0%, 100% { height: 10px; opacity: .4; }
  50% { height: 28px; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-loader span { animation: none; height: 18px; opacity: .7; }
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
  gap: 18px;
  margin-top: 18px;
}

.dashboard-section + .dashboard-section {
  margin-top: 28px;
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

.forecast-available {
  color: var(--primary-blue);
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

.trend-chart-canvas-old-unused {
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

.priority-count-pill {
  cursor: pointer;
  font-family: inherit;
}
.priority-count-pill.all {
  background: var(--surface);
  color: var(--primary-navy);
  border-color: var(--border);
}
.priority-count-pill.active {
  box-shadow: 0 0 0 2px var(--primary-blue);
}
.trend-chart-canvas {
  min-height: 280px;
  background: #F8FAFD;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  position: relative;
  padding: 12px;
}
.trend-svg { width: 100%; height: 240px; display: block; }
.chart-grid { stroke: var(--border-subtle); stroke-width: 1; vector-effect: non-scaling-stroke; }
.trend-line { stroke: var(--primary-blue); stroke-width: 2.5; vector-effect: non-scaling-stroke; }
.trend-range {
  display: flex; justify-content: space-between; gap: 12px;
  font-size: var(--font-size-xs); color: var(--text-muted); padding: 2px 8px 0;
}


.dashboard-filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-top: 18px;
}
.dashboard-filter {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 160px;
}
.dashboard-filter > span {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-navy);
}
.dashboard-filter select {
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
  font-family: inherit;
}
.attention-only-toggle {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--primary-navy);
  cursor: pointer;
}
.filter-reset-btn {
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--primary-blue);
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
}
.filter-reset-btn:hover { border-color: var(--primary-blue); }
@media (max-width: 768px) {
  .dashboard-filter { min-width: 100%; }
  .dashboard-filter-bar { align-items: stretch; }
}


.dashboard-top-filters{
  margin-left:auto;
  display:flex;
  align-items:flex-end;
  justify-content:flex-end;
  gap:10px;
  flex-wrap:wrap;
}
.top-filter{
  display:flex;
  flex-direction:column;
  gap:4px;
  min-width:112px;
  font-size:11px;
  font-weight:600;
  color:var(--text-secondary);
}
.top-filter select{
  height:36px;
  padding:0 30px 0 10px;
  border:1px solid var(--border);
  border-radius:var(--radius-sm);
  background:var(--surface);
  color:var(--text-primary);
  font:inherit;
}
.top-filter-reset{
  height:36px;
  padding:0 14px;
  border:1px solid var(--border);
  border-radius:var(--radius-sm);
  background:var(--surface);
  color:var(--primary-navy);
  font-weight:600;
  cursor:pointer;
}
.top-filter-reset:disabled{opacity:.45;cursor:default}
@media (max-width:900px){
  .dashboard-top-filters{width:100%;justify-content:flex-start;margin-left:0}
}


.trend-select-asset{min-height:220px;border:1px dashed var(--border);border-radius:var(--radius-md);background:#F8FAFD;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-secondary);text-align:center;padding:24px}
.trend-select-asset strong{color:var(--primary-dark);font-size:var(--font-size-md)}
.trend-card-header{justify-content:space-between;flex-wrap:wrap}
.trend-chart-title{font-size:16px;color:var(--primary-dark);font-weight:700;margin:0}
.trend-chart-unit{font-size:11px;color:var(--text-muted)}
.select-indicator{min-height:38px;font-size:12px;font-weight:600}
.trend-legend{display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:11px;color:var(--text-secondary);margin:4px 0 12px}
.trend-legend span{display:inline-flex;align-items:center;gap:7px}
.legend-line{width:28px;height:0;border-top:2px solid var(--primary-blue);display:inline-block}
.legend-line.forecast{border-top-style:dashed}
.legend-line.alarm{border-top:2px dotted #555}
.legend-line.trip{border-top:2px dashed #222}
.legend-band{width:28px;height:10px;background:#E4EDF7;display:inline-block}
.trend-chart-wrap{width:100%;overflow-x:auto}
.trend-svg{width:100%;min-width:820px;height:390px;display:block}
.chart-grid{stroke:var(--border-subtle);stroke-width:1;vector-effect:non-scaling-stroke}
.measured-line{stroke:var(--primary-blue);stroke-width:2.5;vector-effect:non-scaling-stroke}
.forecast-line{stroke:#21A99A;stroke-width:2.5;stroke-dasharray:10 7;vector-effect:non-scaling-stroke}
.forecast-band{fill:#DDE9F5;opacity:.7}
.measured-dot{fill:var(--surface);stroke:var(--primary-blue);stroke-width:2;vector-effect:non-scaling-stroke}
.historical-zone{fill:#64748B;opacity:.035;pointer-events:none}
.forecast-zone{fill:#22A99A;opacity:.055;pointer-events:none}
.zone-label{font-size:10px;font-weight:700;letter-spacing:.08em;fill:var(--text-muted)}
.forecast-zone-label{fill:#16877C}
.reference-line{stroke:#222;stroke-width:2;stroke-dasharray:3 4;vector-effect:non-scaling-stroke}
.reference-label,.limit-label{font-size:11px;fill:var(--text-muted)}
.limit-line{stroke:#333;stroke-width:1.8;vector-effect:non-scaling-stroke}
.alarm-line{stroke-dasharray:3 4}.trip-line{stroke-dasharray:10 8}
.axis-label{font-size:11px;fill:var(--text-muted)}
.axis-title{font-size:12px;fill:var(--text-secondary)}
.trend-loading{min-height:300px;justify-content:center}


.trend-range-controls{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin:8px 0 14px;padding:12px 14px;background:#F8FAFD;border:1px solid var(--border);border-radius:var(--radius-sm)}
.trend-range-controls label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:700;color:var(--primary-navy)}
.trend-range-controls input{height:36px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text-primary);font-family:inherit}
.range-btn{height:36px;padding:0 14px;border:1px solid var(--primary-blue);border-radius:var(--radius-sm);background:var(--primary-blue);color:white;font-family:inherit;font-weight:700;cursor:pointer}
.range-btn.ghost{background:var(--surface);color:var(--primary-blue)}
.forecast-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 14px}
.forecast-summary>div{padding:12px 14px;background:#F8FAFD;border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:4px}
.forecast-summary-label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);font-weight:700}
.forecast-summary strong{font-size:13px;color:var(--primary-dark)}
@media(max-width:760px){.forecast-summary{grid-template-columns:1fr}.trend-range-controls label{width:100%}.trend-range-controls input{width:100%}}

</style>
