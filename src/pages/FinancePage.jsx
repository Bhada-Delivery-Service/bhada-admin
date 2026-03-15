import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, TrendingUp, TrendingDown, Wallet, RefreshCw,
  Plus, Filter, X, ChevronDown, BookOpen, ArrowUpCircle,
  ArrowDownCircle, Receipt, Bike, RotateCcw, Landmark,
  CreditCard, Wrench, Download, Search, AlertCircle,
  CheckCircle2, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { financeAPI } from '../services/api';

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt      = (n) => (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) => (n ?? 0).toLocaleString('en-IN');
const fmtDate  = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) : '—';

const TX_TYPES = [
  'ORDER_INCOME', 'MANUAL_DEPOSIT', 'RIDER_PAYOUT',
  'REFUND', 'GST_PAYMENT', 'RAZORPAY_COMMISSION', 'SYSTEM_ADJUSTMENT',
];

const TYPE_CONFIG = {
  ORDER_INCOME:        { label: 'Order Income',        icon: IndianRupee,    colorKey: 'green'  },
  MANUAL_DEPOSIT:      { label: 'Manual Deposit',      icon: ArrowUpCircle,  colorKey: 'blue'   },
  RIDER_PAYOUT:        { label: 'Rider Payout',        icon: Bike,           colorKey: 'orange' },
  REFUND:              { label: 'Refund',               icon: RotateCcw,      colorKey: 'red'    },
  GST_PAYMENT:         { label: 'GST Payment',          icon: Landmark,       colorKey: 'purple' },
  RAZORPAY_COMMISSION: { label: 'Razorpay Commission',  icon: CreditCard,     colorKey: 'orange' },
  SYSTEM_ADJUSTMENT:   { label: 'System Adjustment',   icon: Wrench,         colorKey: 'blue'   },
};

const DIR_COLOR = { CREDIT: 'green', DEBIT: 'red' };

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, colorKey, icon: Icon, sub }) {
  return (
    <div className={`stat-card ${colorKey}`}>
      <div className={`stat-icon ${colorKey}`}><Icon size={18} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">₹{fmt(value)}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Manual Deposit Modal ─────────────────────────────────────────────────────
function DepositModal({ onClose, onSuccess }) {
  const [form, setForm]   = useState({ amount: '', description: '', referenceId: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.amount || !form.description.trim()) {
      toast.error('Amount and description are required'); return;
    }
    setLoading(true);
    try {
      await financeAPI.manualDeposit({
        amount:      Number(form.amount),
        description: form.description.trim(),
        referenceId: form.referenceId.trim() || undefined,
      });
      toast.success(`₹${fmt(Number(form.amount))} deposited`);
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Deposit failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Manual Deposit" onClose={onClose}>
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <input className="form-input" type="number" min="1" placeholder="e.g. 5000"
            value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <input className="form-input" placeholder="e.g. Bank transfer top-up"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Reference ID <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
          <input className="form-input" placeholder="e.g. UTR number"
            value={form.referenceId} onChange={e => setForm(p => ({ ...p, referenceId: e.target.value }))} />
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Processing…' : 'Confirm Deposit'}
        </button>
      </div>
    </Modal>
  );
}

// ─── GST Payment Modal ────────────────────────────────────────────────────────
function GstModal({ onClose, onSuccess }) {
  const [form, setForm]   = useState({ amount: '', period: '', referenceId: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.amount || !form.period.trim()) {
      toast.error('Amount and period are required'); return;
    }
    setLoading(true);
    try {
      await financeAPI.gstPayment({
        amount:      Number(form.amount),
        period:      form.period.trim(),
        referenceId: form.referenceId.trim() || undefined,
      });
      toast.success('GST payment recorded');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Record GST Payment" onClose={onClose}>
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <input className="form-input" type="number" min="1" placeholder="e.g. 12000"
            value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Period *</label>
          <input className="form-input" placeholder='e.g. "Mar 2025"'
            value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Reference / Challan No. <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
          <input className="form-input" placeholder="GST challan reference"
            value={form.referenceId} onChange={e => setForm(p => ({ ...p, referenceId: e.target.value }))} />
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Recording…' : 'Record GST Payment'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Adjustment Modal ─────────────────────────────────────────────────────────
function AdjustmentModal({ onClose, onSuccess }) {
  const [form, setForm]   = useState({ amount: '', direction: 'CREDIT', description: '', referenceId: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.amount || !form.description.trim()) {
      toast.error('Amount and description are required'); return;
    }
    setLoading(true);
    try {
      await financeAPI.ledgerEntry({
        type:        'SYSTEM_ADJUSTMENT',
        amount:      Number(form.amount),
        direction:   form.direction,
        description: form.description.trim(),
        referenceId: form.referenceId.trim() || undefined,
      });
      toast.success('Adjustment recorded');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="System Adjustment" onClose={onClose}>
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Direction *</label>
          <select className="form-input" value={form.direction}
            onChange={e => setForm(p => ({ ...p, direction: e.target.value }))}>
            <option value="CREDIT">CREDIT (add money)</option>
            <option value="DEBIT">DEBIT (remove money)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <input className="form-input" type="number" min="1"
            value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <input className="form-input" placeholder="Reason for adjustment"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Reference ID <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
          <input className="form-input"
            value={form.referenceId} onChange={e => setForm(p => ({ ...p, referenceId: e.target.value }))} />
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Recording…' : 'Record Adjustment'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ entry }) {
  const cfg = TYPE_CONFIG[entry.type] ?? { label: entry.type, icon: Receipt, colorKey: 'blue' };
  const Icon = cfg.icon;
  const isCredit = entry.direction === 'CREDIT';

  return (
    <div className="table-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.4fr', alignItems: 'center', gap: 12 }}>
      {/* Type + description */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
        <div className={`stat-icon ${cfg.colorKey}`} style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8 }}>
          <Icon size={14} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {entry.description}
          </div>
          {entry.referenceId && (
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1, fontFamily: 'monospace' }}>
              ref: {entry.referenceId}
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: isCredit ? 'var(--green)' : 'var(--red)' }}>
          {isCredit ? '+' : '−'}₹{fmt(entry.amount)}
        </span>
      </div>

      {/* Direction badge */}
      <div>
        <span className={`badge ${DIR_COLOR[entry.direction]}`}>
          {isCredit
            ? <><ArrowUpCircle size={10} style={{ marginRight: 3 }} />CREDIT</>
            : <><ArrowDownCircle size={10} style={{ marginRight: 3 }} />DEBIT</>}
        </span>
      </div>

      {/* Balance after */}
      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-2)' }}>
        ₹{fmt(entry.balanceAfter)}
      </div>

      {/* Date */}
      <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
        {fmtDate(entry.createdAt)}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [balance,      setBalance]      = useState(null);
  const [report,       setReport]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [txLoading,    setTxLoading]    = useState(false);

  // Filters
  const [filterType,   setFilterType]   = useState('');
  const [filterDir,    setFilterDir]    = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [search,       setSearch]       = useState('');

  // Modals
  const [modal, setModal] = useState(null); // 'deposit' | 'gst' | 'adjustment'

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    try {
      const [balRes, repRes] = await Promise.all([
        financeAPI.getBalance(),
        financeAPI.getReport(
          filterFrom || undefined,
          filterTo   || undefined,
        ),
      ]);
      setBalance(balRes.data.data.balance);
      setReport(repRes.data.data);
    } catch (e) {
      toast.error('Failed to load financial summary');
    }
  }, [filterFrom, filterTo]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await financeAPI.getTransactions({
        type:      filterType  || undefined,
        direction: filterDir   || undefined,
        from:      filterFrom  || undefined,
        to:        filterTo    || undefined,
        limit:     200,
      });
      setTransactions(res.data.data ?? []);
    } catch (e) {
      toast.error('Failed to load transactions');
    } finally { setTxLoading(false); }
  }, [filterType, filterDir, filterFrom, filterTo]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSummary(), loadTransactions()]);
    setLoading(false);
  }, [loadSummary, loadTransactions]);

  useEffect(() => { loadAll(); }, []);

  const applyFilters = () => { loadSummary(); loadTransactions(); };

  const clearFilters = () => {
    setFilterType(''); setFilterDir('');
    setFilterFrom(''); setFilterTo('');
    setSearch('');
    setTimeout(loadAll, 0);
  };

  const onActionSuccess = () => { loadSummary(); loadTransactions(); };

  // ── Filtered display list ──────────────────────────────────────────────────
  const displayed = transactions.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.description?.toLowerCase().includes(s) ||
      t.referenceId?.toLowerCase().includes(s)  ||
      t.transactionId?.toLowerCase().includes(s)
    );
  });

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Transaction ID', 'Type', 'Direction', 'Amount', 'Balance After', 'Reference', 'Description', 'Date'];
    const rows = displayed.map(t => [
      t.transactionId, t.type, t.direction, t.amount, t.balanceAfter,
      t.referenceId ?? '', t.description, new Date(t.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `bhada-ledger-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-3)' }}>
        <RefreshCw size={20} className="spin" /> Loading financial data…
      </div>
    );
  }

  const byType = report?.byType ?? {};

  return (
    <div className="page-content">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={22} /> Accounting Ledger
          </h1>
          <p className="page-subtitle">Complete financial flow — every rupee tracked</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => setModal('gst')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Landmark size={14} /> GST Payment
          </button>
          <button className="btn btn-secondary" onClick={() => setModal('adjustment')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wrench size={14} /> Adjustment
          </button>
          <button className="btn btn-primary" onClick={() => setModal('deposit')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Manual Deposit
          </button>
        </div>
      </div>

      {/* ── Balance Banner ──────────────────────────────────────────────────── */}
      <div style={{
        background:    'linear-gradient(135deg, var(--accent) 0%, #5a67fa 100%)',
        borderRadius:  16,
        padding:       '28px 32px',
        marginBottom:  24,
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        flexWrap:      'wrap',
        gap:           16,
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Current System Balance
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', marginTop: 4, letterSpacing: '-0.02em' }}>
            ₹{fmt(balance)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
            Live — updated on every transaction
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>Total Credits</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#6EF5A0' }}>₹{fmtShort(report?.totalCredits)}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>Total Debits</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FF8A8A' }}>₹{fmtShort(report?.totalDebits)}</div>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Order Income"        value={byType.ORDER_INCOME}          colorKey="green"  icon={IndianRupee}  />
        <StatCard label="Manual Deposits"     value={byType.MANUAL_DEPOSIT}        colorKey="blue"   icon={ArrowUpCircle} />
        <StatCard label="Rider Payouts"       value={byType.RIDER_PAYOUT}          colorKey="orange" icon={Bike}         />
        <StatCard label="Refunds Issued"      value={byType.REFUND}                colorKey="red"    icon={RotateCcw}    />
        <StatCard label="GST Paid"            value={byType.GST_PAYMENT}           colorKey="purple" icon={Landmark}     />
        <StatCard label="Razorpay Commission" value={byType.RAZORPAY_COMMISSION}   colorKey="orange" icon={CreditCard}   />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search description / reference…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Type filter */}
          <div style={{ flex: '1 1 160px' }}>
            <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {TX_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_CONFIG[t]?.label ?? t}</option>
              ))}
            </select>
          </div>

          {/* Direction filter */}
          <div style={{ flex: '1 1 120px' }}>
            <select className="form-input" value={filterDir} onChange={e => setFilterDir(e.target.value)}>
              <option value="">All directions</option>
              <option value="CREDIT">Credit only</option>
              <option value="DEBIT">Debit only</option>
            </select>
          </div>

          {/* Date range */}
          <div style={{ flex: '1 1 140px' }}>
            <input className="form-input" type="date" value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)} title="From date" />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <input className="form-input" type="date" value={filterTo}
              onChange={e => setFilterTo(e.target.value)} title="To date" />
          </div>

          <button className="btn btn-primary" onClick={applyFilters} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} /> Apply
          </button>
          {(filterType || filterDir || filterFrom || filterTo) && (
            <button className="btn btn-secondary" onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Transaction Table ────────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.4fr',
          gap: 12, padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          {['Transaction', 'Amount', 'Direction', 'Balance After', 'Date'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Transaction' ? 'left' : 'right' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {txLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <RefreshCw size={16} className="spin" /> Loading transactions…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
            <Receipt size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>No transactions found</div>
            {(filterType || filterDir || filterFrom || filterTo || search) && (
              <button className="btn btn-secondary" onClick={clearFilters} style={{ marginTop: 12 }}>Clear filters</button>
            )}
          </div>
        ) : (
          <div>
            {displayed.map((entry, i) => (
              <div key={entry.transactionId}
                style={{ padding: '14px 20px', borderBottom: i < displayed.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <TxRow entry={entry} />
              </div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {displayed.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {displayed.length} transaction{displayed.length !== 1 ? 's' : ''}</span>
            {transactions.length >= 200 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Showing latest 200 — use date filters to narrow results
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal === 'deposit'    && <DepositModal    onClose={() => setModal(null)} onSuccess={onActionSuccess} />}
      {modal === 'gst'        && <GstModal        onClose={() => setModal(null)} onSuccess={onActionSuccess} />}
      {modal === 'adjustment' && <AdjustmentModal onClose={() => setModal(null)} onSuccess={onActionSuccess} />}
    </div>
  );
}
