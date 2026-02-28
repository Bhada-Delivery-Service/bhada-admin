import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
        window.dispatchEvent(new Event('tokenRefreshed'));
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
  loginAdmin:   (idToken, adminPassword) =>
    api.post('/auth/verify-firebase/admin', { idToken, adminPassword }),
  refreshToken: (refreshToken) =>
    api.post('/auth/refresh-token', { refreshToken }),
  checkSession: () => api.get('/auth/check-session'),
};

// ─── Admins ────────────────────────────────────────────────────────────────
export const adminsAPI = {
  seedSuperAdmin: ()            => api.post('/admins/seed-super-admin'),
  getAll:         (pageSize=20) => api.get(`/admins?pageSize=${pageSize}`),
  getById:        (id)          => api.get(`/admins/${id}`),
  getSuperAdmin:  ()            => api.get('/admins/super-admin'),
  getByLevel:     (level)       => api.get(`/admins/by-level/${level}`),
  create:         (data)        => api.post('/admins', data),
  update:         (id, data)    => api.put(`/admins/${id}`, data),
  delete:         (id)          => api.delete(`/admins/${id}`),
};

// ─── Orders ────────────────────────────────────────────────────────────────
export const ordersAPI = {
  // ── Admin queries ──
  // Search/filter: pass any combo of { orderId, status, riderId, senderId, receiverId, pageSize }
  adminSearch:   (params)     => api.get('/orders/admin/search', { params }),
  // Admin place a full order on behalf of a user (body: PlaceOrderDTO + senderUid or senderPhone)
  adminPlace:    (data)       => api.post('/orders/admin/place', data),
  // Admin save draft on behalf of user
  adminDraft:    (data)       => api.post('/orders/admin/draft', data),

  // ── General admin ──
  getAll:        (pageSize=20)=> api.get(`/orders?pageSize=${pageSize}`),
  getById:       (id)         => api.get(`/orders/${id}`),
  getByStatus:   (status)     => api.get(`/orders/status/${status}`),

  // ── User / rider ──
  getAvailable:      ()           => api.get('/orders/available'),
  update:            (id, data)   => api.put(`/orders/${id}`, data),
  cancel:            (id, reason) => api.put(`/orders/${id}/cancel`, { reason }),
  // NOTE: admin does NOT call accept — riders only
  accept:            (id)         => api.put(`/orders/${id}/accept`),
  handover:          (id, otp)    => api.post(`/orders/${id}/handover`, { pickupOtp: otp }),
  deliver:           (id, otp)    => api.post(`/orders/${id}/deliver`,  { dropOtp:   otp }),
  cancelDelivery:    (id, reason) => api.put(`/orders/${id}/cancel-delivery`, { reason }),
  checkAvailability: (params)     => api.get('/orders/check-availability', { params }),
};

// ─── Riders ────────────────────────────────────────────────────────────────
export const ridersAPI = {
  getAll:             ()                => api.get('/riders'),
  getAvailable:       ()                => api.get('/riders/available'),
  getById:            (id)              => api.get(`/riders/${id}`),
  approveKyc:         (id)              => api.put(`/riders/${id}/kyc/approve`),
  rejectKyc:          (id)              => api.put(`/riders/${id}/kyc/reject`),
  approveOnboarding:  (id)              => api.put(`/riders/${id}/onboarding/approve`),
  rejectOnboarding:   (id)              => api.put(`/riders/${id}/onboarding/reject`),
  assignOrder:        (riderId, orderId) => api.post(`/riders/${riderId}/assign/${orderId}`),
  getPerformance:     (id)              => api.get(`/riders/${id}/performance`),
  rate:               (id, rating, opts={}) => api.post(`/riders/${id}/rate`, { rating, ...opts }),
  getRatings:         (id)              => api.get(`/riders/${id}/ratings`),
  getRoutes:          (id)              => api.get(`/riders/${id}/routes`),
};

// ─── Offers ────────────────────────────────────────────────────────────────
export const offersAPI = {
  getAll:     ()     => api.get('/offers'),
  getByCode:  (code) => api.get(`/offers/code/${code}`),
  create:     (data) => api.post('/offers', data),
  deactivate: (id)   => api.delete(`/offers/${id}`),
};

// ─── Pricing ───────────────────────────────────────────────────────────────
export const pricingAPI = {
  getActive:  ()          => api.get('/pricing/active'),
  getAll:     ()          => api.get('/pricing'),
  create:     (data)      => api.post('/pricing', data),
  cleanup:    ()          => api.post('/pricing/cleanup'),
  activate:   (id)        => api.patch(`/pricing/${id}/activate`),
  deactivate: (id)        => api.patch(`/pricing/${id}/deactivate`),
  estimate:   (data)      => api.post('/pricing/estimate', data),
  getGrids:   ()          => api.get('/pricing/grids'),
  upsertGrid: (data)      => api.post('/pricing/grids', data),
  deleteGrid: (gridId)    => api.delete(`/pricing/grids/${gridId}`),
  resolveGrid:(lat, lng)  => api.get(`/pricing/grids/resolve?lat=${lat}&lng=${lng}`),
};

// ─── Payments ──────────────────────────────────────────────────────────────
export const paymentsAPI = {
  getAll:        (status, limit = 100) =>
    api.get(`/payments${status ? `?status=${status}&limit=${limit}` : `?limit=${limit}`}`),
  getStatistics: () => api.get('/payments/statistics'),
  getStatus:     (paymentId)         => api.get(`/payments/${paymentId}/status`),
  refund:        (paymentId, amount) => api.post(`/payments/${paymentId}/refund`, { refundAmount: amount }),
};

// ─── Disputes ──────────────────────────────────────────────────────────────
export const disputesAPI = {
  getAll:      (status)   => api.get(`/disputes${status ? `?status=${status}` : ''}`),
  getById:     (id)       => api.get(`/disputes/${id}`),
  review:      (id)       => api.put(`/disputes/${id}/review`),
  resolve:     (id, data) => api.put(`/disputes/${id}/resolve`, data),
  reject:      (id, note) => api.put(`/disputes/${id}/reject`, { adminNote: note }),
  getChat:     (id)       => api.get(`/disputes/${id}/chat`),
  sendMessage: (id, data) => api.post(`/disputes/${id}/chat`, data),
};

// ─── Notifications ─────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:      (limit=40) => api.get(`/notifications?limit=${limit}`),
  getCount:    ()         => api.get('/notifications/count'),
  markSeen:    (id)       => api.put(`/notifications/${id}/seen`),
  markAllSeen: ()         => api.put('/notifications/seen-all'),
};

// ─── Tracking ──────────────────────────────────────────────────────────────
export const trackingAPI = {
  getAll:  ()        => api.get('/tracking/locations'),
  getById: (riderId) => api.get(`/tracking/locations/${riderId}`),
};

// ─── Files ─────────────────────────────────────────────────────────────────
export const filesAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ─── Earnings & Withdrawals ────────────────────────────────────────────────
export const earningsAPI = {
  getRiderSummary:     (riderId)             => api.get(`/earnings/riders/${riderId}/summary`),
  getRiderEarnings:    (riderId, limit = 50) => api.get(`/earnings/riders/${riderId}?limit=${limit}`),
  getRiderWithdrawals: (riderId)             => api.get(`/earnings/riders/${riderId}/withdrawals`),
  creditRider:         (riderId, data)       => api.post(`/earnings/riders/${riderId}/credit`, data),
  getAllWithdrawals:    (status)             =>
    api.get(`/earnings/withdrawals${status && status !== 'ALL' ? '?status=' + status : ''}`),
  getWithdrawal:       (id)     => api.get(`/earnings/withdrawals/${id}`),
  processWithdrawal:   (id, data)  => api.put(`/earnings/withdrawals/${id}/process`, data),
  rejectWithdrawal:    (id, reason)=> api.put(`/earnings/withdrawals/${id}/reject`, { reason }),
};

// ─── Security Deposit ──────────────────────────────────────────────────────
export const securityDepositAPI = {
  getConfig:  ()               => api.get('/security-deposit/config'),
  setConfig:  (data)           => api.put('/security-deposit/config', data),
  enable:     ()               => api.put('/security-deposit/config/enable'),
  disable:    ()               => api.put('/security-deposit/config/disable'),
  getAll:     (status)         => api.get(`/security-deposit${status ? `?status=${status}` : ''}`),
  getByRider: (riderId)        => api.get(`/security-deposit/${riderId}`),
  refund:     (riderId, note)  => api.post(`/security-deposit/${riderId}/refund`,  note ? { note } : {}),
  forfeit:    (riderId, note)  => api.post(`/security-deposit/${riderId}/forfeit`, note ? { note } : {}),
};

// ─── Handling Charge Rules ─────────────────────────────────────────────────
export const handlingChargeAPI = {
  getAll:    ()                          => api.get('/handling-charges'),
  upsert:    (sizeType, data)            => api.put(`/handling-charges/${sizeType}`, data),
  toggle:    (sizeType)                  => api.patch(`/handling-charges/${sizeType}/toggle`),
  seedDefaults: ()                       => api.post('/handling-charges/seed'),
};

export default api;