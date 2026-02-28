import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Search, RefreshCw, X, TrendingUp,
  CheckCircle2, XCircle, Clock, RotateCcw, AlertCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsAPI } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt    = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => (n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';

const STATUS_CFG = {
  SUCCESS:        { label: 'Success',   cls: 'green',  Icon: CheckCircle2 },
  FAILED:         { label: 'Failed',    cls: 'red',    Icon: XCircle      },
  PENDING:        { label: 'Pending',   cls: 'orange', Icon: Clock        },
  INITIATED:      { label: 'Initiated', cls: 'orange', Icon: Clock        },
  REFUNDED:       { label: 'Refunded',  cls: 'purple', Icon: RotateCcw    },
  PARTIAL_REFUND: { label: 'Partial',   cls: 'purple', Icon: RotateCcw    },
};

const FILTERS = ['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'INITIATED'];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'accent' }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className={`stat-icon ${color}`}><Icon size={18} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── Refund Modal ─────────────────────────────────────────────────────────────

function RefundModal({ payment, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [busy,   setBusy]   = useState(false);

  const maxRefund = payment.amount - (payment.refundAmount || 0);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)    { toast.error('Enter a valid amount'); return; }
    if (amt > maxRefund)     { toast.error(`Max refundable is ₹${fmt(maxRefund)}`); return; }
    setBusy(true);
    try {
      await paymentsAPI.refund(payment.paymentId, amt);
      toast.success(`Refund of ₹${fmt(amt)} initiated`);
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Refund failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Issue Refund</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
              {payment.paymentId}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Amount breakdown */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          {[
            ['Original amount', `₹${fmt(payment.amount)}`, 'var(--text-0)'],
            payment.refundAmount > 0 && ['Already refunded', `₹${fmt(payment.refundAmount)}`, 'var(--purple)'],
          ].filter(Boolean).map(([k, v, color]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{k}</span>
              <span style={{ fontWeight: 700, color }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Max refundable</span>
            <span style={{ fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: 20 }}>₹{fmt(maxRefund)}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Refund Amount (₹)</label>
          <div style={{ position: 'relative' }}>
            <input className="form-input" type="number" step="0.01" min="1" max={maxRefund}
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              style={{ paddingRight: 64 }} autoFocus />
            <button onClick={() => setAmount(String(maxRefund))}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--accent)', padding: '3px 8px', cursor: 'pointer', fontWeight: 700 }}>
              MAX
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--orange-dim)', border: '1px solid rgba(255,154,60,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-1)', marginBottom: 20 }}>
          <AlertCircle size={13} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
          Refunds are processed via the payment gateway and may take 5–7 business days to reflect.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={busy || !amount}>
            {busy ? 'Processing…' : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ p, onRefund }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[p.status] || STATUS_CFG.PENDING;
  const { Icon } = cfg;

  return (
    <>
      <tr style={{ cursor: 'pointer', background: open ? 'var(--bg-2)' : undefined }}
        onClick={() => setOpen(o => !o)}>
        <td>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {(p.paymentId || '').slice(0, 20)}…
          </span>
        </td>
        <td>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--text-0)' }}>
            ₹{fmtInt(p.amount)}
          </span>
        </td>
        <td>
          <span className={`badge ${cfg.cls}`}>
            <Icon size={9} /> {cfg.label}
          </span>
        </td>
        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmtDate(p.paymentDate)}</td>
        <td>
          {p.refundAmount > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--purple)' }}>
              ₹{fmtInt(p.refundAmount)}
            </span>
          )}
        </td>
        <td onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {p.status === 'SUCCESS' && (
              <button className="btn btn-sm"
                style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid rgba(168,85,247,0.2)' }}
                onClick={() => onRefund(p)}>
                <RotateCcw size={11} /> Refund
              </button>
            )}
            <button className="btn btn-ghost btn-sm btn-icon-sm" onClick={() => setOpen(o => !o)}>
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr style={{ background: 'var(--bg-2)' }}>
          <td colSpan={6} style={{ paddingTop: 0, paddingBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, paddingTop: 12 }}>
              {[
                ['Payment ID',     p.paymentId],
                ['Transaction ID', p.transactionId || '—'],
                ['Gateway Ref',    p.gatewayResponse || '—'],
                ['Status',         p.status],
                ['Payment Date',   fmtDate(p.paymentDate)],
                p.refundAmount > 0 && ['Refund Amount', `₹${fmt(p.refundAmount)}`],
                p.refundDate       && ['Refund Date',   fmtDate(p.refundDate)],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 500, wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [payments,    setPayments]    = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('ALL');
  const [search,      setSearch]      = useState('');
  const [refundModal, setRefundModal] = useState(null);

  // Quick lookup by ID
  const [lookupId,  setLookupId]  = useState('');
  const [lookedUp,  setLookedUp]  = useState(null);
  const [lookupBusy,setLookupBusy]= useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        paymentsAPI.getAll(filter === 'ALL' ? undefined : filter),
        paymentsAPI.getStatistics(),
      ]);
      if (listRes.status  === 'fulfilled') setPayments(listRes.value.data?.data  || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data    || null);
      if (listRes.status  === 'rejected')  toast.error('Could not load payments list');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupId.trim()) return;
    setLookupBusy(true);
    setLookedUp(null);
    try {
      const { data } = await paymentsAPI.getStatus(lookupId.trim());
      setLookedUp(data?.data || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment not found');
    } finally { setLookupBusy(false); }
  };

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.paymentId || '').toLowerCase().includes(q)
        || (p.transactionId || '').toLowerCase().includes(q)
        || (p.gatewayResponse || '').toLowerCase().includes(q);
  });

  const afterRefund = () => {
    setRefundModal(null);
    setLookedUp(null);
    load();
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Payments</h1>
          <p>Monitor transactions, process refunds, and look up payment details</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <StatCard icon={TrendingUp}   color="accent"  label="Total Collected"  value={`₹${fmtInt(stats.totalAmount)}`}        sub={`${stats.successfulPayments} successful`} />
          <StatCard icon={CheckCircle2} color="green"   label="Successful"       value={stats.successfulPayments}               sub={`of ${stats.totalPayments} total`}         />
          <StatCard icon={Clock}        color="orange"  label="Pending"          value={stats.pendingPayments}                  sub="awaiting confirmation"                     />
          <StatCard icon={XCircle}      color="red"     label="Failed"           value={stats.failedPayments}                                                                   />
          <StatCard icon={RotateCcw}    color="purple"  label="Refunded"         value={stats.refundedPayments}                 sub={`₹${fmtInt(stats.totalRefundedAmount)} total`} />
        </div>
      )}

      {/* ── Quick Lookup ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Quick Lookup by Payment ID</div>
        <form onSubmit={handleLookup}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: lookedUp ? 16 : 0 }}>
          <input className="form-input"
            style={{ flex: 1, minWidth: 240, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            placeholder="Enter Payment ID  e.g. pay_xxx"
            value={lookupId}
            onChange={e => setLookupId(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={lookupBusy || !lookupId.trim()}>
            <Search size={14} /> {lookupBusy ? 'Looking up…' : 'Look Up'}
          </button>
          {lookedUp && (
            <button type="button" className="btn btn-secondary"
              onClick={() => { setLookedUp(null); setLookupId(''); }}>
              <X size={13} /> Clear
            </button>
          )}
        </form>

        {lookedUp && (() => {
          const c = STATUS_CFG[lookedUp.status] || STATUS_CFG.PENDING;
          const LIcon = c.Icon;
          return (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>{lookedUp.paymentId}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>₹{fmt(lookedUp.amount)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span className={`badge ${c.cls}`}><LIcon size={10} /> {c.label}</span>
                  {lookedUp.status === 'SUCCESS' && (
                    <button className="btn btn-sm"
                      style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid rgba(168,85,247,0.2)' }}
                      onClick={() => setRefundModal(lookedUp)}>
                      <RotateCcw size={11} /> Issue Refund
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {[
                  ['Transaction ID', lookedUp.transactionId || '—'],
                  ['Gateway Ref',    lookedUp.gatewayResponse || '—'],
                  ['Payment Date',   fmtDate(lookedUp.paymentDate)],
                  lookedUp.refundAmount > 0 && ['Refunded', `₹${fmt(lookedUp.refundAmount)}`],
                  lookedUp.refundDate && ['Refund Date', fmtDate(lookedUp.refundDate)],
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Filters + Search ── */}
      <div className="filters-row" style={{ marginBottom: 16 }}>
        <div className="search-input-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search by payment ID or transaction ID…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--accent)' : 'var(--bg-3)',
              color:      filter === f ? 'var(--bg-0)'   : 'var(--text-1)',
              border:     filter === f ? 'none'          : '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '7px 14px',
              fontSize: 12, fontWeight: filter === f ? 700 : 500,
              cursor: 'pointer', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-center" style={{ padding: 60 }}><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CreditCard size={22} /></div>
            <h3>No payments found</h3>
            <p>{filter !== 'ALL' ? `No ${filter.toLowerCase()} payments yet` : 'No payments recorded yet'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Refunded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <PaymentRow key={p.paymentId} p={p} onRefund={setRefundModal} />
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--border)' }}>
              Showing {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {refundModal && (
        <RefundModal payment={refundModal} onClose={() => setRefundModal(null)} onSuccess={afterRefund} />
      )}
    </div>
  );
}