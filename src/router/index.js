import { createRouter, createWebHistory } from 'vue-router'
import PlaceholderView from '../components/common/PlaceholderView.vue'
import DashboardView from '../views/DashboardView.vue'
import DataInputView from '../views/DataInputView.vue'
import ProblemVerificationView from '../views/ProblemVerificationView.vue'
import ReliabilityIncidentsView from '../views/ReliabilityIncidentsView.vue'
import CapaTrackingView from '../views/CapaTrackingView.vue'
import EquipmentDirectoryView from '../views/EquipmentDirectoryView.vue'
import SensorTagsView from '../views/SensorTagsView.vue'
import EquipmentLimitsView from '../views/EquipmentLimitsView.vue'
import UserManagementView from '../views/UserManagementView.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView
  },
  {
    path: '/operations/data-input',
    name: 'OperationsDataInput',
    component: DataInputView
  },
  {
    path: '/operations/problem-verification',
    name: 'ProblemVerification',
    component: ProblemVerificationView
  },
  {
    path: '/reliability/incidents',
    name: 'ReliabilityIncidents',
    component: ReliabilityIncidentsView
  },
  {
    path: '/reliability/capa',
    name: 'ReliabilityCapa',
    component: CapaTrackingView
  },
  {
    path: '/assets',
    name: 'AssetDirectory',
    component: EquipmentDirectoryView
  },
  {
    path: '/assets/sensors',
    name: 'AssetSensors',
    component: SensorTagsView
  },
  {
    path: '/assets/limits',
    name: 'AssetLimits',
    component: EquipmentLimitsView
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: UserManagementView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
