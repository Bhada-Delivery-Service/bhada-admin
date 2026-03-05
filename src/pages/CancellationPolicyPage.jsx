import React, { useState, useEffect } from 'react';
import {
  Settings2, Save, RefreshCw, Info, Shield, CreditCard, Coins,
  AlertTriangle, CheckCircle2, Percent,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cancellationPolicyAPI } from '../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
}) : '—';

function FieldRow({ label, hint, value, onChange, unit = '₹', min = 0, max = 100, step = 1 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{label}</div>
        <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 3 }}>{hint}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140 }}>
        {unit && <span style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 500 }}>{unit}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: 80, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-1)', fontSize: 15, fontWeight: 600, textAlign: 'right',
          }}
        />
      </div>
    </div>
  );
}

/** Clamp helper — mirrors the backend formula */
function calcFee(orderAmount, pct, min, max) {
  const raw = orderAmount * (pct / 100);
  return Math.min(max, Math.max(min, raw));
}

export default function CancellationPolicyPage() {
  const [policy, setPolicy]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [form, setForm]       = useState({
    cvSmallDeduction:       5,
    cvLargeDeduction:       15,
    cvDeliveryRestore:      2,
    cancellationFeePercent: 3,
    cancellationFeeMin:     20,
    cancellationFeeMax:     100,
  });

  const PREVIEW_AMOUNTS = [200, 500, 1000, 3000];

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await cancellationPolicyAPI.get();
      const p = data?.data || {};
      setPolicy(p);
      setForm({
        cvSmallDeduction:       p.cvSmallDeduction       ?? 5,
        cvLargeDeduction:       p.cvLargeDeduction       ?? 15,
        cvDeliveryRestore:      p.cvDeliveryRestore      ?? 2,
        cancellationFeePercent: p.cancellationFeePercent ?? 3,
        cancellationFeeMin:     p.cancellationFeeMin     ?? 20,
        cancellationFeeMax:     p.cancellationFeeMax     ?? 100,
      });
      setDirty(false);
    } catch {
      toast.error('Failed to load cancellation policy');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const upd = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (form.cancellationFeePercent < 0 || form.cancellationFeePercent > 100) {
      toast.error('Cancellation fee % must be between 0 and 100');
      return;
    }
    if (form.cancellationFeeMax < form.cancellationFeeMin) {
      toast.error('Maximum fee must be ≥ Minimum fee');
      return;
    }
    setSaving(true);
    try {
      const { data } = await cancellationPolicyAPI.update(form);
      setPolicy(data?.data || {});
      setDirty(false);
      toast.success('Cancellation policy saved!');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save policy');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading policy...</div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings2 size={22} /> Cancellation Policy
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>Configure fees and CV score deductions for order cancellations</p>
          {policy?.updatedAt && (
            <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 11 }}>Last updated: {fmtDate(policy.updatedAt)}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-1)', fontWeight: 600, fontSize: 13 }}>
            <RefreshCw size={14} /> Reset
          </button>
          <button onClick={handleSave} disabled={!dirty || saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: dirty ? 'var(--blue)' : 'var(--surface-2)', border: 'none', borderRadius: 8, cursor: (dirty && !saving) ? 'pointer' : 'not-allowed', color: dirty ? '#fff' : 'var(--text-2)', fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Rules Info Banner */}
      <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(77,159,255,0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Info size={16} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--blue)' }}>Cancellation Rules:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text-2)' }}>
              <li>Cancellation is <strong>only allowed before DISPATCHED</strong></li>
              <li><strong>COD + Before READY</strong> → Small CV deduction</li>
              <li><strong>COD + After READY</strong> → Large CV deduction</li>
              <li><strong>Online (any stage)</strong> → Cancellation fee deducted from refund</li>
              <li>Online fee = <strong>% of order amount</strong>, clamped between Min and Max</li>
              <li>No CV impact for online payment cancellations</li>
              <li>CV score increases <strong>+{form.cvDeliveryRestore} pts on successful delivery</strong> (max 100)</li>
              <li>CV &lt; 50 → COD disabled | CV ≥ 60 (after being blocked) → COD re-enabled</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CV Score Settings */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Shield size={17} color="var(--orange)" />
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-1)' }}>COD Customer Value (CV) Score</h3>
        </div>
        <p style={{ margin: '4px 0 16px', color: 'var(--text-2)', fontSize: 12 }}>
          Applied only on <strong>COD orders</strong>. Online payment cancellations don't affect CV score.
        </p>
        <FieldRow
          label="Small CV Deduction (Before READY)"
          hint="Deducted when a COD order is cancelled before the sender marks it as READY"
          value={form.cvSmallDeduction}
          onChange={v => upd('cvSmallDeduction', v)}
          unit="pts" min={0} max={50}
        />
        <FieldRow
          label="Large CV Deduction (After READY)"
          hint="Deducted when a COD order is cancelled after it becomes READY (rider assigned + sender packed)"
          value={form.cvLargeDeduction}
          onChange={v => upd('cvLargeDeduction', v)}
          unit="pts" min={0} max={100}
        />
        <FieldRow
          label="CV Restore on Successful Delivery"
          hint="CV points added to the sender's score after each successful delivery. Helps recover from cancellation deductions."
          value={form.cvDeliveryRestore}
          onChange={v => upd('cvDeliveryRestore', v)}
          unit="pts" min={0} max={50}
        />
      </div>

      {/* Online Fee Settings */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <CreditCard size={17} color="var(--blue)" />
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-1)' }}>Online Payment — Cancellation Fee</h3>
        </div>
        <p style={{ margin: '4px 0 4px', color: 'var(--text-2)', fontSize: 12 }}>
          Deducted from the refund for any online-payment cancellation (before or after READY).
        </p>
        <div style={{ margin: '0 0 16px', padding: '10px 14px', background: 'color-mix(in srgb, var(--blue) 10%, transparent)', borderRadius: 8, fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
          Formula: Fee = Order Amount × {form.cancellationFeePercent}% &nbsp;|&nbsp; Min ₹{form.cancellationFeeMin} &nbsp;|&nbsp; Max ₹{form.cancellationFeeMax}
        </div>
        <FieldRow
          label="Cancellation Fee Percentage"
          hint="Percentage of the order amount charged as cancellation fee"
          value={form.cancellationFeePercent}
          onChange={v => upd('cancellationFeePercent', v)}
          unit="%" min={0} max={100} step={0.5}
        />
        <FieldRow
          label="Minimum Fee"
          hint="The cancellation fee will never be less than this amount (₹)"
          value={form.cancellationFeeMin}
          onChange={v => upd('cancellationFeeMin', v)}
          unit="₹" min={0} max={500}
        />
        <FieldRow
          label="Maximum Fee"
          hint="The cancellation fee will never exceed this amount (₹)"
          value={form.cancellationFeeMax}
          onChange={v => upd('cancellationFeeMax', v)}
          unit="₹" min={0} max={5000}
        />
      </div>

      {/* Live Preview */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Coins size={17} color="var(--green)" />
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-1)' }}>Live Preview</h3>
        </div>
        <p style={{ margin: '0 0 16px', color: 'var(--text-2)', fontSize: 12 }}>
          Estimated cancellation fees for sample order amounts.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'COD — Before READY', detail: `−${form.cvSmallDeduction} CV pts`, color: 'var(--orange)', Icon: AlertTriangle },
            { label: 'COD — After READY',  detail: `−${form.cvLargeDeduction} CV pts`, color: 'var(--red)',    Icon: AlertTriangle },
          ].map(({ label, detail, color, Icon }) => (
            <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `color-mix(in srgb, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Order Amount</span>
            <span style={{ textAlign: 'center' }}>Raw ({form.cancellationFeePercent}%)</span>
            <span style={{ textAlign: 'right' }}>Fee Charged</span>
          </div>
          {PREVIEW_AMOUNTS.map(amt => {
            const raw     = +(amt * form.cancellationFeePercent / 100).toFixed(2);
            const clamped = +calcFee(amt, form.cancellationFeePercent, form.cancellationFeeMin, form.cancellationFeeMax).toFixed(2);
            const note    = clamped === form.cancellationFeeMin ? '(min)' : clamped === form.cancellationFeeMax ? '(max)' : '';
            return (
              <div key={amt} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-1)', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>₹{amt}</span>
                <span style={{ textAlign: 'center', color: 'var(--text-2)' }}>₹{raw}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>
                  ₹{clamped} <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 400 }}>{note}</span>
                </span>
              </div>
            );
          })}
          <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-2)' }}>
            Refund = Order Amount − Fee Charged
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--green-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={16} color="var(--green)" />
          <span style={{ fontSize: 13, color: 'var(--green)' }}>
            On successful delivery: CV score +{form.cvDeliveryRestore} pts (max 100). COD re-enabled when CV ≥ 60.
          </span>
        </div>
      </div>
    </div>
  );
}