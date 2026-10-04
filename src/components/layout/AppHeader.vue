<template>
  <header class="app-header">
    <div class="header-brand">
      <img
        :src="chandraAsriLogo"
        alt="PT Chandra Asri Pacific Tbk"
        class="company-logo"
      />

      <div class="brand-text">
        <div class="product-name">Cali-INI</div>
        <div class="product-subtitle">
          Intelligent Manufacturing Decision Support
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import chandraAsriLogo from '@/assets/images/logo.svg'
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.header-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.company-logo {
  height: 42px;
  width: auto;
  object-fit: contain;
  display: block;
}

.brand-divider {
  width: 1px;
  height: 34px;
  background-color: var(--border);
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.product-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary-dark);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.product-subtitle {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  letter-spacing: 0.01em;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 20px;
}

.scope-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--surface-alt);
  border: 1px solid var(--border-subtle);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.scope-label {
  color: var(--text-muted);
  font-weight: 500;
}

.scope-value {
  color: var(--primary-navy);
  font-weight: 600;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--status-normal-bg);
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--status-normal);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--status-normal-text);
  letter-spacing: 0.04em;
}
</style>