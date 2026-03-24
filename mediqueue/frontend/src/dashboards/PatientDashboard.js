import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyAppointments, cancelAppointment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import './Dashboard.css';

// Dept base consultation times (minutes)
const DEPT_BASE = {
  1:20, 2:30, 3:25, 4:15, 5:35,
  6:20, 7:25, 8:20, 9:25, 10:30, 11:40, 12:10
};

const statusBadge = {
  'Booked':     { cls: 'badge-blue',   label: 'Booked' },
  'Checked-In': { cls: 'badge-amber',  label: 'In Queue' },
  'In-Progress':{ cls: 'badge-green',  label: 'In Progress' },
  'Completed':  { cls: 'badge-teal',   label: 'Completed' },
  'No-Show':    { cls: 'badge-red',    label: 'No Show' },
  'Cancelled':  { cls: 'badge-gray',   label: 'Cancelled' },
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [qrModal, setQrModal] = useState(null);
  const [queueData, setQueueData] = useState({});
  const [countdown, setCountdown] = useState({});
  const timerRefs = useRef({});

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

  // Fetch queue position for each checked-in appointment
  useEffect(() => {
    const checkedIn = appointments.filter(a => a.status === 'Checked-In');
    checkedIn.forEach(async a => {
      try {
        const r = await API.get(`/queue/position/${a.id}`);
        if (r.data.success) {
          const pos = r.data.queue_position;
          const deptBase = DEPT_BASE[a.department_id] || 20;
          // Position #1 = 0 wait, #2 = 1×base, #3 = 2×base ...
          const waitMins = pos <= 1 ? 0 : (pos - 1) * deptBase;
          setQueueData(prev => ({
            ...prev,
            [a.id]: { position: pos, waitMins, patientsAhead: pos - 1 }
          }));
          // Start countdown timer
          setCountdown(prev => ({ ...prev, [a.id]: waitMins * 60 }));
        }
      } catch {}
    });
  }, [appointments]);

  // Live countdown timer — decreases every second
  useEffect(() => {
    Object.keys(countdown).forEach(id => {
      if (timerRefs.current[id]) clearInterval(timerRefs.current[id]);
      if (countdown[id] > 0) {
        timerRefs.current[id] = setInterval(() => {
          setCountdown(prev => {
            const newVal = (prev[id] || 0) - 1;
            if (newVal <= 0) { clearInterval(timerRefs.current[id]); return { ...prev, [id]: 0 }; }
            return { ...prev, [id]: newVal };
          });
        }, 1000);
      }
    });
    return () => Object.values(timerRefs.current).forEach(clearInterval);
  }, [countdown]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return '0 min';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} min ${s}s` : `${s}s`;
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await cancelAppointment(id);
      toast.success('Appointment cancelled successfully.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel.');
    }
  };

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  const upcoming = appointments.filter(a =>
    a.appointment_date >= today && !['Completed','Cancelled','No-Show'].includes(a.status)
  );
  const history = appointments.filter(a =>
    ['Completed','Cancelled','No-Show'].includes(a.status) || a.appointment_date < today
  );
  const checkedIn = appointments.filter(a => a.status === 'Checked-In');
  const displayed = activeTab === 'upcoming' ? upcoming : history;

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
          const q = queueData[appt.id];
          const secs = countdown[appt.id] || 0;
          const deptBase = DEPT_BASE[appt.department_id] || 20;
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
                {/* Position Circle */}
                <div className="lq-position">
                  <div className={`pos-circle ${q?.position === 1 ? 'pos-current' : ''}`}>
                    <span className="pos-num">#{q?.position || '–'}</span>
                    <span className="pos-label">{q?.position === 1 ? 'Current' : 'Position'}</span>
                  </div>
                </div>

                {/* Info */}
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

                {/* Wait Timer */}
                <div className="lq-timer">
                  {q?.position === 1 ? (
                    <div className="timer-box current">
                      <span className="timer-val">Now</span>
                      <span className="timer-label">Your turn!</span>
                    </div>
                  ) : (
                    <div className="timer-box waiting">
                      <span className="timer-val">{formatTime(secs)}</span>
                      <span className="timer-label">Est. Wait</span>
                      <span className="timer-sub">~{q?.waitMins || deptBase} min total</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
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
                🔄 Auto-refreshes every 15 seconds · {appt.dept_name} avg: {deptBase} min/patient
              </div>
            </div>
          );
        })}

        {/* Appointments Table */}
        <div className="card">
          <div className="card-header-row">
            <h3>My Appointments</h3>
            <div className="dash-tabs" style={{ border: 'none', marginBottom: 0 }}>
              <button className={`dash-tab ${activeTab==='upcoming'?'active':''}`} onClick={()=>setActiveTab('upcoming')}>Upcoming ({upcoming.length})</button>
              <button className={`dash-tab ${activeTab==='history'?'active':''}`} onClick={()=>setActiveTab('history')}>History ({history.length})</button>
            </div>
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : displayed.length === 0 ? (
            <div className="empty-dash">
              <div className="empty-icon">📋</div>
              <p>No {activeTab} appointments</p>
              {activeTab==='upcoming' && <button className="btn btn-primary btn-sm" onClick={()=>navigate('/find-hospital')}>Book Now</button>}
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
                      <p className="appt-date">📅 {a.appointment_date?.split('T')[0]} · 🎫 {a.booking_id}</p>
                      {a.status==='Checked-In' && queueData[a.id] && (
                        <p className="appt-queue-inline">
                          🔴 Queue #{queueData[a.id].position} · {queueData[a.id].patientsAhead} ahead · ~{queueData[a.id].waitMins} min wait
                        </p>
                      )}
                    </div>
                    <div className="appt-actions-col">
                      {a.qr_code_data && <button className="btn btn-outline btn-sm" onClick={()=>setQrModal(a)}>📲 QR</button>}
                      {a.status==='Booked' && <button className="btn btn-danger btn-sm" onClick={()=>handleCancel(a.id)}>Cancel</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className="modal-overlay" onClick={()=>setQrModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>📲 QR Entry Pass</h3>
              <button className="modal-close" onClick={()=>setQrModal(null)}>✕</button>
            </div>
            <p style={{color:'var(--muted)',marginBottom:16,fontSize:'0.875rem'}}>Show this at reception to join the queue</p>
            <div style={{textAlign:'center',marginBottom:16}}>
              <img src={qrModal.qr_code_data} alt="QR" style={{width:200,height:200,borderRadius:8,border:'2px solid var(--border)'}} />
            </div>
            <div className="qr-details">
              <div className="qr-row"><span>Booking ID</span><strong>{qrModal.booking_id}</strong></div>
              <div className="qr-row"><span>Doctor</span><strong>Dr. {qrModal.first_name} {qrModal.last_name}</strong></div>
              <div className="qr-row"><span>Department</span><strong>{qrModal.dept_name}</strong></div>
              <div className="qr-row"><span>Date & Slot</span><strong>{qrModal.appointment_date?.split('T')[0]} · {qrModal.time_slot}</strong></div>
            </div>
            <button className="btn btn-primary" style={{width:'100%',marginTop:16}} onClick={()=>setQrModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;