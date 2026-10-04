<template>
  <div class="user-management-view">
    <!-- WHAT: View Header -->
    <header class="view-header">
      <div>
        <div class="breadcrumbs">
          <span>Administration</span>
          <span class="crumb-separator">/</span>
          <span class="crumb-active">User Management</span>
        </div>
        <h1 class="view-title">User Management</h1>
        <p class="view-subtitle">
          Manage system user accounts, roles, disciplines, and active access status.
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-primary" @click="openCreateModal">
          + Add User
        </button>
        <button class="btn btn-outline" @click="fetchUsers" :disabled="loading">
          <span v-if="loading">Refreshing...</span>
          <span v-else>↻ Refresh</span>
        </button>
      </div>
    </header>

    <!-- Filter / Search Bar -->
    <div class="card filter-card">
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Search Users</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by username, name, email, or employee ID..."
            class="filter-control"
            @input="page = 1"
          />
        </div>

        <div class="filter-group" style="max-width: 200px;">
          <label class="filter-label">Status</label>
          <select v-model="statusFilter" class="filter-control" @change="page = 1">
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div class="filter-actions">
          <button class="btn btn-outline btn-sm" @click="resetFilters">Reset</button>
        </div>
      </div>
    </div>

    <!-- HOW: Users Table / List -->
    <div class="card table-card">
      <!-- Loading State -->
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p>Loading users...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="state-container error-state">
        <p class="error-msg">⚠ {{ error }}</p>
        <button class="btn btn-outline btn-sm" @click="fetchUsers">Try Again</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredUsers.length === 0" class="state-container empty-state">
        <p>No users found matching current criteria.</p>
      </div>

      <!-- Data Table -->
      <div v-else>
        <DataTable
          :columns="columns"
          :data="paginatedUsers"
          :empty-message="'No users available.'"
        >
          <template #cell-is_active="{ row }">
            <span
              class="badge"
              :class="row.is_active ? 'badge-active' : 'badge-inactive'"
            >
              {{ row.is_active ? 'Active' : 'Inactive' }}
            </span>
          </template>

          <template #cell-actions="{ row }">
            <button class="btn btn-outline btn-xs" @click="openEditModal(row)">
              Edit
            </button>
          </template>
        </DataTable>

        <!-- Pagination -->
        <div class="pagination-bar" v-if="totalPages > 1">
          <span class="pagination-info">
            Showing {{ ((page - 1) * PAGE_SIZE) + 1 }}–{{ Math.min(page * PAGE_SIZE, filteredUsers.length) }} of {{ filteredUsers.length }} users
          </span>
          <div class="pagination-controls">
            <button
              class="btn btn-outline btn-xs"
              :disabled="page <= 1"
              @click="page--"
            >
              ‹ Prev
            </button>
            <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
            <button
              class="btn btn-outline btn-xs"
              :disabled="page >= totalPages"
              @click="page++"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Add New User</h3>
            <span class="modal-subtitle">Contracted endpoint: POST /api/v1/users</span>
          </div>
          <button class="modal-close-btn" @click="showCreateModal = false">✕</button>
        </div>

        <form @submit.prevent="submitCreateUser">
          <div class="modal-body form-grid">
            <div v-if="modalError" class="modal-error-alert">
              {{ modalError }}
            </div>

            <div class="form-group">
              <label class="form-label">Username *</label>
              <input
                v-model="createForm.username"
                type="text"
                class="form-control"
                placeholder="e.g. reliability_lead"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Display Name *</label>
              <input
                v-model="createForm.display_name"
                type="text"
                class="form-control"
                placeholder="e.g. Siti Nurhaliza"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Email *</label>
              <input
                v-model="createForm.email"
                type="email"
                class="form-control"
                placeholder="e.g. user@chandraasri.net"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Employee ID</label>
              <input
                v-model="createForm.employee_id"
                type="text"
                class="form-control"
                placeholder="e.g. EMP-1029"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Role *</label>
              <input
                v-model="createForm.role"
                type="text"
                class="form-control"
                placeholder="e.g. operator, reliability_engineer"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Discipline</label>
              <input
                v-model="createForm.discipline"
                type="text"
                class="form-control"
                placeholder="e.g. Mechanical, Operations, Reliability"
              />
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="createForm.is_active" type="checkbox" />
                <span>Active Account</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="showCreateModal = false" :disabled="submitting">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting">Saving...</span>
              <span v-else>Create User</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="modal-backdrop" @click.self="showEditModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Edit User</h3>
            <span class="modal-subtitle">Contracted endpoint: PATCH /api/v1/users/{user_id}</span>
          </div>
          <button class="modal-close-btn" @click="showEditModal = false">✕</button>
        </div>

        <form @submit.prevent="submitEditUser">
          <div class="modal-body form-grid">
            <div v-if="modalError" class="modal-error-alert">
              {{ modalError }}
            </div>

            <div class="form-group">
              <label class="form-label">Username</label>
              <input
                :value="editingUser?.username"
                type="text"
                class="form-control"
                disabled
              />
              <span class="form-help">Username cannot be modified.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Display Name *</label>
              <input
                v-model="editForm.display_name"
                type="text"
                class="form-control"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Email *</label>
              <input
                v-model="editForm.email"
                type="email"
                class="form-control"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Role *</label>
              <input
                v-model="editForm.role"
                type="text"
                class="form-control"
                required
              />
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="editForm.is_active" type="checkbox" />
                <span>Active Account</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="showEditModal = false" :disabled="submitting">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiClient from '../api/client.js'
import { ENDPOINTS } from '../api/endpoints.js'
import DataTable from '../components/common/DataTable.vue'

// State
const users = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const PAGE_SIZE = 25

// Filters
const searchQuery = ref('')
const statusFilter = ref('')

// Modals
const showCreateModal = ref(false)
const showEditModal = ref(false)
const submitting = ref(false)
const modalError = ref('')
const editingUser = ref(null)

// Contracted create form (UserCreate)
const createForm = ref({
  username: '',
  display_name: '',
  email: '',
  employee_id: '',
  role: '',
  discipline: '',
  is_active: true
})

// Contracted edit form (UserUpdate)
const editForm = ref({
  display_name: '',
  email: '',
  role: '',
  is_active: true
})

// Contracted UserResponse fields
const columns = [
  { key: 'user_id', label: 'ID', width: '70px' },
  { key: 'username', label: 'Username', width: '130px' },
  { key: 'display_name', label: 'Display Name' },
  { key: 'email', label: 'Email' },
  { key: 'employee_id', label: 'Emp ID', width: '110px' },
  { key: 'role', label: 'Role', width: '130px' },
  { key: 'discipline', label: 'Discipline', width: '120px' },
  { key: 'is_active', label: 'Status', width: '100px' },
  { key: 'actions', label: 'Action', width: '90px' }
]

// Filtered list
const filteredUsers = computed(() => {
  return users.value.filter(u => {
    if (statusFilter.value === 'active' && !u.is_active) return false
    if (statusFilter.value === 'inactive' && u.is_active) return false

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const match =
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.display_name && u.display_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.employee_id && u.employee_id.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.discipline && u.discipline.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })
})

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / PAGE_SIZE)))
const paginatedUsers = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredUsers.value.slice(start, start + PAGE_SIZE)
})

const resetFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  page.value = 1
}

// Fetch Users — GET /api/v1/users
const fetchUsers = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await apiClient.get(ENDPOINTS.USERS)
    users.value = data.data || []
    page.value = 1
  } catch (err) {
    error.value = err.message || 'Failed to load user accounts.'
    users.value = []
  } finally {
    loading.value = false
  }
}

// Modal Handlers
const openCreateModal = () => {
  modalError.value = ''
  createForm.value = {
    username: '',
    display_name: '',
    email: '',
    employee_id: '',
    role: '',
    discipline: '',
    is_active: true
  }
  showCreateModal.value = true
}

const openEditModal = (user) => {
  modalError.value = ''
  editingUser.value = user
  editForm.value = {
    display_name: user.display_name || '',
    email: user.email || '',
    role: user.role || '',
    is_active: Boolean(user.is_active)
  }
  showEditModal.value = true
}

// Submit Create — POST /api/v1/users
const submitCreateUser = async () => {
  modalError.value = ''
  submitting.value = true
  try {
    const payload = {
      username: createForm.value.username.trim(),
      display_name: createForm.value.display_name.trim(),
      email: createForm.value.email.trim(),
      employee_id: createForm.value.employee_id.trim() || undefined,
      role: createForm.value.role.trim(),
      discipline: createForm.value.discipline.trim() || undefined,
      is_active: createForm.value.is_active
    }
    await apiClient.post(ENDPOINTS.USERS, payload)
    showCreateModal.value = false
    await fetchUsers()
  } catch (err) {
    modalError.value = err.response?.data?.detail || err.message || 'Failed to create user.'
  } finally {
    submitting.value = false
  }
}

// Submit Edit — PATCH /api/v1/users/{user_id}
const submitEditUser = async () => {
  if (!editingUser.value) return
  modalError.value = ''
  submitting.value = true
  try {
    const payload = {
      display_name: editForm.value.display_name.trim(),
      email: editForm.value.email.trim(),
      role: editForm.value.role.trim(),
      is_active: editForm.value.is_active
    }
    await apiClient.patch(ENDPOINTS.USER_BY_ID(editingUser.value.user_id), payload)
    showEditModal.value = false
    await fetchUsers()
  } catch (err) {
    modalError.value = err.response?.data?.detail || err.message || 'Failed to update user.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-management-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5, 20px);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-tertiary, #8b8fa3);
  margin-bottom: 6px;
}

.crumb-separator { color: var(--text-tertiary, #8b8fa3); }
.crumb-active { color: var(--text-secondary, #b4b7c9); }

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #e8eaf0);
  margin: 0 0 6px 0;
}

.view-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #b4b7c9);
  margin: 0;
  max-width: 780px;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.card {
  background: var(--bg-card, #161826);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-4, 16px);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  flex: 1;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #b4b7c9);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-control {
  padding: 8px 12px;
  background: var(--bg-input, #0f111a);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-md, 8px);
  color: var(--text-primary, #e8eaf0);
  font-size: 0.85rem;
}

.filter-control:focus {
  outline: none;
  border-color: var(--primary-500, #4f8cff);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  padding-bottom: 2px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 50px 20px;
  color: var(--text-tertiary, #8b8fa3);
}

.state-container.error-state {
  color: var(--danger, #ff5050);
}

.error-msg {
  font-size: 0.9rem;
  margin: 0;
}

.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-active {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.badge-inactive {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--primary-500, #4f8cff);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #3b76e8;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-default, #2a2d42);
  color: var(--text-secondary, #b4b7c9);
}

.btn-outline:hover:not(:disabled) {
  background: var(--bg-hover, #1e2133);
  color: var(--text-primary, #e8eaf0);
}

.btn-outline:disabled,
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.btn-xs {
  padding: 4px 10px;
  font-size: 0.75rem;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border-default, #2a2d42);
  flex-wrap: wrap;
  gap: 10px;
}

.pagination-info {
  font-size: 0.8rem;
  color: var(--text-tertiary, #8b8fa3);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  font-size: 0.8rem;
  color: var(--text-secondary, #b4b7c9);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-default, #2a2d42);
  border-top-color: var(--primary-500, #4f8cff);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
}

.modal-dialog {
  background: var(--bg-card, #161826);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-lg, 12px);
  width: 100%;
  max-width: 500px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-default, #2a2d42);
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #e8eaf0);
  margin: 0;
}

.modal-subtitle {
  font-size: 0.78rem;
  color: var(--text-tertiary, #8b8fa3);
}

.modal-close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary, #8b8fa3);
  font-size: 1.3rem;
  cursor: pointer;
  padding: 4px;
}

.modal-close-btn:hover { color: var(--text-primary, #e8eaf0); }

.modal-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary, #b4b7c9);
}

.form-control {
  padding: 8px 12px;
  background: var(--bg-input, #0f111a);
  border: 1px solid var(--border-default, #2a2d42);
  border-radius: var(--radius-md, 8px);
  color: var(--text-primary, #e8eaf0);
  font-size: 0.85rem;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500, #4f8cff);
}

.form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.03);
}

.form-help {
  font-size: 0.72rem;
  color: var(--text-tertiary, #8b8fa3);
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
  padding-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-primary, #e8eaf0);
  cursor: pointer;
}

.modal-error-alert {
  padding: 10px 14px;
  border-radius: var(--radius-md, 8px);
  background: rgba(255, 80, 80, 0.1);
  border: 1px solid rgba(255, 80, 80, 0.2);
  color: var(--danger, #ff5050);
  font-size: 0.85rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-default, #2a2d42);
}
</style>
