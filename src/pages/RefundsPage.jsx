import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, RefreshCw, X, CheckCircle2, XCircle, Eye,
  Clock, Search, SkipForward, Copy, Check, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { refundsAPI } from '../services/api';

const FILTERS = ['PENDING', 'REFUNDED', 'SKIPPED', 'ALL'];

const STATUS_CFG = {
  PENDING:  { label: 'Pending',  color: 'var(--orange)', bg: 'var(--orange-dim)', icon: Clock        },
  REFUNDED: { label: 'Refunded', color: 'var(--green)',  bg: 'var(--green-dim)',  icon: CheckCircle2 },
  SKIPPED:  { label: 'Skipped',  color: 'var(--text-2)', bg: 'var(--surface-2)',  icon: SkipForward  },
};

const fmt     = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-2)', padding: '0 4px' }} title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING;
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600 }}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

// ── Mark Refunded Modal ────────────────────────────────────────────────────────
function MarkRefundedModal({ refund, onClose, onSuccess }) {
  const [form, setForm] = useState({ transactionRef: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.transactionRef.trim()) { toast.error('Transaction reference is required'); return; }
    setSubmitting(true);
    try {
      await refundsAPI.markRefunded(refund.id, { transactionRef: form.transactionRef.trim(), notes: form.notes.trim() || undefined });
      toast.success('Refund marked as processed!');
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to process refund');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-1)' }}>Mark Refund as Processed</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}><X size={20} /></button>
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-2)' }}>User</span><br /><strong style={{ color: 'var(--text-1)' }}>{refund.userName}</strong></div>
            <div><span style={{ color: 'var(--text-2)' }}>Phone</span><br /><strong style={{ color: 'var(--text-1)' }}>{refund.userPhone}</strong></div>
            <div><span style={{ color: 'var(--text-2)' }}>Original Amount</span><br /><strong>₹{fmt(refund.originalAmount)}</strong></div>
            <div><span style={{ color: 'var(--text-2)' }}>Deducted (fees)</span><br /><strong style={{ color: 'var(--red)' }}>-₹{fmt(refund.deductedAmount)}</strong></div>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Refund Amount</span>
            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 18 }}>₹{fmt(refund.refundAmount)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Transaction Reference *</label>
            <input
              value={form.transactionRef}
              onChange={e => upd('transactionRef', e.target.value)}
              placeholder="UPI txn ID / bank ref / etc."
              style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => upd('notes', e.target.value)}
              rows={2}
              placeholder="Any notes about this refund..."
              style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-1)', fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '11px', background: 'var(--green)', border: 'none', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: 700, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Processing...' : 'Mark as Refunded ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────────
function DetailModal({ refund, onClose, onRefund, onSkip }) {
  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    if (!window.confirm('Are you sure you want to skip this refund?')) return;
    setSkipping(true);
    try {
      await refundsAPI.skip(refund.id, 'Skipped by admin');
      toast.success('Refund skipped');
      onSkip();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to skip');
    } finally { setSkipping(false); }
  };

  const cfg = STATUS_CFG[refund.status] || STATUS_CFG.PENDING;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 520, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-1)' }}>Refund Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <StatusBadge status={refund.status} />
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Created {fmtDate(refund.createdAt)}</span>
        </div>

        {[
          ['Order ID', refund.orderId, true],
          ['User', refund.userName],
          ['Phone', refund.userPhone],
          ['Payment Mode', refund.paymentMode],
          ['Cancellation Reason', refund.cancellationReason || '—'],
          ['Original Amount', `₹${fmt(refund.originalAmount)}`],
          ['Deducted (fees)', `-₹${fmt(refund.deductedAmount)}`],
          ['Refund Amount', `₹${fmt(refund.refundAmount)}`],
          ...(refund.status === 'REFUNDED' ? [
            ['Transaction Ref', refund.refundTransactionRef, true],
            ['Refunded At', fmtDate(refund.refundedAt)],
            ['Notes', refund.refundNotes || '—'],
          ] : []),
        ].map(([label, value, copy]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>
              {value}
              {copy && value && value !== '—' && <CopyBtn text={value} />}
            </span>
          </div>
        ))}

        {refund.status === 'PENDING' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={handleSkip} disabled={skipping} style={{ flex: 1, padding: '11px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-2)', fontWeight: 600 }}>
              {skipping ? 'Skipping...' : 'Skip Refund'}
            </button>
            <button onClick={() => { onClose(); onRefund(refund); }} style={{ flex: 2, padding: '11px', background: 'var(--green)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 700 }}>
              Mark as Refunded
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function RefundsPage() {
  const [refunds, setRefunds]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('PENDING');
  const [search, setSearch]         = useState('');
  const [detailRefund, setDetail]   = useState(null);
  const [payRefund, setPay]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await refundsAPI.getAll(filter);
      setRefunds(data?.data || []);
    } catch { toast.error('Failed to load refund requests'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // ── Real-time: update refund status without full reload ────────────────────
  useEffect(() => {
    const handler = (e) => {
      const updated = e.detail;
      if (!updated?.id) return;
      setRefunds(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
      // Also update the detail panel if it's open
      setDetail(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
    };
    window.addEventListener('ws:refund:updated', handler);
    return () => window.removeEventListener('ws:refund:updated', handler);
  }, []);

  const filtered = refunds.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.userName || '').toLowerCase().includes(s)
      || (r.userPhone || '').toLowerCase().includes(s)
      || (r.orderId || '').toLowerCase().includes(s);
  });

  const pending  = refunds.filter(r => r.status === 'PENDING').length;
  const totalPending = refunds.filter(r => r.status === 'PENDING').reduce((s, r) => s + (r.refundAmount || 0), 0);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Refund Requests</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>Manage online payment refunds for cancelled orders</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-1)', fontWeight: 600 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pending Refunds', value: pending, color: 'var(--orange)', icon: AlertCircle },
          { label: 'Pending Amount', value: `₹${fmt(totalPending)}`, color: 'var(--red)', icon: IndianRupee },
          { label: 'Total Requests', value: refunds.length, color: 'var(--blue)', icon: Eye },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filter === f ? 'var(--blue)' : 'var(--border)',
              background: filter === f ? 'var(--blue-dim)' : 'var(--surface-1)',
              color: filter === f ? 'var(--blue)' : 'var(--text-2)',
              cursor: 'pointer', fontSize: 13, fontWeight: filter === f ? 700 : 400,
            }}>{f}</button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, order ID..."
            style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-2)' }}>Loading refund requests...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-2)' }}>No refund requests found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ color: 'var(--text-1)' }}>{r.userName}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.userPhone}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>Order: <code style={{ fontSize: 11 }}>{r.orderId?.slice(-12)}</code></span>
                  <span>Mode: {r.paymentMode}</span>
                  <span>{fmtDate(r.createdAt)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>₹{fmt(r.refundAmount)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>of ₹{fmt(r.originalAmount)} <span style={{ color: 'var(--red)' }}>(-₹{fmt(r.deductedAmount)})</span></div>
                </div>
                <StatusBadge status={r.status} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setDetail(r)} style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-1)', fontSize: 12, fontWeight: 600 }}>
                    <Eye size={13} />
                  </button>
                  {r.status === 'PENDING' && (
                    <button onClick={() => setPay(r)} style={{ padding: '6px 12px', background: 'var(--green)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                      Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {detailRefund && (
        <DetailModal
          refund={detailRefund}
          onClose={() => setDetail(null)}
          onRefund={(r) => { setDetail(null); setPay(r); }}
          onSkip={() => { setDetail(null); load(); }}
        />
      )}
      {payRefund && (
        <MarkRefundedModal
          refund={payRefund}
          onClose={() => setPay(null)}
          onSuccess={() => { setPay(null); load(); }}
        />
      )}
    </div>
  );
}