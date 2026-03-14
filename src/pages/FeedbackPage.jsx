import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Lightbulb, Bug, ThumbsUp, Search, RefreshCw,
  X, CheckCircle, Eye, Clock, ChevronDown, Filter, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { feedbackAPI } from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const TYPE_META = {
  FEEDBACK:   { label: 'Feedback',    icon: MessageSquare, color: 'var(--accent)',   bg: 'var(--accent-dim)'  },
  SUGGESTION: { label: 'Suggestion',  icon: Lightbulb,     color: '#f59e0b',         bg: 'rgba(245,158,11,0.12)' },
  BUG_REPORT: { label: 'Bug Report',  icon: Bug,           color: 'var(--red)',      bg: 'var(--red-dim)'     },
  COMPLIMENT: { label: 'Compliment',  icon: ThumbsUp,      color: 'var(--green)',    bg: 'var(--green-dim)'   },
};

const STATUS_META = {
  PENDING:   { label: 'Pending',   cls: 'orange' },
  REVIEWED:  { label: 'Reviewed',  cls: 'blue'   },
  ACTIONED:  { label: 'Actioned',  cls: 'green'  },
  DISMISSED: { label: 'Dismissed', cls: 'neutral' },
};

const STATUSES   = ['ALL', 'PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED'];
const CATEGORIES = ['ALL', 'APP', 'DELIVERY', 'RIDER', 'PRICING', 'SUPPORT', 'OTHER'];

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        display: 'grid', placeItems: 'center',
      }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-0)', lineHeight: 1 }}>{value ?? 0}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function FeedbackDetailModal({ item, onClose, onUpdated }) {
  const [status,    setStatus]    = useState(item.status);
  const [adminNote, setAdminNote] = useState(item.adminNote || '');
  const [saving,    setSaving]    = useState(false);

  const typeMeta   = TYPE_META[item.type]   || TYPE_META.FEEDBACK;
  const TypeIcon   = typeMeta.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      await feedbackAPI.update(item.feedbackId, { status, adminNote });
      toast.success('Feedback updated');
      onUpdated({ ...item, status, adminNote });
      onClose();
    } catch {
      toast.error('Failed to update');
    } finally { setSaving(false); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(5,8,15,0.85)', display: 'grid', placeItems: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: typeMeta.bg, display: 'grid', placeItems: 'center' }}>
              <TypeIcon size={16} style={{ color: typeMeta.color }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{typeMeta.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                {item.feedbackId.slice(-10).toUpperCase()}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Meta row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Submitted By', value: item.submittedBy?.slice(0, 14) + '…' },
              { label: 'Category',     value: item.category },
              { label: 'Submitted',    value: fmt(item.createdAt) },
              { label: 'Last Updated', value: fmt(item.updatedAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 600, wordBreak: 'break-all' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Message */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Message</div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: 'var(--text-0)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {item.message}
            </div>
          </div>

          {/* Update status */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Update Status</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED'].map(s => {
                const meta = STATUS_META[s];
                const active = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-dim)' : 'var(--bg-2)',
                      color: active ? 'var(--accent)' : 'var(--text-1)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin note */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Admin Note (optional)</div>
            <textarea
              className="form-input form-textarea"
              rows={3}
              placeholder="Add an internal note about this feedback…"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const [items,      setItems]      = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [status,     setStatus]     = useState('ALL');
  const [category,   setCategory]   = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        feedbackAPI.getAll(status === 'ALL' ? undefined : status),
        feedbackAPI.getStats(),
      ]);
      setItems(itemsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
    } catch {
      toast.error('Failed to load feedback');
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const handleUpdated = (updated) => {
    setItems(prev => prev.map(i => i.feedbackId === updated.feedbackId ? updated : i));
    if (stats) {
      setStats(prev => {
        const next = { ...prev };
        // decrement old, increment new
        const old = items.find(i => i.feedbackId === updated.feedbackId);
        if (old && old.status !== updated.status) {
          next[old.status] = Math.max(0, (next[old.status] || 0) - 1);
          next[updated.status] = (next[updated.status] || 0) + 1;
        }
        return next;
      });
    }
  };

  // Filter client-side for category, type, search
  const filtered = items.filter(i => {
    if (category !== 'ALL' && i.category !== category) return false;
    if (typeFilter !== 'ALL' && i.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.message.toLowerCase().includes(q) && !i.submittedBy.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-0)' }}>Feedback & Suggestions</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)' }}>Review and manage user submissions</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => load(true)}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total"     value={stats.TOTAL}     color="var(--accent)"  icon={MessageSquare} />
          <StatCard label="Pending"   value={stats.PENDING}   color="#f59e0b"        icon={Clock}         />
          <StatCard label="Reviewed"  value={stats.REVIEWED}  color="var(--blue)"    icon={Eye}           />
          <StatCard label="Actioned"  value={stats.ACTIONED}  color="var(--green)"   icon={CheckCircle}   />
          <StatCard label="Dismissed" value={stats.DISMISSED} color="var(--text-2)"  icon={X}             />
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
          <input
            className="form-input"
            placeholder="Search by message or user ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Status */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Status:</span>
            {STATUSES.map(s => (
              <button key={s}
                onClick={() => setStatus(s)}
                className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >{s === 'ALL' ? 'All' : STATUS_META[s]?.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          {/* Type */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Type:</span>
            {['ALL', 'FEEDBACK', 'SUGGESTION', 'BUG_REPORT', 'COMPLIMENT'].map(t => (
              <button key={t}
                onClick={() => setTypeFilter(t)}
                className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >{t === 'ALL' ? 'All' : TYPE_META[t]?.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          {/* Category */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Category:</span>
            {CATEGORIES.map(c => (
              <button key={c}
                onClick={() => setCategory(c)}
                className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
        {loading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', height: 200 }}>
          <div className="loader" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'grid', placeItems: 'center', height: 200, color: 'var(--text-2)', fontSize: 14 }}>
          No feedback found
        </div>
      ) : (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 110px 90px 80px 1fr 110px 90px',
            gap: 0,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-2)',
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <div></div>
            <div>Type</div>
            <div>Category</div>
            <div>Status</div>
            <div>Message</div>
            <div>Submitted</div>
            <div></div>
          </div>

          {/* Rows */}
          {filtered.map((item) => {
            const typeMeta   = TYPE_META[item.type]   || TYPE_META.FEEDBACK;
            const statusMeta = STATUS_META[item.status] || STATUS_META.PENDING;
            const TypeIcon   = typeMeta.icon;

            return (
              <div
                key={item.feedbackId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 110px 90px 80px 1fr 110px 90px',
                  gap: 0,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => setSelected(item)}
              >
                {/* Icon */}
                <div style={{ width: 28, height: 28, borderRadius: 8, background: typeMeta.bg, display: 'grid', placeItems: 'center' }}>
                  <TypeIcon size={13} style={{ color: typeMeta.color }} />
                </div>

                {/* Type */}
                <div style={{ fontSize: 12, fontWeight: 600, color: typeMeta.color }}>{typeMeta.label}</div>

                {/* Category */}
                <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{item.category}</div>

                {/* Status */}
                <span className={`badge ${statusMeta.cls}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                  {statusMeta.label}
                </span>

                {/* Message preview */}
                <div style={{ fontSize: 12, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {item.adminNote && (
                    <span style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginRight: 6 }}>[note]</span>
                  )}
                  {item.message}
                </div>

                {/* Date */}
                <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                {/* View */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); setSelected(item); }}
                  >
                    <Eye size={11} /> View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <FeedbackDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}