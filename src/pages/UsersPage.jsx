import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, RefreshCw, X, Eye, Edit2, Trash2, Ban, CheckCircle,
  Plus, Phone, Mail, Calendar, Package, MessageSquare, ChevronRight,
  ChevronLeft, AlertTriangle, Copy, Check, StickyNote, ShieldOff,
  UserCheck, FileText, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usersAPI } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(val) {
  if (!val) return '—';
  if (val?.seconds) return new Date(val.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  try { return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

function fmtTime(val) {
  if (!val) return '—';
  if (val?.seconds) return new Date(val.seconds * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  try { return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

function getFullName(u) {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return n || u.name || '—';
}

function getInitials(u) {
  const n = getFullName(u);
  if (n === '—') return '?';
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function statusColor(s) {
  if (!s) return { bg: 'var(--blue-dim)', color: 'var(--blue)' };
  if (s === 'ACTIVE')  return { bg: 'var(--green-dim)', color: 'var(--green)' };
  if (s === 'BLOCKED') return { bg: 'rgba(255,77,109,0.12)', color: '#ff4d6d' };
  if (s === 'DELETED') return { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-2)' };
  return { bg: 'var(--blue-dim)', color: 'var(--blue)' };
}

function StatusBadge({ status }) {
  const { bg, color } = statusColor(status || 'ACTIVE');
  return (
    <span style={{ background: bg, color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
      {status || 'ACTIVE'}
    </span>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-2)', padding: '0 3px', verticalAlign: 'middle' }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', minWidth: 120 }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text-0)', fontFamily: 'var(--font-mono)' }}>{value ?? '—'}</div>
    </div>
  );
}

const TABS = ['OVERVIEW', 'ORDERS', 'NOTES'];
const STATUS_FILTERS = ['ALL', 'ACTIVE', 'BLOCKED', 'DELETED'];

// ── Drawer ────────────────────────────────────────────────────────────────
function UserDrawer({ user, onClose, onRefresh }) {
  const [tab, setTab]             = useState('OVERVIEW');
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [newNote, setNewNote]     = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, label }
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    if (user) {
      setEditForm({
        name: getFullName(user) === '—' ? '' : getFullName(user),
        email: user.email || '',
        adminNote: user.adminNote || '',
      });
      setTab('OVERVIEW');
      setEditing(false);
      setConfirmAction(null);
    }
  }, [user?.uid]);

  if (!user) return null;

  const notes = user.adminNotes || [];

  async function handleSave() {
    setSaving(true);
    try {
      await usersAPI.update(user.uid, editForm);
      toast.success('User updated');
      setEditing(false);
      onRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  }

  async function handleAction(type) {
    setSaving(true);
    try {
      if (type === 'block')   await usersAPI.block(user.uid, { reason: blockReason });
      if (type === 'unblock') await usersAPI.unblock(user.uid);
      if (type === 'delete')  await usersAPI.softDelete(user.uid);
      toast.success(`User ${type}ed`);
      setConfirmAction(null);
      setBlockReason('');
      onRefresh();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Action failed');
    } finally { setSaving(false); }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await usersAPI.addNote(user.uid, newNote.trim());
      toast.success('Note added');
      setNewNote('');
      onRefresh();
    } catch (e) {
      toast.error('Failed to add note');
    } finally { setAddingNote(false); }
  }

  async function handleDeleteNote(noteId) {
    try {
      await usersAPI.deleteNote(user.uid, noteId);
      toast.success('Note deleted');
      onRefresh();
    } catch (e) {
      toast.error('Failed to delete note');
    }
  }

  const isBlocked = user.status === 'BLOCKED';
  const isDeleted = user.status === 'DELETED';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(5,8,15,0.65)' }} />
      <div style={{ width: 520, background: 'var(--bg-1)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-2)', border: '2px solid var(--border-bright)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
            {getInitials(user)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-0)' }}>{getFullName(user)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{user.uid}</div>
          </div>
          <StatusBadge status={user.status} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: tab === t ? 'var(--accent)' : 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'OVERVIEW' && (
            <>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admin Note</label>
                    <textarea className="form-input" rows={3} value={editForm.adminNote} onChange={e => setEditForm(f => ({ ...f, adminNote: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                  </div>
                </div>
              ) : (
                <>
                  <InfoRow label="Phone" value={<>{user.phoneNumber || '—'} {user.phoneNumber && <CopyBtn text={user.phoneNumber} />}</>} />
                  <InfoRow label="Email" value={<>{user.email || '—'} {user.email && <CopyBtn text={user.email} />}</>} />
                  <InfoRow label="Status" value={<StatusBadge status={user.status} />} />
                  <InfoRow label="Email Verified" value={user.emailVerified ? '✓ Verified' : '✗ Not verified'} />
                  <InfoRow label="Member Since" value={fmt(user.createdAt)} />
                  <InfoRow label="Last Login" value={fmtTime(user.lastLoginAt)} />
                  <InfoRow label="Last Logout" value={fmtTime(user.lastLogoutAt)} />
                  <InfoRow label="Orders Placed" value={user.totalOrdersPlaced ?? 0} />
                  <InfoRow label="Orders Received" value={user.totalOrdersReceived ?? 0} />
                  {user.adminNote && (
                    <div style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: 8, padding: 12, marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#ffc107', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>ADMIN NOTE</div>
                      <div style={{ fontSize: 13 }}>{user.adminNote}</div>
                    </div>
                  )}
                  {isBlocked && user.blockReason && (
                    <div style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 8, padding: 12, marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#ff4d6d', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>BLOCK REASON</div>
                      <div style={{ fontSize: 13 }}>{user.blockReason}</div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── ORDERS TAB ── */}
          {tab === 'ORDERS' && (
            <div style={{ color: 'var(--text-2)', textAlign: 'center', paddingTop: 40 }}>
              <Package size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>Orders placed: <strong style={{ color: 'var(--text-0)' }}>{user.totalOrdersPlaced ?? 0}</strong></p>
              <p style={{ fontSize: 13 }}>Orders received: <strong style={{ color: 'var(--text-0)' }}>{user.totalOrdersReceived ?? 0}</strong></p>
              <p style={{ fontSize: 11, marginTop: 16, opacity: 0.6 }}>Go to Orders page and search by phone to see full order history.</p>
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {tab === 'NOTES' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input className="form-input" style={{ flex: 1 }} placeholder="Add admin note…" value={newNote} onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddNote()} />
                <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                  {addingNote ? '…' : <Plus size={14} />}
                </button>
              </div>
              {notes.length === 0 && <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', paddingTop: 24 }}>No notes yet</div>}
              {[...notes].reverse().map(note => (
                <div key={note.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <StickyNote size={14} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{note.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{fmtTime(note.addedAt)}</div>
                  </div>
                  <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 2 }} title="Delete note">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Confirm Action ── */}
          {confirmAction && (
            <div style={{ marginTop: 20, background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.25)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#ff4d6d' }}>Confirm: {confirmAction.label}</div>
              {confirmAction.type === 'block' && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Reason (optional)</label>
                  <input className="form-input" placeholder="Enter block reason…" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction(null)}>Cancel</button>
                <button className="btn btn-sm" style={{ background: '#ff4d6d', color: '#fff' }} onClick={() => handleAction(confirmAction.type)} disabled={saving}>
                  {saving ? 'Processing…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!editing && !confirmAction && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit2 size={13} /> Edit
            </button>
            {isBlocked ? (
              <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setConfirmAction({ type: 'unblock', label: 'Unblock User' })}>
                <UserCheck size={13} /> Unblock
              </button>
            ) : !isDeleted && (
              <button className="btn btn-sm" style={{ background: 'rgba(255,77,109,0.08)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.25)', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setConfirmAction({ type: 'block', label: 'Block User' })}>
                <Ban size={13} /> Block
              </button>
            )}
            {!isDeleted && (
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setConfirmAction({ type: 'delete', label: 'Delete User (soft)' })}>
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', width: 130, flexShrink: 0, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await usersAPI.create(form);
      toast.success('User created');
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to create user');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(5,8,15,0.75)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderRadius: 14, width: 420, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Create New User</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers]           = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('ALL');
  const [selected, setSelected]     = useState(null);   // open drawer
  const [showCreate, setShowCreate] = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [startAfter, setStartAfter] = useState(null);   // cursor
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 20;
  const searchTimer = useRef(null);

  const loadUsers = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        pageSize: PAGE_SIZE,
        ...(opts.startAfter ? { startAfter: opts.startAfter } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      };
      const res = await usersAPI.getAll(params);
      const data = res.data.data || [];
      setUsers(data);
      setHasMore(res.data.pagination?.hasNext || false);
    } catch (e) {
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  }, [statusFilter, search]);

  const loadStats = useCallback(async () => {
    try {
      const res = await usersAPI.getStats();
      setStats(res.data.data);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    setPage(1); setStartAfter(null);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadUsers(), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, statusFilter]);

  function handleRefresh() {
    loadStats();
    loadUsers({ startAfter: null });
    setPage(1); setStartAfter(null);
    if (selected) {
      usersAPI.getById(selected.uid).then(r => setSelected(r.data.data)).catch(() => {});
    }
  }

  function handleNextPage() {
    if (!hasMore || users.length === 0) return;
    const cursor = users[users.length - 1].uid;
    setStartAfter(cursor);
    setPage(p => p + 1);
    loadUsers({ startAfter: cursor });
  }

  function handlePrevPage() {
    // Simple: just go back to first page
    setPage(1); setStartAfter(null);
    loadUsers({ startAfter: null });
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Users"   value={stats?.total}   color="var(--text-0)" />
        <StatCard label="Active"        value={stats?.active}  color="var(--green)" />
        <StatCard label="Blocked"       value={stats?.blocked} color="#ff4d6d" />
        <StatCard label="Deleted"       value={stats?.deleted} color="var(--text-2)" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search by name, email, phone, UID…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}><X size={13} /></button>}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all .15s',
                background: statusFilter === s ? (s === 'BLOCKED' ? 'rgba(255,77,109,0.15)' : s === 'ACTIVE' ? 'var(--green-dim)' : 'var(--accent)') : 'var(--bg-2)',
                color: statusFilter === s ? (s === 'BLOCKED' ? '#ff4d6d' : s === 'ACTIVE' ? 'var(--green)' : 'var(--bg-0)') : 'var(--text-2)',
                borderColor: statusFilter === s ? 'currentColor' : 'var(--border)' }}>
              {s}
            </button>
          ))}
        </div>

        <button className="btn btn-ghost btn-sm" onClick={handleRefresh} title="Refresh"><RefreshCw size={14} /></button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New User
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Phone', 'Email', 'Status', 'Orders', 'Joined', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
                <Users size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><br />No users found
              </td></tr>
            )}
            {!loading && users.map(u => (
              <tr key={u.uid} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                onClick={() => setSelected(u)}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-2)', border: '1.5px solid var(--border-bright)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                      {getInitials(u)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-0)' }}>{getFullName(u)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{u.uid.slice(0, 14)}…</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.phoneNumber || '—'}</td>
                <td style={{ padding: '11px 14px', color: 'var(--text-1)', fontSize: 12 }}>{u.email || '—'}</td>
                <td style={{ padding: '11px 14px' }}><StatusBadge status={u.status} /></td>
                <td style={{ padding: '11px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)' }}>
                  {(u.totalOrdersPlaced || 0) + (u.totalOrdersReceived || 0)}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-2)', fontSize: 12 }}>{fmt(u.createdAt)}</td>
                <td style={{ padding: '11px 14px' }}>
                  <ChevronRight size={15} style={{ color: 'var(--text-2)' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, padding: '0 4px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          Page {page} · {users.length} users shown
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePrevPage} disabled={page === 1} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleNextPage} disabled={!hasMore} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            handleRefresh();
            usersAPI.getById(selected.uid).then(r => setSelected(r.data.data)).catch(() => setSelected(null));
          }}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleRefresh} />
      )}
    </div>
  );
}