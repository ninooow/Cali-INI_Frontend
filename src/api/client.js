import axios from 'axios'

/**
 * Cali-INI Base Axios API Client
 * Configured per 07_FRONTEND_BACKEND_CONTRACT.md
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Authentication is currently disabled on backend per 07_FRONTEND_BACKEND_CONTRACT.md
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Returns unwrapped payload where appropriate or standard response
    return response
  },
  (error) => {
    let errorMessage = 'An unexpected error occurred'
    if (error.response?.data?.detail) {
      if (Array.isArray(error.response.data.detail)) {
        errorMessage = error.response.data.detail.map(d => `${d.loc?.join('.')}: ${d.msg}`).join(', ')
      } else {
        errorMessage = error.response.data.detail
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    return Promise.reject(new Error(errorMessage))
  }
)

export default apiClient
