<template>
  <aside class="app-sidebar">
    <nav class="nav-container">
      <!-- Section: OVERVIEW -->
      <div class="nav-group">
        <div class="group-title">OVERVIEW</div>
        <router-link to="/dashboard" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 15.5v-11zM4.5 3.5c-.55 0-1 .45-1 1v4h13v-4c0-.55-.45-1-1-1h-11zm13 6.5h-6v6.5h5a1 1 0 001-1V10zm-7.5 6.5V10h-6.5v5.5a1 1 0 001 1h5.5z"/>
          </svg>
          <span class="nav-label">Dashboard</span>
        </router-link>
      </div>

      <!-- Section: OPERATIONS -->
      <div class="nav-group">
        <div class="group-title">OPERATIONS</div>
        <router-link to="/operations/data-input" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm1 5a1 1 0 00-1 1v.01a1 1 0 001 1h12a1 1 0 001-1V16a1 1 0 00-1-1H4z" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">Data Input</span>
        </router-link>
        <router-link to="/operations/problem-verification" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">Problem Verification</span>
        </router-link>
      </div>

      <!-- Section: RELIABILITY -->
      <div class="nav-group">
        <div class="group-title">RELIABILITY</div>
        <router-link to="/reliability/incidents" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">Incident Register</span>
        </router-link>
        <router-link to="/reliability/capa" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">CAPA Tracking</span>
        </router-link>
      </div>

      <!-- Section: ASSET MANAGEMENT -->
      <div class="nav-group">
        <div class="group-title">ASSET MANAGEMENT</div>
        <router-link to="/assets" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">Assets Directory</span>
        </router-link>
        <router-link to="/assets/sensors" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">Sensors & Parameters</span>
        </router-link>
        <router-link to="/assets/limits" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span class="nav-label">Equipment Limits</span>
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script setup>
</script>

<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height));
  position: sticky;
  top: var(--header-height);
  overflow-y: auto;
}

.nav-container {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  padding: 4px 12px;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s ease-in-out;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: var(--surface-alt);
  color: var(--primary-dark);
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.75;
  transition: opacity 0.15s ease;
}

.nav-item:hover .nav-icon {
  opacity: 1;
}

/* Active router link state per 04_Cali_INI_Design_System_and_Logo.md */
.router-link-active {
  background-color: #EBF3FC;
  color: var(--primary-blue);
  font-weight: 600;
  border-left-color: var(--accent-turquoise);
}

.router-link-active .nav-icon {
  color: var(--primary-blue);
  opacity: 1;
}
</style>
