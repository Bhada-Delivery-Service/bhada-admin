import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, RefreshCw,
  Package, Tag, Layers, ChevronUp, ChevronDown,
  ToggleLeft, ToggleRight, AlertCircle,
} from 'lucide-react';
import { itemCatalogAPI } from '../services/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function extractError(e) {
  const d = e?.response?.data;
  if (!d) return e?.message || 'Something went wrong';
  if (typeof d === 'string') return d;
  if (d.message) return d.message;
  if (Array.isArray(d.errors)) return d.errors.map(x => x.msg || x.message).join(' · ');
  return 'Request failed';
}

const card = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24 };
const labelSm = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--bg-overlay)', border: '1px solid var(--border-md)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const btnPrimary = { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 };
const btnDanger = { padding: '6px 10px', background: 'var(--red-dim, #fee2e2)', color: 'var(--red, #ef4444)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 };
const btnGhost = { padding: '6px 10px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 };

/* ─── Badge ───────────────────────────────────────────────────────────────── */
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

/* ─── Toast ───────────────────────────────────────────────────────────────── */
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

/* ─── Confirm Modal ───────────────────────────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════════════════════
   SIZE FORM
═══════════════════════════════════════════════════════════════════════════ */
function SizeForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: '', key: '', weightMin: '', weightMax: '',
    width: '', length: '', height: '',
    description: '', isActive: true, sortOrder: '',
    ...initial,
    width: initial?.dimensions?.width ?? '',
    length: initial?.dimensions?.length ?? '',
    height: initial?.dimensions?.height ?? '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim() || !form.key.trim()) return;
    onSave({
      name: form.name.trim(),
      key: form.key.trim(),
      weightMin: parseFloat(form.weightMin) || 0,
      weightMax: parseFloat(form.weightMax) || 0,
      dimensions: {
        width: parseFloat(form.width) || 0,
        length: parseFloat(form.length) || 0,
        height: parseFloat(form.height) || 0,
      },
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder !== '' ? parseInt(form.sortOrder) : undefined,
    });
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <div style={labelSm}>{label}</div>
      <input
        style={inputStyle} type={type} placeholder={placeholder}
        value={form[key]} onChange={e => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {field('Size Name *', 'name', 'text', 'e.g. Small')}
        {field('Key (slug) *', 'key', 'text', 'e.g. small')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {field('Weight Min (kg)', 'weightMin', 'number', '0')}
        {field('Weight Max (kg)', 'weightMax', 'number', '10')}
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={labelSm}>Dimensions (cm) — Width × Length × Height</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input style={inputStyle} type="number" placeholder="Width" value={form.width} onChange={e => set('width', e.target.value)} />
          <input style={inputStyle} type="number" placeholder="Length" value={form.length} onChange={e => set('length', e.target.value)} />
          <input style={inputStyle} type="number" placeholder="Height" value={form.height} onChange={e => set('height', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, marginBottom: 12 }}>
        {field('Description (optional)', 'description', 'text', '')}
        {field('Sort Order', 'sortOrder', 'number', '0')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => set('isActive', !form.isActive)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.isActive ? 'var(--green, #16a34a)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          {form.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          {form.isActive ? 'Active' : 'Inactive'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} style={btnPrimary} disabled={saving}>
          {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
          {initial ? 'Update' : 'Create'}
        </button>
        <button onClick={onCancel} style={btnGhost}><X size={13} />Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMPLE FORM (for Types & Categories)
═══════════════════════════════════════════════════════════════════════════ */
function SimpleForm({ initial, onSave, onCancel, saving, namePlaceholder, keyPlaceholder }) {
  const [form, setForm] = useState({
    name: '', key: '', description: '', isActive: true, sortOrder: '',
    ...initial,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim() || !form.key.trim()) return;
    onSave({
      name: form.name.trim(),
      key: form.key.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder !== '' ? parseInt(form.sortOrder) : undefined,
    });
  };

  return (
    <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={labelSm}>Name *</div>
          <input style={inputStyle} placeholder={namePlaceholder || 'e.g. Fragile'} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <div style={labelSm}>Key (slug) *</div>
          <input style={inputStyle} placeholder={keyPlaceholder || 'e.g. FRAGILE'} value={form.key} onChange={e => set('key', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={labelSm}>Description (optional)</div>
          <input style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <div style={labelSm}>Sort Order</div>
          <input style={inputStyle} type="number" placeholder="0" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => set('isActive', !form.isActive)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.isActive ? 'var(--green, #16a34a)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          {form.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          {form.isActive ? 'Active' : 'Inactive'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} style={btnPrimary} disabled={saving}>
          {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
          {initial ? 'Update' : 'Create'}
        </button>
        <button onClick={onCancel} style={btnGhost}><X size={13} />Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIZES TABLE
═══════════════════════════════════════════════════════════════════════════ */
function SizesSection({ toast }) {
  const [sizes, setSizes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSizes((await itemCatalogAPI.getSizes()).data.data); }
    catch (e) { toast(extractError(e), 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await itemCatalogAPI.createSize(data);
      toast('Size created', 'success');
      setShowForm(false);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      await itemCatalogAPI.updateSize(editItem.id, data);
      toast('Size updated', 'success');
      setEditItem(null);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await itemCatalogAPI.deleteSize(id);
      toast('Size deleted', 'success');
      setConfirm(null);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
  };

  const handleToggle = async (item) => {
    try {
      await itemCatalogAPI.updateSize(item.id, { isActive: !item.isActive });
      toast(`Size ${!item.isActive ? 'activated' : 'deactivated'}`, 'success');
      load();
    } catch (e) { toast(extractError(e), 'error'); }
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={16} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Item Sizes</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sizes.length} configured</div>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditItem(null); }} style={btnPrimary}>
          <Plus size={14} /> Add Size
        </button>
      </div>

      {showForm && !editItem && (
        <SizeForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)' }}>
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : sizes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)', fontSize: 13 }}>
          No sizes configured yet. Add your first size above.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order', 'Name', 'Key', 'Weight Range', 'Dimensions (cm)', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ ...labelSm, padding: '6px 10px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map(s => (
                <React.Fragment key={s.id}>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: editItem?.id === s.id ? 'var(--bg-elevated)' : 'transparent' }}>
                    <td style={{ padding: '10px 10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.sortOrder}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <code style={{ background: 'var(--bg-overlay)', padding: '2px 7px', borderRadius: 5, fontSize: 11 }}>{s.key}</code>
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.weightMin} – {s.weightMax} kg
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.dimensions ? `${s.dimensions.width}W × ${s.dimensions.length}L × ${s.dimensions.height}H` : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.description || '—'}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <button onClick={() => handleToggle(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <ActiveBadge active={s.isActive} />
                      </button>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={btnGhost} onClick={() => { setEditItem(s); setShowForm(false); }}>
                          <Pencil size={12} />
                        </button>
                        <button style={btnDanger} onClick={() => setConfirm(s.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editItem?.id === s.id && (
                    <tr><td colSpan={8} style={{ padding: '0 10px 10px' }}>
                      <SizeForm
                        initial={{ ...s, width: s.dimensions?.width, length: s.dimensions?.length, height: s.dimensions?.height }}
                        onSave={handleUpdate}
                        onCancel={() => setEditItem(null)}
                        saving={saving}
                      />
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirm && <ConfirmModal msg="Are you sure you want to delete this size? This cannot be undone." onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GENERIC TABLE SECTION (for Types & Categories)
═══════════════════════════════════════════════════════════════════════════ */
function CatalogSection({ title, icon: Icon, color, fetchAll, createFn, updateFn, deleteFn, namePlaceholder, keyPlaceholder, toast }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await fetchAll()).data.data); }
    catch (e) { toast(extractError(e), 'error'); }
    finally { setLoading(false); }
  }, [fetchAll, toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createFn(data);
      toast(`${title.slice(0, -1)} created`, 'success');
      setShowForm(false);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      await updateFn(editItem.id, data);
      toast(`${title.slice(0, -1)} updated`, 'success');
      setEditItem(null);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteFn(id);
      toast(`${title.slice(0, -1)} deleted`, 'success');
      setConfirm(null);
      load();
    } catch (e) { toast(extractError(e), 'error'); }
  };

  const handleToggle = async (item) => {
    try {
      await updateFn(item.id, { isActive: !item.isActive });
      toast(`${!item.isActive ? 'Activated' : 'Deactivated'}`, 'success');
      load();
    } catch (e) { toast(extractError(e), 'error'); }
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: `${color}22`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={color} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{items.length} configured</div>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditItem(null); }} style={btnPrimary}>
          <Plus size={14} /> Add {title.slice(0, -1)}
        </button>
      </div>

      {showForm && !editItem && (
        <SimpleForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} namePlaceholder={namePlaceholder} keyPlaceholder={keyPlaceholder} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)' }}>
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)', fontSize: 13 }}>
          No {title.toLowerCase()} configured yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order', 'Name', 'Key', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ ...labelSm, padding: '6px 10px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <React.Fragment key={item.id}>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: editItem?.id === item.id ? 'var(--bg-elevated)' : 'transparent' }}>
                    <td style={{ padding: '10px 10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{item.sortOrder}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <code style={{ background: 'var(--bg-overlay)', padding: '2px 7px', borderRadius: 5, fontSize: 11 }}>{item.key}</code>
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '—'}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <button onClick={() => handleToggle(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <ActiveBadge active={item.isActive} />
                      </button>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={btnGhost} onClick={() => { setEditItem(item); setShowForm(false); }}>
                          <Pencil size={12} />
                        </button>
                        <button style={btnDanger} onClick={() => setConfirm(item.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editItem?.id === item.id && (
                    <tr><td colSpan={6} style={{ padding: '0 10px 10px' }}>
                      <SimpleForm
                        initial={item}
                        onSave={handleUpdate}
                        onCancel={() => setEditItem(null)}
                        saving={saving}
                        namePlaceholder={namePlaceholder}
                        keyPlaceholder={keyPlaceholder}
                      />
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirm && <ConfirmModal msg={`Delete this ${title.slice(0, -1).toLowerCase()}? This cannot be undone.`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function ItemCatalogPage() {
  const [toastMsg, setToastMsg]   = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = useCallback((msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
  }, []);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Item Catalog</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Configure item sizes, types, and categories available to users when placing orders
            </div>
          </div>
        </div>
      </div>

      {/* Sizes */}
      <SizesSection toast={showToast} />

      {/* Types */}
      <CatalogSection
        title="Item Types"
        icon={Tag}
        color="var(--blue, #3b82f6)"
        fetchAll={() => itemCatalogAPI.getTypes()}
        createFn={(d) => itemCatalogAPI.createType(d)}
        updateFn={(id, d) => itemCatalogAPI.updateType(id, d)}
        deleteFn={(id) => itemCatalogAPI.deleteType(id)}
        namePlaceholder="e.g. Fragile"
        keyPlaceholder="e.g. FRAGILE"
        toast={showToast}
      />

      {/* Categories */}
      <CatalogSection
        title="Item Categories"
        icon={Package}
        color="var(--purple, #8b5cf6)"
        fetchAll={() => itemCatalogAPI.getCategories()}
        createFn={(d) => itemCatalogAPI.createCategory(d)}
        updateFn={(id, d) => itemCatalogAPI.updateCategory(id, d)}
        deleteFn={(id) => itemCatalogAPI.deleteCategory(id)}
        namePlaceholder="e.g. Electronics"
        keyPlaceholder="e.g. ELECTRONICS"
        toast={showToast}
      />

      <Toast msg={toastMsg} type={toastType} onClose={() => setToastMsg('')} />
    </div>
  );
}
