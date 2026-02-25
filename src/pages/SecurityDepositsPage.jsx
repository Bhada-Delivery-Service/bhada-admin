import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, RefreshCw, Settings, ToggleLeft, ToggleRight,
  X, ChevronDown, RotateCcw, Ban, Search, IndianRupee,
  CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { securityDepositAPI } from '../services/api';

/* ── Status badge ─────────────────────────────────────────────────────────── */
const STATUS_META = {
  PAID:            { label: 'Paid',            color: 'var(--green)',  bg: 'var(--green-dim)',  Icon: CheckCircle },
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'var(--orange)', bg: 'var(--orange-dim)', Icon: Clock },
  REFUNDED:        { label: 'Refunded',        color: 'var(--blue)',   bg: 'var(--blue-dim)',   Icon: RotateCcw },
  FORFEITED:       { label: 'Forfeited',       color: 'var(--red)',    bg: 'var(--red-dim)',    Icon: Ban },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'var(--text-2)', bg: 'var(--bg-3)', Icon: AlertTriangle };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: m.bg, color: m.color,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>
      <m.Icon size={10} />
      {m.label}
    </span>
  );
}

/* ── Config Panel ─────────────────────────────────────────────────────────── */
function ConfigPanel({ config, onConfigSaved }) {
  const [editing, setEditing]   = useState(false);
  const [amount, setAmount]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (config) setAmount(String(config.amount));
  }, [config]);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid amount (≥ 0)'); return; }
    setSaving(true);
    try {
      const { data } = await securityDepositAPI.setConfig({ amount: num });
      toast.success('Config updated');
      onConfigSaved(data.data);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update config');
    } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    if (!config) return;
    setToggling(true);
    try {
      const { data } = config.isEnabled
        ? await securityDepositAPI.disable()
        : await securityDepositAPI.enable();
      toast.success(`Security deposit ${config.isEnabled ? 'disabled' : 'enabled'}`);
      onConfigSaved({ ...config, isEnabled: data.data.isEnabled });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle');
    } finally { setToggling(false); }
  };

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', display: 'grid', placeItems: 'center' }}>
            <Settings size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Deposit Configuration</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
              Amount &amp; feature toggle
            </div>
          </div>
        </div>
        {/* Enable / Disable toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling || !config}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: config?.isEnabled ? 'var(--green-dim)' : 'var(--bg-3)',
            color: config?.isEnabled ? 'var(--green)' : 'var(--text-2)',
            border: `1px solid ${config?.isEnabled ? 'rgba(54,211,153,0.25)' : 'var(--border)'}`,
            borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {config?.isEnabled
            ? <><ToggleRight size={15} /> Enabled</>
            : <><ToggleLeft size={15} /> Disabled</>}
        </button>
      </div>

      {/* Amount row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          flex: 1, padding: '14px 16px', background: 'var(--bg-2)',
          border: '1px solid var(--border)', borderRadius: 10,
        }}>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>₹</span>
              <input
                type="number" min="0" step="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)',
                  color: 'var(--text-0)',
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IndianRupee size={16} style={{ color: 'var(--text-2)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
                {config?.amount ?? '—'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 4 }}>INR</span>
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Required deposit amount
          </div>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setAmount(String(config?.amount || 0)); }}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            Edit Amount
          </button>
        )}
      </div>

      {config && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-2)' }}>
          Last updated: {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : '—'}
        </div>
      )}
    </div>
  );
}

/* ── Action Modal (refund / forfeit) ──────────────────────────────────────── */
function ActionModal({ riderId, action, onClose, onDone }) {
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const isRefund = action === 'refund';

  const handle = async () => {
    setSaving(true);
    try {
      if (isRefund) await securityDepositAPI.refund(riderId, note);
      else          await securityDepositAPI.forfeit(riderId, note);
      toast.success(`Deposit ${isRefund ? 'refunded' : 'forfeited'} successfully`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: isRefund ? 'var(--blue)' : 'var(--red)' }}>
            {isRefund ? '↩ Refund Deposit' : '⚠ Forfeit Deposit'}
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
          {isRefund
            ? 'Mark this rider\'s deposit as refunded. Transfer the actual money manually via UPI/bank. This action only updates the status in the system.'
            : 'Forfeit this rider\'s security deposit as a penalty for violations or policy breach. This action cannot be undone.'}
        </div>

        <div className="form-group">
          <label className="form-label">Note (optional)</label>
          <input
            className="form-input"
            placeholder={isRefund ? 'e.g. Rider left platform voluntarily' : 'e.g. Repeated fraud complaints'}
            value={note}
            onChange={e => setNote(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex gap-8">
          <button className="btn btn-secondary flex-1" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className={`btn flex-1 ${isRefund ? 'btn-primary' : 'btn-danger'}`}
            onClick={handle}
            disabled={saving}
            style={isRefund ? {} : { background: 'var(--red)', color: '#fff', border: 'none' }}
          >
            {saving ? 'Processing…' : isRefund ? 'Confirm Refund' : 'Confirm Forfeit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function SecurityDepositsPage() {
  const [config, setConfig]       = useState(null);
  const [deposits, setDeposits]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]       = useState('');
  const [actionModal, setActionModal] = useState(null); // { riderId, action }

  const STATUS_FILTERS = ['', 'PAID', 'PENDING_PAYMENT', 'REFUNDED', 'FORFEITED'];

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [configRes, depositsRes] = await Promise.all([
        securityDepositAPI.getConfig(),
        securityDepositAPI.getAll(filterStatus || undefined),
      ]);
      setConfig(configRes.data.data);
      setDeposits(depositsRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load security deposits');
    } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
    toast.success('Refreshed');
  };

  const filtered = deposits.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.riderId?.toLowerCase().includes(q) ||
      d.gatewayPaymentId?.toLowerCase().includes(q) ||
      d.gatewayOrderId?.toLowerCase().includes(q)
    );
  });

  /* ── Stats ────────────────────────────────────────────────────────────────── */
  const stats = {
    total:    deposits.length,
    paid:     deposits.filter(d => d.status === 'PAID').length,
    pending:  deposits.filter(d => d.status === 'PENDING_PAYMENT').length,
    forfeited: deposits.filter(d => d.status === 'FORFEITED').length,
    totalCollected: deposits.filter(d => d.status === 'PAID').reduce((s, d) => s + (d.amount || 0), 0),
  };

  if (loading) return (
    <div style={{ display: 'grid', placeItems: 'center', height: '40vh' }}>
      <div className="loader" />
    </div>
  );

  return (
    <div style={{ padding: '0 2px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', display: 'grid', placeItems: 'center' }}>
            <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Security Deposits</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Manage rider security deposit payments</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={13} style={{ animation: refreshing ? 'ksp 0.7s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Riders', value: stats.total, color: 'var(--text-0)' },
          { label: 'Paid', value: stats.paid, color: 'var(--green)' },
          { label: 'Pending', value: stats.pending, color: 'var(--orange)' },
          { label: 'Forfeited', value: stats.forfeited, color: 'var(--red)' },
          { label: 'Total Collected', value: `₹${stats.totalCollected.toLocaleString()}`, color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Config panel ───────────────────────────────────────────────────── */}
      <ConfigPanel config={config} onConfigSaved={setConfig} />

      {/* ── Filters & search ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8 }}
            placeholder="Search rider ID or payment ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            className="form-select"
            style={{ paddingRight: 32, appearance: 'none' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_FILTERS.filter(Boolean).map(s => (
              <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--text-2)',
        }}>
          <ShieldCheck size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>No deposits found</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 100px 130px 1fr 130px',
            gap: 0,
            padding: '10px 16px',
            background: 'var(--bg-2)',
            borderBottom: '1px solid var(--border)',
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>Rider ID</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Paid At</span>
            <span>Payment ID</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {/* Rows */}
          {filtered.map((dep, i) => (
            <div key={dep.riderId} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 100px 130px 1fr 130px',
              gap: 0,
              padding: '13px 16px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              fontSize: 13,
            }}>
              {/* Rider ID */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)' }}>
                {dep.riderId}
              </span>

              {/* Amount */}
              <span style={{ fontWeight: 600, color: dep.status === 'PAID' ? 'var(--green)' : 'var(--text-1)' }}>
                ₹{dep.amount ?? '—'}
              </span>

              {/* Status */}
              <span><StatusBadge status={dep.status} /></span>

              {/* Paid At */}
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                {dep.paidAt ? new Date(dep.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </span>

              {/* Payment ID */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {dep.gatewayPaymentId || '—'}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {dep.status === 'PAID' && (
                  <>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 11, background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(0,120,255,0.2)' }}
                      onClick={() => setActionModal({ riderId: dep.riderId, action: 'refund' })}
                    >
                      <RotateCcw size={11} /> Refund
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 11, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.2)' }}
                      onClick={() => setActionModal({ riderId: dep.riderId, action: 'forfeit' })}
                    >
                      <Ban size={11} /> Forfeit
                    </button>
                  </>
                )}
                {dep.status !== 'PAID' && (
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action modal */}
      {actionModal && (
        <ActionModal
          riderId={actionModal.riderId}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onDone={() => load(true)}
        />
      )}

      <style>{`@keyframes ksp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}