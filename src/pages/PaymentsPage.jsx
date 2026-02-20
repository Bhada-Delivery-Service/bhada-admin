import React, { useState } from 'react';
import { CreditCard, Search, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';

export default function PaymentsPage() {
  const [paymentId, setPaymentId] = useState('');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!paymentId) return;
    setLoading(true);
    setPayment(null);
    try {
      const { data } = await paymentsAPI.getStatus(paymentId);
      setPayment(data?.data || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment not found');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!payment || !refundAmount) return;
    setRefunding(true);
    try {
      await paymentsAPI.refund(paymentId, parseFloat(refundAmount));
      toast.success('Refund initiated successfully');
      setRefundModal(false);
      setRefundAmount('');
      // Re-fetch
      const { data } = await paymentsAPI.getStatus(paymentId);
      setPayment(data?.data || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund failed');
    } finally {
      setRefunding(false);
    }
  };

  const statusColorMap = {
    SUCCESS: 'green', FAILED: 'red', PENDING: 'orange', REFUNDED: 'purple', PARTIAL_REFUND: 'purple',
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Payments</h1>
          <p>Look up payment status and process refunds</p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-0)', marginBottom: 16 }}>
          Payment Lookup
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 240, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            placeholder="Enter Payment ID (e.g. pay_xxx)"
            value={paymentId}
            onChange={e => setPaymentId(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !paymentId}>
            <Search size={14} />
            {loading ? 'Looking up...' : 'Look Up'}
          </button>
        </form>
      </div>

      {/* Result */}
      {payment && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-0)' }}>
                Payment Details
              </div>
              <span className="code" style={{ fontSize: 12 }}>{payment.paymentId || paymentId}</span>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          <div className="detail-grid">
            <div className="detail-item"><label>Amount</label><p style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)' }}>₹{payment.amount || '—'}</p></div>
            <div className="detail-item"><label>Status</label><p><StatusBadge status={payment.status} /></p></div>
            <div className="detail-item"><label>Order ID</label><p><span className="code" style={{ fontSize: 11 }}>{payment.orderId || '—'}</span></p></div>
            <div className="detail-item"><label>Gateway ID</label><p><span className="code" style={{ fontSize: 11 }}>{payment.gatewayPaymentId || '—'}</span></p></div>
            <div className="detail-item"><label>Created</label><p>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '—'}</p></div>
            <div className="detail-item"><label>Updated</label><p>{payment.updatedAt ? new Date(payment.updatedAt).toLocaleString() : '—'}</p></div>
          </div>

          {payment.refunds?.length > 0 && (
            <>
              <hr className="divider" />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 10 }}>Refunds</div>
              {payment.refunds.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Refund #{i + 1}</span>
                  <span style={{ color: 'var(--purple)' }}>₹{r.amount}</span>
                </div>
              ))}
            </>
          )}

          {['SUCCESS'].includes(payment.status) && (
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-sm" style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid rgba(168,85,247,0.2)' }}
                onClick={() => { setRefundModal(true); setRefundAmount(''); }}>
                ↩ Issue Refund
              </button>
            </div>
          )}
        </div>
      )}

      {!payment && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon"><CreditCard size={22} /></div>
          <h3>No payment loaded</h3>
          <p>Enter a payment ID above to look up details</p>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div className="modal-overlay" onClick={() => setRefundModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Issue Refund</div>
              <button className="modal-close" onClick={() => setRefundModal(false)}><X size={15} /></button>
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>
              Original amount: <strong style={{ color: 'var(--text-0)' }}>₹{payment?.amount}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Refund Amount (₹)</label>
              <input className="form-input" type="number" step="0.01" max={payment?.amount}
                value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRefundModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRefund} disabled={refunding || !refundAmount}>
                {refunding ? 'Processing...' : 'Issue Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
