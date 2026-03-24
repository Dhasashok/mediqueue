import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerPatient, registerDoctor, getDepartments } from '../services/api';
import API from '../services/api';
import './Auth.css';

const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const Field = ({ name, label, type, placeholder, required, value, onChange, error, children }) => (
  <div className="form-group">
    <label>{label}{required && ' *'}</label>
    {children || (
      <input type={type||'text'} placeholder={placeholder} value={value}
        onChange={e => onChange(name, e.target.value)} autoComplete="new-password" />
    )}
    {error && <p className="error">⚠ {error}</p>}
  </div>
);

/* ── OTP Screen ─────────────────────────────────────── */
const OTPScreen = ({ email, onSuccess }) => {
  const [otp, setOtp] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [hasError, setHasError] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    const t = setInterval(() => setTimer(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    setHasError(false);
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); inputs.current[5]?.focus(); }
  };

  const handleVerify = async () => {
    const otpStr = otp.join('');
    if (otpStr.length < 6) { toast.error('Please enter the complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res = await API.post('/auth/verify-otp', { email, otp: otpStr });
      if (res.data.success) {
        toast.success('✅ Email verified! Redirecting to login...');
        onSuccess();
      }
    } catch (err) {
      setHasError(true);
      toast.error(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['','','','','','']);
      setTimeout(() => { setHasError(false); inputs.current[0]?.focus(); }, 600);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await API.post('/auth/resend-otp', { email });
      toast.success('New OTP sent!');
      setTimer(60); setOtp(['','','','','','']);
      inputs.current[0]?.focus();
    } catch { toast.error('Error sending OTP.'); }
    finally { setResending(false); }
  };

  return (
    <div className="otp-page">
      <div className="otp-card">
        <div className="otp-icon-circle">📧</div>
        <h2>Verify Your Email</h2>
        <p className="otp-subtitle">We sent a 6-digit OTP to</p>
        <p className="otp-email-label">{email}</p>

        <div className="otp-container" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input key={idx} ref={el => inputs.current[idx] = el}
              className={`otp-input ${digit ? 'filled' : ''} ${hasError ? 'error' : ''}`}
              type="text" inputMode="numeric" maxLength={1} value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)} autoFocus={idx === 0} />
          ))}
        </div>

        <button className="otp-verify-btn" onClick={handleVerify}
          disabled={loading || otp.join('').length < 6}>
          {loading ? '⏳ Verifying...' : '✅ Verify OTP'}
        </button>

        <div className="otp-resend-row">
          {timer > 0 ? (
            <>Resend OTP in <strong style={{ color: '#0d9488' }}>{timer}s</strong></>
          ) : (
            <>Didn't receive it?{' '}
              <button className="otp-resend-btn" onClick={handleResend} disabled={resending}>
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
            </>
          )}
        </div>

        <div className="otp-warning">
          ⚠️ OTP is valid for <strong>10 minutes</strong>. Check spam folder if not received.
        </div>
      </div>
    </div>
  );
};

/* ── Register ────────────────────────────────────────── */
const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOTP, setShowOTP] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [form, setForm] = useState({
    first_name:'', last_name:'', email:'', phone:'',
    date_of_birth:'', gender:'', blood_group:'',
    password:'', confirm_password:'', terms: false,
    specialization:'', department_id:'', years_of_experience:'',
    medical_license_no:'', languages_known:'', consultation_fee:''
  });

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data.departments || [])).catch(()=>{});
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g,''))) e.phone = '10-digit number required';
    if (!form.date_of_birth) e.date_of_birth = 'Date of birth is required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must include one uppercase letter';
    else if (!/\d/.test(form.password)) e.password = 'Must include one number';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    if (!form.terms) e.terms = 'You must agree to the terms';
    if (role === 'doctor') {
      if (!form.specialization) e.specialization = 'Specialization required';
      if (!form.department_id) e.department_id = 'Department required';
      if (!form.years_of_experience) e.years_of_experience = 'Experience required';
      if (!form.medical_license_no.trim()) e.medical_license_no = 'License number required';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const fn = role === 'patient' ? registerPatient : registerDoctor;
      const res = await fn({ ...form, phone: form.phone.replace(/\D/g,'') });
      if (res.data.success) {
        if (role === 'patient') {
          setRegisteredEmail(form.email);
          setShowOTP(true);
          toast.info('📧 OTP sent to your email!');
        } else {
          toast.success(res.data.message);
          setTimeout(() => navigate('/login'), 1500);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  if (showOTP) {
    return <OTPScreen email={registeredEmail} onSuccess={() => setTimeout(() => navigate('/login'), 1200)} />;
  }

  return (
    <div className="auth-page">

      {/* ── Left Panel ──────────────────────────────── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <span className="auth-left-icon">🏥</span>
          <h2>Join City General Hospital</h2>
          <p>Create your account to book appointments and manage your healthcare online.</p>

          <ul className="auth-benefits">
            {['Free to register and use', 'Book appointments instantly', 'Digital QR entry pass', 'Real-time queue tracking', 'Email notifications'].map((b, i) => (
              <li key={i}><span>✓</span>{b}</li>
            ))}
          </ul>

          <div className="auth-hospital-tag">
            <span>🔒</span>
            <div>
              <strong>Your data is secure</strong>
              <small>Your health data stays private and protected.</small>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <h2 className="auth-title">Create Account</h2>

          <div className="reg-tabs">
            <button type="button" className={`reg-tab ${role==='patient'?'active':''}`}
              onClick={()=>{ setRole('patient'); setErrors({}); }}>👤 Patient</button>
            <button type="button" className={`reg-tab ${role==='doctor'?'active':''}`}
              onClick={()=>{ setRole('doctor'); setErrors({}); }}>🩺 Doctor</button>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="auth-scroll">
            <div className="form-row">
              <Field name="first_name" label="First Name" placeholder="Rahul" required
                value={form.first_name} onChange={handleChange} error={errors.first_name} />
              <Field name="last_name" label="Last Name" placeholder="Sharma" required
                value={form.last_name} onChange={handleChange} error={errors.last_name} />
            </div>

            <Field name="email" label="Email Address" type="email" placeholder="rahul@example.com" required
              value={form.email} onChange={handleChange} error={errors.email} />
            {role === 'patient' && (
              <p style={{ fontSize: '0.78rem', color: '#0d9488', marginTop: -10, marginBottom: 14, display:'flex', gap:5, alignItems:'center' }}>
                📧 An OTP will be sent to this email for verification
              </p>
            )}

            <div className="form-row">
              <Field name="phone" label="Phone Number" placeholder="9876543210" required
                value={form.phone} onChange={handleChange} error={errors.phone} />
              <Field name="date_of_birth" label="Date of Birth" type="date" required
                value={form.date_of_birth} onChange={handleChange} error={errors.date_of_birth} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender *</label>
                <select value={form.gender} onChange={e=>handleChange('gender',e.target.value)}>
                  <option value="">Select Gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
                {errors.gender && <p className="error">⚠ {errors.gender}</p>}
              </div>
              <div className="form-group">
                <label>Blood Group</label>
                <select value={form.blood_group} onChange={e=>handleChange('blood_group',e.target.value)}>
                  <option value="">Select</option>
                  {bloodGroups.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {role === 'doctor' && (
              <>
                <div className="form-group">
                  <label>Specialization *</label>
                  <select value={form.specialization} onChange={e=>{
                    handleChange('specialization',e.target.value);
                    const d = departments.find(dep=>dep.name===e.target.value);
                    if(d) handleChange('department_id',d.id);
                  }}>
                    <option value="">Select Specialization</option>
                    {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  {errors.specialization && <p className="error">⚠ {errors.specialization}</p>}
                </div>
                <div className="form-row">
                  <Field name="years_of_experience" label="Years of Experience" type="number" placeholder="10" required
                    value={form.years_of_experience} onChange={handleChange} error={errors.years_of_experience} />
                  <Field name="medical_license_no" label="Medical License No." placeholder="MCI-12345" required
                    value={form.medical_license_no} onChange={handleChange} error={errors.medical_license_no} />
                </div>
                <Field name="languages_known" label="Languages Known" placeholder="English, Hindi, Marathi"
                  value={form.languages_known} onChange={handleChange} error={errors.languages_known} />
                <Field name="consultation_fee" label="Consultation Fee (₹)" type="number" placeholder="500"
                  value={form.consultation_fee} onChange={handleChange} error={errors.consultation_fee} />
              </>
            )}

            <div className="form-row">
              <Field name="password" label="Password" type="password" placeholder="Min. 8 characters" required
                value={form.password} onChange={handleChange} error={errors.password} />
              <Field name="confirm_password" label="Confirm Password" type="password" placeholder="Repeat password" required
                value={form.confirm_password} onChange={handleChange} error={errors.confirm_password} />
            </div>

            <div className="form-group">
              <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',fontWeight:500}}>
                <input type="checkbox" checked={form.terms}
                  onChange={e=>handleChange('terms',e.target.checked)}
                  style={{width:'auto',marginTop:3,accentColor:'#0d9488'}} />
                I agree to the <a href="#!" style={{color:'#0d9488',fontWeight:700}}>Terms of Service</a> and <a href="#!" style={{color:'#0d9488',fontWeight:700}}>Privacy Policy</a>
              </label>
              {errors.terms && <p className="error">⚠ {errors.terms}</p>}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? '⏳ Creating account...' : role === 'patient' ? 'Create Account & Verify Email →' : 'Create Doctor Account →'}
            </button>
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in here</Link></p>
        </div>
      </div>

    </div>
  );
};

export default Register;