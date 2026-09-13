import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { KeyRound, Mail, Lock, CheckCircle2, User, Stethoscope, Eye, EyeOff, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import API from '../services/api';
import './Auth.css';

// ── ForgotPassword — Clean & Professional 3-step flow ────────
const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep]                 = useState(1); // 1=email, 2=otp, 3=newpass, 4=done
  const [role, setRole]                 = useState('patient');
  const [email, setEmail]               = useState('');
  const [otp, setOtp]                   = useState(['', '', '', '', '', '']);
  const [fallbackOtp, setFallbackOtp]   = useState('');
  const [newPassword, setNew]           = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showNewPass, setShowNewPass]   = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [resendCooldown, setCooldown]   = useState(0);
  const [redirectCount, setRedirectCount] = useState(5);
  const [otpError, setOtpError]         = useState(false);

  const otpInputs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    let t;
    if (resendCooldown > 0) {
      t = setInterval(() => setCooldown(c => (c > 1 ? c - 1 : 0)), 1000);
    }
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Step 1 — Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email: email.trim(), role });
      if (res.data.success) {
        toast.success('Verification code sent to your email!');
        if (res.data.fallback_otp) {
          setFallbackOtp(res.data.fallback_otp);
          toast.info(`Verification code (Backup): ${res.data.fallback_otp}`, { autoClose: 15000 });
        }
        setStep(2);
        setCooldown(30);
        setTimeout(() => otpInputs.current[0]?.focus(), 150);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — OTP Box Handlers
  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    setOtpError(false);
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) {
      otpInputs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpInputs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const chars = pasted.split('');
      const newOtp = [...otp];
      chars.forEach((c, i) => { if (i < 6) newOtp[i] = c; });
      setOtp(newOtp);
      const nextFocus = Math.min(chars.length, 5);
      otpInputs.current[nextFocus]?.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setOtpError(true);
      setError('Please enter all 6 digits of the OTP.');
      return;
    }
    setStep(3);
  };

  // Step 3 — Reset Password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const fullOtp = otp.join('');
      const res = await API.post('/auth/reset-password', {
        email: email.trim(),
        role,
        otp: fullOtp,
        newPassword
      });
      if (res.data.success) {
        toast.success('Password updated successfully!');
        setStep(4);
        let count = 5;
        const t = setInterval(() => {
          count--;
          setRedirectCount(count);
          if (count <= 0) {
            clearInterval(t);
            navigate('/login');
          }
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please check OTP and try again.');
      if (err.response?.data?.message?.toLowerCase().includes('expired')) {
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP in Step 2
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email: email.trim(), role });
      toast.success('New verification code sent!');
      if (res.data.fallback_otp) {
        setFallbackOtp(res.data.fallback_otp);
        toast.info(`Verification code (Backup): ${res.data.fallback_otp}`, { autoClose: 15000 });
      }
      setCooldown(30);
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-page" style={{ minHeight: '100vh' }}>
      <div className="otp-card" style={{ maxWidth: 460 }}>

        {/* STEP 1: Request Password Reset */}
        {step === 1 && (
          <>
            <div className="otp-icon-circle">
              <KeyRound size={32} color="#0d9488" />
            </div>
            <h2>Reset Your Password</h2>
            <p className="otp-subtitle" style={{ marginBottom: 20 }}>
              Enter your registered email address and we'll send you a 6-digit verification code.
            </p>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: '0.84rem',
                display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSendOtp} style={{ textAlign: 'left' }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Account Type
                </label>
                <div className="reg-tabs" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`reg-tab ${role === 'patient' ? 'active' : ''}`}
                    onClick={() => setRole('patient')}
                  >
                    <User size={15} style={{ marginRight: 6 }} /> Patient
                  </button>
                  <button
                    type="button"
                    className={`reg-tab ${role === 'doctor' ? 'active' : ''}`}
                    onClick={() => setRole('doctor')}
                  >
                    <Stethoscope size={15} style={{ marginRight: 6 }} /> Doctor
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    style={{
                      width: '100%', padding: '12px 14px 12px 38px',
                      border: '1.5px solid #e2e8f0', borderRadius: 10,
                      fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0d9488'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <button
                type="submit"
                className="otp-verify-btn"
                disabled={loading || !email.trim()}
                style={{ marginTop: 8 }}
              >
                {loading ? 'Sending Code...' : 'Send Verification Code →'}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.86rem', color: '#64748b' }}>
              Remember your password?{' '}
              <Link to="/login" style={{ color: '#0d9488', fontWeight: 700, textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          </>
        )}

        {/* STEP 2: Enter 6-digit OTP */}
        {step === 2 && (
          <>
            <div className="otp-icon-circle">
              <Mail size={32} color="#0d9488" />
            </div>
            <h2>Verify Reset Code</h2>
            <p className="otp-subtitle">We sent a 6-digit code to</p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#f1f5f9', padding: '5px 14px', borderRadius: 20,
              fontSize: '0.86rem', color: '#0f766e', fontWeight: 600, margin: '4px auto 16px'
            }}>
              <span>{email}</span>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                style={{
                  background: 'none', border: 'none', color: '#64748b',
                  fontSize: '0.76rem', cursor: 'pointer', textDecoration: 'underline', padding: 0
                }}
              >
                Change
              </button>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 14, color: '#b91c1c', fontSize: '0.84rem',
                display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              <div className="otp-container" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (otpInputs.current[idx] = el)}
                    className={`otp-input ${digit ? 'filled' : ''} ${otpError ? 'error' : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1}`}
                  />
                ))}
              </div>

              {fallbackOtp && (
                <p style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
                  fontSize: '0.8rem', padding: '6px 12px', borderRadius: 8, marginTop: 12
                }}>
                  Backup Code: <strong>{fallbackOtp}</strong>
                </p>
              )}

              <button
                type="submit"
                className="otp-verify-btn"
                disabled={otp.join('').length !== 6}
              >
                Verify Code →
              </button>
            </form>

            <div className="otp-resend-row" style={{ marginTop: 18 }}>
              {resendCooldown > 0 ? (
                <span>Resend code in <strong>{resendCooldown}s</strong></span>
              ) : (
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResend}
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={13} /> Resend Verification Code
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                marginTop: 20, background: 'none', border: 'none', color: '#64748b',
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back to email
            </button>
          </>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 3 && (
          <>
            <div className="otp-icon-circle">
              <Lock size={32} color="#0d9488" />
            </div>
            <h2>Create New Password</h2>
            <p className="otp-subtitle" style={{ marginBottom: 20 }}>
              Choose a strong, secure password for your account.
            </p>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: '0.84rem',
                display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} style={{ textAlign: 'left' }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNew(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoFocus
                    style={{
                      width: '100%', padding: '12px 40px 12px 14px',
                      border: '1.5px solid #e2e8f0', borderRadius: 10,
                      fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0d9488'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0
                    }}
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{
                      width: '100%', padding: '12px 40px 12px 14px',
                      border: `1.5px solid ${confirm && confirm !== newPassword ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: 10, fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0d9488'}
                    onBlur={e => e.target.style.borderColor = confirm && confirm !== newPassword ? '#ef4444' : '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0
                    }}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirm && confirm !== newPassword && (
                  <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="otp-verify-btn"
                disabled={loading || !newPassword || newPassword !== confirm || newPassword.length < 6}
              >
                {loading ? 'Updating Password...' : 'Reset Password →'}
              </button>
            </form>
          </>
        )}

        {/* STEP 4: Success Message */}
        {step === 4 && (
          <div style={{ padding: '12px 0' }}>
            <div className="otp-icon-circle" style={{ background: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={36} color="#059669" />
            </div>
            <h2>Password Changed!</h2>
            <p className="otp-subtitle" style={{ marginBottom: 20 }}>
              Your account password has been updated securely. You can now log in with your new credentials.
            </p>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 24 }}>
              Redirecting to login in <strong>{redirectCount}s</strong>...
            </p>
            <button
              onClick={() => navigate('/login')}
              className="otp-verify-btn"
            >
              Sign In Now →
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;