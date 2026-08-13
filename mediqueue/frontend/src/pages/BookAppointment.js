import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDoctorById, getDoctorSlots, bookAppointment } from '../services/api';
import './BookAppointment.css';

// Fix timezone — use local date not UTC
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ── Arrival Time Calculator ────────────────────────────────
// distributed_mins = 120 / slot_capacity (dept-specific equal share)
// turn_time = slot_start + patients_before × distributed_mins
// arrive_by   = max(turn_time - distributed_mins, slot_start - 15)
// arrive_from = max(turn_time - 2×distributed_mins, slot_start - 30)
const calcArrivalWindow = (timeSlot, patientsBefore, distributedMins) => {
  if (!timeSlot || distributedMins <= 0) return null;
  const slotStartH  = parseInt(timeSlot.split(':')[0]);
  const slotStartM  = parseInt(timeSlot.split(':')[1]) || 0;
  const slotStart   = slotStartH * 60 + slotStartM;

  const turnTime    = slotStart + patientsBefore * distributedMins;

  // arrive_by = 1 consultation before turn, min 15 min before slot
  let arriveBy   = Math.max(turnTime - distributedMins, slotStart - 15);
  // arrive_from = 2 consultations before turn, cap 30 min before slot
  let arriveFrom = Math.max(turnTime - 2 * distributedMins, slotStart - 30);
  // ensure from < by
  if (arriveFrom >= arriveBy) arriveFrom = arriveBy - distributedMins;
  arriveFrom = Math.max(arriveFrom, slotStart - 30);

  const fmt = (mins) => {
    const total = Math.round(mins);
    const h  = Math.floor(total / 60);
    const m  = total % 60;
    const suf = h < 12 ? 'AM' : 'PM';
    const hh  = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hh}:${String(m).padStart(2,'0')} ${suf}`;
  };

  return {
    turnTime:   fmt(turnTime),
    arriveFrom: fmt(arriveFrom),
    arriveBy:   fmt(arriveBy),
    position:   patientsBefore + 1,
  };
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
  //const { user } = useAuth();
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

  if (!doctor) return (
    <div>
      <section className="page-header">
        <div className="container">
          <div className="breadcrumb"><span>Home</span> <span>›</span> <span>Find Hospital</span> <span>›</span> <span>Book Appointment</span></div>
          <h1>📅 Schedule Appointment</h1>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container book-layout">
          <div className="book-left">
            <div className="card skeleton-doctor-card">
              <div className="skeleton skel-avatar"></div>
              <div className="skeleton skel-line medium"></div>
              <div className="skeleton skel-line short"></div>
              <div style={{ height: 16 }}></div>
              {[1,2,3,4].map(i => <div key={i} className="skeleton skel-line full" style={{ marginBottom: 8 }}></div>)}
            </div>
          </div>
          <div className="book-right">
            <div className="card" style={{ padding: 28 }}>
              <div className="skeleton skel-line medium" style={{ marginBottom: 20, height: 22 }}></div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[1,2,3,4,5,6,7].map(i => <div key={i} className="skeleton" style={{ width: 64, height: 80, borderRadius: 14 }}></div>)}
              </div>
              <div className="slot-skeleton-grid">
                {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton slot-skeleton"></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  // Success page
  if (successData) {
    return (
      <div className="success-page">
        <div className="success-card card">
          <div className="success-confetti-ring">🎉</div>
          <h2>Appointment Confirmed!</h2>
          <p>Your booking is confirmed. Show your QR code at reception to join the queue.</p>
          <div className="booking-summary">
            <div className="summary-row"><span>Booking ID</span><strong>{successData.booking_id}</strong></div>
            <div className="summary-row"><span>Doctor</span><strong>Dr. {successData.first_name} {successData.last_name}</strong></div>
            <div className="summary-row"><span>Department</span><strong>{successData.dept_name}</strong></div>
            <div className="summary-row"><span>Date</span><strong>{displayDate(successData.appointment_date)}</strong></div>
            <div className="summary-row"><span>Time Slot</span><strong>{successData.time_slot}</strong></div>
            <div className="summary-row"><span>Est. Wait</span><strong style={{color:'#0d9488'}}>~{successData.predicted_wait_time} min</strong></div>
          </div>

          {/* Arrival Time Guidance */}
          {(() => {
            const arrival = calcArrivalWindow(
              successData.time_slot,
              successData.patients_before ?? 0,
              parseFloat(successData.distributed_mins) || (120 / (successData.slot_capacity || 6))
            );
            if (!arrival) return null;
            return (
              <div style={{
                background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)',
                border: '1.5px solid #0d9488', borderRadius: 12,
                padding: '16px 18px', marginBottom: 16, textAlign: 'left'
              }}>
                <p style={{ fontWeight: 800, color: '#0d9488', margin: '0 0 10px',
                  fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🏥 Suggested Arrival Time
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 12, margin: '10px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Arrive From</p>
                    <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800,
                      color: '#0f172a' }}>{arrival.arriveFrom}</p>
                  </div>
                  <div style={{ color: '#0d9488', fontSize: '1.5rem', fontWeight: 300 }}>—</div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Arrive By</p>
                    <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800,
                      color: '#0f172a' }}>{arrival.arriveBy}</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 6 }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.6 }}>
                    📍 You are patient <strong>#{arrival.position}</strong> in this slot
                    &nbsp;·&nbsp; Your turn starts around <strong>{arrival.turnTime}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                    Arrival window based on {successData.dept_name} avg consultation time
                  </p>
                </div>
              </div>
            );
          })()}

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
              <p className="qr-section-title">📲 Your QR Entry Pass</p>
              <p className="qr-section-sub">Show this at reception to skip the line instantly</p>
              <img src={successData.qr_code_data} alt="QR Entry Pass" className="qr-img" />
            </div>
          )}

          <div className="success-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/dashboard')}>
              📊 Go to Dashboard
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/find-hospital')}>
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
              <p className="book-doc-name">Dr. {doctor.first_name} {doctor.last_name}</p>
              <span className="book-spec">{doctor.specialization}</span>
              <div className="book-doc-meta">
                <div className="book-doc-meta-row"><span>⭐</span><span>{doctor.years_of_experience} Years Experience</span></div>
                <div className="book-doc-meta-row"><span>🗣️</span><span>{doctor.languages_known}</span></div>
                <div className="book-doc-meta-row"><span>🏥</span><span>{doctor.department_name}</span></div>
                <div className="book-doc-meta-row"><span>💰</span><span>₹{doctor.consultation_fee} Consultation Fee</span></div>
              </div>
              <div className="avail-bar" style={{ marginTop: 16 }}>
                <div className="avail-label">
                  <span>Today's Availability</span>
                  <span>{slots.reduce((a, s) => a + s.booked, 0)} booked</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${Math.min(90, slots.reduce((a, s) => a + s.booked, 0) * 6)}%` }}></div>
                </div>
              </div>
            </div>
            <div className="ml-info-box">
              <h4>🤖 ML Wait Prediction</h4>
              <p>Wait times are predicted using a <strong>Random Forest model</strong> trained on real hospital data. Each slot shows estimated wait based on current bookings.</p>
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
                <div className="slot-skeleton-grid">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton slot-skeleton"></div>)}
                </div>
              ) : (
                <div className="slots-grid">
                  {slots.map(s => (
                    <button
                      key={s.slot}
                      className={`slot-btn ${selectedSlot === s.slot ? 'active' : ''} ${(s.available === 0 || s.is_past || s.is_leave) ? 'full' : ''}`}
                      onClick={() => !s.is_past && !s.is_leave && s.available > 0 && setSelectedSlot(s.slot)}
                      disabled={s.available === 0 || s.is_past || !!s.is_leave}
                    >
                      <span className="slot-time">{s.slot}</span>
                      {!s.is_past && !s.is_leave && (
                        <span className="slot-count">{s.booked}/{s.booked + s.available} booked</span>
                      )}
                      {!s.is_past && !s.is_leave && s.available > 0 && (
                        <span className="slot-wait">⏱ ~{s.predicted_wait}m</span>
                      )}
                      {s.is_past && <span className="slot-full">⏰ Ended</span>}
                      {!s.is_past && !!s.is_leave && <span className="slot-full">🏖 Leave</span>}
                      {!s.is_past && !s.is_leave && s.available === 0 && <span className="slot-full">Full</span>}
                    </button>
                  ))}
                </div>
              )}
              {errors.slot && <p className="error" style={{ marginTop: 6 }}>{errors.slot}</p>}

              <div className="book-form-divider"></div>

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input placeholder="Your full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                    {errors.full_name && <p className="error">{errors.full_name}</p>}
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input placeholder="10-digit number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    {errors.phone && <p className="error">{errors.phone}</p>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age *</label>
                    <input type="number" placeholder="25" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
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
                  <label>Reason for Visit <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(Optional)</span></label>
                  <textarea rows={3} placeholder="Brief description of symptoms or reason for visit..." value={form.reason_for_visit} onChange={e => setForm({ ...form, reason_for_visit: e.target.value })} />
                </div>
                <button type="submit" className="book-submit-btn" disabled={loading}>
                  {loading ? <><span>⏳</span> Booking your slot...</> : <><span>📅</span> Confirm Appointment</>}
                </button>
                <p className="book-submit-note">🔒 A QR entry pass will be generated after confirmation</p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookAppointment;