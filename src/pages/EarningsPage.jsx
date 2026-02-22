import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, Search, RefreshCw, X, ChevronRight,
  TrendingUp, Wallet, ArrowDownToLine, Receipt,
  User, Clock, CheckCircle2, XCircle, Banknote,
  Smartphone, ArrowRight, AlertCircle, Plus, Copy, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ridersAPI, earningsAPI } from '../services/api';

function CopyFieldBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <button onClick={copy} title="Copy"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-2)', padding: '0 2px', display: 'inline-flex', alignItems: 'center' }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const fmt      = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) => (n || 0).toLocaleString('en-IN');
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

const WD_STATUS_CFG = {
  PENDING:  { cls: 'orange', icon: Clock,        label: 'Pending'  },
  APPROVED: { cls: 'blue',   icon: CheckCircle2, label: 'Approved' },
  PAID:     { cls: 'green',  icon: CheckCircle2, label: 'Paid'     },
  REJECTED: { cls: 'red',    icon: XCircle,      label: 'Rejected' },
};

const METHOD_LABEL = { PAYTM: 'Paytm', UPI: 'UPI', BANK: 'Bank', CASH: 'Cash' };

// ─── Summary stat card ────────────────────────────────────────────────────────

function MiniStat({ label, value, color, icon: Icon, colorKey }) {
  return (
    <div className={`stat-card ${colorKey}`} style={{ padding: 16 }}>
      <div className={`stat-icon ${colorKey}`} style={{ width: 30, height: 30, marginBottom: 8 }}>
        <Icon size={14} />
      </div>
      <div className="stat-label" style={{ fontSize: 10 }}>{label}</div>
      <div className="stat-value" style={{ fontSize: 20, color }}>{value}</div>
    </div>
  );
}

// ─── Credit modal ─────────────────────────────────────────────────────────────

function CreditModal({ rider, onClose, onSuccess }) {
  const [amount, setAmount]   = useState('');
  const [reason, setReason]   = useState('');
  const [submitting, setSub]  = useState(false);

  const handleSubmit = async () => {
    if (+amount < 1) { toast.error('Enter a valid amount'); return; }
    if (!reason.trim()) { toast.error('Enter a reason'); return; }
    setSub(true);
    try {
      await earningsAPI.creditRider(rider.uid || rider.id, { amount: +amount, description: reason.trim() });
      toast.success(`₹${fmtShort(amount)} credited to ${rider.firstName}'s earnings`);
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to credit');
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Manual Credit</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              Add earnings to {rider.firstName} {rider.lastName}'s ledger
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <input className="form-input" type="number" min="1" placeholder="e.g. 150"
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Reason / Description *</label>
          <textarea className="form-textarea" style={{ minHeight: 72 }}
            placeholder="e.g. Bonus for exceptional performance, correction for missed delivery credit…"
            value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitting}>
            <Plus size={14} /> {submitting ? 'Crediting…' : 'Credit Earnings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rider detail panel ───────────────────────────────────────────────────────

function RiderEarningsPanel({ rider, onClose }) {
  const [summary, setSummary]         = useState(null);
  const [earnings, setEarnings]       = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [riderProfile, setRiderProfile] = useState(rider); // full profile with bank details
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('earnings');
  const [creditModal, setCreditModal] = useState(false);

  const rid = rider.uid || rider.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, earnRes, wdRes, profileRes] = await Promise.allSettled([
        earningsAPI.getRiderSummary(rid),
        earningsAPI.getRiderEarnings(rid, 60),
        earningsAPI.getRiderWithdrawals(rid),
        ridersAPI.getById(rid),
      ]);
      if (sumRes.status === 'fulfilled')     setSummary(sumRes.value.data?.data ?? null);
      if (earnRes.status === 'fulfilled')    setEarnings(earnRes.value.data?.data ?? []);
      if (wdRes.status === 'fulfilled')      setWithdrawals(wdRes.value.data?.data ?? []);
      if (profileRes.status === 'fulfilled') setRiderProfile(profileRes.value.data?.data || profileRes.value.data);
    } catch {
      toast.error('Failed to load rider earnings');
    } finally {
      setLoading(false);
    }
  }, [rid]);

  useEffect(() => { load(); }, [load]);

  const pendingPayout  = summary?.pendingPayout      ?? 0;
  const totalEarnings  = summary?.totalEarnings      ?? 0;
  const totalWithdrawn = summary?.totalWithdrawn     ?? 0;
  const thisMonth      = summary?.thisMonthEarnings  ?? 0;
  const lastMonth      = summary?.lastMonthEarnings  ?? 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(720px, calc(100vw - 32px))', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, background: 'var(--accent-dim)',
              border: '1px solid var(--accent-glow)', borderRadius: '50%',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent)', fontSize: 18,
            }}>
              {(rider.firstName || 'R')[0].toUpperCase()}
            </div>
            <div>
              <div className="modal-title">{rider.firstName} {rider.lastName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                {rider.phoneNumber || rid.slice(0, 14)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setCreditModal(true)}>
              <Plus size={13} /> Credit
            </button>
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <RefreshCw size={13} />
            </button>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {loading ? (
          <div className="loading-center" style={{ minHeight: 200 }}><div className="loader" /></div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
              <MiniStat label="Available"     value={`₹${fmtShort(pendingPayout)}`}  color="var(--accent)"  icon={Wallet}          colorKey="accent" />
              <MiniStat label="Total Earned"  value={`₹${fmtShort(totalEarnings)}`}  color="var(--text-0)"  icon={TrendingUp}      colorKey="blue"   />
              <MiniStat label="Withdrawn"     value={`₹${fmtShort(totalWithdrawn)}`} color="var(--text-1)"  icon={ArrowDownToLine} colorKey="purple" />
              <MiniStat label="This Month"    value={`₹${fmtShort(thisMonth)}`}      color="var(--green)"   icon={IndianRupee}     colorKey="green"  />
              <MiniStat label="Last Month"    value={`₹${fmtShort(lastMonth)}`}      color="var(--text-2)"  icon={IndianRupee}     colorKey="orange" />
            </div>

            {/* Commission rate */}
            {rider.commissionPercentage != null && (
              <div style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 18,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <AlertCircle size={13} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  Commission rate: <strong style={{ color: 'var(--text-0)' }}>{rider.commissionPercentage}%</strong>
                  &nbsp;· Net pay = gross × {(1 - rider.commissionPercentage / 100).toFixed(2)}
                </span>
              </div>
            )}

            {/* Tab bar */}
            <div style={{
              display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: 4, marginBottom: 16,
            }}>
              {[
                { key: 'earnings',    label: 'Transactions', count: earnings.length    },
                { key: 'withdrawals', label: 'Withdrawals',  count: withdrawals.length },
                { key: 'bank',        label: 'Payout Account', count: 0               },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1,
                  background: tab === t.key ? 'var(--bg-1)' : 'transparent',
                  border: `1px solid ${tab === t.key ? 'var(--border-bright)' : 'transparent'}`,
                  borderRadius: 6, padding: '8px 0',
                  color: tab === t.key ? 'var(--text-0)' : 'var(--text-2)',
                  fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {t.label}
                  {t.count > 0 && (
                    <span style={{
                      background: tab === t.key ? 'var(--accent-dim)' : 'var(--bg-3)',
                      color: tab === t.key ? 'var(--accent)' : 'var(--text-2)',
                      borderRadius: 99, fontSize: 10, fontFamily: 'var(--font-mono)',
                      fontWeight: 700, padding: '1px 6px',
                    }}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Transactions tab */}
            {tab === 'earnings' && (
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {earnings.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}>
                    <div className="empty-state-icon"><Receipt size={20} /></div>
                    <h3>No transactions</h3>
                    <p>Earnings appear here after deliveries</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>Description</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>Date</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>Gross</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>Commission</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((e, i) => (
                        <tr key={e.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontSize: 13 }}>
                            {e.description || 'Delivery earning'}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                            {fmtDate(e.createdAt)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                            ₹{fmt(e.grossAmount)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                            -{e.commissionPercentage}%
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                            +₹{fmt(e.netAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Withdrawals tab */}
            {tab === 'withdrawals' && (
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {withdrawals.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}>
                    <div className="empty-state-icon"><ArrowDownToLine size={20} /></div>
                    <h3>No withdrawals</h3>
                    <p>Rider hasn't requested any payouts yet</p>
                  </div>
                ) : (
                  withdrawals.map((wd, i) => {
                    const cfg  = WD_STATUS_CFG[wd.status] || WD_STATUS_CFG.PENDING;
                    const SIcon = cfg.icon;
                    return (
                      <div key={wd.id || i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 0', borderBottom: '1px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-0)', marginBottom: 2 }}>
                            {METHOD_LABEL[wd.paymentMethod] || wd.paymentMethod}
                          </div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                            {wd.accountDetails} · {fmtDate(wd.createdAt)}
                          </div>
                          {wd.transactionReference && (
                            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                              Ref: {wd.transactionReference}
                            </div>
                          )}
                          {wd.rejectionReason && (
                            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>
                              Rejected: {wd.rejectionReason}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
                            ₹{fmtShort(wd.requestedAmount)}
                          </div>
                          <span className={`badge ${cfg.cls}`}>
                            <SIcon size={9} /> {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Payout Account tab */}
            {tab === 'bank' && (
              <div style={{ padding: '4px 0' }}>
                {!(riderProfile?.bankAccountNumber || riderProfile?.upiId) ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
                    This rider has not saved a payout account yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {riderProfile?.upiId && (
                      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>UPI ID</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {riderProfile.upiId}
                          <CopyFieldBtn text={riderProfile.upiId} />
                        </div>
                      </div>
                    )}
                    {riderProfile?.bankAccountNumber && (
                      <>
                        {riderProfile.bankAccountHolderName && (
                          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Account Holder</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-0)' }}>{riderProfile.bankAccountHolderName}</div>
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Account Number</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-0)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {riderProfile.bankAccountNumber}
                              <CopyFieldBtn text={riderProfile.bankAccountNumber} />
                            </div>
                          </div>
                          {riderProfile.bankIfscCode && (
                            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>IFSC Code</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-0)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {riderProfile.bankIfscCode}
                                <CopyFieldBtn text={riderProfile.bankIfscCode} />
                              </div>
                            </div>
                          )}
                        </div>
                        {riderProfile.bankName && (
                          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Bank Name</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{riderProfile.bankName}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {creditModal && (
        <CreditModal
          rider={rider}
          onClose={() => setCreditModal(false)}
          onSuccess={() => { setCreditModal(false); load(); }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const [riders, setRiders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  // Summaries keyed by riderId — fetched lazily on row hover/click
  const [summaries, setSummaries] = useState({});

  const fetchRiders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ridersAPI.getAll();
      const list = (data?.data || []).filter(r => r.onboardingStatus === 'APPROVED');
      setRiders(list);
      // Load summaries for all approved riders
      const results = await Promise.allSettled(
        list.map(r => earningsAPI.getRiderSummary(r.uid || r.id))
      );
      const map = {};
      list.forEach((r, i) => {
        const rid = r.uid || r.id;
        if (results[i].status === 'fulfilled') {
          map[rid] = results[i].value.data?.data ?? null;
        }
      });
      setSummaries(map);
    } catch {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  const filtered = riders.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase();
    return name.includes(q) || (r.phoneNumber || '').includes(q);
  });

  // Overall platform totals
  const totalPayout    = Object.values(summaries).reduce((s, v) => s + (v?.pendingPayout ?? 0), 0);
  const totalEarnings  = Object.values(summaries).reduce((s, v) => s + (v?.totalEarnings ?? 0), 0);
  const totalWithdrawn = Object.values(summaries).reduce((s, v) => s + (v?.totalWithdrawn ?? 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Rider Earnings</h1>
          <p>View earnings, transactions, and payout history for each approved rider</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRiders}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Platform-wide stats */}
      {!loading && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card accent">
            <div className="stat-icon accent"><Wallet size={18} /></div>
            <div className="stat-label">Total Pending Payouts</div>
            <div className="stat-value" style={{ fontSize: 22 }}>₹{fmtShort(totalPayout)}</div>
            <div className="stat-sub">across all riders</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon green"><TrendingUp size={18} /></div>
            <div className="stat-label">Total Earnings Credited</div>
            <div className="stat-value" style={{ fontSize: 22 }}>₹{fmtShort(totalEarnings)}</div>
            <div className="stat-sub">all time</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon blue"><ArrowDownToLine size={18} /></div>
            <div className="stat-label">Total Paid Out</div>
            <div className="stat-value" style={{ fontSize: 22 }}>₹{fmtShort(totalWithdrawn)}</div>
            <div className="stat-sub">all time</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon purple"><User size={18} /></div>
            <div className="stat-label">Active Riders</div>
            <div className="stat-value">{riders.length}</div>
            <div className="stat-sub">approved</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search by name or phone…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Riders table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-center"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><User size={22} /></div>
            <h3>No approved riders found</h3>
            <p>Approved riders appear here with their earnings data</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Available Payout</th>
                  <th>Total Earned</th>
                  <th>This Month</th>
                  <th>Total Withdrawn</th>
                  <th>Commission</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rider => {
                  const rid = rider.uid || rider.id;
                  const s   = summaries[rid];
                  return (
                    <tr key={rid} style={{ cursor: 'pointer' }} onClick={() => setSelected(rider)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, background: 'var(--accent-dim)',
                            border: '1px solid var(--accent-glow)', borderRadius: '50%',
                            display: 'grid', placeItems: 'center',
                            fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)', fontSize: 13,
                            flexShrink: 0,
                          }}>
                            {(rider.firstName || 'R')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-0)' }}>
                              {rider.firstName} {rider.lastName}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                              {rider.phoneNumber || rid.slice(0, 10)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {s ? (
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: s.pendingPayout > 0 ? 'var(--accent)' : 'var(--text-2)' }}>
                            ₹{fmtShort(s.pendingPayout)}
                          </div>
                        ) : <div className="loader" style={{ width: 16, height: 16, margin: 0, borderWidth: 1.5 }} />}
                      </td>

                      <td>
                        {s ? (
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-0)' }}>
                            ₹{fmtShort(s.totalEarnings)}
                          </span>
                        ) : '—'}
                      </td>

                      <td>
                        {s ? (
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>
                            ₹{fmtShort(s.thisMonthEarnings)}
                          </span>
                        ) : '—'}
                      </td>

                      <td>
                        {s ? (
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                            ₹{fmtShort(s.totalWithdrawn)}
                          </span>
                        ) : '—'}
                      </td>

                      <td>
                        <span className="badge neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                          {rider.commissionPercentage ?? 20}%
                        </span>
                      </td>

                      <td>
                        <button className="btn btn-ghost btn-sm">
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rider detail panel */}
      {selected && (
        <RiderEarningsPanel
          rider={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}






