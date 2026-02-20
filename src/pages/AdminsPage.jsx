import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, RefreshCw, X, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './DashboardPage';

const ADMIN_LEVELS = ['OPERATION_ADMIN', 'FINANCE_ADMIN', 'CUSTOMER_SUPPORT'];
const ALL_PERMISSIONS = ['MANAGE_USERS', 'MANAGE_RIDERS', 'VIEW_REPORTS', 'MANAGE_PRICING', 'MANAGE_SETTINGS', 'MANAGE_ORDERS'];

const emptyForm = { uid: '', firstName: '', lastName: '', email: '', adminLevel: 'OPERATION_ADMIN', permissions: [], password: '' };

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'create' | 'edit' | null
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await adminsAPI.getAll();
      setAdmins(data?.data || []);
    } catch {
      toast.error('Failed to load admins. Requires Super Admin access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const filtered = admins.filter(a => {
    const q = search.toLowerCase();
    return !q || `${a.firstName || ''} ${a.lastName || ''} ${a.email || ''} ${a.uid || ''}`.toLowerCase().includes(q);
  });

  const openCreate = () => { setForm(emptyForm); setEditTarget(null); setModal('create'); };
  const openEdit = (admin) => {
    setForm({
      uid: admin.uid,
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      email: admin.email || '',
      adminLevel: admin.adminLevel || 'OPERATION_ADMIN',
      permissions: admin.permissions || [],
      password: '',
    });
    setEditTarget(admin.uid);
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal === 'create') {
        await adminsAPI.create(form);
        toast.success('Admin created successfully');
      } else {
        const { uid, ...rest } = form;
        await adminsAPI.update(editTarget, rest);
        toast.success('Admin updated');
      }
      setModal(null);
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      await adminsAPI.delete(id);
      toast.success('Admin deleted');
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const togglePermission = (perm) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const levelColor = { SUPER_ADMIN: 'accent', OPERATION_ADMIN: 'blue', FINANCE_ADMIN: 'green', CUSTOMER_SUPPORT: 'orange' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Admin Management</h1>
          <p>Manage admin accounts and permissions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchAdmins}>
            <RefreshCw size={13} /> Refresh
          </button>
          {user?.isSuperAdmin && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={14} /> New Admin
            </button>
          )}
        </div>
      </div>

      {!user?.isSuperAdmin && (
        <div style={{ background: 'var(--orange-dim)', border: '1px solid rgba(255,154,60,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--orange)', fontSize: 13 }}>
          ⚠️ Super Admin access required to manage admins.
        </div>
      )}

      <div className="filters-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input className="search-input" placeholder="Search admins..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShieldCheck size={22} /></div>
            <h3>No admins found</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Level</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(admin => (
                  <tr key={admin.uid}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-0)' }}>
                        {`${admin.firstName || ''} ${admin.lastName || ''}`.trim() || '—'}
                        {admin.isSuperAdmin && <span className="badge accent" style={{ marginLeft: 6, fontSize: 10 }}>SUPER</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{admin.email || admin.uid?.slice(0, 16)}</div>
                    </td>
                    <td>
                      <span className={`badge ${levelColor[admin.adminLevel] || 'neutral'}`}>{admin.adminLevel}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 280 }}>
                        {(admin.permissions || []).map(p => (
                          <span key={p} className="tag" style={{ fontSize: 10 }}>{p.replace('MANAGE_', '')}</span>
                        ))}
                      </div>
                    </td>
                    <td><StatusBadge status={admin.status || 'ACTIVE'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!admin.isSuperAdmin && user?.isSuperAdmin && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(admin)}><Edit2 size={13} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(admin.uid)}><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'create' ? 'Create Admin' : 'Edit Admin'}</div>
              <button className="modal-close" onClick={() => setModal(null)}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {modal === 'create' && (
                <div className="form-group">
                  <label className="form-label">Firebase UID *</label>
                  <input className="form-input" placeholder="Firebase UID of user" value={form.uid} onChange={e => setForm(f => ({ ...f, uid: e.target.value }))} required />
                </div>
              )}
              <div className="two-col" style={{ gap: 12, marginBottom: 18 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              {modal === 'create' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">Admin Level</label>
                <select className="form-select" value={form.adminLevel} onChange={e => setForm(f => ({ ...f, adminLevel: e.target.value }))}>
                  {ADMIN_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: form.permissions.includes(p) ? 'var(--accent)' : 'var(--text-1)' }}>
                      <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePermission(p)} style={{ accentColor: 'var(--accent)' }} />
                      {p.replace('MANAGE_', '').replace('VIEW_', '')}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : modal === 'create' ? 'Create Admin' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
