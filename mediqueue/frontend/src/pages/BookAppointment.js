import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Star,
  Globe,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Check,
  ArrowRight,
  Edit3
} from 'lucide-react';
import { getDoctorById, getDoctorSlots, bookAppointment } from '../services/api';
import './BookAppointment.css';

// Local date formatting
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Arrival window calculation
const calcArrivalWindow = (timeSlot, patientsBefore, distributedMins) => {
  if (!timeSlot) return null;
  const dist = (distributedMins && distributedMins > 0) ? distributedMins : 20;

  const slotStartH  = parseInt(timeSlot.split(':')[0], 10);
  const slotStartM  = parseInt(timeSlot.split(':')[1], 10) || 0;
  const slotStart   = slotStartH * 60 + slotStartM;

  const position = (patientsBefore != null ? patientsBefore : 0) + 1;
  const turnStart = slotStart + (position - 1) * dist;

  const buffer = Math.max(15, Math.min(30, dist));
  const arriveFrom = Math.max(0, turnStart - buffer);
  const arriveBy   = turnStart;

  const fmt = (mins) => {
    const total = Math.round(mins);
    const h  = Math.floor(total / 60);
    const m  = total % 60;
    const suf = h < 12 ? 'AM' : 'PM';
    const hh  = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hh}:${String(m).padStart(2,'0')} ${suf}`;
  };

  return {
    turnTime:   fmt(turnStart),
    arriveFrom: fmt(arriveFrom),
    arriveBy:   fmt(arriveBy),
    position:   position,
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
  return dateStr.split('T')[0];
};

const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);

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

  const [step, setStep] = useState(1);

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
    const ageNum = parseInt(form.age, 10);
    if (!form.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) e.age = 'Please enter a valid age (1 - 120)';
    if (!form.gender) e.gender = 'Gender is required';
    if (!selectedSlot) e.slot = 'Please select a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
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
        toast.success('Appointment booked successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!doctor) return (
    <div className="book-page">
      <section className="page-header book-page-header">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link> <span>›</span> <Link to="/find-hospital">Book Appointment</Link> <span>›</span> <span>Schedule</span>
          </div>
          <h1>Schedule Appointment</h1>
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
              <div className="skeleton skel-line full" style={{ height: 140, borderRadius: 14 }}></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  // Success screen
  if (successData) {
    const arrival = successData.time_slot
      ? calcArrivalWindow(successData.time_slot, successData.queue_position || 1, successData.consultation_mins || 15)
      : null;

    return (
      <div className="success-page">
        <div className="success-ticket-card">
          <div className="st-header">
            <div className="st-icon-badge">
              <CheckCircle2 size={36} color="#10b981" />
            </div>
            <h2>Appointment Confirmed!</h2>
            <p>Your hospital OPD consultation slot has been reserved.</p>
          </div>

          <div className="st-body">
            <div className="st-summary-grid">
              <div className="st-item">
                <span>Booking ID</span>
                <strong>{successData.booking_id}</strong>
              </div>
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
                <span>Time Slot</span>
                <strong style={{ color: '#0d9488' }}>{successData.time_slot}</strong>
              </div>
              <div className="st-item">
                <span>Est. Wait Time</span>
                <strong style={{ color: '#0d9488' }}>~{successData.predicted_wait_time} min</strong>
              </div>
            </div>

            {/* Arrival Guidance Card */}
            {arrival && (
              <div className="st-arrival-box">
                <div className="st-arrival-title">
                  <Clock size={16} color="#0d9488" />
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
                  Queue Position: <strong>#{arrival.position}</strong> · Estimated consultation start: <strong>{arrival.turnTime}</strong>
                </p>
              </div>
            )}

            {/* Perforated Divider */}
            <div className="st-perforated">
              <span className="st-notch st-notch-left"></span>
              <div className="st-dashed-line"></div>
              <span className="st-notch st-notch-right"></span>
            </div>

            {/* QR Section */}
            {successData.qr_code_data && (
              <div className="st-qr-wrap">
                <div className="st-qr-title">
                  <QrCode size={18} color="#0d9488" />
                  <span>Digital Entry Pass</span>
                </div>
                <img src={successData.qr_code_data} alt="QR Entry Pass" className="st-qr-img" />
                <span className="st-qr-hint">Scan at Hospital Kiosk / Reception</span>
              </div>
            )}
          </div>

          <div className="st-footer-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/dashboard')}>
              Go to My Queue
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
    <div className="book-page">
      {/* Mobile Top Navigation */}
      <div className="book-mobile-topbar">
        <div className="book-topbar-inner">
          {step === 2 ? (
            <button
              type="button"
              className="book-back-btn"
              onClick={() => setStep(1)}
              aria-label="Back to slots"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <Link
              to={`/department/${doctor.department_id}`}
              className="book-back-btn"
              aria-label="Back to doctors"
            >
              <ArrowLeft size={18} />
            </Link>
          )}
          <div className="book-topbar-center">
            <h1 className="book-topbar-title">
              {step === 1 ? 'Select Date & Slot' : 'Patient Details'}
            </h1>
            <span className="book-topbar-subtitle">
              Dr. {doctor.first_name} {doctor.last_name} · {doctor.department_name}
            </span>
          </div>
          <div className="book-topbar-dummy"></div>
        </div>
      </div>

      <section className="page-header book-page-header">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link> <span>›</span>
            <Link to="/find-hospital">Book Appointment</Link> <span>›</span>
            <Link to={`/department/${doctor.department_id}`}>{doctor.department_name}</Link> <span>›</span>
            <span>Schedule</span>
          </div>
          <h1>Schedule Appointment</h1>
          <p>Choose your preferred date and slot to book your OPD consultation.</p>
        </div>
      </section>

      {/* Booking Step Indicator (Interactive Wizard) */}
      <div className="container book-stepper-wrap">
        <div className="book-stepper">
          <div
            className={`step-node ${step > 1 ? 'completed' : 'active'}`}
            onClick={() => { if (step > 1) setStep(1); }}
            style={{ cursor: step > 1 ? 'pointer' : 'default' }}
          >
            <span className="step-circle">{step > 1 ? <Check size={14} /> : '1'}</span>
            <span className="step-text">Date & Slot</span>
          </div>
          <div className={`step-line-bar ${step > 1 ? 'filled' : ''}`}></div>
          <div className={`step-node ${step === 2 ? 'active' : ''}`}>
            <span className="step-circle">2</span>
            <span className="step-text">Patient Details</span>
          </div>
          <div className="step-line-bar"></div>
          <div className="step-node">
            <span className="step-circle">3</span>
            <span className="step-text">QR Pass</span>
          </div>
        </div>
      </div>

      <section className="section" style={{ paddingTop: 16 }}>
        <div className="container book-layout">
          {step === 1 ? (
            <>
              {/* Step 1 Left: Doctor Info Card */}
              <div className="book-left">
                <div className="card doc-info-card">
                  <div className="book-doc-avatar-wrap">
                    <div className="book-doc-photo">{doctor.first_name[0]}{doctor.last_name[0]}</div>
                    <span className="book-doc-verified" title="Verified Specialist">
                      <ShieldCheck size={16} color="white" />
                    </span>
                  </div>
                  <div className="book-doc-body">
                    <h2 className="book-doc-name">Dr. {doctor.first_name} {doctor.last_name}</h2>
                    <div className="book-doc-badges-row">
                      <span className="book-spec">{doctor.specialization}</span>
                      <span className="book-doc-exp-badge">
                        <Star size={11} color="#f59e0b" fill="#f59e0b" />
                        <span>{doctor.years_of_experience} yrs exp</span>
                      </span>
                    </div>

                    <div className="book-doc-meta">
                      <div className="book-doc-meta-row book-doc-lang-row">
                        <Globe size={13} color="#64748b" />
                        <span>{doctor.languages_known}</span>
                      </div>
                      <div className="book-doc-meta-row book-doc-fee-row">
                        <IndianRupee size={14} color="#0d9488" />
                        <strong>₹{parseInt(doctor.consultation_fee, 10).toLocaleString('en-IN')} Consultation Fee</strong>
                      </div>
                    </div>

                    <div className="book-doc-perks">
                      <span className="bd-perk">⚡ Instant Booking Confirmation</span>
                      <span className="bd-perk">🏥 City General Hospital OPD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Right: Date & Slot Picker */}
              <div className="book-right">
                <div className="card book-form-card">
                  <h3 className="book-card-heading">Select Date & Time Slot</h3>

                  <div className="book-sub-header">
                    <Calendar size={16} color="#0d9488" />
                    <span>1. Select Appointment Date</span>
                  </div>

                  <div className="date-picker">
                    {days.map(d => (
                      <button
                        key={d.full}
                        type="button"
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

                  <div className="book-sub-header" style={{ marginTop: 22 }}>
                    <Clock size={16} color="#0d9488" />
                    <span>2. Select 2-Hour Window Slot</span>
                  </div>

                  {loadingSlots ? (
                    <div className="slot-skeleton-grid">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton slot-skeleton"></div>)}
                    </div>
                  ) : (
                    <div className="slots-grid">
                      {slots.map(s => {
                        const isAvailable = s.available > 0 && !s.is_past && !s.is_leave;
                        return (
                          <button
                            key={s.slot}
                            type="button"
                            className={`slot-btn ${selectedSlot === s.slot ? 'active' : ''} ${!isAvailable ? 'full' : ''}`}
                            onClick={() => isAvailable && setSelectedSlot(s.slot)}
                            disabled={!isAvailable}
                          >
                            <span className="slot-time">{s.slot}</span>
                            {isAvailable && (
                              <>
                                <span className="slot-count">{s.booked}/{s.booked + s.available} booked</span>
                                <span className="slot-wait">
                                  <Clock size={11} /> ~{s.predicted_wait}m wait
                                </span>
                              </>
                            )}
                            {s.is_past && <span className="slot-full">Ended</span>}
                            {!s.is_past && !!s.is_leave && <span className="slot-full">Leave</span>}
                            {!s.is_past && !s.is_leave && s.available === 0 && <span className="slot-full">Full</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Step 1 Action Bar: Continue to Patient Details */}
                  <div className="step-continue-bar">
                    {selectedSlot ? (
                      <div className="step-continue-inner">
                        <div className="sci-left">
                          <span className="sci-lbl">Selected Slot</span>
                          <strong className="sci-slot">{selectedSlot}</strong>
                          <span className="sci-date">{selectedDate}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-continue-step"
                          onClick={() => {
                            setStep(2);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <span>Proceed to Patient Details</span>
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="step-prompt-box">
                        <Clock size={15} color="#0d9488" />
                        <span>Click an available 2-hour window slot above to continue</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 2 Left: Selected Slot & Doctor Ticket Summary */}
              <div className="book-left">
                <div className="card booking-summary-card">
                  <div className="bsc-header">
                    <div className="book-doc-photo bsc-photo">{doctor.first_name[0]}{doctor.last_name[0]}</div>
                    <div className="bsc-doc-info">
                      <h3 className="bsc-doc-name">Dr. {doctor.first_name} {doctor.last_name}</h3>
                      <span className="book-spec">{doctor.specialization}</span>
                    </div>
                  </div>

                  <div className="bsc-ticket">
                    <div className="bsc-ticket-item">
                      <span className="bsc-lbl"><Calendar size={13} /> Appointment Date</span>
                      <strong className="bsc-val">{selectedDate}</strong>
                    </div>
                    <div className="bsc-ticket-item">
                      <span className="bsc-lbl"><Clock size={13} /> Time Slot Window</span>
                      <strong className="bsc-val bsc-slot-highlight">{selectedSlot}</strong>
                    </div>
                    <div className="bsc-ticket-item bsc-fee-item">
                      <span className="bsc-lbl"><IndianRupee size={13} /> Consultation Fee</span>
                      <strong className="bsc-val bsc-fee">₹{parseInt(doctor.consultation_fee, 10).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-change-slot"
                    onClick={() => setStep(1)}
                  >
                    <Edit3 size={14} />
                    <span>Change Date or Slot</span>
                  </button>

                  <div className="book-doc-perks bsc-perks">
                    <span className="bd-perk">⚡ Instant Booking Confirmation</span>
                    <span className="bd-perk">🏥 City General Hospital OPD</span>
                  </div>
                </div>
              </div>

              {/* Step 2 Right: Patient Form */}
              <div className="book-right">
                <div className="card book-form-card">
                  <div className="step2-heading-row">
                    <div>
                      <h3 className="book-card-heading" style={{ marginBottom: 4 }}>Patient Information</h3>
                      <p className="step2-subtitle">
                        Please provide patient details for hospital entry pass verification.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-link-step"
                      onClick={() => setStep(1)}
                    >
                      ← Back to Slots
                    </button>
                  </div>

                  <form ref={formRef} onSubmit={handleSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input
                          placeholder="e.g. Rahul Sharma"
                          value={form.full_name}
                          onChange={e => setForm({ ...form, full_name: e.target.value })}
                        />
                        {errors.full_name && <p className="error">{errors.full_name}</p>}
                      </div>
                      <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
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
                          min="1"
                          max="120"
                          placeholder="28"
                          value={form.age}
                          onChange={e => {
                            const cleaned = e.target.value.replace(/[^0-9]/g, '');
                            setForm({ ...form, age: cleaned });
                          }}
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
                      <label>Reason for Visit <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(Optional)</span></label>
                      <textarea
                        rows={3}
                        placeholder="Brief description of symptoms or consultation reason..."
                        value={form.reason_for_visit}
                        onChange={e => setForm({ ...form, reason_for_visit: e.target.value })}
                      />
                    </div>

                    <div className="step2-action-row">
                      <button
                        type="button"
                        className="btn-back-step"
                        onClick={() => setStep(1)}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className="book-submit-btn"
                        disabled={loading}
                      >
                        {loading ? 'Processing booking...' : (
                          <>
                            <Calendar size={17} />
                            <span>Confirm Appointment · ₹{parseInt(doctor.consultation_fee, 10).toLocaleString('en-IN')}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="book-submit-note">
                      <ShieldCheck size={14} color="#0d9488" />
                      Instant QR Entry Pass generated upon booking
                    </p>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookAppointment;