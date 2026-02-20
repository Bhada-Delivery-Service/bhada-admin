import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, RefreshCw, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { offersAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';

const emptyForm = {
  code: '', description: '', discountType: 'PERCENTAGE', discountValue: 10,
  minOrderValue: 0, maxDiscount: '', expiresAt: '', usageLimit: '',
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
    return !q || (o.code || '').toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        discountValue: parseFloat(form.discountValue),
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        ...(form.maxDiscount ? { maxDiscount: parseFloat(form.maxDiscount) } : {}),
        ...(form.usageLimit ? { usageLimit: parseInt(form.usageLimit) } : {}),
      };
      await offersAPI.create(payload);
      toast.success('Offer created!');
      setShowCreate(false);
      setForm(emptyForm);
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
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
          <input className="search-input" placeholder="Search by code or description..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <tr><th>Code</th><th>Description</th><th>Discount</th><th>Min Order</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(offer => (
                  <tr key={offer.id || offer.code}>
                    <td><span className="code">{offer.code}</span></td>
                    <td style={{ maxWidth: 200 }}><span style={{ color: 'var(--text-0)' }}>{offer.description || '—'}</span></td>
                    <td>
                      <span className="badge accent">
                        {offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                      </span>
                    </td>
                    <td>₹{offer.minOrderValue || 0}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td><StatusBadge status={offer.status || 'ACTIVE'} /></td>
                    <td>
                      {offer.status !== 'INACTIVE' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(offer.id)}>
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
              <div className="form-group">
                <label className="form-label">Offer Code *</label>
                <input className="form-input" placeholder="e.g. SAVE20" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="e.g. 20% off on first order" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="two-col" style={{ gap: 12, marginBottom: 18 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Discount Type</label>
                  <select className="form-select" value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Discount Value</label>
                  <input className="form-input" type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Min Order Value (₹)</label>
                  <input className="form-input" type="number" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Max Discount (₹)</label>
                  <input className="form-input" type="number" placeholder="Optional" value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expires At</label>
                  <input className="form-input" type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Usage Limit</label>
                  <input className="form-input" type="number" placeholder="Unlimited" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Offer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
