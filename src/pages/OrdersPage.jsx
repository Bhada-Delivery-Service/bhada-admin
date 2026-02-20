import React, { useState, useEffect } from 'react';
import { Package, Search, RefreshCw, X, Eye, AlertOctagon } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';

const STATUSES = ['ALL', 'PLACED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'DRAFT'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = statusFilter !== 'ALL'
        ? await ordersAPI.getByStatus(statusFilter)
        : await ordersAPI.getAll(100);
      setOrders(data?.data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || (o.orderId || o.id || '').toLowerCase().includes(q);
  });

  const handleCancel = async () => {
    if (!cancelModal) return;
    try {
      await ordersAPI.cancel(cancelModal, cancelReason);
      toast.success('Order cancelled');
      setCancelModal(null);
      setCancelReason('');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Orders</h1>
          <p>Manage all parcel delivery orders</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input
            className="search-input"
            placeholder="Search by order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Package size={22} /></div>
            <h3>No orders found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Pickup OTP</th>
                  <th>Drop OTP</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.orderId || order.id}>
                    <td>
                      <span className="code">#{(order.orderId || order.id || '—').slice(-10)}</span>
                    </td>
                    <td><StatusBadge status={order.status} /></td>
                    <td><span className="code">{order.pickupOtp || '—'}</span></td>
                    <td><span className="code">{order.dropOtp || '—'}</span></td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(order)} title="View">
                          <Eye size={13} />
                        </button>
                        {['PLACED', 'DISPATCHED'].includes(order.status) && (
                          <button className="btn btn-danger btn-sm" onClick={() => setCancelModal(order.orderId || order.id)} title="Cancel">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Order Details</div>
                <span className="code" style={{ fontSize: 12 }}>#{(selected.orderId || selected.id || '').slice(-12)}</span>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={15} /></button>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Status</label>
                <p><StatusBadge status={selected.status} /></p>
              </div>
              <div className="detail-item">
                <label>Pickup OTP</label>
                <p><span className="code">{selected.pickupOtp || '—'}</span></p>
              </div>
              <div className="detail-item">
                <label>Drop OTP</label>
                <p><span className="code">{selected.dropOtp || '—'}</span></p>
              </div>
              <div className="detail-item">
                <label>User ID</label>
                <p style={{ wordBreak: 'break-all', fontSize: 12 }}>{selected.userId || '—'}</p>
              </div>
              <div className="detail-item">
                <label>Rider ID</label>
                <p style={{ wordBreak: 'break-all', fontSize: 12 }}>{selected.riderId || '—'}</p>
              </div>
              <div className="detail-item">
                <label>Created</label>
                <p>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</p>
              </div>
            </div>
            {selected.items?.length > 0 && (
              <>
                <hr className="divider" />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 10 }}>Items</div>
                {selected.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span>{item.description || item.name || `Item ${i + 1}`}</span>
                    <span className="badge neutral">{item.category || '—'}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Cancel Order</div>
              <button className="modal-close" onClick={() => setCancelModal(null)}><X size={15} /></button>
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>
              Provide a reason for cancellation (optional):
            </p>
            <div className="form-group">
              <textarea
                className="form-textarea"
                placeholder="Cancellation reason..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Back</button>
              <button className="btn btn-danger" onClick={handleCancel}>Cancel Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
