import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyAppointments, cancelAppointment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import './Dashboard.css';

// Wait time now uses dept_avg_mins from API (real self-learned value per dept)
// Fallback = 20 min if dept_consultation_stats has no data yet

const statusBadge = {
  'Booked':      { cls: 'badge-blue',  label: 'Booked' },
  'Checked-In':  { cls: 'badge-amber', label: 'In Queue' },
  'In-Progress': { cls: 'badge-green', label: 'In Progress' },
  'Completed':   { cls: 'badge-teal',  label: 'Completed' },
  'No-Show':     { cls: 'badge-red',   label: 'No Show' },
  'Cancelled':   { cls: 'badge-gray',  label: 'Cancelled' },
};

// ── IST-safe date display ─────────────────────────────────────
// FIXED: was appointment_date?.split('T')[0]
// MySQL DATE column comes back as "2026-03-26T00:00:00.000Z"
// For IST users split('T')[0] gives "2026-03-25" — wrong!
// Now backend sends DATE_FORMAT result = clean "2026-03-26" string
// This function handles both formats safely
const displayDate = (dateStr) => {
  if (!dateStr) return '';
  // If already clean YYYY-MM-DD (from DATE_FORMAT in backend)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Fallback: add IST offset before extracting date
  const d         = new Date(dateStr);
  const istOffset = 5.5 * 60 * 60000;
  const ist       = new Date(d.getTime() + istOffset);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`;
};

const PatientDashboard = () => {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('upcoming');
  const [qrModal, setQrModal]           = useState(null);
  const [cancelModal, setCancelModal]   = useState(null);   // appt being cancelled
  const [cancelling, setCancelling]     = useState(false);
  const [rxModal, setRxModal]           = useState(null);   // prescription view modal
  const [rxLoading, setRxLoading]       = useState(null);   // appt id being loaded
  const [queueData, setQueueData]       = useState({});
  const [countdown, setCountdown]       = useState({});
  const timerRefs   = useRef({});

  const load = useCallback(() => {
    getMyAppointments()
      .then(r => { setAppointments(r.data.appointments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  // ── Accurate persistent timer ────────────────────────────────
  // Core idea: timer counts down from the moment position #1's treatment starts
  //
  // HOW IT WORKS:
  // Backend returns pos1_treatment_start = when doctor clicked ▶ Start for patient #1
  // remaining = (dept_avg_mins × 60) - elapsed_since_pos1_started
  //
  // Patient #2 logs in LATE (e.g. 5 min after treatment started)?
  //   elapsed = 5 min → remaining = (14.7 × 60) - 300 = 582s ≈ 9.7 min ✓ CORRECT
  //
  // Patient #2 refreshes page?
  //   Same calculation from pos1_treatment_start — always accurate ✓
  //
  // Fallback: if doctor hasn't clicked ▶ Start yet, use patients_ahead × deptAvg
  // and store startedAt in localStorage so refresh still works
  const TIMER_KEY = id => `mq_timer_${id}`;

  const computeRemaining = (apptId, pos, deptAvg, pos1TreatmentStart, patients_ahead) => {
    // Position 1 = currently being seen = 0 wait
    if (pos <= 1) return 0;

    // If doctor has started treatment of pos #1 → compute exact remaining
    if (pos1TreatmentStart) {
      const elapsedSecs = Math.floor((Date.now() - new Date(pos1TreatmentStart).getTime()) / 1000);
      // Each patient ahead (including pos 1) takes deptAvg minutes
      const totalForAhead = patients_ahead * deptAvg * 60;
      const remaining = totalForAhead - elapsedSecs;
      // Store reference in localStorage so refresh works without API call
      try {
        localStorage.setItem(TIMER_KEY(apptId), JSON.stringify({
          pos1Start: new Date(pos1TreatmentStart).getTime(),
          patients_ahead,
          deptAvgMins: deptAvg
        }));
      } catch {}
      return Math.max(0, remaining);
    }

    // Doctor hasn't started yet — check localStorage for persisted reference
    try {
      const stored = localStorage.getItem(TIMER_KEY(apptId));
      if (stored) {
        const { pos1Start, patients_ahead: storedAhead, deptAvgMins } = JSON.parse(stored);
        if (pos1Start) {
          const elapsed = Math.floor((Date.now() - pos1Start) / 1000);
          const remaining = (storedAhead * deptAvgMins * 60) - elapsed;
          if (remaining > 0) return remaining;
        }
      }
    } catch {}

    // Pure estimate: patients_ahead × deptAvg (no treatment started yet)
    const totalSecs = patients_ahead * deptAvg * 60;
    // Persist the estimate start time so refreshes don't reset
    try {
      const stored = localStorage.getItem(TIMER_KEY(apptId));
      if (!stored) {
        localStorage.setItem(TIMER_KEY(apptId), JSON.stringify({
          pos1Start: null,
          estimateStartedAt: Date.now(),
          totalSecs,
          patients_ahead,
          deptAvgMins: deptAvg
        }));
      } else {
        const parsed = JSON.parse(stored);
        if (!parsed.pos1Start && parsed.estimateStartedAt) {
          const elapsed = Math.floor((Date.now() - parsed.estimateStartedAt) / 1000);
          const remaining = parsed.totalSecs - elapsed;
          if (remaining > 0) return remaining;
        }
      }
    } catch {}
    return totalSecs;
  };

  // ── fetchQueuePositions: polls /queue/position for every Checked-In patient ──
  // Called on mount, on appointments change, AND every 15s independently
  // This ensures timer starts the moment doctor clicks ▶ Start (within 15s)
  const fetchQueuePositions = useCallback(async (apptList) => {
    const checkedIn = (apptList || appointments).filter(a => a.status === 'Checked-In');
    for (const a of checkedIn) {
      try {
        const r = await API.get(`/queue/position/${a.id}`);
        if (r.data.success) {
          const pos                = r.data.queue_position;
          const deptAvg            = parseFloat(r.data.dept_avg_mins) || 20;
          const patients_ahead     = parseInt(r.data.patients_ahead) || (pos > 1 ? pos - 1 : 0);
          const pos1TreatmentStart = r.data.pos1_treatment_start || null;
          const waitMins           = pos <= 1 ? 0 : Math.round(patients_ahead * deptAvg);
          setQueueData(prev => ({
            ...prev,
            [a.id]: { position: pos, waitMins, patientsAhead: patients_ahead, deptAvg }
          }));
          const remainingSecs = computeRemaining(a.id, pos, deptAvg, pos1TreatmentStart, patients_ahead);
          setCountdown(prev => {
            const current = prev[a.id] || 0;
            // If pos1_treatment_start just became available → reset to accurate value
            // If already running and within 30s of computed value → keep ticking (no jump)
            if (pos1TreatmentStart) {
              // Accurate anchor available: always sync to it (self-corrects drift)
              return { ...prev, [a.id]: remainingSecs };
            }
            // No treatment started yet: only set if timer hasn't started or has expired
            if (current <= 0) return { ...prev, [a.id]: remainingSecs };
            return prev; // keep existing ticking timer
          });
        }
      } catch {}
    }
    // Clean up localStorage for non-checked-in appointments
    (apptList || appointments).forEach(a => {
      if (a.status !== 'Checked-In') {
        try { localStorage.removeItem(TIMER_KEY(a.id)); } catch {}
      }
    });
  }, [appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run on appointments change (status updates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchQueuePositions(appointments); }, [appointments]);
  

  // Also poll every 15s independently — catches doctor ▶ Start without status change
  // Patient #2 timer starts within 15s of doctor clicking ▶ Start on patient #1
  useEffect(() => {
    const t = setInterval(() => fetchQueuePositions(), 15000);
    return () => clearInterval(t);
  }, [fetchQueuePositions]);

  // Live countdown timer — ticks every second
  const startedTimers = useRef({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    Object.keys(countdown).forEach(id => {
      if (startedTimers.current[id]) return;
      if ((countdown[id] || 0) <= 0) return;
      startedTimers.current[id] = true;
      timerRefs.current[id] = setInterval(() => {
        setCountdown(prev => {
          const newVal = (prev[id] || 0) - 1;
          if (newVal <= 0) {
            clearInterval(timerRefs.current[id]);
            delete startedTimers.current[id];
            try { localStorage.removeItem(TIMER_KEY(id)); } catch {}
            return { ...prev, [id]: 0 };
          }
          return { ...prev, [id]: newVal };
        });
      }, 1000);
    });
  }, [Object.keys(countdown).join(',')]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'Any moment now';
    const totalSecs = Math.round(seconds); // ← floor to integer first
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `${m} min ${s}s` : `${s}s`;
  };

  const handleViewRx = async (appt) => {
    setRxLoading(appt.id);
    try {
      const res = await API.get('/prescriptions/appointment/' + appt.id);
      if (res.data.success && res.data.prescription) {
        setRxModal({ ...res.data.prescription, appt });
      } else {
        toast.info('Doctor has not added a prescription for this appointment yet.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast.info('No prescription added yet — please check back later or contact the doctor.');
      } else {
        toast.error('Could not load prescription. Please try again.');
      }
    } finally { setRxLoading(null); }
  };

  const handleCancel = (appt) => {
    setCancelModal(appt);  // open beautiful modal instead of browser confirm()
  };

  const confirmCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await cancelAppointment(cancelModal.id);
      toast.success('Appointment cancelled.');
      setCancelModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel.');
    } finally { setCancelling(false); }
  };

  // IST-safe today for filtering upcoming vs history
  const today = (() => {
    const now       = new Date();
    const istOffset = 5.5 * 60 * 60000;
    const ist       = new Date(now.getTime() + istOffset);
    return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`;
  })();

  // Use displayDate() for safe comparison — handles both clean and UTC strings
  const upcoming   = appointments.filter(a =>
    displayDate(a.appointment_date) >= today &&
    !['Completed','Cancelled','No-Show'].includes(a.status)
  );
  const history    = appointments.filter(a =>
    ['Completed','Cancelled','No-Show'].includes(a.status) ||
    displayDate(a.appointment_date) < today
  );
  const checkedIn  = appointments.filter(a => a.status === 'Checked-In');
  const displayed  = activeTab === 'upcoming' ? upcoming : history;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="container">
          <div className="dash-header-row">
            <div>
              <h1>Patient Dashboard</h1>
              <p>Welcome back, <strong>{user?.name}</strong></p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/find-hospital')}>
              + Book Appointment
            </button>
          </div>
        </div>
      </div>

      <div className="container dashboard-body">
        {/* Stats */}
        <div className="dash-stats">
          <div className="dash-stat-card">
            <div className="stat-icon-box blue"><span>📅</span></div>
            <div><p className="ds-val">{upcoming.length}</p><p className="ds-label">Upcoming</p></div>
          </div>
          <div className="dash-stat-card">
            <div className="stat-icon-box green"><span>✅</span></div>
            <div><p className="ds-val">{appointments.filter(a=>a.status==='Completed').length}</p><p className="ds-label">Completed</p></div>
          </div>
          <div className="dash-stat-card">
            <div className="stat-icon-box teal"><span>🏥</span></div>
            <div><p className="ds-val">{appointments.length}</p><p className="ds-label">Total Visits</p></div>
          </div>
          <div className="dash-stat-card">
            <div className="stat-icon-box purple"><span>📊</span></div>
            <div><p className="ds-val">{checkedIn.length}</p><p className="ds-label">In Queue</p></div>
          </div>
        </div>

        {/* Live Queue Cards */}
        {checkedIn.map(appt => {
          const q    = queueData[appt.id];
          const secs = countdown[appt.id] || 0;
          return (
            <div key={appt.id} className="live-queue-card">
              <div className="lq-header">
                <div className="lq-title">
                  <span className="live-dot"></span>
                  <span>LIVE Queue Status</span>
                </div>
                <span className="badge badge-green">Checked In ✓</span>
              </div>

              <div className="lq-body">
                <div className="lq-position">
                  <div className={`pos-circle ${q?.position === 1 ? 'pos-current' : ''}`}>
                    <span className="pos-num">#{q?.position || '–'}</span>
                    <span className="pos-label">{q?.position === 1 ? 'Current' : 'Position'}</span>
                  </div>
                </div>

                <div className="lq-info">
                  <div className="lq-info-row">
                    <span className="lq-key">Doctor</span>
                    <span className="lq-val">Dr. {appt.first_name} {appt.last_name}</span>
                  </div>
                  <div className="lq-info-row">
                    <span className="lq-key">Department</span>
                    <span className="lq-val">{appt.dept_name}</span>
                  </div>
                  <div className="lq-info-row">
                    <span className="lq-key">Patients Ahead</span>
                    <span className="lq-val">{q?.patientsAhead ?? '–'} patient{q?.patientsAhead !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="lq-info-row">
                    <span className="lq-key">Booking ID</span>
                    <span className="lq-val">{appt.booking_id}</span>
                  </div>
                </div>

                <div className="lq-timer">
                  {q?.position === 1 ? (
                    <div className="timer-box current">
                      <span className="timer-val">Now</span>
                      <span className="timer-label">Your turn!</span>
                    </div>
                  ) : (
                    <div className={`timer-box ${secs <= 0 ? 'current' : 'waiting'}`}>
                      <span className="timer-val">{formatTime(secs)}</span>
                      <span className="timer-label">{secs <= 0 ? 'Getting close!' : 'Est. Wait'}</span>
                      {secs > 0 && <span className="timer-sub">~{q?.waitMins || q?.deptAvg || 20} min total</span>}
                    </div>
                  )}
                </div>
              </div>

              {q && (
                <div className="lq-progress">
                  <div className="lq-progress-bar">
                    <div className="lq-progress-fill" style={{ width: `${Math.max(5, 100 - (q.patientsAhead * 20))}%` }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {q.patientsAhead === 0 ? '🎉 You are next!' : `${q.patientsAhead} patient${q.patientsAhead!==1?'s':''} ahead`}
                  </span>
                </div>
              )}

              <div className="lq-footer">
                🔄 Auto-refreshes every 15 seconds · Avg consultation: {q?.deptAvg || 20} min/patient (real data)
              </div>
            </div>
          );
        })}

        {/* Appointments Table */}
        <div className="card">
          <div className="card-header-row">
            <h3>My Appointments</h3>
            <div className="dash-tabs" style={{ border: 'none', marginBottom: 0 }}>
              <button className={`dash-tab ${activeTab==='upcoming'?'active':''}`} onClick={()=>setActiveTab('upcoming')}>
                Upcoming ({upcoming.length})
              </button>
              <button className={`dash-tab ${activeTab==='history'?'active':''}`} onClick={()=>setActiveTab('history')}>
                History ({history.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : displayed.length === 0 ? (
            <div className="empty-dash">
              <div className="empty-icon">📋</div>
              <p>No {activeTab} appointments</p>
              {activeTab==='upcoming' && (
                <button className="btn btn-primary btn-sm" onClick={()=>navigate('/find-hospital')}>
                  Book Now
                </button>
              )}
            </div>
          ) : (
            <div className="appt-list">
              {displayed.map(a => {
                const sb = statusBadge[a.status] || { cls:'badge-gray', label: a.status };
                return (
                  <div key={a.id} className="appt-row">
                    <div className="appt-dept-icon">{a.dept_name?.[0]}</div>
                    <div className="appt-main">
                      <div className="appt-top-row">
                        <p className="appt-doc">Dr. {a.first_name} {a.last_name}</p>
                        <span className={`badge ${sb.cls}`}>{sb.label}</span>
                      </div>
                      <p className="appt-dept">{a.dept_name} · {a.time_slot}</p>
                      {/* FIXED: was a.appointment_date?.split('T')[0] */}
                      <p className="appt-date">📅 {displayDate(a.appointment_date)} · 🎫 {a.booking_id}</p>
                      {a.status==='Checked-In' && queueData[a.id] && (
                        <p className="appt-queue-inline">
                          🔴 Queue #{queueData[a.id].position} · {queueData[a.id].patientsAhead} ahead · ~{queueData[a.id].waitMins} min wait
                        </p>
                      )}
                    </div>
                    <div className="appt-actions-col">
                      {/* QR — only for active appointments */}
                      {a.qr_code_data && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'No-Show' && (
                        <button className="btn btn-outline btn-sm" onClick={()=>setQrModal(a)}>📲 QR</button>
                      )}
                      {/* Prescription — completed appointments */}
                      {a.status==='Completed' && (
                        <button className="btn btn-outline btn-sm"
                          style={{borderColor:'#0d9488',color:'#0d9488'}}
                          disabled={rxLoading===a.id}
                          onClick={()=>handleViewRx(a)}>
                          {rxLoading===a.id ? '⏳' : '📋 Prescription'}
                        </button>
                      )}
                      {/* Reschedule — Booked appointments (cancel + rebook same doctor) */}

                      {/* Cancel — Booked appointments */}
                      {a.status==='Booked' && (
                        <button className="btn btn-danger btn-sm" onClick={()=>handleCancel(a)}>
                          Cancel
                        </button>
                      )}
                      {/* Rebook — Completed, Cancelled, No-Show */}
                      {['Completed','Cancelled','No-Show'].includes(a.status) && (
                        <button className="btn btn-outline btn-sm"
                          style={{borderColor:'#0d9488',color:'#0d9488'}}
                          onClick={()=>navigate(`/book/${a.doctor_id}`)}>
                          📅 Rebook
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Prescription View Modal */}
      {rxModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,
          display:'flex',alignItems:'flex-start',justifyContent:'center',
          padding:'20px 16px',overflowY:'auto'}}
          onClick={()=>setRxModal(null)}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:620,
            boxShadow:'0 24px 64px rgba(0,0,0,0.25)',margin:'auto'}}
            onClick={e=>e.stopPropagation()}>

            {/* Letterhead */}
            <div style={{background:'linear-gradient(135deg,#0f172a,#0d9488)',
              borderRadius:'16px 16px 0 0',padding:'20px 28px',color:'#fff'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <h2 style={{margin:0,fontSize:'1.1rem',fontWeight:800}}>🏥 City General Hospital</h2>
                  <p style={{margin:'3px 0 0',fontSize:'0.77rem',opacity:0.8}}>Pune, Maharashtra</p>
                  <p style={{margin:'8px 0 0',fontSize:'0.82rem',opacity:0.9}}>
                    Dr. {rxModal.doc_first} {rxModal.doc_last} · {rxModal.dept_name}
                  </p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{margin:0,fontSize:'0.77rem',opacity:0.8}}>Date</p>
                  <p style={{margin:'2px 0 0',fontWeight:700,fontSize:'0.88rem'}}>
                    {rxModal.appt?.appointment_date}
                  </p>
                  <button onClick={()=>setRxModal(null)}
                    style={{marginTop:8,background:'rgba(255,255,255,0.2)',border:'none',
                      color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:'0.78rem'}}>
                    Close ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Patient strip */}
            <div style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0',
              padding:'12px 28px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>
                <p style={{margin:0,fontSize:'0.68rem',color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>Patient</p>
                <p style={{margin:'2px 0 0',fontWeight:700,color:'#0f172a'}}>{rxModal.appt?.full_name || rxModal.appt?.first_name}</p>
              </div>
              <div>
                <p style={{margin:0,fontSize:'0.68rem',color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>Booking ID</p>
                <p style={{margin:'2px 0 0',fontWeight:600,color:'#0d9488'}}>{rxModal.appt?.booking_id}</p>
              </div>
            </div>

            {/* Prescription content */}
            <div style={{padding:'20px 28px'}}>
              <div style={{marginBottom:16,padding:'12px 16px',background:'#f0fdf4',
                borderRadius:8,borderLeft:'4px solid #0d9488'}}>
                <p style={{margin:0,fontSize:'0.75rem',fontWeight:700,color:'#064e3b',
                  textTransform:'uppercase',letterSpacing:0.5}}>Diagnosis</p>
                <p style={{margin:'6px 0 0',color:'#0f172a',fontSize:'0.92rem',fontWeight:600}}>
                  {rxModal.diagnosis}
                </p>
              </div>

              {rxModal.medicines?.length > 0 && (
                <div style={{marginBottom:16}}>
                  <p style={{margin:'0 0 8px',fontSize:'0.75rem',fontWeight:700,
                    color:'#475569',textTransform:'uppercase',letterSpacing:0.5}}>
                    Rx — Medicines
                  </p>
                  <div style={{border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
                    <div style={{display:'grid',gridTemplateColumns:'3fr 1fr 1.4fr 1.2fr',
                      background:'#f1f5f9',padding:'7px 12px',gap:8}}>
                      {['Medicine','Dose','Frequency','Duration'].map((h,i)=>(
                        <span key={i} style={{fontSize:'0.7rem',fontWeight:700,
                          color:'#475569',textTransform:'uppercase'}}>{h}</span>
                      ))}
                    </div>
                    {rxModal.medicines.map((m,i)=>(
                      <div key={i} style={{display:'grid',gridTemplateColumns:'3fr 1fr 1.4fr 1.2fr',
                        padding:'8px 12px',gap:8,
                        background:i%2===0?'#fff':'#fafafa',
                        borderTop:'1px solid #f1f5f9'}}>
                        <span style={{fontSize:'0.85rem',fontWeight:600,color:'#0f172a'}}>{m.name}</span>
                        <span style={{fontSize:'0.85rem',color:'#475569'}}>{m.dose}</span>
                        <span style={{fontSize:'0.85rem',color:'#475569'}}>{m.frequency}</span>
                        <span style={{fontSize:'0.85rem',color:'#475569'}}>{m.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(rxModal.instructions || rxModal.follow_up_date || rxModal.notes) && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
                  {rxModal.instructions && (
                    <div style={{padding:'12px',background:'#fafafa',borderRadius:8,
                      border:'1px solid #e2e8f0'}}>
                      <p style={{margin:'0 0 4px',fontSize:'0.7rem',fontWeight:700,
                        color:'#64748b',textTransform:'uppercase'}}>Instructions</p>
                      <p style={{margin:0,fontSize:'0.85rem',color:'#0f172a',lineHeight:1.5}}>
                        {rxModal.instructions}
                      </p>
                    </div>
                  )}
                  <div>
                    {rxModal.follow_up_date && (
                      <div style={{padding:'12px',background:'#eff6ff',borderRadius:8,
                        border:'1px solid #bfdbfe',marginBottom:8}}>
                        <p style={{margin:'0 0 4px',fontSize:'0.7rem',fontWeight:700,
                          color:'#1e40af',textTransform:'uppercase'}}>Follow-up</p>
                        <p style={{margin:0,fontSize:'0.88rem',fontWeight:600,color:'#1d4ed8'}}>
                          📅 {rxModal.follow_up_date?.substring(0,10)}
                        </p>
                      </div>
                    )}
                    {rxModal.notes && (
                      <div style={{padding:'12px',background:'#fafafa',borderRadius:8,
                        border:'1px solid #e2e8f0'}}>
                        <p style={{margin:'0 0 4px',fontSize:'0.7rem',fontWeight:700,
                          color:'#64748b',textTransform:'uppercase'}}>Notes</p>
                        <p style={{margin:0,fontSize:'0.85rem',color:'#0f172a'}}>{rxModal.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Download button */}
              <button
                onClick={()=>{
                  const win = window.open('','_blank');
                  const meds = rxModal.medicines?.map(m=>
                    '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 12px;font-weight:600">'+m.name+'</td><td style="padding:8px 12px;color:#475569">'+m.dose+'</td><td style="padding:8px 12px;color:#475569">'+m.frequency+'</td><td style="padding:8px 12px;color:#475569">'+m.duration+'</td></tr>'
                  ).join('') || '';
                  win.document.write('<html><head><title>Prescription - '+rxModal.appt?.booking_id+'</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0}@media print{.no-print{display:none}}</style></head><body>'+
                    '<div style="background:linear-gradient(135deg,#0f172a,#0d9488);color:white;padding:24px 32px">'+
                    '<h1 style="margin:0;font-size:1.3rem">🏥 City General Hospital</h1>'+
                    '<p style="margin:4px 0 0;opacity:0.8">Pune, Maharashtra</p>'+
                    '<p style="margin:12px 0 0">Dr. '+rxModal.doc_first+' '+rxModal.doc_last+' | '+rxModal.dept_name+'</p></div>'+
                    '<div style="padding:20px 32px">'+
                    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr><td><strong>Patient:</strong> '+(rxModal.appt?.full_name||'')+'</td><td><strong>Date:</strong> '+(rxModal.appt?.appointment_date||'')+'</td><td><strong>Booking ID:</strong> '+(rxModal.appt?.booking_id||'')+'</td></tr></table>'+
                    '<div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;border-left:4px solid #0d9488;margin-bottom:16px"><strong>Diagnosis:</strong> '+rxModal.diagnosis+'</div>'+
                    (meds?'<h3>Rx — Medicines</h3><table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0"><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left">Medicine</th><th style="padding:8px 12px;text-align:left">Dose</th><th style="padding:8px 12px;text-align:left">Frequency</th><th style="padding:8px 12px;text-align:left">Duration</th></tr>'+meds+'</table>':'')+
                    (rxModal.instructions?'<p style="margin-top:16px"><strong>Instructions:</strong> '+rxModal.instructions+'</p>':'')+
                    (rxModal.follow_up_date?'<p><strong>Follow-up:</strong> '+rxModal.follow_up_date?.substring(0,10)+'</p>':'')+
                    (rxModal.notes?'<p><strong>Notes:</strong> '+rxModal.notes+'</p>':'')+
                    '<br/><hr/><p style="font-size:0.75rem;color:#64748b;text-align:center">MediQueue — City General Hospital, Pune</p>'+
                    '</div><div class="no-print" style="text-align:center;padding:16px"><button onclick="window.print()" style="background:#0d9488;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:1rem;cursor:pointer">🖨️ Print</button></div></body></html>');
                  win.document.close();
                }}
                style={{width:'100%',padding:'12px',background:'#0f172a',color:'#fff',
                  border:'none',borderRadius:10,fontWeight:700,fontSize:'0.92rem',cursor:'pointer'}}>
                ⬇️ Download / Print Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Appointment Modal ── */}
      {cancelModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, backdropFilter: 'blur(4px)'
        }} onClick={() => !cancelling && setCancelModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420,
            boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>

            {/* Red header */}
            <div style={{
              background: 'linear-gradient(135deg, #991b1b, #ef4444)',
              padding: '24px 28px 20px', color: '#fff', textAlign: 'center'
            }}>
              <div style={{
                width: 56, height: 56, background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 28, margin: '0 auto 12px'
              }}>🚫</div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Cancel Appointment?
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', opacity: 0.85 }}>
                This action cannot be undone
              </p>
            </div>

            {/* Appointment details */}
            <div style={{ padding: '20px 28px' }}>
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: '14px 16px', marginBottom: 20
              }}>
                {/* Doctor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#0f172a,#0d9488)',
                    color: '#fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', flexShrink: 0
                  }}>
                    {(cancelModal.first_name?.[0] || '') + (cancelModal.last_name?.[0] || '')}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, margin: 0, color: '#0f172a', fontSize: '0.95rem' }}>
                      Dr. {cancelModal.first_name} {cancelModal.last_name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      {cancelModal.dept_name}
                    </p>
                  </div>
                </div>
                {/* Date & Slot */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Date</p>
                    <p style={{ margin: '3px 0 0', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                      📅 {displayDate(cancelModal.appointment_date)}
                    </p>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Slot</p>
                    <p style={{ margin: '3px 0 0', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                      🕐 {cancelModal.time_slot}
                    </p>
                  </div>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                  🎫 {cancelModal.booking_id}
                </p>
              </div>

              {/* Cancel only */}
              <button onClick={confirmCancel} disabled={cancelling}
                style={{
                  width: '100%', padding: '13px', marginBottom: 10,
                  background: cancelling ? '#94a3b8' : '#ef4444',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer'
                }}>
                {cancelling ? '⏳ Cancelling...' : '🚫 Yes, Cancel Appointment'}
              </button>

              {/* Cancel & Rebook */}
              <button
                disabled={cancelling}
                onClick={async () => {
                  if (!cancelModal) return;
                  setCancelling(true);
                  try {
                    await cancelAppointment(cancelModal.id);
                    toast.success('Cancelled! Redirecting to rebook...');
                    const docId = cancelModal.doctor_id;
                    setCancelModal(null);
                    setTimeout(() => navigate('/book/' + docId), 700);
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Could not cancel.');
                  } finally { setCancelling(false); }
                }}
                style={{
                  width: '100%', padding: '13px', marginBottom: 10,
                  background: '#f0fdf4', color: '#0d9488',
                  border: '2px solid #0d9488', borderRadius: 10,
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                }}>
                📅 Cancel &amp; Rebook with Same Doctor
              </button>

              {/* Keep */}
              <button onClick={() => setCancelModal(null)} disabled={cancelling}
                style={{
                  width: '100%', padding: '11px',
                  background: 'none', color: '#64748b',
                  border: '1.5px solid #e2e8f0', borderRadius: 10,
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
                }}>
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="modal-overlay" onClick={()=>setQrModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>📲 QR Entry Pass</h3>
              <button className="modal-close" onClick={()=>setQrModal(null)}>✕</button>
            </div>
            <p style={{color:'var(--muted)',marginBottom:16,fontSize:'0.875rem'}}>
              Show this at reception to join the queue
            </p>
            <div style={{textAlign:'center',marginBottom:16}}>
              <img
                src={qrModal.qr_code_data} alt="QR"
                style={{width:200,height:200,borderRadius:8,border:'2px solid var(--border)'}}
              />
            </div>
            <div className="qr-details">
              <div className="qr-row"><span>Booking ID</span><strong>{qrModal.booking_id}</strong></div>
              <div className="qr-row"><span>Doctor</span><strong>Dr. {qrModal.first_name} {qrModal.last_name}</strong></div>
              <div className="qr-row"><span>Department</span><strong>{qrModal.dept_name}</strong></div>
              {/* FIXED: was qrModal.appointment_date?.split('T')[0] */}
              <div className="qr-row">
                <span>Date & Slot</span>
                <strong>{displayDate(qrModal.appointment_date)} · {qrModal.time_slot}</strong>
              </div>
            </div>
            <button className="btn btn-primary" style={{width:'100%',marginTop:16}} onClick={()=>setQrModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;