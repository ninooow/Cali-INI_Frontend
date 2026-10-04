/**
 * Cali-INI Authoritative Endpoints Constant
 * Strictly mapped from 07_FRONTEND_BACKEND_CONTRACT.md
 * Never invent an endpoint.
 */
export const ENDPOINTS = {
  // System Health
  HEALTH: '/health',
  SYSTEM: '/system',

  // Assets
  ASSETS: '/assets',
  ASSET_BY_ID: (id) => `/assets/${id}`,
  ASSET_TAGS: (id) => `/assets/${id}/tags`,
  ASSET_LIMITS: (id) => `/assets/${id}/limits`,

  // Telemetry
  TELEMETRY_HOURLY: '/telemetry/hourly',

  // Reliability
  INCIDENTS: '/reliability/incidents',
  INCIDENT_BY_ID: (id) => `/reliability/incidents/${id}`,
  RCA: '/reliability/rca',
  RCA_BY_AR: (arNo) => `/reliability/rca/${arNo}`,
  RCA_PRIORITY_MATRIX: (arNo) => `/reliability/rca/${arNo}/priority-matrix`,
  RCA_4P: (arNo) => `/reliability/rca/${arNo}/4p`,
  RCA_4M: (arNo) => `/reliability/rca/${arNo}/4m`,
  RCA_CAPA: (arNo) => `/reliability/rca/${arNo}/capa`,

  // Problem Workflow
  WORKFLOW_TICKETS: '/workflow/tickets',
  WORKFLOW_TICKET_BY_ID: (id) => `/workflow/tickets/${id}`,
  WORKFLOW_TICKET_AUDIT_LOGS: (id) => `/workflow/tickets/${id}/audit_logs`,

  // Users
  USERS: '/users',
  USER_BY_ID: (id) => `/users/${id}`,

  // Analytics Domain (Read-Only)
  ANALYTICS_RUNS: '/analytics/runs',
  ANALYTICS_RUN_LATEST: '/analytics/runs/latest',
  ANALYTICS_RUN_BY_ID: (id) => `/analytics/runs/${id}`,
  ANALYTICS_CONDITION_INFERENCES: '/analytics/condition-inferences',
  ANALYTICS_PARAMETER_FORECASTS: '/analytics/parameter-forecasts',
  ANALYTICS_RCA_MATCHES: '/analytics/rca-matches',
  ANALYTICS_DASHBOARD: '/analytics/dashboard',

  // Asset Configuration
  SENSOR_TAGS: '/sensor-tags',
  EQUIPMENT_LIMITS: '/equipment-limits'
}

export default ENDPOINTS
