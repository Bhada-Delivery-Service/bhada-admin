import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, RefreshCw, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { offersAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';

// Field names match backend exactly:
// offerCode, offerName, description, offerType, discountValue,
// maxDiscountAmount, minOrderAmount, validFrom, validUntil, usageLimit
const emptyForm = {
  offerCode: '',
  offerName: '',
  description: '',
  offerType: 'PERCENTAGE',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  validFrom: '',
  validUntil: '',
  usageLimit: '',
};

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data } = await offersAPI.getAll();
      setOffers(data?.data || []);
    } catch {
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const filtered = offers.filter(o => {
    const q = search.toLowerCase();
    return !q ||
      (o.offerCode || o.code || '').toLowerCase().includes(q) ||
      (o.offerName || o.description || '').toLowerCase().includes(q);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.validFrom || !form.validUntil) {
      toast.error('Valid From and Valid Until dates are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        offerCode: form.offerCode.trim(),
        offerName: form.offerName.trim(),
        description: form.description.trim(),
        offerType: form.offerType,
        discountValue: parseFloat(form.discountValue),
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : 0,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : 0,
      };
      await offersAPI.create(payload);
      toast.success('Offer created!');
      setShowCreate(false);
      setForm(emptyForm);
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this offer?')) return;
    try {
      await offersAPI.deactivate(id);
      toast.success('Offer deactivated');
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Offers</h1>
          <p>Create and manage discount offers</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchOffers}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Offer</button>
        </div>
      </div>

      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Tag size={22} /></div>
            <h3>No offers yet</h3>
            <p>Create your first offer code</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Type</th><th>Discount</th><th>Min Order</th><th>Valid Until</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(offer => (
                  <tr key={offer.id || offer.offerId || offer.offerCode}>
                    <td><span className="code">{offer.offerCode || offer.code}</span></td>
                    <td style={{ color: 'var(--text-0)' }}>{offer.offerName || '—'}</td>
                    <td><span className="badge neutral">{offer.offerType || offer.discountType}</span></td>
                    <td>
                      <span className="badge accent">
                        {(offer.offerType || offer.discountType) === 'PERCENTAGE'
                          ? `${offer.discountValue}%`
                          : `₹${offer.discountValue}`}
                      </span>
                    </td>
                    <td>₹{offer.minOrderAmount || offer.minOrderValue || 0}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {offer.validUntil || offer.expiresAt
                        ? new Date(offer.validUntil || offer.expiresAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      {offer.isActive !== false && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(offer.id || offer.offerId)}>
                          <Trash2 size={12} /> Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Offer</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="two-col" style={{ gap: 12, marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">Offer Code *</label>
                  <input className="form-input" placeholder="e.g. SAVE20" value={form.offerCode}
                    onChange={e => setForm(f => ({ ...f, offerCode: e.target.value.toUpperCase() }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Offer Name *</label>
                  <input className="form-input" placeholder="e.g. Save 20%" value={form.offerName}
                    onChange={e => setForm(f => ({ ...f, offerName: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="e.g. 20% off on first order" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="two-col" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Offer Type *</label>
                  <select className="form-select" value={form.offerType} onChange={e => setForm(f => ({ ...f, offerType: e.target.value }))}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat Amount</option>
                    <option value="CASHBACK">Cashback</option>
                    <option value="FREE_DELIVERY">Free Delivery</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Value *</label>
                  <input className="form-input" type="number" min="0" step="0.01" placeholder="e.g. 20"
                    value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Order Amount (₹)</label>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Discount Amount (₹)</label>
                  <input className="form-input" type="number" min="0" placeholder="0 = unlimited"
                    value={form.maxDiscountAmount} onChange={e => setForm(f => ({ ...f, maxDiscountAmount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Valid From *</label>
                  <input className="form-input" type="datetime-local" value={form.validFrom}
                    onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Valid Until *</label>
                  <input className="form-input" type="datetime-local" value={form.validUntil}
                    onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Usage Limit</label>
                  <input className="form-input" type="number" min="0" placeholder="0 = unlimited"
                    value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
