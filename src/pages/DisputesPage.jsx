import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Search, RefreshCw, X, Eye, CheckCircle, XCircle,
  Clock, MessageCircle, Package, User, MapPin, CreditCard, Bike,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { disputesAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';
import DisputeChatModal from '../components/DisputeChatModal';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socketService';

const STATUSES = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

const fmt  = (d) => d ? new Date(d).toLocaleString('en-IN',  { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function SectionHeader({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '18px 0 10px', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
      <span style={{ color: 'var(--primary)', display: 'flex' }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-1)' }}>{title}</span>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0', borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: mono ? 'monospace' : 'inherit', color: highlight ? 'var(--primary)' : 'var(--text-0)', textAlign: 'right', wordBreak: 'break-word', maxWidth: 260 }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ─── Rich Detail Modal ────────────────────────────────────────────────────────
function DisputeDetailModal({ disputeId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!disputeId) return;
    setLoading(true);
    disputesAPI.getById(disputeId)
      .then(res => setData(res.data?.data || null))
      .catch(() => toast.error('Failed to load details'))
      .finally(() => setLoading(false));
  }, [disputeId]);

  const d = data;
  const o = d?.order;
  const b = d?.billing;
  const r = d?.rider;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 720, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-title">Dispute Details</div>
            {d && <StatusBadge status={d.status} />}
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: 60 }}><div className="loader" /></div>
        ) : !d ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Failed to load dispute details.</div>
        ) : (
          <div style={{ padding: '0 20px 24px' }}>

            {/* ── 1. DISPUTE INFO ── */}
            <SectionHeader icon={<AlertTriangle size={14} />} title="Dispute Information" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <InfoRow label="Dispute ID"  value={`#${(d.disputeId || '').slice(-12).toUpperCase()}`} mono />
              <InfoRow label="Order ID"    value={`#${(d.orderId   || '').slice(-12).toUpperCase()}`} mono />
              <InfoRow label="Status"      value={d.status?.replace(/_/g, ' ')} highlight />
              <InfoRow label="Reason"      value={d.reason?.replace(/_/g, ' ')} />
              <InfoRow label="Raised By"   value={d.raisedBy} mono />
              <InfoRow label="Role"        value={d.raisedByRole} />
              <InfoRow label="Created At"  value={fmt(d.createdAt)} />
              <InfoRow label="Updated At"  value={fmt(d.updatedAt)} />
            </div>
            {d.description && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 13, color: 'var(--text-0)', lineHeight: 1.6 }}>{d.description}</div>
              </div>
            )}
            {d.adminNote && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--blue-dim, rgba(59,130,246,0.08))', borderRadius: 6, border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 4, fontWeight: 600 }}>Admin Note</div>
                <div style={{ fontSize: 13, color: 'var(--text-0)', lineHeight: 1.6 }}>{d.adminNote}</div>
              </div>
            )}
            {d.refundAmount > 0 && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--green-dim)', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 2, fontWeight: 600 }}>Refund Issued</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>₹{d.refundAmount}</div>
              </div>
            )}
            {d.evidenceUrls?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Evidence ({d.evidenceUrls.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {d.evidenceUrls.map((url, i) => (
                    /\.(jpg|jpeg|png|gif|webp)/i.test(url)
                      ? <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="evidence" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                        </a>
                      : <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue)' }}>File {i + 1}</a>
                  ))}
                </div>
              </div>
            )}

            {/* ── 2. ORDER INFO ── */}
            <SectionHeader icon={<Package size={14} />} title="Order Information" />
            {o ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <InfoRow label="Order ID"         value={`#${(o.orderId || '').slice(-12).toUpperCase()}`} mono />
                  <InfoRow label="Order Status"     value={o.status?.replace(/_/g, ' ')} highlight />
                  <InfoRow label="Placed At"        value={fmt(o.createdAt)} />
                  <InfoRow label="Last Updated"     value={fmt(o.updatedAt)} />
                  <InfoRow label="Self Handling"    value={o.isSelfHandling ? 'Yes' : 'No'} />
                  {o.cancelReason    && <InfoRow label="Cancel Reason"    value={o.cancelReason} />}
                  {o.riderAcceptedAt && <InfoRow label="Rider Accepted At" value={fmt(o.riderAcceptedAt)} />}
                  {o.senderReadyAt   && <InfoRow label="Sender Ready At"   value={fmt(o.senderReadyAt)} />}
                </div>

                {/* Sender + Receiver cards */}
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Sender */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontWeight: 600, fontSize: 12, color: 'var(--text-1)' }}>
                      <User size={13} /> Sender
                    </div>
                    <InfoRow label="Name"  value={`${o.sender?.firstName || ''} ${o.sender?.lastName || ''}`.trim() || o.sender?.name} />
                    <InfoRow label="Phone" value={o.sender?.phoneNumber} />
                    <InfoRow label="Email" value={o.sender?.email} />
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> Pickup Address
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-0)', lineHeight: 1.6 }}>
                        {[o.senderNode?.addressLine1, o.senderNode?.addressLine2, o.senderNode?.city, o.senderNode?.state, o.senderNode?.pincode].filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Receiver */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontWeight: 600, fontSize: 12, color: 'var(--text-1)' }}>
                      <User size={13} /> Receiver
                    </div>
                    <InfoRow label="Name"  value={`${o.receiver?.firstName || ''} ${o.receiver?.lastName || ''}`.trim() || o.receiver?.name} />
                    <InfoRow label="Phone" value={o.receiver?.phoneNumber} />
                    <InfoRow label="Email" value={o.receiver?.email} />
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> Drop Address
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-0)', lineHeight: 1.6 }}>
                        {[o.receiverNode?.addressLine1, o.receiverNode?.addressLine2, o.receiverNode?.city, o.receiverNode?.state, o.receiverNode?.pincode].filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                {o.items?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Items ({o.items.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {o.items.map((item, i) => (
                        <div key={i} style={{ padding: '4px 10px', background: 'var(--bg-3, #f3f4f6)', borderRadius: 20, fontSize: 12, color: 'var(--text-0)' }}>
                          {item.name || item.category} × {item.quantity}
                          {item.isFragile ? ' 🔴' : ''}{item.isPerishable ? ' 🟡' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-2)', fontSize: 13, padding: '6px 0' }}>Order data not available.</div>
            )}

            {/* ── 3. PAYMENT & BILLING ── */}
            <SectionHeader icon={<CreditCard size={14} />} title="Payment & Billing" />
            {b ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <InfoRow label="Billing ID"     value={`#${(b.billingId || '').slice(-12).toUpperCase()}`} mono />
                  <InfoRow label="Invoice No."    value={b.invoiceNumber} mono />
                  <InfoRow label="Billing Status" value={b.status} highlight />
                  <InfoRow label="Payment Mode"   value={b.paymentMode} />
                  <InfoRow label="Distance"       value={b.totalDistance ? `${b.totalDistance} km` : '—'} />
                  <InfoRow label="Currency"       value={b.currency} />
                </div>
                <div style={{ margin: '12px 0', padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    <InfoRow label="Delivery Charges" value={`₹${b.deliveryCharges ?? 0}`} />
                    <InfoRow label="Handling Charges" value={`₹${b.handlingCharges ?? 0}`} />
                    <InfoRow label="Subtotal"          value={`₹${b.subtotalAmount  ?? 0}`} />
                    <InfoRow label={`GST (${b.gstPercentage ?? 0}%)`} value={`₹${b.gstCharges ?? 0}`} />
                    <InfoRow label="Discount"          value={`₹${b.discountAmount  ?? 0}`} />
                    <InfoRow label="Total Payable"     value={`₹${b.payableAmount   ?? 0}`} highlight />
                  </div>
                </div>
                {b.payment && (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Transaction</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                      <InfoRow label="Payment ID"     value={b.payment.paymentId}    mono />
                      <InfoRow label="Transaction ID" value={b.payment.transactionId || '—'} mono />
                      <InfoRow label="Amount"         value={`₹${b.payment.amount}`} />
                      <InfoRow label="Status"         value={b.payment.status}       highlight />
                      <InfoRow label="Payment Date"   value={fmt(b.payment.paymentDate)} />
                      {b.payment.refundAmount > 0 && <InfoRow label="Refund Amount" value={`₹${b.payment.refundAmount}`} highlight />}
                      {b.payment.refundDate    && <InfoRow label="Refund Date"   value={fmt(b.payment.refundDate)} />}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-2)', fontSize: 13, padding: '6px 0' }}>Billing data not available.</div>
            )}

            {/* ── 4. RIDER INFO ── */}
            <SectionHeader icon={<Bike size={14} />} title="Rider Information" />
            {r ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <InfoRow label="Rider UID"          value={r.uid} mono />
                <InfoRow label="Name"               value={`${r.firstName || ''} ${r.lastName || ''}`.trim()} />
                <InfoRow label="Phone"              value={r.phoneNumber} />
                <InfoRow label="Email"              value={r.email} />
                <InfoRow label="Vehicle Type"       value={r.vehicleType} />
                <InfoRow label="Vehicle Number"     value={r.vehicleNumber} />
                <InfoRow label="Rating"             value={r.rating ? `${r.rating} ⭐` : '—'} />
                <InfoRow label="Deliveries Done"    value={`${r.completedDeliveries ?? 0} / ${r.totalDeliveries ?? 0}`} />
                <InfoRow label="Availability"       value={r.riderAvailabilityStatus} />
              </div>
            ) : (
              <div style={{ color: 'var(--text-2)', fontSize: 13, padding: '6px 0' }}>
                {o?.assignedRiderId ? 'Rider info unavailable.' : 'No rider assigned to this order.'}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main DisputesPage ────────────────────────────────────────────────────────
export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch]             = useState('');
  const [selectedId, setSelectedId]     = useState(null);
  const [chatDispute, setChatDispute]   = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [rejectModal, setRejectModal]   = useState(null);
  const [resolveForm, setResolveForm]   = useState({ adminNote: '', refundAmount: '' });
  const [rejectNote, setRejectNote]     = useState('');

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

  // ── Real-time: update dispute status badges without full reload ────────────
  useEffect(() => {
    const handler = (e) => {
      const updated = e.detail;
      if (!updated?.disputeId && !updated?.id) return;
      const id = updated.disputeId || updated.id;
      setDisputes(prev => {
        const exists = prev.some(d => (d.disputeId || d.id) === id);
        if (exists) return prev.map(d => (d.disputeId || d.id) === id ? { ...d, ...updated } : d);
        // New dispute raised — prepend if filter allows
        if (!statusFilter || statusFilter === 'ALL' || updated.status === statusFilter) {
          return [updated, ...prev];
        }
        return prev;
      });
    };
    window.addEventListener('ws:dispute:updated', handler);
    return () => window.removeEventListener('ws:dispute:updated', handler);
  }, [statusFilter]);

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
                    <td style={{ maxWidth: 200, color: 'var(--text-0)' }}>{d.reason?.replace(/_/g, ' ') || '—'}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" title="View full details" onClick={() => setSelectedId(d.disputeId || d.id)}>
                          <Eye size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Open Chat" style={{ color: 'var(--blue)' }} onClick={() => setChatDispute(d)}>
                          <MessageCircle size={13} />
                        </button>
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

      {/* Rich Detail Modal */}
      {selectedId && <DisputeDetailModal disputeId={selectedId} onClose={() => setSelectedId(null)} />}

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

      {/* Chat Modal */}
      {chatDispute && (
        <DisputeChatModal
          dispute={chatDispute}
          onClose={() => setChatDispute(null)}
          currentAdminUid={user?.uid}
          socket={getSocket?.()}
        />
      )}
    </div>
  );
}