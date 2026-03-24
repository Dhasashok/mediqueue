import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDoctorById, getDoctorSlots, bookAppointment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './BookAppointment.css';

// Fix timezone — use local date not UTC
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysFromToday = (count = 7) => {
  const days = [];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
      full: formatLocalDate(d),  // ← Fixed: local date
      isToday: i === 0
    });
  }
  return days;
};

// Clean display date
const displayDate = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

const BookAppointment = () => {
  const { doctorId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [days] = useState(getDaysFromToday(7));
  const [selectedDate, setSelectedDate] = useState(getDaysFromToday(7)[0].full);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [form, setForm] = useState({ full_name: '', phone: '', age: '', gender: '', reason_for_visit: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    getDoctorById(doctorId)
      .then(r => setDoctor(r.data.doctor))
      .catch(() => navigate('/find-hospital'));
  }, [doctorId, navigate]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    getDoctorSlots(doctorId, selectedDate)
      .then(r => setSlots(r.data.slots || []))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [doctorId, selectedDate]);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.phone || !/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Valid 10-digit phone required';
    if (!form.age || form.age < 1 || form.age > 120) e.age = 'Valid age required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!selectedSlot) e.slot = 'Please select a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await bookAppointment({
        doctor_id: parseInt(doctorId),
        department_id: doctor.department_id,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        ...form,
        phone: form.phone.replace(/\D/g, '')
      });
      if (res.data.success) {
        setSuccessData(res.data.appointment);
        toast.success('🎉 Appointment booked successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!doctor) return <div className="loading-screen"><div className="spinner"></div></div>;

  // Success page
  if (successData) {
    return (
      <div className="success-page">
        <div className="success-card card">
          <div className="success-icon">✅</div>
          <h2>Appointment Booked!</h2>
          <p>Your appointment has been confirmed. Please show your QR code at the reception.</p>
          <div className="booking-summary">
            <div className="summary-row">
              <span>Booking ID</span>
              <strong>{successData.booking_id}</strong>
            </div>
            <div className="summary-row">
              <span>Doctor</span>
              <strong>Dr. {successData.first_name} {successData.last_name}</strong>
            </div>
            <div className="summary-row">
              <span>Department</span>
              <strong>{successData.dept_name}</strong>
            </div>
            <div className="summary-row">
              <span>Date</span>
              <strong>{displayDate(successData.appointment_date)}</strong>
            </div>
            <div className="summary-row">
              <span>Time Slot</span>
              <strong>{successData.time_slot}</strong>
            </div>
            <div className="summary-row">
              <span>Est. Wait</span>
              <strong>~{successData.predicted_wait_time} min</strong>
            </div>
          </div>

          {/* ML Wait Time Explanation */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 20, textAlign: 'left' }}>
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#15803d' }}>🤖 ML Predicted Wait Time</p>
            <p style={{ fontSize: '0.82rem', color: '#166534' }}>
              Estimated wait of <strong>~{successData.predicted_wait_time} minutes</strong> is calculated based on:
            </p>
            <ul style={{ fontSize: '0.8rem', color: '#166534', marginTop: 6, paddingLeft: 16 }}>
              <li>Department average consultation time</li>
              <li>Number of patients already booked</li>
              <li>Time slot demand</li>
            </ul>
          </div>

          {successData.qr_code_data && (
            <div className="qr-section">
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Your QR Entry Pass</p>
              <img src={successData.qr_code_data} alt="QR Code" className="qr-img" />
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8 }}>
                Show this at reception to join the queue
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/patient/dashboard')}>
              Go to Dashboard
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/find-hospital')}>
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <div className="breadcrumb">
            <a href="/">Home</a> <span>›</span>
            <a href="/find-hospital">Find Hospital</a> <span>›</span>
            <span>Schedule Appointment</span>
          </div>
          <h1>📅 Schedule Appointment</h1>
          <p>Select a date and 2-hour slot. Estimated wait time is predicted automatically.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container book-layout">

          {/* Left: Doctor Info */}
          <div className="book-left">
            <div className="card doc-info-card">
              <div className="book-doc-photo">{doctor.first_name[0]}{doctor.last_name[0]}</div>
              <h3>Dr. {doctor.first_name} {doctor.last_name}</h3>
              <p className="book-spec">{doctor.specialization}</p>
              <div className="book-doc-meta">
                <span>⭐ {doctor.years_of_experience} Years Exp.</span>
                <span>🗣️ {doctor.languages_known}</span>
                <span>🏥 {doctor.department_name}</span>
                <span>💰 ₹{doctor.consultation_fee}</span>
              </div>
              <div className="divider"></div>
              <div className="avail-bar">
                <span>Today's Availability</span>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${Math.min(80, slots.reduce((a, s) => a + s.booked, 0))}%` }}></div>
                </div>
              </div>
            </div>

            {/* ML Info Card */}
            <div className="card" style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h4 style={{ color: '#15803d', marginBottom: 8 }}>🤖 ML Wait Prediction</h4>
              <p style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.6 }}>
                Wait times are predicted using a <strong>Random Forest ML model</strong> trained on hospital data.
                Each slot shows estimated wait based on bookings and department load.
              </p>
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="book-right">
            <div className="card">
              <h3>Choose Date &amp; Time Slot</h3>

              <p className="book-sub">Select Date</p>
              <div className="date-picker">
                {days.map(d => (
                  <button
                    key={d.full}
                    className={`date-btn ${selectedDate === d.full ? 'active' : ''}`}
                    onClick={() => { setSelectedDate(d.full); setSelectedSlot(''); }}
                  >
                    <span className="date-day">{d.label}</span>
                    <span className="date-num">{d.date}</span>
                    <span className="date-month">{d.month}</span>
                    {d.isToday && <span className="today-dot"></span>}
                  </button>
                ))}
              </div>

              <p className="book-sub">Select 2-Hour Slot</p>
              {loadingSlots ? (
                <div className="spinner" style={{ margin: '20px auto' }}></div>
              ) : (
                <div className="slots-grid">
                  {slots.map(s => (
                    <button
                      key={s.slot}
                      className={`slot-btn ${selectedSlot === s.slot ? 'active' : ''} ${s.available === 0 ? 'full' : ''}`}
                      onClick={() => s.available > 0 && setSelectedSlot(s.slot)}
                      disabled={s.available === 0}
                    >
                      <span className="slot-time">{s.slot}</span>
                      <span className="slot-count">{s.booked}/{s.booked + s.available} booked</span>
                      {s.available > 0 && (
                        <span className="slot-wait">~{s.predicted_wait}min wait</span>
                      )}
                      {s.available === 0 && <span className="slot-full">Full</span>}
                    </button>
                  ))}
                </div>
              )}
              {errors.slot && <p className="error" style={{ marginTop: 6 }}>{errors.slot}</p>}

              <div className="divider"></div>
              <h3>Your Information</h3>

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      placeholder="Your full name"
                      value={form.full_name}
                      onChange={e => setForm({ ...form, full_name: e.target.value })}
                    />
                    {errors.full_name && <p className="error">{errors.full_name}</p>}
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      placeholder="10-digit number"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                    {errors.phone && <p className="error">{errors.phone}</p>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      placeholder="25"
                      value={form.age}
                      onChange={e => setForm({ ...form, age: e.target.value })}
                    />
                    {errors.age && <p className="error">{errors.age}</p>}
                  </div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    {errors.gender && <p className="error">{errors.gender}</p>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Reason for Visit (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of symptoms..."
                    value={form.reason_for_visit}
                    onChange={e => setForm({ ...form, reason_for_visit: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? '⏳ Booking...' : 'Schedule Appointment →'}
                </button>
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', marginTop: 10 }}>
                  After booking, a QR code will be generated as your entry pass
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookAppointment;