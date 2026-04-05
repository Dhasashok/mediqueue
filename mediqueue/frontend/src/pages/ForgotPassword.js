import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

// ── ForgotPassword — 3-step flow ─────────────────────────────
// Step 1: Enter email + role → backend sends OTP
// Step 2: Enter OTP from email
// Step 3: Enter new password → done
// ─────────────────────────────────────────────────────────────

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1); // 1=email, 2=otp, 3=newpass, 4=done
  const [role, setRole]         = useState('patient');
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [newPassword, setNew]   = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [resendCooldown, setCooldown] = useState(0);
  const [redirectCount, setRedirectCount] = useState(5);

  const startCooldown = () => {
    setCooldown(30);
    const t = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  // Step 1 — Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email.');
    setLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email: email.trim(), role });
      if (res.data.success) {
        setStep(2);
        startCooldown();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  // Step 2 — Verify OTP
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) return setError('OTP must be 6 digits.');
    setStep(3);
  };

  // Step 3 — Reset Password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const res = await API.post('/auth/reset-password', {
        email: email.trim(), role, otp: otp.trim(), newPassword
      });
      if (res.data.success) {
        setStep(4);
        // Auto-redirect to login after 5 seconds
        let count = 5;
        const t = setInterval(() => {
          count--;
          setRedirectCount(count);
          if (count <= 0) { clearInterval(t); navigate('/login'); }
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Check OTP and try again.');
      if (err.response?.data?.message?.includes('expired')) setStep(2);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim(), role });
      startCooldown();
    } catch (err) {
      setError('Failed to resend OTP.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
            {step === 4 ? 'Password Reset!' : 'Forgot Password?'}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: '0.9rem' }}>
            {step === 1 && 'Enter your email and we\'ll send you a reset OTP'}
            {step === 2 && `OTP sent to ${email}. Check your inbox.`}
            {step === 3 && 'Create your new password'}
            {step === 4 && 'You can now log in with your new password'}
          </p>
        </div>

        {/* Progress dots */}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{
                width: s === step ? 28 : 10, height: 10, borderRadius: 5,
                background: s < step ? '#0d9488' : s === step ? '#0d9488' : '#e2e8f0',
                transition: 'all 0.3s ease'
              }} />
            ))}
          </div>
        )}

        <div className="card" style={{ padding: 32 }}>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#b91c1c', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1 — Email + Role */}
          {step === 1 && (
            <form onSubmit={handleSendOtp}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--navy)' }}>Account Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['patient','👤 Patient'], ['doctor','🩺 Doctor']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setRole(val)}
                      style={{
                        padding: '10px 16px', borderRadius: 10, border: `2px solid ${role === val ? '#0d9488' : '#e2e8f0'}`,
                        background: role === val ? '#f0fdf4' : '#fff', color: role === val ? '#0d9488' : '#64748b',
                        fontWeight: role === val ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--navy)' }}>Email Address</label>
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? '#94a3b8' : '#0d9488', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? '⏳ Sending OTP...' : 'Send OTP →'}
              </button>
            </form>
          )}

          {/* STEP 2 — OTP Entry */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--navy)' }}>Enter 6-digit OTP</label>
                <input
                  type="text" required maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                  placeholder="123456"
                  autoFocus
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '1.4rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: 8, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8 }}>
                  OTP valid for 10 minutes. Check spam folder if not received.
                </p>
              </div>

              <button type="submit" disabled={otp.length !== 6}
                style={{ width: '100%', padding: '13px', background: otp.length !== 6 ? '#94a3b8' : '#0d9488', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: otp.length !== 6 ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
                Verify OTP →
              </button>

              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                  style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? '#94a3b8' : '#0d9488', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : '↻ Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3 — New Password */}
          {step === 3 && (
            <form onSubmit={handleReset}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--navy)' }}>New Password</label>
                <input
                  type="password" required
                  value={newPassword} onChange={e => setNew(e.target.value)}
                  placeholder="Min 6 characters"
                  autoFocus
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--navy)' }}>Confirm Password</label>
                <input
                  type="password" required
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  style={{ width: '100%', padding: '12px 16px', border: `2px solid ${confirm && confirm !== newPassword ? '#ef4444' : '#e2e8f0'}`, borderRadius: 10, fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                {confirm && confirm !== newPassword && (
                  <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={loading || newPassword !== confirm || newPassword.length < 6}
                style={{ width: '100%', padding: '13px', background: (loading || newPassword !== confirm || newPassword.length < 6) ? '#94a3b8' : '#0d9488', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                {loading ? '⏳ Resetting...' : 'Reset Password →'}
              </button>
            </form>
          )}

          {/* STEP 4 — Success */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <p style={{ color: '#15803d', fontWeight: 600, fontSize: '1rem', marginBottom: 24 }}>
                Password reset successfully!
              </p>
              <p style={{ fontSize:'0.82rem', color:'var(--muted)', marginBottom:12 }}>
                Redirecting to login in {redirectCount}s...
              </p>
              <button onClick={() => navigate('/login')}
                style={{ width: '100%', padding: '13px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                Go to Login Now →
              </button>
            </div>
          )}
        </div>

        {/* Back to login */}
        {step < 4 && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--muted)' }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;