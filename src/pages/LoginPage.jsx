import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sendOTP, verifyOTP } from '../services/firebase';

const STEP = { PHONE: 'phone', OTP: 'otp', PASSWORD: 'password' };

export default function LoginPage() {
  const [step, setStep] = useState(STEP.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [adminPassword, setAdminPassword] = useState('');
  const [idToken, setIdToken] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const formatPhone = (raw) => {
    const cleaned = raw.replace(/\D/g, '');
    if (raw.startsWith('+')) return raw.replace(/\s/g, '');
    if (cleaned.length === 10) return `+91${cleaned}`;
    return `+${cleaned}`;
  };

  // Step 1 — Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    const formatted = formatPhone(phone);
    if (formatted.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const result = await sendOTP(formatted);
      setConfirmationResult(result);
      setStep(STEP.OTP);
      setResendTimer(30);
      toast.success(`OTP sent to ${formatted}`);
    } catch (err) {
      const msg = err.code === 'auth/invalid-phone-number'
        ? 'Invalid phone number format'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Try again later.'
        : err.message || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const token = await verifyOTP(confirmationResult, otpStr);
      setIdToken(token);
      setStep(STEP.PASSWORD);
      toast.success('Phone verified! Enter your admin password.');
    } catch (err) {
      const msg = err.code === 'auth/invalid-verification-code'
        ? 'Incorrect OTP. Please try again.'
        : err.code === 'auth/code-expired'
        ? 'OTP expired. Please resend.'
        : 'Verification failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminPassword) { toast.error('Enter your admin password'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.loginAdmin(idToken, adminPassword);
      login(data.accessToken, data.refreshToken, data.user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // OTP box handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      const result = await sendOTP(formatPhone(phone));
      setConfirmationResult(result);
      setResendTimer(30);
      toast.success('OTP resent!');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch { toast.error('Failed to resend OTP'); }
    finally { setLoading(false); }
  };

  const stepIndex = { [STEP.PHONE]: 0, [STEP.OTP]: 1, [STEP.PASSWORD]: 2 };

  return (
    <div className="login-page">
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      }} />

      <div className="login-card" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-mark">B</div>
          <div>
            <div className="login-logo-text">Bhada</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.1em' }}>ADMIN CONSOLE</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: 3, flex: 1, borderRadius: 99,
              background: stepIndex[step] >= i ? 'var(--accent)' : 'var(--bg-3)',
              transition: 'background 0.35s ease',
              boxShadow: stepIndex[step] >= i ? '0 0 8px var(--accent-glow)' : 'none',
            }} />
          ))}
        </div>

        {/* ─── STEP 1: Phone Number ─── */}
        {step === STEP.PHONE && (
          <div style={{ animation: 'slideUp 0.22s ease' }}>
            <h1 className="login-title">Enter Phone Number</h1>
            <p className="login-sub">We'll send an OTP to verify your identity</p>

            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' }} />
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ paddingLeft: 38 }}
                    autoFocus
                    required
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6 }}>
                  Include country code — e.g. +91 for India. 10-digit numbers get +91 automatically.
                </div>
              </div>

              <button
                id="send-otp-btn"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15, marginTop: 4 }}
                disabled={loading || !phone.trim()}
              >
                <Phone size={15} />
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </div>
        )}

        {/* ─── STEP 2: OTP ─── */}
        {step === STEP.OTP && (
          <div style={{ animation: 'slideUp 0.22s ease' }}>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18, padding: '4px 0', color: 'var(--text-2)' }}
              onClick={() => { setStep(STEP.PHONE); setOtp(['','','','','','']); }}>
              <ArrowLeft size={14} /> Back
            </button>

            <h1 className="login-title">Enter OTP</h1>
            <p className="login-sub">
              6-digit code sent to{' '}
              <strong style={{ color: 'var(--text-0)' }}>{formatPhone(phone)}</strong>
            </p>

            <form onSubmit={handleVerifyOTP}>
              {/* OTP boxes */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '28px 0' }} onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    style={{
                      width: 48, height: 56,
                      textAlign: 'center',
                      fontSize: 22,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      background: digit ? 'var(--accent-dim)' : 'var(--bg-0)',
                      border: `1.5px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10,
                      color: digit ? 'var(--accent)' : 'var(--text-0)',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      caretColor: 'var(--accent)',
                    }}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15 }}
                disabled={loading || otp.join('').length !== 6}
              >
                <Shield size={15} />
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                {resendTimer > 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    Resend in{' '}
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {resendTimer}s
                    </span>
                  </span>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleResend} disabled={loading}
                    style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    <RefreshCw size={12} /> Resend OTP
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ─── STEP 3: Admin Password ─── */}
        {step === STEP.PASSWORD && (
          <div style={{ animation: 'slideUp 0.22s ease' }}>
            {/* Success pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--green-dim)', border: '1px solid rgba(54,211,153,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 24,
            }}>
              <Shield size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                Phone number verified ✓
              </span>
            </div>

            <h1 className="login-title">Admin Password</h1>
            <p className="login-sub">Enter your admin console password to complete sign-in</p>

            <form onSubmit={handleAdminLogin}>
              <div className="form-group" style={{ marginTop: 24 }}>
                <label className="form-label">Admin Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' }} />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    style={{ paddingLeft: 38 }}
                    autoFocus
                    required
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6 }}>
                  Default: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>admin@123</span>
                  {' '}— set via <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>ADMIN_PASSWORD</span> env var
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15, marginTop: 8 }}
                disabled={loading || !adminPassword}
              >
                <KeyRound size={15} />
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
