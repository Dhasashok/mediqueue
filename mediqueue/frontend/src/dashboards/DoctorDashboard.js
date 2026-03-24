import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getDoctorAppointments, completeAppointment, markNoShow } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const DEPT_BASE = {
  1:20,2:30,3:25,4:15,5:35,6:20,7:25,8:20,9:25,10:30,11:40,12:10
};

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = useCallback(() => {
    getDoctorAppointments()
      .then(r => {
        setAppointments(r.data.appointments || []);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const handleComplete = async (id) => {
    try {
      await completeAppointment(id);
      toast.success('✅ Patient consultation completed!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error completing.');
    }
  };

  const handleNoShow = async (id) => {
    if (!window.confirm('Mark as No-Show?')) return;
    try {
      await markNoShow(id);
      toast.warning('Marked as No-Show');
      load();
    } catch (err) {
      toast.error('Error');
    }
  };

  const queue = appointments
    .filter(a => ['Checked-In','In-Progress'].includes(a.status) ||
      (['Waiting','In-Progress'].includes(a.queue_status)))
    .sort((a,b) => (a.queue_position||99) - (b.queue_position||99));

  const booked = appointments.filter(a => a.status === 'Booked');
  const completed = appointments.filter(a => a.status === 'Completed');
  const noShows = appointments.filter(a => a.status === 'No-Show');

  // Get dept base time from first queue item
  const deptId = queue[0]?.department_id;
  const baseTime = DEPT_BASE[deptId] || 20;

  // Calculate wait per position
  const getWaitForPosition = (pos) => {
    if (pos <= 1) return 0;
    return (pos - 1) * baseTime;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header doctor-header">
        <div className="container">
          <div className="dash-header-row">
            <div>
              <h1>Doctor Dashboard</h1>
              <p>Welcome, <strong>Dr. {user?.name}</strong> · Today's Queue Management</p>
            </div>
            <div className="header-refresh">
              <span style={{fontSize:'0.78rem',color:'#94a3b8'}}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <button className="btn-refresh" onClick={load}>↻ Refresh</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container dashboard-body">
        {/* Stats */}
        <div className="dash-stats">
          <div className="dash-stat-card">
            <div className="stat-icon-box red"><span>🔴</span></div>
            <div><p className="ds-val">{queue.length}</p><p className="ds-label">In Queue</p></div>
          </div>
          <div className="dash-stat-card">
            <div className="stat-icon-box blue"><span>📅</span></div>
            <div><p className="ds-val">{booked.length}</p><p className="ds-label">Upcoming</p></div>
          </div>
          <div className="dash-stat-card">
            <div className="stat-icon-box green"><span>✅</span></div>
            <div><p className="ds-val">{completed.length}</p><p className="ds-label">Completed</p></div>
          </div>
          <div className="dash-stat-card">
            <div className="stat-icon-box teal"><span>📊</span></div>
            <div><p className="ds-val">{appointments.length}</p><p className="ds-label">Total Today</p></div>
          </div>
        </div>

        {/* Queue Summary Banner */}
        {queue.length > 0 && (
          <div className="queue-summary-banner">
            <div className="qs-item">
              <span className="qs-label">Next Patient</span>
              <span className="qs-val">{queue[0]?.full_name}</span>
            </div>
            <div className="qs-divider"></div>
            <div className="qs-item">
              <span className="qs-label">Avg Wait/Patient</span>
              <span className="qs-val">{baseTime} min</span>
            </div>
            <div className="qs-divider"></div>
            <div className="qs-item">
              <span className="qs-label">Total Queue Time</span>
              <span className="qs-val">~{queue.length * baseTime} min</span>
            </div>
            <div className="qs-divider"></div>
            <div className="qs-item">
              <span className="qs-label">Patients Waiting</span>
              <span className="qs-val">{queue.length}</span>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="card">
          <div className="dash-tabs">
            <button className={`dash-tab ${activeTab==='queue'?'active':''}`} onClick={()=>setActiveTab('queue')}>
              🔴 Live Queue ({queue.length})
            </button>
            <button className={`dash-tab ${activeTab==='booked'?'active':''}`} onClick={()=>setActiveTab('booked')}>
              📅 Upcoming ({booked.length})
            </button>
            <button className={`dash-tab ${activeTab==='completed'?'active':''}`} onClick={()=>setActiveTab('completed')}>
              ✅ Completed ({completed.length})
            </button>
            <button className={`dash-tab ${activeTab==='noshow'?'active':''}`} onClick={()=>setActiveTab('noshow')}>
              ❌ No-Show ({noShows.length})
            </button>
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : (
            <>
              {/* LIVE QUEUE */}
              {activeTab === 'queue' && (
                queue.length === 0 ? (
                  <div className="empty-dash">
                    <div className="empty-icon">😊</div>
                    <p>No patients in queue</p>
                    <span style={{fontSize:'0.82rem',color:'var(--muted)'}}>Patients appear here after receptionist checks them in</span>
                    <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh Now</button>
                  </div>
                ) : (
                  <div className="doctor-queue-list">
                    {queue.map((a, idx) => {
                      const waitMins = getWaitForPosition(idx + 1);
                      const isCurrent = idx === 0;
                      return (
                        <div key={a.id} className={`doctor-queue-row ${isCurrent ? 'dq-current' : 'dq-waiting'}`}>
                          {/* Position */}
                          <div className={`dq-pos ${isCurrent ? 'dq-pos-current' : ''}`}>
                            <span className="dq-pos-num">#{idx + 1}</span>
                            {isCurrent && <span className="dq-pos-tag">NOW</span>}
                          </div>

                          {/* Patient Info */}
                          <div className="dq-info">
                            <div className="dq-name-row">
                              <p className="dq-name">{a.full_name}</p>
                              {isCurrent && <span className="badge badge-green">Current Patient</span>}
                            </div>
                            <div className="dq-meta">
                              <span>Age: {a.age}</span>
                              <span>·</span>
                              <span>{a.gender}</span>
                              <span>·</span>
                              <span>Slot: {a.time_slot}</span>
                              <span>·</span>
                              <span>🎫 {a.booking_id}</span>
                            </div>
                            {a.reason_for_visit && (
                              <p className="dq-reason">📋 {a.reason_for_visit}</p>
                            )}
                          </div>

                          {/* Wait Time */}
                          <div className="dq-wait">
                            {isCurrent ? (
                              <div className="wait-box wait-now">
                                <span className="wait-val">In</span>
                                <span className="wait-label">Progress</span>
                              </div>
                            ) : (
                              <div className="wait-box wait-pending">
                                <span className="wait-val">~{waitMins}</span>
                                <span className="wait-label">min wait</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="dq-actions">
                            <button className="btn btn-primary" onClick={()=>handleComplete(a.id)}>
                              ✓ Complete
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={()=>handleNoShow(a.id)}>
                              No Show
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* UPCOMING */}
              {activeTab === 'booked' && (
                booked.length === 0 ? (
                  <div className="empty-dash"><div className="empty-icon">📅</div><p>No upcoming appointments</p></div>
                ) : (
                  <div className="appt-list">
                    {booked.map(a => (
                      <div key={a.id} className="appt-row">
                        <div className="appt-dept-icon">{a.dept_name?.[0]}</div>
                        <div className="appt-main">
                          <div className="appt-top-row">
                            <p className="appt-doc">{a.full_name}</p>
                            <span className="badge badge-blue">Booked</span>
                          </div>
                          <p className="appt-dept">Age: {a.age} · {a.gender} · Slot: {a.time_slot}</p>
                          <p className="appt-date">🎫 {a.booking_id}{a.reason_for_visit && ` · ${a.reason_for_visit}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* COMPLETED */}
              {activeTab === 'completed' && (
                completed.length === 0 ? (
                  <div className="empty-dash"><div className="empty-icon">✅</div><p>No completed appointments yet</p></div>
                ) : (
                  <div className="appt-list">
                    {completed.map(a => (
                      <div key={a.id} className="appt-row">
                        <div className="appt-dept-icon" style={{background:'#dcfce7',color:'#15803d'}}>✓</div>
                        <div className="appt-main">
                          <div className="appt-top-row">
                            <p className="appt-doc">{a.full_name}</p>
                            <span className="badge badge-teal">Completed</span>
                          </div>
                          <p className="appt-dept">Slot: {a.time_slot} · Age: {a.age}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* NO SHOW */}
              {activeTab === 'noshow' && (
                noShows.length === 0 ? (
                  <div className="empty-dash"><div className="empty-icon">🎉</div><p>No no-shows today!</p></div>
                ) : (
                  <div className="appt-list">
                    {noShows.map(a => (
                      <div key={a.id} className="appt-row">
                        <div className="appt-dept-icon" style={{background:'#fee2e2',color:'#b91c1c'}}>✕</div>
                        <div className="appt-main">
                          <div className="appt-top-row">
                            <p className="appt-doc">{a.full_name}</p>
                            <span className="badge badge-red">No-Show</span>
                          </div>
                          <p className="appt-dept">Slot: {a.time_slot}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;