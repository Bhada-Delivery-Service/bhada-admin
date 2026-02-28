import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, RefreshCw, ToggleLeft, ToggleRight,
  Save, AlertCircle, Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { handlingChargeAPI } from '../services/api';

/* ── Size meta ──────────────────────────────────────────────────────────────── */
const SIZE_META = {
  MINI:        { label: 'Mini',        color: 'var(--blue)',   description: '0 - 2 kg (e.g. envelope, document, small parcel)' },
  SMALL:       { label: 'Small',       color: 'var(--green)',  description: '2 - 15 kg (e.g. phone, shoes, small box)' },
  MEDIUM:      { label: 'Medium',      color: 'var(--orange)', description: '15 - 30 kg (e.g. bag, mid-size parcel)' },
  LARGE:       { label: 'Large',       color: 'var(--red)',    description: '30 - 60 kg (e.g. large box, appliance)' },
  EXTRA_LARGE: { label: 'Extra Large', color: '#8b5cf6',       description: '60 - 120 kg (e.g. heavy appliance, bulk cargo)' },
};

const UNLIMITED_VALUE = 99999;

function formatFreeLimit(v) {
  return v >= UNLIMITED_VALUE ? '∞ (Unlimited)' : String(v);
}

/* ── Row Editor ─────────────────────────────────────────────────────────────── */
function RuleRow({ rule, onSaved }) {
  const [editing,   setEditing]   = useState(false);
  const [free,      setFree]      = useState('');
  const [charge,    setCharge]    = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState(false);

  const meta = SIZE_META[rule.sizeType] || { label: rule.sizeType, color: 'var(--text-2)', description: '' };

  const startEdit = () => {
    setFree(rule.freeQuantityLimit >= UNLIMITED_VALUE ? '0' : String(rule.freeQuantityLimit));
    setCharge(String(rule.perItemCharge));
    setUnlimited(rule.freeQuantityLimit >= UNLIMITED_VALUE);
    setEditing(true);
  };

  const handleSave = async () => {
    const freeVal   = unlimited ? UNLIMITED_VALUE : parseInt(free, 10);
    const chargeVal = parseFloat(charge);
    if (isNaN(freeVal) || freeVal < 0)       { toast.error('Free quantity must be ≥ 0'); return; }
    if (isNaN(chargeVal) || chargeVal < 0)   { toast.error('Per-item charge must be ≥ 0'); return; }

    setSaving(true);
    try {
      const { data } = await handlingChargeAPI.upsert(rule.sizeType, {
        freeQuantityLimit: freeVal,
        perItemCharge:     chargeVal,
        isActive:          rule.isActive,
      });
      toast.success(`${meta.label} rule updated`);
      onSaved(data.data);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const { data } = await handlingChargeAPI.toggle(rule.sizeType);
      toast.success(`${meta.label} rule ${data.data.isActive ? 'enabled' : 'disabled'}`);
      onSaved(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle rule');
    } finally { setToggling(false); }
  };

  return (
    <div style={{
      background: 'var(--bg-2)', borderRadius: 12,
      border: '1px solid var(--border)',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: meta.color + '22', color: meta.color,
            borderRadius: 8, padding: '4px 12px', fontWeight: 700, fontSize: 13,
          }}>{meta.label}</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{meta.description}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleToggle} disabled={toggling}
            title={rule.isActive ? 'Disable' : 'Enable'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            {rule.isActive
              ? <ToggleRight size={26} color="var(--accent)" />
              : <ToggleLeft  size={26} color="var(--text-3)" />}
          </button>
          {!editing && (
            <button
              onClick={startEdit}
              style={{
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 14px', fontSize: 12,
                cursor: 'pointer', color: 'var(--text-1)', fontWeight: 500,
              }}
            >Edit</button>
          )}
        </div>
      </div>

      {/* Values / Editor */}
      {editing ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          {/* Free Quantity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Free Quantity Limit
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={unlimited}
                  onChange={e => setUnlimited(e.target.checked)}
                />
                <span style={{ fontSize: 14 }}>∞</span> Unlimited
              </label>
              {!unlimited && (
                <input
                  type="number" min="0" value={free}
                  onChange={e => setFree(e.target.value)}
                  style={{
                    width: 80, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-1)',
                    color: 'var(--text-1)', fontSize: 13,
                  }}
                />
              )}
            </div>
          </div>

          {/* Per Item Charge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Per Item Charge (₹)
            </label>
            <input
              type="number" min="0" step="0.5" value={charge}
              onChange={e => setCharge(e.target.value)}
              style={{
                width: 100, padding: '6px 10px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-1)',
                color: 'var(--text-1)', fontSize: 13,
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Save size={14} />{saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 14px', fontSize: 13,
                cursor: 'pointer', color: 'var(--text-2)',
              }}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Free Quantity
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
              {formatFreeLimit(rule.freeQuantityLimit)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Per Item Charge
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: rule.perItemCharge > 0 ? meta.color : 'var(--text-3)' }}>
              {rule.perItemCharge > 0 ? `₹${rule.perItemCharge}` : 'Free'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Status
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: rule.isActive ? 'var(--green)' : 'var(--text-3)',
            }}>
              {rule.isActive ? '● Active' : '○ Disabled'}
            </div>
          </div>
        </div>
      )}

      {/* Calculation preview */}
      {!editing && rule.isActive && rule.perItemCharge > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <AlertCircle size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {rule.freeQuantityLimit >= UNLIMITED_VALUE
            ? 'No charge for any quantity (free limit is unlimited)'
            : rule.freeQuantityLimit === 0
              ? `₹${rule.perItemCharge} charged per item (all items billable)`
              : `First ${rule.freeQuantityLimit} items free, then ₹${rule.perItemCharge} each`}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function HandlingChargePage() {
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [seeding,  setSeeding]  = useState(false);

  const SIZE_ORDER = ['MINI', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await handlingChargeAPI.getAll();
      const sorted = [...(data.data || [])].sort(
        (a, b) => SIZE_ORDER.indexOf(a.sizeType) - SIZE_ORDER.indexOf(b.sizeType)
      );
      setRules(sorted);
    } catch (err) {
      toast.error('Failed to load handling charge rules');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (updated) => {
    setRules(prev => prev.map(r => r.sizeType === updated.sizeType ? updated : r));
  };

  const handleSeed = async () => {
    if (!window.confirm('Seed default handling charge rules? This will create rules for all size types.')) return;
    setSeeding(true);
    try {
      await handlingChargeAPI.seedDefaults();
      toast.success('Default rules seeded successfully');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Seeding failed');
    } finally { setSeeding(false); }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IndianRupee size={24} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
              Handling Charges
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
              Configure per-size handling fees charged when orders are not self-handled
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {rules.length === 0 && !loading && (
            <button
              onClick={handleSeed} disabled={seeding}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 600, cursor: seeding ? 'not-allowed' : 'pointer',
              }}
            >
              <Settings size={14} />{seeding ? 'Seeding…' : 'Seed Defaults'}
            </button>
          )}
          <button
            onClick={load}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13,
              cursor: 'pointer', color: 'var(--text-2)',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'var(--blue-dim, #dbeafe)', border: '1px solid var(--blue, #3b82f6)44',
        borderRadius: 10, padding: '12px 16px', marginBottom: 12,
        fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
      }}>
        <strong>How it works:</strong> Handling charges apply per item size when the sender does not self-handle.
        Items within the free quantity limit are not charged. Beyond the limit, each additional item incurs the per-item fee.
        <strong> Self-handling orders</strong> are always ₹0.
      </div>

      {/* Size Reference Table */}
      <div style={{ marginBottom: 20, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px', background: 'var(--bg-3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
          Size Reference — based on item weight
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: 'var(--bg-2)' }}>
          {[
            { size: 'MINI',        range: '0 - 2 kg',    color: 'var(--blue)'   },
            { size: 'SMALL',       range: '2 - 15 kg',   color: 'var(--green)'  },
            { size: 'MEDIUM',      range: '15 - 30 kg',  color: 'var(--orange)' },
            { size: 'LARGE',       range: '30 - 60 kg',  color: 'var(--red)'    },
            { size: 'EXTRA LARGE', range: '60 - 120 kg', color: '#8b5cf6'       },
          ].map(({ size, range, color }) => (
            <div key={size} style={{ padding: '10px 12px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 3 }}>{size}</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>{range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
          Loading rules…
        </div>
      ) : rules.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'var(--bg-2)', borderRadius: 12,
          border: '1px dashed var(--border)',
          color: 'var(--text-3)',
        }}>
          <IndianRupee size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No rules configured</div>
          <div style={{ fontSize: 12, marginBottom: 16 }}>
            Click "Seed Defaults" to create the default handling charge rules for all item sizes.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map(rule => (
            <RuleRow key={rule.sizeType} rule={rule} onSaved={handleSaved} />
          ))}
        </div>
      )}
    </div>
  );
}