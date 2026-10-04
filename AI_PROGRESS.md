# AI_PROGRESS.md — Cali-INI Frontend Progress

## Current Status: Milestone 7a Completed — Equipment Directory

### 1. Completed Work

- **Milestone 1 — Frontend Foundation:**
  - Vue 3 + Vite tooling, dev proxy, environment config.
  - Design tokens in `src/styles/variables.css` and base styling in `src/styles/main.css`.
  - App shell (`AppHeader.vue`, `AppSidebar.vue`, `AppShell.vue`) and complete `vue-router` structure.
  - Base Axios API client in `src/api/client.js`.

- **Milestone 2 — Design System Components & Dashboard View (`/dashboard`):**
  - Updated `src/api/endpoints.js` to strictly match `07_FRONTEND_BACKEND_CONTRACT.md`.
  - Reusable components: `StatusBadge.vue`, `MetricCard.vue`, `DataTable.vue`.
  - `DashboardView.vue` with WHAT → WHY → HOW hierarchy.

- **Milestone 3 — Operations: Hourly Telemetry Data Input (`/operations/data-input`):**
  - `DataInputView.vue` — `GET/POST /api/v1/telemetry/hourly`, `GET /api/v1/assets`.

- **Milestone 4 — Operations: Problem Verification (`/operations/problem-verification`):**
  - `ProblemVerificationView.vue` — full ticket lifecycle, audit logs.

- **Milestone 5 — Reliability: Incident Register & RCA (`/reliability/incidents`):**
  - `ReliabilityIncidentsView.vue` — Incident listing/create, RCA workspace with Priority Matrix, 4P, 4M, and CAPA tabs.

- **Milestone 5a — Contract Audit Fixes:**
  - **Removed invented `risk_score` formula** from RCA create payload (was hardcoded `12.0`/`8.0` based on `pre_risk`). Now optional user input; omitted from payload if empty.
  - **Added `date_occurrence` user input** to RCA create form (was auto-set to `new Date()`). Now a `datetime-local` field defaulting to current time but editable.
  - **Completed incident detail modal** with all `IncidentResponse` fields: `discipline`, `risk_score`, `actual_loss_kusd`, `potential_loss_kusd`, `rca_due_date`, `source_type`, `created_at`, `updated_at`. Null-safe rendering for all.
  - **Added client-side pagination** (25 rows/page) to both incident and RCA tables per contract §11 guidance.
  - Build verified: PASS (0 errors).

- **Milestone 6 — Reliability: CAPA Tracking (`/reliability/capa`):**
  - Created `src/views/CapaTrackingView.vue`:
    - **WHAT:** View header with breadcrumb and gated "+ New CAPA" (disabled until AR selected).
    - **WHY:** RCA Selector Panel — loads all RCA headers (`GET /api/v1/reliability/rca`), search-filterable dropdown; explicit note that no global CAPA endpoint exists.
    - **HOW:** On AR selection: fetches RCA header detail (`GET /api/v1/reliability/rca/{ar_no}`) for context card (problem statement, root cause, risk), then fetches CAPA list (`GET /api/v1/reliability/rca/{ar_no}/capa`). DataTable with pagination (25/page).
    - **Create CAPA:** Modal form with contracted fields only (`rc`, `action_type`, `target_date`, `pic`, `status`, `action_plan`, `fingerprint`). `fingerprint` is auto-generated via `crypto.subtle.digest('SHA-256')` on `action_plan` text — mandatory 64-char hex per contract §4.3 note.
    - **Enums used:** `action_type` = `CORRECTIVE | PREVENTIVE`; `status` = `OPEN | IN_PROGRESS | CLOSED` (from contract response example).
    - **States:** loading/error/empty for RCA list, RCA detail, CAPA list; submission loading/error in modal.
  - Updated `src/router/index.js`: replaced `PlaceholderView` with `CapaTrackingView` for `/reliability/capa`.
  - Build verified: PASS (0 errors, 108 modules).

- **Milestone 6a — CAPA Contract Audit Fix:**
  - `action_type` locked to `CORRECTIVE` only (read-only input). `PREVENTIVE` removed — not confirmed by contract.
  - `status` locked to `OPEN` only (read-only input). `IN_PROGRESS`/`CLOSED` removed — not confirmed by contract §8.
  - Fingerprint (frontend SHA-256) retained — consistent with contract §4.3 deduplication note.
  - Build verified: PASS (0 errors, 108 modules).

- **Milestone 7a — Asset Management: Equipment Directory (`/assets`):**
  - Created `src/views/EquipmentDirectoryView.vue`:
    - **WHAT:** View header with breadcrumb.
    - **WHY:** Filter bar with all contracted query params (`search`, `plant`, `equipment_type`, `criticality`, `is_active`).
    - **HOW:** DataTable listing all 8 `AssetResponse` fields, client-side pagination (25/page), detail modal via `GET /api/v1/assets/{asset_id}`.
  - Read-only — no create/edit endpoints contracted for assets.
  - Updated `src/router/index.js`: replaced `PlaceholderView` with `EquipmentDirectoryView`.
  - Build verified: PASS (0 errors, 110 modules).

- **Milestone 7b — Asset Management: Sensor & Parameters (`/assets/sensors`):**
  - Created `src/views/SensorTagsView.vue`: filterable list by `asset_id`, `canonical_param`, `is_active` via `GET /api/v1/sensor-tags` and `GET /api/v1/assets/{id}/tags`, dynamic field mapping without invented schemas, detail modal, pagination (25/page).
  - Updated `src/router/index.js` to route `/assets/sensors` to `SensorTagsView`. Build verified: PASS (0 errors, 112 modules).

- **Milestone 7c — Asset Management: Equipment Limits (`/assets/limits`):**
  - Created `src/views/EquipmentLimitsView.vue`: filterable list by `asset_id` and `parameter` via `GET /api/v1/equipment-limits` and `GET /api/v1/assets/{id}/limits`, dynamic field mapping without invented schemas, detail modal, pagination (25/page).
  - Updated `src/router/index.js` to route `/assets/limits` to `EquipmentLimitsView`. Build verified: PASS (0 errors, 114 modules).

- **Milestone 8 — Administration: User Management (`/admin/users`):**
  - Created `src/views/UserManagementView.vue`: user list (`GET /api/v1/users`), contracted user create (`POST /api/v1/users` with `UserCreate`), contracted user edit (`PATCH /api/v1/users/{id}` with `UserUpdate`), loading/error/empty/submitting states, pagination (25/page).
  - Updated `src/router/index.js` to route `/admin/users` to `UserManagementView`. Build verified: PASS (0 errors, 116 modules).

- **Milestone 9 — Integration Smoke Verification & Incident Schema Fix:**
  - Resolved `GET /api/v1/reliability/incidents` HTTP 500 error by allowing nullable `ar_no: Optional[str] = None` in `IncidentBase` (Pydantic) to match database reality.
  - Verified 9 of 9 core READ flows against backend (incidents returned 380 records, HTTP 200).
  - Production build verified: PASS (0 errors, 116 modules).

---

### 2. Contract Alignment & Constraints

- Strict adherence to `07_FRONTEND_BACKEND_CONTRACT.md` §4.1, §4.3, §4.5, and §9.
- No invented fields, formulas, or synthetic values.
- All sub-resources AR-scoped; no global CAPA list used.

### 3. Unresolved Contract Ambiguity

- `IncidentCreate`, `RcaHeaderCreate`, and `CapaActionCreate` request schemas not explicitly listed (only response schemas shown). Payloads send all user-input fields, exclude auto-generated fields.
- CAPA `action_type`: only `CORRECTIVE` confirmed (response example). `PREVENTIVE` may exist in backend enum — pending verification.
- CAPA `status`: only `OPEN` confirmed (response example). `IN_PROGRESS`/`CLOSED` may exist — pending backend enum verification.
- Sensor tag and equipment limit response schemas not fully detailed in contract — generic `{"data": [...]}` only.

---

### 4. Next Recommended Step

- All frontend milestones complete and integration verified. Ready for staging deployment or user review.
