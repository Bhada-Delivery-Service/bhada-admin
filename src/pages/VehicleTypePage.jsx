import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, RefreshCw,
  Truck, ToggleLeft, ToggleRight, AlertCircle,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { vehicleConfigAPI } from '../services/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function extractError(e) {
  const d = e?.response?.data;
  if (!d) return e?.message || 'Something went wrong';
  if (typeof d === 'string') return d;
  if (d.message) return d.message;
  if (Array.isArray(d.errors)) return d.errors.map(x => x.msg || x.message).join(' · ');
  return 'Request failed';
}

const card        = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24 };
const labelSm     = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase' };
const inputStyle  = { width: '100%', padding: '8px 12px', background: 'var(--bg-overlay)', border: '1px solid var(--border-md)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const btnPrimary  = { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 };
const btnDanger   = { padding: '6px 10px', background: 'var(--red-dim, #fee2e2)', color: 'var(--red, #ef4444)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const btnGhost    = { padding: '6px 10px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 };
const btnSecondary= { padding: '8px 14px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 };

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function ActiveBadge({ active }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: active ? 'var(--green-dim, #dcfce7)' : 'var(--bg-overlay)',
      color: active ? 'var(--green, #16a34a)' : 'var(--text-tertiary)',
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
      background: type === 'error' ? '#fee2e2' : '#dcfce7',
      color: type === 'error' ? '#991b1b' : '#14532d',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, opacity: 0.6 }}><X size={13} /></button>
    </div>
  );
}

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 14, padding: 28, width: 340, boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirm Delete</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{msg}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btnPrimary, background: 'var(--red, #ef4444)' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Vehicle Form ────────────────────────────────────────────────────────── */
function VehicleForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    id:           '',
    name:         '',
    icon:         '🚗',
    baseFare:     '',
    perKmRate:    '',
    maxWeightKg:  '',
    maxVolumeL:   '',
    sortOrder:    '',
    ...initial,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (!initial && !form.id.trim()) return;
    onSave({
      ...(initial ? {} : { id: form.id.trim().toUpperCase().replace(/\s+/g, '_') }),
      name:        form.name.trim(),
      icon:        form.icon.trim() || '🚗',
      baseFare:    parseFloat(form.baseFare)    || 0,
      perKmRate:   parseFloat(form.perKmRate)   || 0,
      maxWeightKg: parseFloat(form.maxWeightKg) || 0,
      maxVolumeL:  parseFloat(form.maxVolumeL)  || 0,
      sortOrder:   form.sortOrder !== '' ? parseInt(form.sortOrder) : undefined,
    });
  };

  const field = (label, key, type = 'text', placeholder = '', disabled = false) => (
    <div>
      <div style={labelSm}>{label}</div>
      <input
        style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }}
        type={type} placeholder={placeholder}
        value={form[key]} disabled={disabled}
        onChange={e => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12, marginBottom: 12 }}>
        {field('ID (slug) *', 'id', 'text', 'e.g. BIKE', !!initial)}
        {field('Display Name *', 'name', 'text', 'e.g. Bike / Motorcycle')}
        {field('Icon', 'icon', 'text', '🏍️')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px', gap: 12, marginBottom: 12 }}>
        {field('Base Fare (₹)', 'baseFare', 'number', '30')}
        {field('Per Km Rate (₹)', 'perKmRate', 'number', '8')}
        {field('Max Weight (kg)', 'maxWeightKg', 'number', '0 = no limit')}
        {field('Max Volume (L)', 'maxVolumeL', 'number', '0 = no limit')}
        {field('Sort Order', 'sortOrder', 'number', '1')}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 14 }}>
        💡 Base Fare &amp; Per Km Rate — set to 0 to use the global pricing config slabs instead.
        Max Weight/Volume — set to 0 for no limit.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} style={btnPrimary} disabled={saving}>
          {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
          {initial ? 'Update' : 'Create'}
        </button>
        <button onClick={onCancel} style={btnSecondary}><X size={13} /> Cancel</button>
      </div>
    </div>
  );
}

/* ─── Stats bar ───────────────────────────────────────────────────────────── */
function StatsBar({ vehicles }) {
  const active   = vehicles.filter(v => v.isActive).length;
  const inactive = vehicles.length - active;
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      {[
        { label: 'Total', value: vehicles.length, color: 'var(--accent)' },
        { label: 'Active', value: active, color: 'var(--green, #16a34a)' },
        { label: 'Inactive', value: inactive, color: 'var(--text-tertiary)' },
      ].map(s => (
        <div key={s.label} style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function VehicleTypePage() {
  const [vehicles,  setVehicles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [confirm,   setConfirm]   = useState(null); // id to delete
  const [seeding,   setSeeding]   = useState(false);
  const [toastMsg,  setToastMsg]  = useState('');
  const [toastType, setToastType] = useState('success');

  const toast = useCallback((msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await vehicleConfigAPI.getAll();
      setVehicles((data?.data ?? data ?? []).sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  /* ─── CRUD handlers ───────────────────────────────────────────────────── */

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      await vehicleConfigAPI.create(formData);
      toast('Vehicle type created', 'success');
      setShowForm(false);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (formData) => {
    setSaving(true);
    try {
      await vehicleConfigAPI.update(editItem.id, formData);
      toast('Vehicle type updated', 'success');
      setEditItem(null);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await vehicleConfigAPI.delete(id);
      toast('Vehicle type deleted', 'success');
      setConfirm(null);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
  };

  const handleToggle = async (vehicle) => {
    try {
      await vehicleConfigAPI.toggle(vehicle.id);
      toast(`${!vehicle.isActive ? 'Activated' : 'Deactivated'} ${vehicle.name}`, 'success');
      load();
    } catch (e) { toast(extractError(e), 'error'); }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data } = await vehicleConfigAPI.seed();
      const msg = data?.message || 'Seeded default vehicle types';
      toast(msg, 'success');
      load();
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setSeeding(false); }
  };

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={20} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Vehicle Types</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Configure vehicle types available to riders during onboarding. Changes reflect immediately across all apps.
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div style={card}>

        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Vehicle Types</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{vehicles.length} configured</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSeed} style={btnSecondary} disabled={seeding}>
              {seeding
                ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <RefreshCw size={13} />}
              Seed Defaults
            </button>
            <button onClick={() => { setShowForm(true); setEditItem(null); }} style={btnPrimary}>
              <Plus size={14} /> Add Vehicle Type
            </button>
          </div>
        </div>

        {/* Stats */}
        {vehicles.length > 0 && <StatsBar vehicles={vehicles} />}

        {/* Create form */}
        {showForm && !editItem && (
          <VehicleForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        )}

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Truck size={32} color="var(--text-tertiary)" style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 16 }}>No vehicle types configured yet.</div>
            <button onClick={handleSeed} style={btnPrimary} disabled={seeding}>
              {seeding ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              Seed Default Types
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Order', 'Vehicle', 'ID', 'Base Fare', 'Per Km', 'Max Weight', 'Max Vol', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ ...labelSm, padding: '6px 10px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <React.Fragment key={v.id}>
                    <tr style={{
                      borderBottom: '1px solid var(--border)',
                      background: editItem?.id === v.id ? 'var(--bg-elevated)' : 'transparent',
                    }}>
                      {/* Sort order */}
                      <td style={{ padding: '10px 10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {v.sortOrder}
                      </td>

                      {/* Icon + Name */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{v.icon || '🚗'}</span>
                          <span style={{ fontWeight: 600 }}>{v.name}</span>
                        </div>
                      </td>

                      {/* ID badge */}
                      <td style={{ padding: '10px 10px' }}>
                        <code style={{ background: 'var(--bg-overlay)', padding: '2px 7px', borderRadius: 5, fontSize: 11 }}>{v.id}</code>
                      </td>

                      {/* Pricing */}
                      <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                        {v.baseFare > 0 ? `₹${v.baseFare}` : <span style={{ color: 'var(--text-tertiary)' }}>Global</span>}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                        {v.perKmRate > 0 ? `₹${v.perKmRate}/km` : <span style={{ color: 'var(--text-tertiary)' }}>Global</span>}
                      </td>

                      {/* Capacity */}
                      <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                        {v.maxWeightKg > 0 ? `${v.maxWeightKg} kg` : <span style={{ color: 'var(--text-tertiary)' }}>No limit</span>}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                        {v.maxVolumeL > 0 ? `${v.maxVolumeL} L` : <span style={{ color: 'var(--text-tertiary)' }}>No limit</span>}
                      </td>

                      {/* Toggle status */}
                      <td style={{ padding: '10px 10px' }}>
                        <button onClick={() => handleToggle(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <ActiveBadge active={v.isActive} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={btnGhost} onClick={() => { setEditItem(v); setShowForm(false); }}>
                            <Pencil size={12} />
                          </button>
                          <button style={btnDanger} onClick={() => setConfirm(v.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline edit row */}
                    {editItem?.id === v.id && (
                      <tr>
                        <td colSpan={9} style={{ padding: '0 10px 10px' }}>
                          <VehicleForm
                            initial={editItem}
                            onSave={handleUpdate}
                            onCancel={() => setEditItem(null)}
                            saving={saving}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pricing note card */}
      <div style={{ ...card, background: 'var(--bg-overlay)', border: '1px solid var(--border-md)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>💡 How pricing works</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong>Base Fare</strong> — Minimum fare for this vehicle. If set to 0, the global <em>minimumFare</em> from the Pricing config is used.<br />
          <strong>Per Km Rate</strong> — Override per-km rate for this vehicle. If set to 0, the global distance slabs from the Pricing config are used.<br />
          <strong>Max Weight / Volume</strong> — Optional capacity limits. Setting both to 0 means no restriction.<br />
          <strong>Status toggle</strong> — Inactive vehicles are hidden from rider onboarding and the order flow immediately.
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          msg="Delete this vehicle type? Riders with this vehicle already set will keep it — only new selections are affected."
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <Toast msg={toastMsg} type={toastType} onClose={() => setToastMsg('')} />
    </div>
  );
}