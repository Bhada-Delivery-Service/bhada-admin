import React, { useState, useEffect } from 'react';
import { BadgePercent, Plus, RefreshCw, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { pricingAPI } from '../services/api';

const emptyConfig = {
  version: '',
  baseFare: 30,
  baseDistance: 2,
  perKmRate: 8,
  commissionPercent: 15,
  surgeEnabled: false,
  categories: { small: { multiplier: 1.0 }, medium: { multiplier: 1.3 }, large: { multiplier: 1.6 } },
};

export default function PricingPage() {
  const [active, setActive] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyConfig);
  const [submitting, setSubmitting] = useState(false);
  const [estimateForm, setEstimateForm] = useState({ pickupLat: '', pickupLng: '', dropLat: '', dropLng: '' });
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, all] = await Promise.allSettled([pricingAPI.getActive(), pricingAPI.getAll()]);
      if (a.status === 'fulfilled') setActive(a.value.data?.data || a.value.data);
      if (all.status === 'fulfilled') setConfigs(all.value.data?.data || []);
    } catch {
      toast.error('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pricingAPI.create(form);
      toast.success('Pricing config created');
      setShowCreate(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEstimate = async (e) => {
    e.preventDefault();
    setEstimating(true);
    try {
      const { data } = await pricingAPI.estimate(estimateForm);
      setEstimate(data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Estimation failed');
    } finally {
      setEstimating(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="loader" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pricing</h1>
          <p>Configure fare structures and pricing rules</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Config</button>
        </div>
      </div>

      {/* Active config */}
      {active && (
        <div className="card mb-24" style={{ marginBottom: 24, borderColor: 'var(--accent)', borderWidth: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div className="stat-icon accent" style={{ width: 32, height: 32 }}><Zap size={15} /></div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-0)' }}>Active Pricing Config</div>
              <span className="code" style={{ fontSize: 11 }}>{active.version || 'v1'}</span>
            </div>
            <span className="badge accent" style={{ marginLeft: 'auto' }}>ACTIVE</span>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><label>Base Fare</label><p>₹{active.baseFare}</p></div>
            <div className="detail-item"><label>Base Distance</label><p>{active.baseDistance} km</p></div>
            <div className="detail-item"><label>Per KM Rate</label><p>₹{active.perKmRate}</p></div>
            <div className="detail-item"><label>Commission</label><p>{active.commissionPercent}%</p></div>
            <div className="detail-item"><label>Surge</label><p>{active.surgeEnabled ? '🟢 Enabled' : '⚫ Disabled'}</p></div>
          </div>
          {active.categories && (
            <>
              <hr className="divider" />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 10 }}>Category Multipliers</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {Object.entries(active.categories).map(([cat, val]) => (
                  <div key={cat} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{cat.toUpperCase()}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{val.multiplier}×</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Fare estimator */}
      <div className="card mb-24" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-0)', marginBottom: 18 }}>Fare Estimator</div>
        <form onSubmit={handleEstimate}>
          <div className="two-col" style={{ gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Pickup Lat</label>
              <input className="form-input" type="number" step="any" placeholder="12.97" value={estimateForm.pickupLat} onChange={e => setEstimateForm(f => ({ ...f, pickupLat: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Pickup Lng</label>
              <input className="form-input" type="number" step="any" placeholder="77.59" value={estimateForm.pickupLng} onChange={e => setEstimateForm(f => ({ ...f, pickupLng: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Drop Lat</label>
              <input className="form-input" type="number" step="any" placeholder="12.93" value={estimateForm.dropLat} onChange={e => setEstimateForm(f => ({ ...f, dropLat: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Drop Lng</label>
              <input className="form-input" type="number" step="any" placeholder="77.62" value={estimateForm.dropLng} onChange={e => setEstimateForm(f => ({ ...f, dropLng: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={estimating}>
            {estimating ? 'Estimating...' : '⚡ Estimate Fare'}
          </button>
        </form>
        {estimate && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>
              ₹{estimate.estimatedFare?.toFixed(2) || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Estimated fare</div>
          </div>
        )}
      </div>

      {/* All configs */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-0)', marginBottom: 16 }}>All Pricing Configs</div>
        {configs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BadgePercent size={22} /></div>
            <h3>No configs yet</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Version</th><th>Base Fare</th><th>Per KM</th><th>Commission</th><th>Surge</th></tr>
              </thead>
              <tbody>
                {configs.map((c, i) => (
                  <tr key={c.id || i}>
                    <td><span className="code">{c.version || '—'}</span></td>
                    <td>₹{c.baseFare}</td>
                    <td>₹{c.perKmRate}</td>
                    <td>{c.commissionPercent}%</td>
                    <td>{c.surgeEnabled ? <span className="badge green">On</span> : <span className="badge neutral">Off</span>}</td>
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
              <div className="modal-title">New Pricing Config</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Version</label>
                <input className="form-input" placeholder="e.g. v2" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} required />
              </div>
              <div className="two-col" style={{ gap: 12, marginBottom: 18 }}>
                {[['baseFare', 'Base Fare (₹)'], ['baseDistance', 'Base Distance (km)'], ['perKmRate', 'Per KM Rate (₹)'], ['commissionPercent', 'Commission %']].map(([k, label]) => (
                  <div className="form-group" key={k} style={{ marginBottom: 0 }}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" type="number" step="0.01" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: parseFloat(e.target.value) }))} />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-1)' }}>
                  <input type="checkbox" checked={form.surgeEnabled} onChange={e => setForm(f => ({ ...f, surgeEnabled: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
                  Enable Surge Pricing
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Config'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
