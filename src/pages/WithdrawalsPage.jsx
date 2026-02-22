import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, RefreshCw, X, CheckCircle2, XCircle, Eye,
  Clock, Upload, ExternalLink, Search, Banknote,
  Smartphone, ArrowRight, Wallet, ChevronDown, ChevronUp,
  AlertCircle, Copy, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { earningsAPI, filesAPI, ridersAPI } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS = ['PENDING', 'PAID', 'APPROVED', 'REJECTED', 'ALL'];

const STATUS_CFG = {
  PENDING:  { label: 'Pending',  color: 'var(--orange)', bg: 'var(--orange-dim)', border: 'rgba(255,154,60,0.25)',  cls: 'orange', icon: Clock        },
  APPROVED: { label: 'Approved', color: 'var(--blue)',   bg: 'var(--blue-dim)',   border: 'rgba(77,159,255,0.25)', cls: 'blue',   icon: CheckCircle2 },
  PAID:     { label: 'Paid',     color: 'var(--green)',  bg: 'var(--green-dim)',  border: 'rgba(54,211,153,0.25)', cls: 'green',  icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(255,77,109,0.25)', cls: 'red',    icon: XCircle      },
};

const METHOD_CFG = {
  PAYTM: { label: 'Paytm',        icon: Smartphone  },
  UPI:   { label: 'UPI',          icon: ArrowRight  },
  BANK:  { label: 'Bank Transfer',icon: Banknote    },
  CASH:  { label: 'Cash',         icon: Wallet      },
};

const fmt     = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) => (n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-2)', padding: '0 4px' }} title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// ─── Pay Modal ────────────────────────────────────────────────────────────────

function PayModal({ withdrawal, onClose, onSuccess }) {
  const [form, setForm] = useState({
    paidAmount: String(withdrawal.requestedAmount || ''),
    transactionReference: '',
    paymentNotes: '',
    paymentScreenshotUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [riderProfile, setRiderProfile] = useState(null);

  // Fetch full rider profile to get saved bank account details
  useEffect(() => {
    if (!withdrawal.riderId) return;
    ridersAPI.getById(withdrawal.riderId)
      .then(({ data }) => setRiderProfile(data?.data || data))
      .catch(() => {});
  }, [withdrawal.riderId]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await filesAPI.upload(file);
      const url = data?.data?.url || data?.url || '';
      upd('paymentScreenshotUrl', url);
      toast.success('Screenshot uploaded');
    } catch {
      toast.error('Upload failed — paste a URL manually');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.transactionReference.trim()) { toast.error('Enter transaction reference'); return; }
    if (+form.paidAmount < 1) { toast.error('Enter a valid paid amount'); return; }
    if (!form.paymentScreenshotUrl.trim()) { toast.error('Payment screenshot URL is required'); return; }
    setSubmitting(true);
    try {
      await earningsAPI.processWithdrawal(withdrawal.id, {
        paidAmount: +form.paidAmount,
        transactionReference: form.transactionReference.trim(),
        paymentNotes: form.paymentNotes.trim() || undefined,
        paymentScreenshotUrl: form.paymentScreenshotUrl.trim() || undefined,
      });
      toast.success(`₹${fmtShort(form.paidAmount)} marked as paid ✓`);
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  const m = METHOD_CFG[withdrawal.paymentMethod] || METHOD_CFG.UPI;
  const MIcon = m.icon;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Mark as Paid</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              Confirm you've sent the payment to the rider
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Rider + amount summary */}
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Rider
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-0)' }}>
                {withdrawal.riderName || withdrawal.riderId?.slice(0, 12)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                {withdrawal.riderPhone || ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                ₹{fmtShort(withdrawal.requestedAmount)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                <MIcon size={12} /> {m.label}
              </div>
            </div>
          </div>

          {/* Account details */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Pay to (from withdrawal request)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-0)', fontWeight: 600 }}>
                {withdrawal.accountDetails}
              </span>
              <CopyBtn text={withdrawal.accountDetails} />
            </div>
          </div>

          {/* Saved bank account from rider profile */}
          {riderProfile && (riderProfile.bankAccountNumber || riderProfile.upiId) && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Saved payout account (from rider profile)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {riderProfile.upiId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)', borderRadius: 6, padding: '6px 10px' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPI ID</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                      {riderProfile.upiId} <CopyBtn text={riderProfile.upiId} />
                    </span>
                  </div>
                )}
                {riderProfile.bankAccountNumber && (
                  <>
                    {riderProfile.bankAccountHolderName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)', borderRadius: 6, padding: '6px 10px' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{riderProfile.bankAccountHolderName}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>A/C No.</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>
                        {riderProfile.bankAccountNumber} <CopyBtn text={riderProfile.bankAccountNumber} />
                      </span>
                    </div>
                    {riderProfile.bankIfscCode && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)', borderRadius: 6, padding: '6px 10px' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IFSC</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>
                          {riderProfile.bankIfscCode} <CopyBtn text={riderProfile.bankIfscCode} />
                        </span>
                      </div>
                    )}
                    {riderProfile.bankName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)', borderRadius: 6, padding: '6px 10px' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{riderProfile.bankName}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form fields */}
        <div className="form-group">
          <label className="form-label">Actual Amount Paid (₹)</label>
          <input className="form-input" type="number" min="1"
            value={form.paidAmount}
            onChange={e => upd('paidAmount', e.target.value)}
            placeholder="Amount you actually sent"
          />
          {+form.paidAmount !== withdrawal.requestedAmount && +form.paidAmount > 0 && (
            <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 5, display: 'flex', gap: 4 }}>
              <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
              Differs from requested ₹{fmtShort(withdrawal.requestedAmount)} — double-check before confirming
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Transaction Reference *</label>
          <input className="form-input"
            placeholder="e.g. 412345678901 / UPI ref / cheque no."
            value={form.transactionReference}
            onChange={e => upd('transactionReference', e.target.value)}
          />
        </div>

        {/* Screenshot upload */}
        <div className="form-group">
          <label className="form-label">Payment Screenshot *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '8px 14px',
              cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13,
              color: 'var(--text-1)', opacity: uploading ? 0.6 : 1,
              transition: 'all 0.15s',
            }}>
              <Upload size={13} />
              {uploading ? 'Uploading…' : 'Upload file'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
          <input className="form-input"
            placeholder="Or paste image URL directly"
            value={form.paymentScreenshotUrl}
            onChange={e => upd('paymentScreenshotUrl', e.target.value)}
          />
          {form.paymentScreenshotUrl && (
            <div style={{ marginTop: 8 }}>
              <a href={form.paymentScreenshotUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Eye size={11} /> Preview screenshot
              </a>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-textarea" style={{ minHeight: 60 }}
            placeholder="Any additional payment notes…"
            value={form.paymentNotes}
            onChange={e => upd('paymentNotes', e.target.value)}
          />
        </div>

        {/* Info note */}
        <div style={{
          background: 'var(--green-dim)', border: '1px solid rgba(54,211,153,0.2)',
          borderRadius: 8, padding: '10px 14px', fontSize: 12,
          color: 'var(--text-1)', marginBottom: 20,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <CheckCircle2 size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
          Rider will be notified and the withdrawal will be marked PAID. Their ledger will be updated automatically.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitting}>
            <CheckCircle2 size={15} />
            {submitting ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({ withdrawal, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const PRESETS = [
    'Incorrect account details',
    'Duplicate request',
    'Insufficient verification',
    'Account under review',
  ];

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('Enter a rejection reason'); return; }
    setSubmitting(true);
    try {
      await earningsAPI.rejectWithdrawal(withdrawal.id, reason.trim());
      toast.success('Withdrawal request rejected — balance refunded to rider');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ color: 'var(--red)' }}>Reject Withdrawal</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              ₹{fmtShort(withdrawal.requestedAmount)} · {withdrawal.riderName || withdrawal.riderId?.slice(0, 12)}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Preset reasons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Quick reasons
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => setReason(p)}
                style={{
                  background: reason === p ? 'var(--red-dim)' : 'var(--bg-3)',
                  border: `1px solid ${reason === p ? 'rgba(255,77,109,0.3)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '5px 10px', fontSize: 12,
                  color: reason === p ? 'var(--red)' : 'var(--text-1)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >{p}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Rejection Reason *</label>
          <textarea className="form-textarea" style={{ minHeight: 80 }}
            placeholder="Explain why this request is being rejected…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <div style={{
          background: 'var(--orange-dim)', border: '1px solid rgba(255,154,60,0.2)',
          borderRadius: 8, padding: '10px 14px', fontSize: 12,
          color: 'var(--text-1)', marginBottom: 20,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertCircle size={13} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
          The rider's held balance of ₹{fmtShort(withdrawal.requestedAmount)} will be fully refunded to their payout wallet.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
            <XCircle size={15} />
            {submitting ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Withdrawal row (expandable) ──────────────────────────────────────────────

function WithdrawalRow({ wd, onPay, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const cfg  = STATUS_CFG[wd.status] || STATUS_CFG.PENDING;
  const mCfg = METHOD_CFG[wd.paymentMethod] || METHOD_CFG.UPI;
  const SIcon = cfg.icon;
  const MIcon = mCfg.icon;

  return (
    <>
      <tr
        style={{ cursor: 'pointer', background: expanded ? 'var(--bg-2)' : undefined }}
        onClick={() => setExpanded(e => !e)}
      >
        <td>
          <div style={{ fontWeight: 600, color: 'var(--text-0)' }}>
            {wd.riderName || <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{wd.riderId?.slice(0, 10)}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {wd.riderPhone || ''}
          </div>
        </td>

        <td>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: cfg.color }}>
            ₹{fmtShort(wd.requestedAmount)}
          </div>
        </td>

        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MIcon size={13} style={{ color: 'var(--text-2)' }} />
            <span>{mCfg.label}</span>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', marginTop: 2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {wd.accountDetails}
          </div>
        </td>

        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmtDate(wd.createdAt)}</td>

        <td>
          <span className={`badge ${cfg.cls}`}>
            <SIcon size={10} />
            {cfg.label}
          </span>
        </td>

        <td onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {wd.status === 'PENDING' && (
              <>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(54,211,153,0.2)' }}
                  onClick={() => onPay(wd)}
                >
                  <CheckCircle2 size={12} /> Pay
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => onReject(wd)}>
                  <XCircle size={12} /> Reject
                </button>
              </>
            )}
            {wd.paymentScreenshotUrl && (
              <a href={wd.paymentScreenshotUrl} target="_blank" rel="noreferrer"
                className="btn btn-ghost btn-sm" title="View screenshot">
                <Eye size={13} />
              </a>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr style={{ background: 'var(--bg-2)' }}>
          <td colSpan={6} style={{ paddingTop: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, padding: '12px 0 16px' }}>
              {[
                ['Request ID',        wd.id?.slice(0, 16) + '…'],
                ['Account Details',   wd.accountDetails],
                wd.paidAmount          && ['Paid Amount',        `₹${fmt(wd.paidAmount)}`],
                wd.paidAt              && ['Paid At',            fmtDate(wd.paidAt)],
                wd.transactionReference && ['Transaction Ref',   wd.transactionReference],
                wd.paymentNotes        && ['Notes',              wd.paymentNotes],
                wd.rejectionReason     && ['Rejection Reason',   wd.rejectionReason],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {k}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 500, wordBreak: 'break-word' }}>
                    {v}
                    {k === 'Account Details' && <CopyBtn text={v} />}
                  </div>
                </div>
              ))}
            </div>
            {wd.paymentScreenshotUrl && (
              <div style={{ paddingBottom: 16 }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Payment Screenshot
                </div>
                <a href={wd.paymentScreenshotUrl} target="_blank" rel="noreferrer">
                  <img
                    src={wd.paymentScreenshotUrl}
                    alt="Payment screenshot"
                    style={{ height: 120, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', cursor: 'pointer' }}
                  />
                </a>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('PENDING');
  const [search, setSearch]           = useState('');
  const [payModal, setPayModal]       = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await earningsAPI.getAllWithdrawals(filter);
      setWithdrawals(data?.data || []);
    } catch {
      toast.error('Failed to load withdrawals');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = withdrawals.filter(wd => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = `${wd.rider?.firstName || ''} ${wd.rider?.lastName || ''}`.toLowerCase();
    return name.includes(q) || (wd.rider?.phoneNumber || '').includes(q) || (wd.accountDetails || '').toLowerCase().includes(q);
  });

  // Summary stats for PENDING
  const pending     = withdrawals.filter(w => w.status === 'PENDING');
  const pendingAmt  = pending.reduce((s, w) => s + (w.requestedAmount || 0), 0);
  const paidToday   = withdrawals
    .filter(w => w.status === 'PAID' && w.paidAt && new Date(w.paidAt).toDateString() === new Date().toDateString())
    .reduce((s, w) => s + (w.paidAmount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Rider Withdrawals</h1>
          <p>Review, process, and track all payout requests</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card orange">
          <div className="stat-icon orange"><Clock size={18} /></div>
          <div className="stat-label">Pending Requests</div>
          <div className="stat-value">{pending.length}</div>
          <div className="stat-sub">₹{fmtShort(pendingAmt)} to be paid</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><CheckCircle2 size={18} /></div>
          <div className="stat-label">Paid Today</div>
          <div className="stat-value">₹{fmtShort(paidToday)}</div>
          <div className="stat-sub">across all riders</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue"><IndianRupee size={18} /></div>
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{withdrawals.length}</div>
          <div className="stat-sub">in selected view</div>
        </div>
      </div>

      {/* ── Filters + search ── */}
      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search by name, phone, account…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--accent)' : 'var(--bg-3)',
                color: filter === f ? 'var(--bg-0)' : 'var(--text-1)',
                border: filter === f ? 'none' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '7px 14px',
                fontSize: 12, fontWeight: filter === f ? 700 : 500,
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em', transition: 'all 0.15s',
              }}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-center"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IndianRupee size={22} /></div>
            <h3>No {filter.toLowerCase()} withdrawal requests</h3>
            <p>{filter === 'PENDING' ? 'All caught up! No pending payouts.' : 'Try a different filter.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(wd => (
                  <WithdrawalRow
                    key={wd.id}
                    wd={wd}
                    onPay={setPayModal}
                    onReject={setRejectModal}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {payModal && (
        <PayModal
          withdrawal={payModal}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); load(); }}
        />
      )}
      {rejectModal && (
        <RejectModal
          withdrawal={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={() => { setRejectModal(null); load(); }}
        />
      )}
    </div>
  );
}