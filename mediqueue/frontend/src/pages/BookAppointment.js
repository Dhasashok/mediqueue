import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Star,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Check,
  ArrowRight,
  Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDoctorById, getDoctorSlots, bookAppointment } from '../services/api';
import './BookAppointment.css';

// Local date formatting YYYY-MM-DD
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Arrival window calculation (Department-specific)
const calcArrivalWindow = (timeSlot, patientsBefore, distributedMins) => {
  if (!timeSlot) return null;
  const dist = (distributedMins && distributedMins > 0) ? parseFloat(distributedMins) : 20;

  const slotStartH  = parseInt(timeSlot.split(':')[0], 10);
  const slotStartM  = parseInt(timeSlot.split(':')[1], 10) || 0;
  const slotStart   = slotStartH * 60 + slotStartM;

  const position     = (patientsBefore != null ? parseInt(patientsBefore, 10) : 0) + 1;
  const consultStart = slotStart + (position - 1) * dist;
  const consultEnd   = consultStart + dist;

  const buffer     = Math.max(15, Math.min(30, Math.round(dist)));
  const arriveFrom = Math.max(0, consultStart - buffer);
  const arriveBy   = consultStart;

  const fmt = (mins) => {
    const total = Math.round(mins);
    const h  = Math.floor(total / 60);
    const m  = total % 60;
    const suf = h < 12 ? 'AM' : 'PM';
    const hh  = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hh}:${String(m).padStart(2, '0')} ${suf}`;
  };

  return {
    turnTime:     `${fmt(consultStart)} – ${fmt(consultEnd)}`,
    consultStart: fmt(consultStart),
    consultEnd:   fmt(consultEnd),
    arriveFrom:   fmt(arriveFrom),
    arriveBy:     fmt(arriveBy),
    position:     position,
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
      full: formatLocalDate(d),
      isToday: i === 0
    });
  }
  return days;
};

const displayDate = (dateStr) => {
  if (!dateStr) return '';
  const raw = dateStr.split('T')[0];
  const parts = raw.split('-');
  if (parts.length === 3) {
    const y = parts[0], m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d} ${months[m - 1]} ${y}`;
  }
  return raw;
};

const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { user } = useAuth();

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
  const [copiedId, setCopiedId] = useState(false);

  // Auto-fill form from logged-in user profile
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        full_name: prev.full_name || user.name || (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : ''),
        phone: prev.phone || user.phone || '',
        age: prev.age || (user.age ? String(user.age) : ''),
        gender: prev.gender || user.gender || ''
      }));
    }
  }, [user]);

  const handleCopyBookingId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('Booking ID copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

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

  const handleSlotSelect = (slotTime) => {
    setSelectedSlot(slotTime);
    // On mobile, gently scroll down so user sees the active slot reflected and form ready
    if (window.innerWidth < 768 && formRef.current) {
      setTimeout(() => {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const validate = () => {
    const e = {};
    if (!selectedSlot) e.slot = 'Please choose a time slot on the left';
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.phone || !/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Valid 10-digit phone required';
    const ageNum = parseInt(form.age, 10);
    if (!form.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      e.age = 'Age must be 1 – 120';
    }
    if (!form.gender) e.gender = 'Gender is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      if (errors.slot && !selectedSlot) {
        toast.info('Please click an available time slot above.');
      }
      return;
    }
    setLoading(true);
    try {
      const res = await bookAppointment({
        doctor_id: parseInt(doctorId, 10),
        department_id: doctor.department_id,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        ...form,
        phone: form.phone.replace(/\D/g, '')
      });
      if (res.data.success) {
        setSuccessData(res.data.appointment);
        toast.success('Appointment confirmed!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton state
  if (!doctor) return (
    <div className="book-page">
      <div className="container book-unified-container" style={{ paddingTop: 32 }}>
        <div className="skeleton-grid">
          <div className="skeleton" style={{ height: 260, borderRadius: 16 }}></div>
          <div className="skeleton" style={{ height: 420, borderRadius: 16 }}></div>
        </div>
      </div>
    </div>
  );

  // Success screen — Digital Boarding Pass Ticket
  if (successData) {
    const patientsBefore = successData.patients_before != null
      ? successData.patients_before
      : (successData.queue_position ? successData.queue_position - 1 : 0);

    const distMins = successData.distributed_mins
      ? parseFloat(successData.distributed_mins)
      : (successData.consultation_avg ? parseFloat(successData.consultation_avg) : 20);

    const arrival = successData.time_slot
      ? calcArrivalWindow(successData.time_slot, patientsBefore, distMins)
      : null;

    return (
      <div className="success-page">
        <div className="success-ticket-card">
          {/* Main Details Column */}
          <div className="st-main-section">
            <div className="st-header">
              <div className="st-header-badge-row">
                <div className="st-icon-badge">
                  <CheckCircle2 size={26} color="#10b981" />
                </div>
                <div className="st-header-text">
                  <h2>Appointment Confirmed!</h2>
                  <p>Your hospital OPD consultation slot has been reserved.</p>
                </div>
              </div>
            </div>

            <div className="st-body">
              {/* Full-width Booking ID banner with 1-click Copy */}
              <div className="st-booking-banner">
                <div className="st-bb-info">
                  <span className="st-bb-label">CONFIRMED BOOKING ID</span>
                  <strong className="st-bb-code">{successData.booking_id}</strong>
                </div>
                <button
                  type="button"
                  className="btn-copy-booking"
                  onClick={() => handleCopyBookingId(successData.booking_id)}
                  title="Copy Booking ID"
                >
                  {copiedId ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Summary Details Grid */}
              <div className="st-summary-grid">
                <div className="st-item">
                  <span>Doctor</span>
                  <strong>Dr. {successData.first_name} {successData.last_name}</strong>
                </div>
                <div className="st-item">
                  <span>Department</span>
                  <strong>{successData.dept_name}</strong>
                </div>
                <div className="st-item">
                  <span>Appointment Date</span>
                  <strong>{displayDate(successData.appointment_date)}</strong>
                </div>
                <div className="st-item">
                  <span>Time Slot Window</span>
                  <strong className="st-val-highlight">{successData.time_slot}</strong>
                </div>
                <div className="st-item">
                  <span>Est. Wait Time</span>
                  <strong style={{ color: '#0d9488' }}>~{successData.predicted_wait_time} min</strong>
                </div>
                {doctor?.consultation_fee && (
                  <div className="st-item">
                    <span>Consultation Fee</span>
                    <strong style={{ color: '#0f766e' }}>₹{parseInt(doctor.consultation_fee, 10).toLocaleString('en-IN')}</strong>
                  </div>
                )}
              </div>

              {/* Personalized Arrival Window */}
              {arrival && (
                <div className="st-arrival-box">
                  <div className="st-arrival-title">
                    <Clock size={15} color="#0d9488" />
                    <span>Personalized Arrival Window</span>
                  </div>
                  <div className="st-arrival-times">
                    <div>
                      <span className="st-arrival-lbl">Arrive From</span>
                      <strong className="st-arrival-val">{arrival.arriveFrom}</strong>
                    </div>
                    <span className="st-arrival-arrow">→</span>
                    <div>
                      <span className="st-arrival-lbl">Arrive By</span>
                      <strong className="st-arrival-val">{arrival.arriveBy}</strong>
                    </div>
                  </div>
                  <p className="st-arrival-note">
                    Queue Position: <strong>#{arrival.position}</strong> · Doctor Consultation Slot: <strong>{arrival.turnTime}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Perforated Divider */}
          <div className="st-perforated-wrap">
            <span className="st-notch st-notch-top-or-left"></span>
            <div className="st-divider-line"></div>
            <span className="st-notch st-notch-bottom-or-right"></span>
          </div>

          {/* QR Entry Pass & Actions Column */}
          <div className="st-pass-section">
            <div className="st-pass-content">
              <div className="st-qr-title">
                <QrCode size={18} color="#0d9488" />
                <span>Digital Entry Pass</span>
              </div>
              {successData.qr_code_data ? (
                <img src={successData.qr_code_data} alt="QR Entry Pass" className="st-qr-img" />
              ) : (
                <div className="st-qr-img skeleton" style={{ width: 140, height: 140 }}></div>
              )}
              <span className="st-qr-hint">Scan at Hospital Reception / OPD Kiosk</span>
            </div>

            <div className="st-footer-actions">
              <button
                type="button"
                className="btn btn-primary st-btn-primary"
                onClick={() => navigate('/patient/dashboard')}
              >
                <span>Go to My Queue</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="btn btn-outline st-btn-secondary"
                onClick={() => navigate('/find-hospital')}
              >
                Book Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Doctor image resolution
  const isFemale = (doctor.gender === 'Female') ||
    doctor.first_name.toLowerCase().includes('nisha') ||
    doctor.first_name.toLowerCase().includes('priya');

  const fallbackPhoto = isFemale
    ? 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80';

  const photoUrl = doctor.profile_image_url || fallbackPhoto;

  // Clean deduplicated specialization title
  const cleanSpecialization = (doctor.specialization && doctor.department_name && doctor.specialization.trim().toLowerCase() === doctor.department_name.trim().toLowerCase())
    ? (doctor.specialization.toLowerCase().includes('dent') ? 'Dental Care Specialist' : doctor.specialization)
    : (doctor.specialization ? `${doctor.specialization} · ${doctor.department_name}` : doctor.department_name);

  return (
    <div className="book-page">
      {/* ── Mobile Top Navigation ────────────────────────────── */}
      <div className="book-mobile-topbar">
        <div className="book-topbar-inner">
          <Link
            to={`/department/${doctor.department_id}`}
            className="book-back-btn"
            aria-label="Back to department"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="book-topbar-center">
            <h1 className="book-topbar-title">Book Appointment</h1>
            <span className="book-topbar-subtitle">
              Dr. {doctor.first_name} {doctor.last_name} · {doctor.department_name}
            </span>
          </div>
          <div className="book-topbar-dummy"></div>
        </div>
      </div>

      <div className="container book-unified-container">
        {/* ── Compact Clean Desktop Header ───────────────────── */}
        <header className="book-clean-header">
          <div className="book-breadcrumb">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/find-hospital">Departments</Link>
            <span className="sep">›</span>
            <Link to={`/department/${doctor.department_id}`}>{doctor.department_name}</Link>
            <span className="sep">›</span>
            <span className="current">Book OPD</span>
          </div>
          <div className="book-header-text-row">
            <div>
              <h1 className="book-title">Schedule Appointment</h1>
              <p className="book-subtitle">Confirm your hospital OPD time slot in 2 simple steps</p>
            </div>
            <Link to={`/department/${doctor.department_id}`} className="book-back-link">
              <ArrowLeft size={14} />
              <span>Back to {doctor.department_name}</span>
            </Link>
          </div>
        </header>

        {/* ── Unified Single-Screen 2-Column Grid ─────────────── */}
        <div className="book-grid-layout">
          {/* ── Left Column: Doctor Summary + Date & Slot Picker ── */}
          <div className="book-col-left">
            {/* Compact Doctor Profile Banner */}
            <div className="card doc-compact-card">
              <div className="dcc-avatar-wrap">
                <img
                  src={photoUrl}
                  alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                  className="dcc-avatar"
                  onError={(e) => { e.currentTarget.src = fallbackPhoto; }}
                />
                <span className="dcc-verified" title="Verified OPD Specialist">
                  <ShieldCheck size={14} color="#ffffff" />
                </span>
              </div>

              <div className="dcc-info">
                <div className="dcc-name-row">
                  <h2 className="dcc-name">Dr. {doctor.first_name} {doctor.last_name}</h2>
                  <span className="dcc-badge-exp">
                    <Star size={11} color="#f59e0b" fill="#f59e0b" />
                    <span>{doctor.years_of_experience} yrs</span>
                  </span>
                </div>
                <p className="dcc-spec">{cleanSpecialization}</p>
                <div className="dcc-meta-row">
                  <span className="dcc-meta-pill fee-pill">
                    <IndianRupee size={12} />
                    <strong>₹{parseInt(doctor.consultation_fee, 10).toLocaleString('en-IN')}</strong> OPD Fee
                  </span>
                  <span className="dcc-meta-pill hospital-pill">
                    City General Hospital
                  </span>
                </div>
              </div>
            </div>

            {/* Date & Slot Selection Container */}
            <div className="card book-picker-card">
              {/* Date Selection */}
              <div className="picker-section-title">
                <Calendar size={16} color="#0d9488" />
                <span>1. Select Appointment Date</span>
              </div>

              <div className="date-picker-row">
                {days.map(d => (
                  <button
                    key={d.full}
                    type="button"
                    className={`date-pill ${selectedDate === d.full ? 'active' : ''}`}
                    onClick={() => { setSelectedDate(d.full); setSelectedSlot(''); }}
                  >
                    <span className="dp-day">{d.label}</span>
                    <span className="dp-num">{d.date}</span>
                    <span className="dp-month">{d.month}</span>
                    {d.isToday && <span className="dp-today-dot"></span>}
                  </button>
                ))}
              </div>

              {/* Slot Selection */}
              <div className="picker-section-title slot-picker-title">
                <Clock size={16} color="#0d9488" />
                <span>2. Select 2-Hour Time Window</span>
              </div>

              {loadingSlots ? (
                <div className="slots-grid-loading">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton slot-skeleton-card"></div>
                  ))}
                </div>
              ) : (
                <div className="slots-grid-unified">
                  {slots.map(s => {
                    const isAvailable = s.available > 0 && !s.is_past && !s.is_leave;
                    const isSelected = selectedSlot === s.slot;

                    return (
                      <button
                        key={s.slot}
                        type="button"
                        className={`slot-card-item ${isSelected ? 'active' : ''} ${!isAvailable ? 'disabled' : ''}`}
                        onClick={() => isAvailable && handleSlotSelect(s.slot)}
                        disabled={!isAvailable}
                        aria-pressed={isSelected}
                      >
                        <div className="sci-header">
                          <strong className="sci-time">{s.slot}</strong>
                          {isSelected && <Check size={14} className="sci-check-icon" />}
                        </div>

                        <div className="sci-footer">
                          {isAvailable ? (
                            <span className="sci-status-available">
                              <span className="avail-dot"></span>
                              <span>Available ({s.available})</span>
                            </span>
                          ) : s.is_past ? (
                            <span className="sci-status-ended">Ended</span>
                          ) : s.is_leave ? (
                            <span className="sci-status-leave">On Leave</span>
                          ) : (
                            <span className="sci-status-full">Slot Full</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Patient Details & Instant Confirmation ── */}
          <div className="book-col-right" ref={formRef}>
            <div className="card patient-booking-card">
              <div className="pbc-header">
                <h3 className="pbc-title">Patient Details</h3>
                <p className="pbc-subtitle">Details will appear on your digital hospital entry pass</p>
              </div>

              {/* Dynamic Live Slot Preview Bar */}
              <div className={`pbc-slot-preview ${selectedSlot ? 'has-slot' : 'no-slot'}`}>
                {selectedSlot ? (
                  <div className="psp-active-wrap">
                    <div className="psp-left">
                      <div className="psp-slot-title">
                        <Clock size={15} color="#0d9488" />
                        <strong>{selectedSlot}</strong>
                      </div>
                      <span className="psp-date">{displayDate(selectedDate)}</span>
                    </div>
                    <div className="psp-right">
                      <span className="psp-fee-tag">
                        ₹{parseInt(doctor.consultation_fee, 10).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="psp-hint-wrap">
                    <Clock size={16} color="#0d9488" />
                    <span>Please select a time slot on the left to proceed</span>
                  </div>
                )}
              </div>

              {/* Patient Form */}
              <form onSubmit={handleSubmit} className="pbc-form">
                <div className="pbc-row">
                  <div className="pbc-field">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={form.full_name}
                      onChange={e => setForm({ ...form, full_name: e.target.value })}
                      className={errors.full_name ? 'input-error' : ''}
                    />
                    {errors.full_name && <span className="err-txt">{errors.full_name}</span>}
                  </div>

                  <div className="pbc-field">
                    <label>Mobile Number *</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className={errors.phone ? 'input-error' : ''}
                    />
                    {errors.phone && <span className="err-txt">{errors.phone}</span>}
                  </div>
                </div>

                <div className="pbc-row age-gender-row">
                  <div className="pbc-field pbc-field-half age-col">
                    <label>Age *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="e.g. 28"
                      value={form.age}
                      onKeyDown={e => {
                        if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                        if (!/^\d$/.test(e.key)) e.preventDefault();
                      }}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setForm(prev => ({ ...prev, age: val }));
                      }}
                      className={errors.age ? 'input-error' : ''}
                    />
                    {errors.age && <span className="err-txt">{errors.age}</span>}
                  </div>

                  <div className="pbc-field pbc-field-half gender-col">
                    <label>Gender *</label>
                    <select
                      value={form.gender}
                      onChange={e => setForm({ ...form, gender: e.target.value })}
                      className={errors.gender ? 'input-error' : ''}
                    >
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    {errors.gender && <span className="err-txt">{errors.gender}</span>}
                  </div>
                </div>

                <div className="pbc-field">
                  <label>
                    Reason for Visit <span className="opt-label">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of consultation symptoms..."
                    value={form.reason_for_visit}
                    onChange={e => setForm({ ...form, reason_for_visit: e.target.value })}
                  />
                </div>

                {/* Primary Green Booking Button */}
                <button
                  type="submit"
                  className={`pbc-confirm-btn ${!selectedSlot ? 'disabled-btn' : ''}`}
                  disabled={loading || !selectedSlot}
                >
                  {loading ? (
                    <span>Confirming Appointment...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>
                        Confirm Appointment {selectedSlot ? `· ₹${parseInt(doctor.consultation_fee, 10).toLocaleString('en-IN')}` : ''}
                      </span>
                    </>
                  )}
                </button>

                <div className="pbc-trust-row">
                  <ShieldCheck size={14} color="#10b981" />
                  <span>Instant digital QR entry pass generated upon booking</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;