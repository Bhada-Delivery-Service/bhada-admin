import React, { useState, useEffect } from 'react';
import { Bike, Search, RefreshCw, X, CheckCircle, XCircle, Eye, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { ridersAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';

export default function RidersPage() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [rating, setRating] = useState(5);

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const { data } = await ridersAPI.getAll();
      setRiders(data?.data || []);
    } catch {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRiders(); }, []);

  const filtered = riders.filter(r => {
    const q = search.toLowerCase();
    const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase();
    const phone = (r.phoneNumber || '').toLowerCase();
    return !q || name.includes(q) || phone.includes(q) || (r.uid || '').toLowerCase().includes(q);
  });

  const handleApproveKyc = async (id) => {
    try {
      await ridersAPI.approveKyc(id);
      toast.success('KYC approved');
      fetchRiders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleRejectKyc = async (id) => {
    try {
      await ridersAPI.rejectKyc(id);
      toast.success('KYC rejected');
      fetchRiders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleApproveOnboarding = async (id) => {
    try {
      await ridersAPI.approveOnboarding(id);
      toast.success('Onboarding approved');
      fetchRiders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleRejectOnboarding = async (id) => {
    try {
      await ridersAPI.rejectOnboarding(id);
      toast.success('Onboarding rejected');
      fetchRiders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleRate = async () => {
    if (!rateModal) return;
    try {
      await ridersAPI.rate(rateModal, rating);
      toast.success('Rating submitted');
      setRateModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Riders</h1>
          <p>Manage rider onboarding, KYC, and status</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRiders}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input
            className="search-input"
            placeholder="Search by name, phone, UID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bike size={22} /></div>
            <h3>No riders found</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Vehicle</th>
                  <th>KYC</th>
                  <th>Onboarding</th>
                  <th>Status</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rider => (
                  <tr key={rider.uid || rider.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-0)' }}>
                        {rider.firstName || rider.lastName ? `${rider.firstName || ''} ${rider.lastName || ''}`.trim() : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                        {rider.phoneNumber || rider.email || (rider.uid || '').slice(0, 10)}
                      </div>
                    </td>
                    <td>
                      {rider.vehicle ? (
                        <div>
                          <div style={{ fontSize: 13 }}>{rider.vehicle.vehicleType || '—'}</div>
                          <span className="code" style={{ fontSize: 11 }}>{rider.vehicle.vehicleNumber || '—'}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-2)' }}>—</span>}
                    </td>
                    <td>
                      <StatusBadge status={rider.kycStatus || 'PENDING'} />
                    </td>
                    <td>
                      <StatusBadge status={rider.onboardingStatus || 'PENDING'} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className={`status-dot ${rider.isOnline ? 'green' : 'neutral'}`} />
                        <span style={{ fontSize: 12 }}>{rider.isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </td>
                    <td>
                      {rider.rating != null ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={12} style={{ color: 'var(--accent)' }} />
                          {(rider.rating || 0).toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(rider)}><Eye size={13} /></button>
                        {rider.kycStatus === 'PENDING' && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', fontSize: 11 }} onClick={() => handleApproveKyc(rider.uid || rider.id)}>
                              <CheckCircle size={12} /> KYC ✓
                            </button>
                            <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => handleRejectKyc(rider.uid || rider.id)}>
                              <XCircle size={12} /> KYC ✗
                            </button>
                          </>
                        )}
                        {rider.onboardingStatus === 'PENDING' && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', fontSize: 11 }} onClick={() => handleApproveOnboarding(rider.uid || rider.id)}>
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => handleRejectOnboarding(rider.uid || rider.id)}>
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setRateModal(rider.uid || rider.id)} title="Rate">
                          <Star size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Rider Details</div>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={15} /></button>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><label>Name</label><p>{`${selected.firstName || ''} ${selected.lastName || ''}`.trim() || '—'}</p></div>
              <div className="detail-item"><label>Phone</label><p>{selected.phoneNumber || '—'}</p></div>
              <div className="detail-item"><label>Email</label><p>{selected.email || '—'}</p></div>
              <div className="detail-item"><label>UID</label><p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{selected.uid || '—'}</p></div>
              <div className="detail-item"><label>KYC Status</label><p><StatusBadge status={selected.kycStatus || 'PENDING'} /></p></div>
              <div className="detail-item"><label>Onboarding</label><p><StatusBadge status={selected.onboardingStatus || 'PENDING'} /></p></div>
              <div className="detail-item"><label>Vehicle Type</label><p>{selected.vehicle?.vehicleType || '—'}</p></div>
              <div className="detail-item"><label>Vehicle No.</label><p><span className="code">{selected.vehicle?.vehicleNumber || '—'}</span></p></div>
              <div className="detail-item"><label>Rating</label><p>{selected.rating != null ? `⭐ ${(selected.rating).toFixed(1)}` : '—'}</p></div>
              <div className="detail-item"><label>Online</label><p>{selected.isOnline ? '🟢 Online' : '⚫ Offline'}</p></div>
              {selected.kyc && (
                <>
                  <div className="detail-item"><label>ID Proof Type</label><p>{selected.kyc.idProofType || '—'}</p></div>
                  <div className="detail-item"><label>ID Proof No.</label><p><span className="code">{selected.kyc.idProofNumber || '—'}</span></p></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <div className="modal-overlay" onClick={() => setRateModal(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Rate Rider</div>
              <button className="modal-close" onClick={() => setRateModal(null)}><X size={15} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Rating (0.0 – 5.0)</label>
              <input
                type="number"
                className="form-input"
                min="0" max="5" step="0.1"
                value={rating}
                onChange={e => setRating(parseFloat(e.target.value))}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRateModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRate}>Submit Rating</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
