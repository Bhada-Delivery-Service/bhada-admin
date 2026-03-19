import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL 
 
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
  // ── Own profile ──
  getMe:              ()       => api.get('/admins/me'),
  updateMe:           (data)   => api.put('/admins/me', data),
  storePasswordOtp:   (otp)    => api.post('/admins/me/store-password-otp', { otp }),
  changePassword:     (data)   => api.post('/admins/me/change-password', data),
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

  // Get COD payment data for an order (QR code, payment status)
  getPayment:     (id)             => api.get(`/orders/${id}/payment`),
  // Status filter e.g. PLACED, DELIVERED
  getByStatus:    (status)         => api.get(`/orders/status/${status}`),
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
  getRatingStats:     (id)              => api.get(`/riders/${id}/ratings`),  // summary included in same response
  getRoutes:          (id)              => api.get(`/riders/${id}/routes`),
  blockRider:         (id)              => api.put(`/riders/${id}/block`),    // ✅ NEW
  unblockRider:       (id)              => api.put(`/riders/${id}/unblock`),  // ✅ NEW
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

// ─── COD Payments (Admin monitoring) ──────────────────────────────────────
// Records stored in Firestore cod_payments/{orderId} by backend
export const codPaymentsAPI = {
  // Get COD payment record for a single order
  getByOrder:     (orderId)        => api.get(`/payments/cod/${orderId}`),
  // (Re-)generate QR + Razorpay order for an order (admin can trigger)
  initiate:       (orderId)        => api.post('/payments/cod/initiate', { orderId }),
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

// ─── Users ────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll:     (params = {}) => api.get('/users', { params }),
  getStats:   ()            => api.get('/users/stats'),
  getById:    (id)          => api.get(`/users/${id}`),
  create:     (data)        => api.post('/users', data),
  update:     (id, data)    => api.put(`/users/${id}`, data),
  delete:     (id)          => api.delete(`/users/${id}`),
  softDelete: (id)          => api.put(`/users/${id}/soft-delete`),
  block:      (id, data)    => api.put(`/users/${id}/block`, data),
  unblock:    (id)          => api.put(`/users/${id}/unblock`),
  disable:    (id)          => api.put(`/users/${id}/disable`),
  enable:     (id)          => api.put(`/users/${id}/enable`),
  addNote:    (id, note)    => api.post(`/users/${id}/notes`, { note }),
  deleteNote: (id, noteId)  => api.delete(`/users/${id}/notes/${noteId}`),
};

// ─── Service Area Management ───────────────────────────────────────────────
export const serviceAreaAPI = {
  getAll:      ()                        => api.get('/service-areas'),
  getActive:   ()                        => api.get('/service-areas/active'),
  upsert:      (data)                    => api.post('/service-areas', data),
  activate:    (gridId)                  => api.patch(`/service-areas/${gridId}/activate`),
  deactivate:  (gridId)                  => api.patch(`/service-areas/${gridId}/deactivate`),
  delete:      (gridId)                  => api.delete(`/service-areas/${gridId}`),
  resolve:     (lat, lng)                => api.get(`/service-areas/resolve?lat=${lat}&lng=${lng}`),
  validate:    (pLat, pLng, dLat, dLng) => api.get(`/service-areas/validate?pickupLat=${pLat}&pickupLng=${pLng}&dropLat=${dLat}&dropLng=${dLng}`),
};

// ─── Cancellation Policy ──────────────────────────────────────────────────
export const cancellationPolicyAPI = {
  get:    ()     => api.get('/cancellation-policy'),
  update: (data) => api.put('/cancellation-policy', data),
};

// ─── Refund Requests ─────────────────────────────────────────────────────
export const refundsAPI = {
  getAll:        (status)    => api.get(`/refunds${status && status !== 'ALL' ? `?status=${status}` : ''}`),
  getById:       (id)        => api.get(`/refunds/${id}`),
  getByOrder:    (orderId)   => api.get(`/refunds/order/${orderId}`),
  markRefunded:  (id, data)  => api.put(`/refunds/${id}/mark-refunded`, data),
  skip:          (id, notes) => api.put(`/refunds/${id}/skip`, { notes }),
};

// ─── Feedback & Suggestions ───────────────────────────────────────────────
export const feedbackAPI = {
  getAll:   (status)          => api.get(`/feedback${status && status !== 'ALL' ? `?status=${status}` : ''}`),
  getStats: ()                => api.get('/feedback/stats'),
  getById:  (id)              => api.get(`/feedback/${id}`),
  update:   (id, data)        => api.put(`/feedback/${id}`, data),
};

// ─── Finance ──────────────────────────────────────────────────────────────
export const financeAPI = {
  // Dashboard
  getBalance:      ()                  => api.get('/finance/balance'),
  getReport:       (from, to)          => api.get(`/finance/report${buildQuery({ from, to })}`),

  // Transactions — all filters optional
  getTransactions: (params = {})       => api.get(`/finance/transactions${buildQuery(params)}`),

  // Entries by linked reference (orderId / refundId / withdrawalId)
  getByReference:  (referenceId)       => api.get(`/finance/reference/${referenceId}`),

  // Manual actions
  manualDeposit:   (data)              => api.post('/finance/manual-deposit',  data),
  gstPayment:      (data)              => api.post('/finance/gst-payment',     data),
  ledgerEntry:     (data)              => api.post('/finance/ledger-entry',     data),
};

// ─── Helper (add once at top of api.js if not already there) ─────────────────
function buildQuery(params = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}


export default api;