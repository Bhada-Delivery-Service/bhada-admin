import axios from 'axios';


const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  loginAdmin: (idToken, adminPassword) =>
    api.post('/auth/verify-firebase/admin', { idToken, adminPassword }),
  refreshToken: (refreshToken) =>
    api.post('/auth/refresh-token', { refreshToken }),
  checkSession: () => api.get('/auth/check-session'),
};

// ─── Admins ────────────────────────────────────────────────────────────────
export const adminsAPI = {
  seedSuperAdmin: () => api.post('/admins/seed-super-admin'),
  getAll: (pageSize = 20) => api.get(`/admins?pageSize=${pageSize}`),
  getById: (id) => api.get(`/admins/${id}`),
  getSuperAdmin: () => api.get('/admins/super-admin'),
  getByLevel: (level) => api.get(`/admins/by-level/${level}`),
  create: (data) => api.post('/admins', data),
  update: (id, data) => api.put(`/admins/${id}`, data),
  delete: (id) => api.delete(`/admins/${id}`),
};

// ─── Orders ────────────────────────────────────────────────────────────────
export const ordersAPI = {
  getAll: (pageSize = 20) => api.get(`/orders?pageSize=${pageSize}`),
  getById: (id) => api.get(`/orders/${id}`),
  getByStatus: (status) => api.get(`/orders/status/${status}`),
  getAvailable: () => api.get('/orders/available'),
  update: (id, data) => api.put(`/orders/${id}`, data),
  cancel: (id, reason) => api.put(`/orders/${id}/cancel`, { reason }),
  accept: (id) => api.put(`/orders/${id}/accept`),
  checkAvailability: (params) => api.get('/orders/check-availability', { params }),
};

// ─── Riders ────────────────────────────────────────────────────────────────
export const ridersAPI = {
  getAll: () => api.get('/riders'),
  getAvailable: () => api.get('/riders/available'),
  getById: (id) => api.get(`/riders/${id}`),
  approveKyc: (id) => api.put(`/riders/${id}/kyc/approve`),
  rejectKyc: (id) => api.put(`/riders/${id}/kyc/reject`),
  approveOnboarding: (id) => api.put(`/riders/${id}/onboarding/approve`),
  rejectOnboarding: (id) => api.put(`/riders/${id}/onboarding/reject`),
  assignOrder: (riderId, orderId) => api.post(`/riders/${riderId}/assign/${orderId}`),
  getPerformance: (id) => api.get(`/riders/${id}/performance`),
  rate: (id, rating) => api.post(`/riders/${id}/rate`, { rating }),
};

// ─── Offers ────────────────────────────────────────────────────────────────
export const offersAPI = {
  getAll: () => api.get('/offers'),
  getByCode: (code) => api.get(`/offers/code/${code}`),
  create: (data) => api.post('/offers', data),
  deactivate: (id) => api.delete(`/offers/${id}`),
};

// ─── Pricing ───────────────────────────────────────────────────────────────
export const pricingAPI = {
  getActive: () => api.get('/pricing/active'),
  getAll: () => api.get('/pricing'),
  create: (data) => api.post('/pricing', data),
  estimate: (data) => api.post('/pricing/estimate', data),
};

// ─── Payments ──────────────────────────────────────────────────────────────
export const paymentsAPI = {
  getStatus: (paymentId) => api.get(`/payments/${paymentId}/status`),
  refund: (paymentId, amount) => api.post(`/payments/${paymentId}/refund`, { refundAmount: amount }),
};

// ─── Disputes ──────────────────────────────────────────────────────────────
export const disputesAPI = {
  getAll: (status) => api.get(`/disputes${status ? `?status=${status}` : ''}`),
  getById: (id) => api.get(`/disputes/${id}`),
  review: (id) => api.put(`/disputes/${id}/review`),
  resolve: (id, data) => api.put(`/disputes/${id}/resolve`, data),
  reject: (id, adminNote) => api.put(`/disputes/${id}/reject`, { adminNote }),
};

// ─── Notifications ─────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:       (limit = 40) => api.get(`/notifications?limit=${limit}`),
  getCount:     ()           => api.get('/notifications/count'),
  markSeen:     (id)         => api.put(`/notifications/${id}/seen`),
  markAllSeen:  ()           => api.put('/notifications/seen-all'),
};

// ─── Tracking ──────────────────────────────────────────────────────────────
export const trackingAPI = {
  getAll:    () => api.get('/tracking/locations'),
  getById:   (riderId) => api.get(`/tracking/locations/${riderId}`),
};

export default api;
