import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, RefreshCw, X, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { disputesAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';

const STATUSES = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [resolveForm, setResolveForm] = useState({ adminNote: '', refundAmount: '' });
  const [rejectNote, setRejectNote] = useState('');

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data } = await disputesAPI.getAll(statusFilter !== 'ALL' ? statusFilter : undefined);
      setDisputes(data?.data || []);
    } catch {
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDisputes(); }, [statusFilter]);

  const filtered = disputes.filter(d => {
    const q = search.toLowerCase();
    return !q || (d.disputeId || d.id || '').toLowerCase().includes(q) || (d.reason || '').toLowerCase().includes(q);
  });

  const handleReview = async (id) => {
    try {
      await disputesAPI.review(id);
      toast.success('Marked under review');
      fetchDisputes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await disputesAPI.resolve(resolveModal, {
        adminNote: resolveForm.adminNote,
        ...(resolveForm.refundAmount ? { refundAmount: parseFloat(resolveForm.refundAmount) } : {}),
      });
      toast.success('Dispute resolved');
      setResolveModal(null);
      fetchDisputes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await disputesAPI.reject(rejectModal, rejectNote);
      toast.success('Dispute rejected');
      setRejectModal(null);
      setRejectNote('');
      fetchDisputes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Disputes</h1>
          <p>Review and resolve customer disputes</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchDisputes}><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search by dispute ID or reason..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><AlertTriangle size={22} /></div>
            <h3>No disputes found</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Dispute ID</th><th>Order</th><th>Reason</th><th>Status</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.disputeId || d.id}>
                    <td><span className="code">#{(d.disputeId || d.id || '').slice(-8)}</span></td>
                    <td><span className="code" style={{ fontSize: 11 }}>#{(d.orderId || '').slice(-8) || '—'}</span></td>
                    <td style={{ maxWidth: 200, color: 'var(--text-0)' }}>{d.reason || '—'}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(d)}><Eye size={13} /></button>
                        {d.status === 'OPEN' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleReview(d.disputeId || d.id)}>
                            <Clock size={12} /> Review
                          </button>
                        )}
                        {['OPEN', 'UNDER_REVIEW'].includes(d.status) && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)' }} onClick={() => { setResolveModal(d.disputeId || d.id); setResolveForm({ adminNote: '', refundAmount: '' }); }}>
                              <CheckCircle size={12} /> Resolve
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(d.disputeId || d.id); setRejectNote(''); }}>
                              <XCircle size={12} /> Reject
                            </button>
                          </>
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
              <div className="modal-title">Dispute Details</div>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={15} /></button>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><label>Dispute ID</label><p><span className="code">#{(selected.disputeId || selected.id || '').slice(-10)}</span></p></div>
              <div className="detail-item"><label>Order ID</label><p><span className="code">#{(selected.orderId || '').slice(-10) || '—'}</span></p></div>
              <div className="detail-item"><label>Status</label><p><StatusBadge status={selected.status} /></p></div>
              <div className="detail-item"><label>Created</label><p>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</p></div>
            </div>
            <hr className="divider" />
            <div className="form-group">
              <label className="form-label">Reason</label>
              <p style={{ color: 'var(--text-0)', fontSize: 14 }}>{selected.reason || '—'}</p>
            </div>
            {selected.adminNote && (
              <div className="form-group">
                <label className="form-label">Admin Note</label>
                <p style={{ color: 'var(--text-1)', fontSize: 13 }}>{selected.adminNote}</p>
              </div>
            )}
            {selected.evidence?.length > 0 && (
              <div>
                <label className="form-label">Evidence</label>
                {selected.evidence.map((e, i) => <div key={i} className="code" style={{ fontSize: 11, marginBottom: 4 }}>{e}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="modal-overlay" onClick={() => setResolveModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Resolve Dispute</div>
              <button className="modal-close" onClick={() => setResolveModal(null)}><X size={15} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Admin Note *</label>
              <textarea className="form-textarea" value={resolveForm.adminNote} onChange={e => setResolveForm(f => ({ ...f, adminNote: e.target.value }))} placeholder="Resolution notes..." />
            </div>
            <div className="form-group">
              <label className="form-label">Refund Amount (₹) — Optional</label>
              <input className="form-input" type="number" value={resolveForm.refundAmount} onChange={e => setResolveForm(f => ({ ...f, refundAmount: e.target.value }))} placeholder="0" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setResolveModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResolve}>Resolve</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Reject Dispute</div>
              <button className="modal-close" onClick={() => setRejectModal(null)}><X size={15} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Rejection Reason *</label>
              <textarea className="form-textarea" value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason for rejection..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject}>Reject Dispute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
