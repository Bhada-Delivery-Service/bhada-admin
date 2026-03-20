import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Plus, Search, RefreshCw, X, Trash2, Edit2, Phone, Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './DashboardPage';
import { sendOTP, verifyOTP, auth } from '../services/firebase';

const ADMIN_LEVELS = ['OPERATION_ADMIN', 'FINANCE_ADMIN', 'CUSTOMER_SUPPORT'];
const ALL_PERMISSIONS = ['MANAGE_USERS', 'MANAGE_RIDERS', 'VIEW_REPORTS', 'MANAGE_PRICING', 'MANAGE_SETTINGS', 'MANAGE_ORDERS'];

// Safely convert permission to string
const permKey = (p) => (typeof p === 'string' ? p : (p?.value || p?.name || JSON.stringify(p) || ''));
const permLabel = (p) => permKey(p).replace('MANAGE_', '').replace('VIEW_', '');

const emptyDetails = { firstName: '', lastName: '', email: '', adminLevel: 'OPERATION_ADMIN', permissions: [], password: '' };

// Modal modes
const MODE = { NONE: null, CREATE: 'create', EDIT: 'edit' };
const CREATE_STEP = { PHONE: 'phone', OTP: 'otp', DETAILS: 'details' };

// ── DetailsForm defined OUTSIDE AdminsPage so React never remounts it on re-render ──
function DetailsForm({ details, setDetails, submitting, onSubmit, onCancel, submitLabel, isCreate }) {
  const toggle = (perm) => setDetails(d => ({
    ...d,
    permissions: d.permissions.includes(perm)
      ? d.permissions.filter(p => p !== perm)
      : [...d.permissions, perm],
  }));

  return (
    <form onSubmit={onSubmit}>
      <div className="two-col" style={{ gap: 12, marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">First Name *</label>
          <input className="form-input" value={details.firstName}
            onChange={e => setDetails(d => ({ ...d, firstName: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label className="form-label">Last Name *</label>
          <input className="form-input" value={details.lastName}
            onChange={e => setDetails(d => ({ ...d, lastName: e.target.value }))} required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Email *</label>
        <input className="form-input" type="email" value={details.email}
          onChange={e => setDetails(d => ({ ...d, email: e.target.value }))} required />
      </div>
      <div className="form-group">
        <label className="form-label">{isCreate ? 'Password *' : 'New Password'}</label>
        <input className="form-input" type="password"
          placeholder={isCreate ? 'Set admin password' : 'Leave blank to keep current'}
          value={details.password || ''}
          onChange={e => setDetails(d => ({ ...d, password: e.target.value }))}
          required={isCreate} />
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
          Admin will use this password along with their phone OTP to login
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Admin Level</label>
        <select className="form-select" value={details.adminLevel}
          onChange={e => setDetails(d => ({ ...d, adminLevel: e.target.value }))}>
          {ADMIN_LEVELS.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Permissions</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_PERMISSIONS.map(p => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13,
              color: details.permissions.includes(p) ? 'var(--accent)' : 'var(--text-1)' }}>
              <input type="checkbox" checked={details.permissions.includes(p)}
                onChange={() => toggle(p)} style={{ accentColor: 'var(--accent)' }} />
              {p.replace('MANAGE_', '').replace('VIEW_', '')}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState(MODE.NONE);
  const [editTarget, setEditTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  // Create flow state
  const [createStep, setCreateStep] = useState(CREATE_STEP.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [verifiedUid, setVerifiedUid] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef([]);

  // Edit/Details form
  const [details, setDetails] = useState(emptyDetails);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

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

  // ── Open create modal (starts at phone step) ──────────────
  const openCreate = () => {
    setPhone('');
    setOtp(['', '', '', '', '', '']);
    setConfirmationResult(null);
    setVerifiedUid('');
    setVerifiedPhone('');
    setDetails(emptyDetails);
    setCreateStep(CREATE_STEP.PHONE);
    setMode(MODE.CREATE);
  };

  // ── Open edit modal ───────────────────────────────────────
  const openEdit = (admin) => {
    setDetails({
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      email: admin.email || '',
      adminLevel: admin.adminLevel || 'OPERATION_ADMIN',
      permissions: (admin.permissions || []).map(permKey).filter(Boolean),
    });
    setEditTarget(admin.uid);
    setMode(MODE.EDIT);
  };

  const closeModal = () => {
    setMode(MODE.NONE);
    setCreateStep(CREATE_STEP.PHONE);
  };

  // ── Format phone ──────────────────────────────────────────
  const formatPhone = (raw) => {
    const cleaned = raw.replace(/\D/g, '');
    if (raw.startsWith('+')) return raw.replace(/\s/g, '');
    if (cleaned.length === 10) return `+91${cleaned}`;
    return `+${cleaned}`;
  };

  // ── Step 1: Send OTP ──────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault();
    const formatted = formatPhone(phone);
    if (formatted.length < 10) { toast.error('Enter a valid phone number'); return; }
    setOtpLoading(true);
    try {
      const result = await sendOTP(formatted, 'recaptcha-container-admin');
      setConfirmationResult(result);
      setCreateStep(CREATE_STEP.OTP);
      setResendTimer(30);
      toast.success(`OTP sent to ${formatted}`);
    } catch (err) {
      const msg = err.code === 'auth/invalid-phone-number' ? 'Invalid phone number'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try later.'
        : err.message || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Step 2: Verify OTP → get UID automatically ────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setOtpLoading(true);
    try {
      const result = await confirmationResult.confirm(otpStr);
      const uid = result.user.uid;
      const formattedPhone = formatPhone(phone);
      setVerifiedUid(uid);
      setVerifiedPhone(formattedPhone);
      setCreateStep(CREATE_STEP.DETAILS);
      toast.success('Phone verified! Fill in the admin details.');
    } catch (err) {
      const msg = err.code === 'auth/invalid-verification-code' ? 'Incorrect OTP'
        : err.code === 'auth/code-expired' ? 'OTP expired. Resend.'
        : 'Verification failed';
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Step 3: Submit admin details ──────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!verifiedUid) { toast.error('Phone not verified'); return; }
    setSubmitting(true);
    try {
      await adminsAPI.create({
        uid: verifiedUid,
        phoneNumber: verifiedPhone,
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        adminLevel: details.adminLevel,
        permissions: details.permissions,
        password: details.password,
      });
      toast.success('Admin created successfully');
      closeModal();
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit submit ───────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminsAPI.update(editTarget, {
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        adminLevel: details.adminLevel,
        permissions: details.permissions,
      });
      toast.success('Admin updated');
      closeModal();
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

  // ── OTP input handlers ────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp]; next[index] = value.slice(-1); setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus(); }
  };
  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setOtpLoading(true);
    try {
      const result = await sendOTP(formatPhone(phone), 'recaptcha-container-admin');
      setConfirmationResult(result);
      setResendTimer(30);
      toast.success('OTP resent');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch { toast.error('Failed to resend'); }
    finally { setOtpLoading(false); }
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
          <button className="btn btn-secondary btn-sm" onClick={fetchAdmins}><RefreshCw size={13} /> Refresh</button>
          {user?.isSuperAdmin && (
            <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New Admin</button>
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
                <tr><th>Admin</th><th>Level</th><th>Permissions</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(admin => (
                  <tr key={admin.uid}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-0)' }}>
                        {`${admin.firstName || ''} ${admin.lastName || ''}`.trim() || '—'}
                        {admin.isSuperAdmin && <span className="badge accent" style={{ marginLeft: 6, fontSize: 10 }}>SUPER</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{admin.phoneNumber || admin.email || admin.uid?.slice(0, 16)}</div>
                    </td>
                    <td><span className={`badge ${levelColor[admin.adminLevel] || 'neutral'}`}>{admin.adminLevel}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 280 }}>
                        {(admin.permissions || []).map((p, i) => {
                          const k = permKey(p) || String(i);
                          const l = permLabel(p);
                          return l ? <span key={k} className="tag" style={{ fontSize: 10 }}>{l}</span> : null;
                        })}
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

      {/* ── CREATE MODAL (3-step) ── */}
      {mode === MODE.CREATE && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">New Admin</div>
                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                  {[CREATE_STEP.PHONE, CREATE_STEP.OTP, CREATE_STEP.DETAILS].map((s, i) => (
                    <div key={s} style={{
                      height: 3, width: 40, borderRadius: 99,
                      background: [CREATE_STEP.PHONE, CREATE_STEP.OTP, CREATE_STEP.DETAILS].indexOf(createStep) >= i
                        ? 'var(--accent)' : 'var(--bg-3)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
              </div>
              <button className="modal-close" onClick={closeModal}><X size={15} /></button>
            </div>

            {/* Step 1 — Phone */}
            {createStep === CREATE_STEP.PHONE && (
              <div style={{ animation: 'slideUp 0.2s ease' }}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                  Enter the new admin's phone number. We'll send an OTP to verify their identity.
                </p>
                <form onSubmit={handleSendOTP}>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' }} />
                      <input className="form-input" type="tel" placeholder="+91 98765 43210"
                        value={phone} onChange={e => setPhone(e.target.value)}
                        style={{ paddingLeft: 36 }} autoFocus required />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 5 }}>
                      10-digit numbers get +91 prefix automatically
                    </div>
                  </div>

                  {/* Invisible reCAPTCHA container — must be a div in the DOM */}
                  <div id="recaptcha-container-admin" />

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={otpLoading || !phone.trim()}>
                      <Phone size={14} />
                      {otpLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2 — OTP */}
            {createStep === CREATE_STEP.OTP && (
              <div style={{ animation: 'slideUp 0.2s ease' }}>
                <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16, padding: '4px 0', color: 'var(--text-2)' }}
                  onClick={() => setCreateStep(CREATE_STEP.PHONE)}>
                  <ArrowLeft size={13} /> Back
                </button>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                  Enter the OTP sent to <strong style={{ color: 'var(--text-0)' }}>{formatPhone(phone)}</strong>
                </p>
                <form onSubmit={handleVerifyOTP}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0 24px' }} onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input key={i} ref={el => otpRefs.current[i] = el}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        autoFocus={i === 0}
                        style={{
                          width: 46, height: 52, textAlign: 'center',
                          fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700,
                          background: digit ? 'var(--accent-dim)' : 'var(--bg-0)',
                          border: `1.5px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 9, color: digit ? 'var(--accent)' : 'var(--text-0)',
                          outline: 'none', transition: 'all 0.15s ease',
                        }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {resendTimer > 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                          Resend in <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{resendTimer}s</span>
                        </span>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={handleResend} disabled={otpLoading}
                          style={{ fontSize: 12, color: 'var(--text-2)', padding: '4px 0' }}>
                          <RefreshCw size={11} /> Resend
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={otpLoading || otp.join('').length !== 6}>
                        <Shield size={14} />
                        {otpLoading ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3 — Details */}
            {createStep === CREATE_STEP.DETAILS && (
              <div style={{ animation: 'slideUp 0.2s ease' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--green-dim)', border: '1px solid rgba(54,211,153,0.2)',
                  borderRadius: 9, padding: '9px 13px', marginBottom: 20,
                }}>
                  <Shield size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                    Phone verified: {verifiedPhone}
                  </span>
                </div>
                <DetailsForm
                  details={details}
                  setDetails={setDetails}
                  submitting={submitting}
                  onSubmit={handleCreateSubmit}
                  onCancel={closeModal}
                  submitLabel="Create Admin"
                  isCreate={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {mode === MODE.EDIT && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Admin</div>
              <button className="modal-close" onClick={closeModal}><X size={15} /></button>
            </div>
            <DetailsForm
                  details={details}
                  setDetails={setDetails}
                  submitting={submitting}
                  onSubmit={handleEditSubmit}
                  onCancel={closeModal}
                  submitLabel="Save Changes"
                />
          </div>
        </div>
      )}
    </div>
  );
} 
