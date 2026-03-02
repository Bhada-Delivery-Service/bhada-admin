// =============================================================================
// pages/ProfilePage.jsx  —  Bhada Admin — My Profile
// Admin can manage their own name, profile image, address.
// Password change is gated behind Firebase phone OTP verification.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Mail, Phone, MapPin, Camera, Lock, ShieldCheck,
  Save, Eye, EyeOff, RefreshCw, CheckCircle, ArrowLeft, Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sendOTP, verifyOTP, auth } from '../services/firebase';

// ─── Small helpers ────────────────────────────────────────────────────────────
function Avatar({ imageUrl, initials, size = 80 }) {
  const [err, setErr] = useState(false);
  if (imageUrl && !err) {
    return (
      <img
        src={imageUrl}
        alt="Profile"
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size / 2.5, fontWeight: 700,
      border: '3px solid var(--accent)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: 'var(--bg-1)', borderRadius: 14,
      border: '1px solid var(--border)',
      padding: '24px 28px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="var(--accent)" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 12px',
        color: 'var(--text-1)', fontSize: 14,
        outline: 'none', transition: 'border-color 0.15s',
        ...(props.style || {}),
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

// ─── OTP Password Change Modal ────────────────────────────────────────────────
function ChangePasswordModal({ phoneNumber, onClose, onSuccess }) {
  const [step, setStep]         = useState('idle'); // idle | sending | otp | changing | done
  const [otp, setOtp]           = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [busy, setBusy]         = useState(false);
  const recaptchaId             = 'recaptcha-pw-modal';

  const handleSendOtp = async () => {
    if (!phoneNumber) return toast.error('Phone number not found on your profile');
    setBusy(true);
    setStep('sending');
    try {
      const result = await sendOTP(phoneNumber, recaptchaId);
      setConfirmResult(result);
      setStep('otp');
      toast.success(`OTP sent to ${phoneNumber}`);
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
      setStep('idle');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP');
    setBusy(true);
    try {
      // Verify OTP client-side via Firebase (gets idToken)
      await verifyOTP(confirmResult, otp);
      // Store OTP hash on backend for password change step
      await adminsAPI.storePasswordOtp(otp);
      setStep('changing');
    } catch (err) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd.length < 8)       return toast.error('Password must be at least 8 characters');
    if (newPwd !== confirmPwd)   return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await adminsAPI.changePassword({ otp, newPassword: newPwd });
      toast.success('Password changed successfully!');
      setStep('done');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      {/* Invisible recaptcha container */}
      <div id={recaptchaId} style={{ display: 'none' }} />

      <div style={{ background: 'var(--bg-1)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 420, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={18} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Change Password</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Verify your identity via OTP</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 20 }}>×</button>
        </div>

        {/* Step: idle — send OTP */}
        {step === 'idle' && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
              We will send a one-time password (OTP) to your registered phone number
              <strong style={{ color: 'var(--text-1)' }}> {phoneNumber}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendOtp} disabled={busy} style={{ flex: 1 }}>
                {busy ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Step: sending */}
        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="loader" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Sending OTP to {phoneNumber}…</p>
          </div>
        )}

        {/* Step: OTP entry */}
        {step === 'otp' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
              Enter the 6-digit OTP sent to <strong style={{ color: 'var(--text-1)' }}>{phoneNumber}</strong>
            </p>
            <FormRow label="OTP Code">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ fontSize: 22, letterSpacing: '0.3em', textAlign: 'center' }}
              />
            </FormRow>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep('idle')}>← Back</button>
              <button className="btn btn-primary" onClick={handleVerifyOtp} disabled={busy || otp.length < 6} style={{ flex: 1 }}>
                {busy ? 'Verifying…' : 'Verify OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Step: new password */}
        {step === 'changing' && (
          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.25)' }}>
              <CheckCircle size={16} color="#22c55e" />
              <span style={{ fontSize: 13, color: '#22c55e' }}>OTP verified successfully</span>
            </div>
            <FormRow label="New Password">
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  style={{ paddingRight: 40 }}
                  required
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormRow>
            <FormRow label="Confirm Password">
              <Input
                type={showPwd ? 'text' : 'password'}
                placeholder="Repeat new password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                required
              />
              {confirmPwd && newPwd !== confirmPwd && (
                <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>Passwords do not match</p>
              )}
            </FormRow>
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Changing Password…' : 'Change Password'}
            </button>
          </form>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle size={40} color="#22c55e" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 600, fontSize: 15 }}>Password Changed!</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>Your password has been updated successfully.</p>
            <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 20, width: '100%' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, login } = useAuth();

  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    profileImageUrl: '',
    address: {
      street: '', city: '', state: '', postalCode: '',
      country: 'India', area: '', buildingOrFlat: '',
      contactNumber: '', contactPerson: '', instruction: '',
    },
  });

  const fileInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminsAPI.getMe();
      const p = data.data;
      setProfile(p);
      setForm({
        firstName:       p.firstName || '',
        lastName:        p.lastName  || '',
        profileImageUrl: p.profileImageUrl || '',
        address: {
          street:         p.address?.street         || '',
          city:           p.address?.city           || '',
          state:          p.address?.state          || '',
          postalCode:     p.address?.postalCode     || '',
          country:        p.address?.country        || 'India',
          area:           p.address?.area           || '',
          buildingOrFlat: p.address?.buildingOrFlat || '',
          contactNumber:  p.address?.contactNumber  || '',
          contactPerson:  p.address?.contactPerson  || '',
          instruction:    p.address?.instruction    || '',
        },
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await adminsAPI.updateMe(form);
      setProfile(data.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB for direct upload');

    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setForm(f => ({ ...f, profileImageUrl: dataUrl }));
        toast.success('Image ready — click Save Profile to apply');
      };
      reader.onerror = () => toast.error('Failed to read image file');
      reader.readAsDataURL(file);
    } finally {
      setImageUploading(false);
    }
  };

  const initials = () => {
    const n = (profile?.firstName || '') + (profile?.lastName || '');
    return n.charAt(0).toUpperCase() || 'A';
  };

  const roleLabel = () => {
    if (profile?.adminLevel === 'SUPER_ADMIN') return 'Super Admin';
    return (profile?.adminLevel || 'Admin').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 780 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your name, avatar, address and password</p>
        </div>
        <button onClick={fetchProfile} className="btn btn-secondary">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* ── Profile Card ────────────────────────────────────────────── */}
        <SectionCard title="Profile Info" icon={User}>
          {/* Avatar + basic info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar imageUrl={form.profileImageUrl} initials={initials()} size={88} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent)', border: '2px solid var(--bg-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}
                title="Change profile photo"
              >
                <Camera size={13} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
            </div>

            {/* Name + role */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
                {profile?.firstName} {profile?.lastName}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                  {roleLabel()}
                </span>
                <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                  Active
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Mail size={12} /> {profile?.email || '—'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <Phone size={12} /> {profile?.phoneNumber || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Profile image URL field */}
          <FormRow label="Profile Image URL">
            <Input
              type="url"
              placeholder="https://example.com/avatar.jpg  (or use the camera button above)"
              value={form.profileImageUrl}
              onChange={e => setForm(f => ({ ...f, profileImageUrl: e.target.value }))}
            />
          </FormRow>

          {/* Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormRow label="First Name">
              <Input
                type="text"
                placeholder="First name"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                required
              />
            </FormRow>
            <FormRow label="Last Name">
              <Input
                type="text"
                placeholder="Last name"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                required
              />
            </FormRow>
          </div>

          {/* Read-only info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
            <FormRow label="Email (read-only)">
              <Input value={profile?.email || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </FormRow>
            <FormRow label="Phone (read-only)">
              <Input value={profile?.phoneNumber || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </FormRow>
          </div>

          {/* Admin info chips */}
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Details</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }}>
                Level: {profile?.adminLevel?.replace(/_/g, ' ') || '—'}
              </span>
              {(profile?.permissions || []).map(p => (
                <span key={typeof p === 'string' ? p : p?.value} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
                  {(typeof p === 'string' ? p : p?.value || '').replace('MANAGE_', '').replace('VIEW_', '')}
                </span>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Address ─────────────────────────────────────────────────── */}
        <SectionCard title="Address" icon={MapPin}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Building / Flat',  key: 'buildingOrFlat', placeholder: 'Flat 4B, Tower A' },
              { label: 'Area / Locality',  key: 'area',           placeholder: 'Andheri West' },
              { label: 'Street',           key: 'street',         placeholder: '14, Link Road' },
              { label: 'City',             key: 'city',           placeholder: 'Mumbai' },
              { label: 'State',            key: 'state',          placeholder: 'Maharashtra' },
              { label: 'Postal Code',      key: 'postalCode',     placeholder: '400053' },
              { label: 'Country',          key: 'country',        placeholder: 'India' },
              { label: 'Contact Person',   key: 'contactPerson',  placeholder: 'Your name' },
              { label: 'Contact Number',   key: 'contactNumber',  placeholder: '+91 98765 43210' },
            ].map(({ label, key, placeholder }) => (
              <FormRow key={key} label={label}>
                <Input
                  placeholder={placeholder}
                  value={form.address[key] || ''}
                  onChange={e => setForm(f => ({ ...f, address: { ...f.address, [key]: e.target.value } }))}
                />
              </FormRow>
            ))}
          </div>
        </SectionCard>

        {/* Save button */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 20 }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 140 }}>
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* ── Password Section ─────────────────────────────────────────── */}
      <SectionCard title="Password & Security" icon={Lock}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
          To change your password, we'll send a one-time passcode (OTP) to your registered phone number
          <strong style={{ color: 'var(--text-1)' }}> {profile?.phoneNumber || '—'}</strong> to verify your identity.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowPwModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Key size={15} />
            Change Password via OTP
          </button>
        </div>
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', fontSize: 13, color: 'var(--text-2)' }}>
          <ShieldCheck size={13} style={{ display: 'inline', marginRight: 6, color: 'var(--accent)' }} />
          Your password is stored securely using bcrypt hashing. It is never stored in plain text.
        </div>
      </SectionCard>

      {/* Password change modal */}
      {showPwModal && (
        <ChangePasswordModal
          phoneNumber={profile?.phoneNumber}
          onClose={() => setShowPwModal(false)}
          onSuccess={() => {
            setShowPwModal(false);
          }}
        />
      )}
    </div>
  );
}