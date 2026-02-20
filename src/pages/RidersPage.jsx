import React, { useState, useEffect, useCallback } from 'react';
import { Bike, Search, RefreshCw, X, CheckCircle, XCircle, Eye, Star, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { ridersAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';
import { getSocket } from '../services/socketService';

/* ── tiny KYC doc viewer ────────────────────────────────────────────────── */
function DocImage({ url, label }) {
  const [open, setOpen] = useState(false);
  if (!url) return <span style={{ color: 'var(--text-2)' }}>—</span>;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'var(--blue-dim)', color: 'var(--blue)',
          border: 'none', borderRadius: 6, padding: '3px 9px',
          fontSize: 11, cursor: 'pointer',
        }}
      >
        <Eye size={11} /> {label}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.88)', display: 'grid', placeItems: 'center' }}
        >
          <img
            src={url} alt={label}
            style={{ maxWidth: '88vw', maxHeight: '82vh', borderRadius: 10, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ position: 'absolute', top: 18, right: 18, display: 'flex', gap: 8 }}>
            <a href={url} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg-2)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '6px 12px', color: 'var(--text-0)', fontSize: 12, textDecoration: 'none' }}>
              <ExternalLink size={12} /> Open
            </a>
            <button
              onClick={() => setOpen(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg-2)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '6px 12px', color: 'var(--text-0)', fontSize: 12, cursor: 'pointer' }}>
              <X size={12} /> Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── live indicator ─────────────────────────────────────────────────────── */
function LiveDot() {
  return (
    <span title="Live updates active" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: 'var(--green)',
        boxShadow: '0 0 6px var(--green)', display: 'inline-block',
        animation: 'pulse 2s ease-in-out infinite',
      }} />
      LIVE
    </span>
  );
}

export default function RidersPage() {
  const [riders,    setRiders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [rating,    setRating]    = useState(5);

  /* ── Fetch all riders ──────────────────────────────────────────────────── */
  const fetchRiders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await ridersAPI.getAll();
      setRiders(data?.data || []);
    } catch {
      toast.error('Failed to load riders');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  /* ── Real-time: re-fetch when a rider submits KYC or onboarding ────────── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNotification = ({ type }) => {
      const triggers = [
        'KYC_SUBMITTED',
        'ONBOARDING_SUBMITTED',
        'KYC_APPROVED',   // in case another admin acts
        'KYC_REJECTED',
        'ONBOARDING_APPROVED',
        'ONBOARDING_REJECTED',
      ];
      if (triggers.includes(type)) {
        fetchRiders(true); // silent refresh — no loading spinner
      }
    };

    socket.on('notification:new', onNotification);
    return () => socket.off('notification:new', onNotification);
  }, [fetchRiders]);

  /* ── Also update the detail modal in real-time if a rider is open ───────── */
  useEffect(() => {
    if (!selected) return;
    const socket = getSocket();
    if (!socket) return;

    const onNotification = ({ type }) => {
      if (['KYC_SUBMITTED', 'ONBOARDING_SUBMITTED'].includes(type)) {
        // refresh the selected rider's data
        ridersAPI.getById(selected.uid || selected.id)
          .then(({ data }) => {
            const rd = data?.data || data;
            setSelected(rd);
            setRiders(prev => prev.map(r => (r.uid || r.id) === (rd.uid || rd.id) ? rd : r));
          })
          .catch(() => {});
      }
    };

    socket.on('notification:new', onNotification);
    return () => socket.off('notification:new', onNotification);
  }, [selected]);

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const act = async (fn, successMsg) => {
    try {
      await fn();
      toast.success(successMsg);
      fetchRiders(true);
      // update detail modal if open
      if (selected) {
        ridersAPI.getById(selected.uid || selected.id)
          .then(({ data }) => setSelected(data?.data || data))
          .catch(() => {});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleApproveKyc        = (id) => act(() => ridersAPI.approveKyc(id),        'KYC approved ✓');
  const handleRejectKyc         = (id) => act(() => ridersAPI.rejectKyc(id),         'KYC rejected');
  const handleApproveOnboarding = (id) => act(() => ridersAPI.approveOnboarding(id), 'Onboarding approved ✓');
  const handleRejectOnboarding  = (id) => act(() => ridersAPI.rejectOnboarding(id),  'Onboarding rejected');

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

  /* ── Filter ────────────────────────────────────────────────────────────── */
  const filtered = riders.filter(r => {
    const q    = search.toLowerCase();
    const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase();
    return !q || name.includes(q) || (r.phoneNumber || '').includes(q) || (r.uid || '').toLowerCase().includes(q);
  });

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Riders <LiveDot />
          </h1>
          <p>Manage rider onboarding, KYC, and status — updates in real time</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => fetchRiders()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search by name, phone, UID…"
            value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th>KYC Doc</th>
                  <th>Onboarding</th>
                  <th>Online</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rider => {
                  const rid = rider.uid || rider.id;
                  return (
                    <tr key={rid}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-0)' }}>
                          {`${rider.firstName || ''} ${rider.lastName || ''}`.trim() || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                          {rider.phoneNumber || rider.email || rid.slice(0, 10)}
                        </div>
                      </td>

                      <td>
                        {rider.vehicle ? (
                          <div>
                            <div style={{ fontSize: 13 }}>{rider.vehicle.vehicleType}</div>
                            <span className="code" style={{ fontSize: 11 }}>{rider.vehicle.vehicleNumber}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-2)' }}>—</span>}
                      </td>

                      <td><StatusBadge status={rider.kycStatus || 'NOT_SUBMITTED'} /></td>

                      {/* ── KYC doc thumbnail ── */}
                      <td>
                        {rider.kyc?.documentUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <DocImage url={rider.kyc.documentUrl} label="Front" />
                            {rider.kyc.documentUrlBack && (
                              <DocImage url={rider.kyc.documentUrlBack} label="Back" />
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-2)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      <td><StatusBadge status={rider.onboardingStatus || 'NOT_SUBMITTED'} /></td>

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
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(rider)}>
                            <Eye size={13} />
                          </button>

                          {rider.kycStatus === 'PENDING' && (
                            <>
                              <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', fontSize: 11 }}
                                onClick={() => handleApproveKyc(rid)}>
                                <CheckCircle size={12} /> KYC ✓
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleRejectKyc(rid)}>
                                <XCircle size={12} /> KYC ✗
                              </button>
                            </>
                          )}

                          {rider.onboardingStatus === 'PENDING' && (
                            <>
                              <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', fontSize: 11 }}
                                onClick={() => handleApproveOnboarding(rid)}>
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleRejectOnboarding(rid)}>
                                <XCircle size={12} /> Reject
                              </button>
                            </>
                          )}

                          <button className="btn btn-ghost btn-sm" onClick={() => setRateModal(rid)} title="Rate">
                            <Star size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {`${selected.firstName || ''} ${selected.lastName || ''}`.trim() || 'Rider Details'}
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={15} /></button>
            </div>

            <div className="detail-grid">
              <div className="detail-item"><label>Name</label><p>{`${selected.firstName || ''} ${selected.lastName || ''}`.trim() || '—'}</p></div>
              <div className="detail-item"><label>Phone</label><p>{selected.phoneNumber || '—'}</p></div>
              <div className="detail-item"><label>Email</label><p>{selected.email || '—'}</p></div>
              <div className="detail-item"><label>UID</label><p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{selected.uid || '—'}</p></div>
              <div className="detail-item"><label>KYC Status</label><p><StatusBadge status={selected.kycStatus || 'NOT_SUBMITTED'} /></p></div>
              <div className="detail-item"><label>Onboarding</label><p><StatusBadge status={selected.onboardingStatus || 'NOT_SUBMITTED'} /></p></div>
              <div className="detail-item"><label>Vehicle Type</label><p>{selected.vehicle?.vehicleType || '—'}</p></div>
              <div className="detail-item"><label>Vehicle No.</label><p><span className="code">{selected.vehicle?.vehicleNumber || '—'}</span></p></div>
              <div className="detail-item"><label>Rating</label><p>{selected.rating != null ? `⭐ ${selected.rating.toFixed(1)}` : '—'}</p></div>
              <div className="detail-item"><label>Online</label><p>{selected.isOnline ? '🟢 Online' : '⚫ Offline'}</p></div>

              {selected.kyc && (
                <>
                  <div className="detail-item"><label>ID Type</label><p>{selected.kyc.idProofType || '—'}</p></div>
                  <div className="detail-item"><label>ID Number</label><p><span className="code">{selected.kyc.idProofNumber || '—'}</span></p></div>
                </>
              )}
            </div>

            {/* KYC doc images */}
            {(selected.kyc?.documentUrl || selected.kyc?.documentUrlBack) && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={12} /> KYC Documents
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {selected.kyc?.documentUrl && (
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Front</div>
                      <img
                        src={selected.kyc.documentUrl} alt="KYC Front"
                        style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 180, cursor: 'pointer', border: '1px solid var(--border)' }}
                        onClick={() => window.open(selected.kyc.documentUrl, '_blank')}
                      />
                    </div>
                  )}
                  {selected.kyc?.documentUrlBack && (
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Back</div>
                      <img
                        src={selected.kyc.documentUrlBack} alt="KYC Back"
                        style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 180, cursor: 'pointer', border: '1px solid var(--border)' }}
                        onClick={() => window.open(selected.kyc.documentUrlBack, '_blank')}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick-action buttons inside modal */}
            {(selected.kycStatus === 'PENDING' || selected.onboardingStatus === 'PENDING') && (
              <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {selected.kycStatus === 'PENDING' && (
                  <>
                    <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}
                      onClick={() => handleApproveKyc(selected.uid || selected.id)}>
                      <CheckCircle size={13} /> Approve KYC
                    </button>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => handleRejectKyc(selected.uid || selected.id)}>
                      <XCircle size={13} /> Reject KYC
                    </button>
                  </>
                )}
                {selected.onboardingStatus === 'PENDING' && (
                  <>
                    <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}
                      onClick={() => handleApproveOnboarding(selected.uid || selected.id)}>
                      <CheckCircle size={13} /> Approve Onboarding
                    </button>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => handleRejectOnboarding(selected.uid || selected.id)}>
                      <XCircle size={13} /> Reject Onboarding
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Rate Modal ─────────────────────────────────────────────────────── */}
      {rateModal && (
        <div className="modal-overlay" onClick={() => setRateModal(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Rate Rider</div>
              <button className="modal-close" onClick={() => setRateModal(null)}><X size={15} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Rating (0.0 – 5.0)</label>
              <input type="number" className="form-input" min="0" max="5" step="0.1"
                value={rating} onChange={e => setRating(parseFloat(e.target.value))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRateModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRate}>Submit Rating</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}