import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const roles = ['patient', 'doctor', 'admin'];
const roleIcons = { patient: '👤', doctor: '🩺', admin: '⚙️' };
const roleLabels = { patient: 'Patient', doctor: 'Doctor', admin: 'Admin' };

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await login({ ...form, role });
      if (res.success) {
        toast.success(`Welcome back, ${res.user.name}!`);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left Panel ──────────────────────────────── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <span className="auth-left-icon">🏥</span>
          <h2>Welcome Back to City General Hospital</h2>
          <p>Sign in to manage your appointments, view your QR tickets, and track your queue status in real-time.</p>

          <ul className="auth-benefits">
            {['Book appointments in 2 minutes', 'Get your QR code instantly', 'Track real-time queue status', 'View predicted wait times'].map((b, i) => (
              <li key={i}><span>✓</span>{b}</li>
            ))}
          </ul>

          <div className="auth-hospital-tag">
            <span>🏥</span>
            <div>
              <strong>City General Hospital, Pune</strong>
              <small>12 Departments · 200+ Doctors · Online 24/7</small>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <h2 className="auth-title">Sign In</h2>
          <p className="auth-sub">Enter your credentials to access your account</p>

          {/* Role selector */}
          <div className="role-tabs">
            {roles.map(r => (
              <button key={r} type="button"
                className={`role-tab ${role === r ? 'active' : ''}`}
                onClick={() => { setRole(r); setErrors({}); }}>
                {roleIcons[r]} {roleLabels[r]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email" placeholder="you@example.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                autoComplete="off"
              />
              {errors.email && <p className="error">⚠ {errors.email}</p>}
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password" placeholder="Enter your password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                autoComplete="off"
              />
              {errors.password && <p className="error">⚠ {errors.password}</p>}
              <p style={{ textAlign: 'right', marginTop: 8 }}>
                <a href="#!" style={{ color: '#0d9488', fontSize: '0.8rem', fontWeight: 600 }}>Forgot Password?</a>
              </p>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </form>

          {role !== 'admin' && (
            <p className="auth-switch" style={{ marginTop: 24 }}>
              Don't have an account? <Link to="/register">Create one here</Link>
            </p>
          )}
        </div>
      </div>

    </div>
  );
};

export default Login;