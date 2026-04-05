import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getDoctorAppointments, completeAppointment, markInProgress, markNoShow } from '../services/api';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

// DYNAMIC: dept_avg_mins now comes from the API (getDoctorAppointments)
// which JOINs dept_consultation_stats for real self-learned values.
// Fallback = 20 min if no real data yet.
// Wait formula: position N → (N-1) × dept_avg_mins

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // ── Prescription states ────────────────────────────────────
  const [prescModal, setPrescModal]   = useState(null);
  const [prescSaved, setPrescSaved]   = useState({});   // track which appts have saved Rx
  const [myLeaves, setMyLeaves]         = useState([]);
  const [leaveDate, setLeaveDate]       = useState('');
  const [leaveReason, setLeaveReason]   = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [prescSaving, setPrescSaving] = useState(false);
  const [prescForm, setPrescForm]     = useState({
    diagnosis: '', instructions: '', notes: '', follow_up_date: '',
    medicines: [{ name: '', dose: '', frequency: '', duration: '' }]
  });

  const loadMyLeaves = useCallback(() => {
    API.get('/doctor/my-leaves')
      .then(r => setMyLeaves(r.data.leaves || []))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    getDoctorAppointments()
      .then(r => {
        setAppointments(r.data.appointments || []);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); loadMyLeaves(); }, [load, loadMyLeaves]);
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

  const handleStartTreatment = async (id) => {
    try {
      await markInProgress(id);
      toast.info('Treatment timer started for this patient.');
      load();
    } catch (err) {
      toast.error('Error starting treatment.');
    }
  };

  const handleOpenPresc = async (appt) => {
    // Load existing prescription data FIRST, then open modal
    // This way the form is already filled when the modal appears
    let formData = {
      diagnosis: '', instructions: '', notes: '', follow_up_date: '',
      medicines: [{ name: '', dose: '', frequency: '', duration: '' }]
    };
    let hasSaved = false;
    try {
      const res = await API.get(`/prescriptions/appointment/${appt.id}`);
      if (res.data.success && res.data.prescription) {
        const rx = res.data.prescription;
        formData = {
          diagnosis:      rx.diagnosis || '',
          instructions:   rx.instructions || '',
          notes:          rx.notes || '',
          follow_up_date: rx.follow_up_date ? rx.follow_up_date.substring(0,10) : '',
          medicines:      rx.medicines?.length ? rx.medicines
                          : [{ name:'', dose:'', frequency:'', duration:'' }]
        };
        hasSaved = true;
      }
    } catch (e) { /* no prescription yet — fresh form */ }
    // Set all state together, THEN open modal so data is ready
    setPrescForm(formData);
    if (hasSaved) {
      setPrescSaved(p => ({ ...p, [appt.id]: true }));
    }
    setPrescModal(appt);
  };

  const handleSavePresc = async () => {
    if (!prescModal) return;
    setPrescSaving(true);
    try {
      await API.post('/prescriptions', { appointment_id: prescModal.id, ...prescForm });
      toast.success('✅ Prescription saved!');
      // Mark as saved — show Edit/Remove options instead of closing
      setPrescSaved(p => ({ ...p, [prescModal.id]: true }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save prescription.');
    } finally { setPrescSaving(false); }
  };

  const handleRemovePresc = async (apptId) => {
    if (!window.confirm('Remove this prescription?')) return;
    try {
      await API.delete(`/prescriptions/appointment/${apptId}`);
      toast.success('Prescription removed.');
      setPrescSaved(p => { const n={...p}; delete n[apptId]; return n; });
      setPrescModal(null);
    } catch { toast.error('Could not remove.'); }
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

  // Dynamic dept avg from API (dept_avg_mins column JOINed from dept_consultation_stats)
  // Uses real self-learned avg for this dept, falls back to 20 if no data
  const deptAvgMins = parseFloat(queue[0]?.dept_avg_mins) || 20;
  const baseTime = Math.round(deptAvgMins * 10) / 10; // show 1 decimal

  // Wait formula: position 1 = 0 min (currently being seen / In Progress)
  // position N = (N-1) × real_dept_avg_mins
  const getWaitForPosition = (pos) => {
    if (pos <= 1) return 0;
    return Math.round((pos - 1) * deptAvgMins);
  };

  return (
    <>
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
              <span className="qs-val">~{Math.round(queue.length * baseTime)} min</span>
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
            <button className={`dash-tab ${activeTab==='myleave'?'active':''}`} onClick={()=>setActiveTab('myleave')}>
              🏖️ My Leaves ({myLeaves.length})
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
                            {isCurrent && !a.queue_status?.includes('Progress') && (
                              <button className="btn btn-outline btn-sm" onClick={()=>handleStartTreatment(a.id)}
                                title="Record treatment start time for accurate ML data">
                                ▶ Start
                              </button>
                            )}
                            {/* Prescription during treatment — available for In-Progress patient */}
                            {isCurrent && (
                              <button className="btn btn-outline btn-sm"
                                style={{borderColor:'#0d9488',color:'#0d9488'}}
                                onClick={()=>handleOpenPresc(a)}>
                                📋 {prescSaved[a.id] ? 'Edit Rx' : 'Prescription'}
                              </button>
                            )}
                            <button className="btn btn-primary" onClick={()=>handleComplete(a.id)}>
                              ✓ Complete
                            </button>
                            {!isCurrent && (
                              <button className="btn btn-danger btn-sm" onClick={()=>handleNoShow(a.id)}>
                                No Show
                              </button>
                            )}
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
                        <div style={{marginLeft:'auto',paddingLeft:12,flexShrink:0,display:'flex',gap:8}}>
                          <button className="btn btn-outline btn-sm"
                            style={{borderColor:'#0d9488',color:'#0d9488'}}
                            onClick={()=>handleOpenPresc(a)}>
                            {prescSaved[a.id] ? '✏️ Edit Rx' : '📋 Add Rx'}
                          </button>
                          {prescSaved[a.id] && (
                            <button className="btn btn-outline btn-sm"
                              style={{borderColor:'#ef4444',color:'#ef4444'}}
                              onClick={()=>handleRemovePresc(a.id)}>
                              🗑️ Remove
                            </button>
                          )}
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

              {/* MY LEAVES TAB */}
              {activeTab === 'myleave' && (
                <div>
                  <div style={{background:'#fef3c7',border:'1.5px solid #f59e0b',borderRadius:10,
                    padding:'12px 16px',marginBottom:20,display:'flex',gap:12,alignItems:'flex-start'}}>
                    <span style={{fontSize:22}}>ℹ️</span>
                    <div>
                      <p style={{fontWeight:700,color:'#92400e',margin:0,fontSize:'0.88rem'}}>
                        When you mark a leave date:
                      </p>
                      <p style={{color:'#b45309',margin:'4px 0 0',fontSize:'0.8rem',lineHeight:1.5}}>
                        All your slots on that date are <strong>automatically blocked</strong> for patients.
                      </p>
                    </div>
                  </div>
                  <div style={{background:'#f8fafc',border:'1px solid var(--border)',
                    borderRadius:12,padding:20,marginBottom:20}}>
                    <h4 style={{margin:'0 0 14px',color:'var(--navy)',fontWeight:700,fontSize:'0.95rem'}}>
                      Mark Yourself Unavailable
                    </h4>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 2fr auto',gap:10,alignItems:'end'}}>
                      <div>
                        <label style={{fontSize:'0.75rem',fontWeight:600,color:'var(--muted)',
                          display:'block',marginBottom:5}}>Date</label>
                        <input type="date" value={leaveDate}
                          onChange={e=>setLeaveDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{width:'100%',padding:'9px 12px',border:'2px solid var(--border)',
                            borderRadius:8,fontSize:'0.85rem',outline:'none',boxSizing:'border-box'}}
                          onFocus={e=>e.target.style.borderColor='#0d9488'}
                          onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                      </div>
                      <div>
                        <label style={{fontSize:'0.75rem',fontWeight:600,color:'var(--muted)',
                          display:'block',marginBottom:5}}>Reason (optional)</label>
                        <input type="text" value={leaveReason}
                          placeholder="e.g. Medical leave, Conference..."
                          onChange={e=>setLeaveReason(e.target.value)}
                          style={{width:'100%',padding:'9px 12px',border:'2px solid var(--border)',
                            borderRadius:8,fontSize:'0.85rem',outline:'none',boxSizing:'border-box'}}
                          onFocus={e=>e.target.style.borderColor='#0d9488'}
                          onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                      </div>
                      <button disabled={!leaveDate || leaveLoading}
                        onClick={async()=>{
                          if(!leaveDate) return;
                          setLeaveLoading(true);
                          try {
                            const res = await API.post('/doctor/my-leave',{leave_date:leaveDate,reason:leaveReason});
                            toast.success(res.data.message);
                            setLeaveDate(''); setLeaveReason('');
                            loadMyLeaves();
                          } catch(err){ toast.error(err.response?.data?.message||'Could not set leave.'); }
                          finally{ setLeaveLoading(false); }
                        }}
                        style={{padding:'9px 18px',
                          background:!leaveDate||leaveLoading?'#94a3b8':'#0d9488',
                          color:'#fff',border:'none',borderRadius:8,fontWeight:600,
                          cursor:'pointer',whiteSpace:'nowrap',fontSize:'0.85rem'}}>
                        {leaveLoading?'⏳':'🏖️ Mark Leave'}
                      </button>
                    </div>
                  </div>
                  {myLeaves.length === 0 ? (
                    <div className="empty-dash">
                      <div className="empty-icon">📅</div>
                      <p>No leaves marked</p>
                    </div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {myLeaves.map((l,i)=>{
                        const isPast = new Date(l.leave_date) < new Date(new Date().toISOString().split('T')[0]);
                        return (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:14,
                            background:'#fff',
                            border:'1.5px solid ' + (isPast?'#e2e8f0':'#fde68a'),
                            borderLeft:'4px solid ' + (isPast?'#94a3b8':'#f59e0b'),
                            borderRadius:10,padding:'12px 16px',opacity:isPast?0.6:1}}>
                            <span style={{fontSize:24}}>{isPast?'✅':'🏖️'}</span>
                            <div style={{flex:1}}>
                              <p style={{fontWeight:600,margin:0,color:'var(--navy)',fontSize:'0.9rem'}}>
                                {l.leave_date}
                                <span style={{marginLeft:8,fontSize:'0.72rem',fontWeight:400,color:'var(--muted)'}}>
                                  {isPast?'(past)':'(upcoming)'}
                                </span>
                              </p>
                              {l.reason&&<p style={{margin:'3px 0 0',fontSize:'0.8rem',color:'#92400e'}}>{l.reason}</p>}
                            </div>
                            <span style={{background:isPast?'#f1f5f9':'#fef3c7',
                              color:isPast?'#64748b':'#92400e',
                              fontSize:'0.72rem',fontWeight:600,padding:'3px 10px',borderRadius:20}}>
                              {isPast?'Past':'Slots Blocked'}
                            </span>
                            {!isPast&&(
                              <button onClick={async()=>{
                                try{
                                  await API.delete('/doctor/my-leave',{data:{leave_date:l.leave_date}});
                                  toast.success('Leave removed.');
                                  loadMyLeaves();
                                } catch{ toast.error('Could not remove.'); }
                              }}
                              style={{background:'none',border:'1.5px solid #ef4444',color:'#ef4444',
                                borderRadius:8,padding:'5px 12px',cursor:'pointer',
                                fontSize:'0.78rem',fontWeight:600}}>
                                Cancel
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>

      {/* ── Prescription Modal - Hospital Format ── */}
      {prescModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,
          display:'flex',alignItems:'flex-start',justifyContent:'center',
          padding:'20px 16px',overflowY:'auto'}}
          onClick={()=>setPrescModal(null)}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:640,
            boxShadow:'0 24px 64px rgba(0,0,0,0.25)',margin:'auto'}}
            onClick={e=>e.stopPropagation()}>

            {/* Hospital Letterhead */}
            <div style={{background:'linear-gradient(135deg,#0f172a,#0d9488)',
              borderRadius:'16px 16px 0 0',padding:'20px 28px',color:'#fff'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <h2 style={{margin:0,fontSize:'1.1rem',fontWeight:800,letterSpacing:0.5}}>
                    🏥 City General Hospital
                  </h2>
                  <p style={{margin:'3px 0 0',fontSize:'0.77rem',opacity:0.8}}>
                    Pune, Maharashtra
                  </p>
                  <p style={{margin:'8px 0 0',fontSize:'0.82rem',opacity:0.9}}>
                    Dr. {user?.name} &nbsp;|&nbsp; {prescModal.dept_name || 'Department'}
                  </p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{margin:0,fontSize:'0.77rem',opacity:0.8}}>Date</p>
                  <p style={{margin:'2px 0 0',fontWeight:700,fontSize:'0.88rem'}}>
                    {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </p>
                  <button onClick={()=>setPrescModal(null)}
                    style={{marginTop:8,background:'rgba(255,255,255,0.2)',border:'none',
                      color:'#fff',borderRadius:8,padding:'4px 10px',
                      cursor:'pointer',fontSize:'0.78rem'}}>
                    Close ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Info Strip */}
            <div style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0',
              padding:'12px 28px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <div>
                <p style={{margin:0,fontSize:'0.68rem',color:'#64748b',fontWeight:700,
                  textTransform:'uppercase',letterSpacing:0.5}}>Patient</p>
                <p style={{margin:'2px 0 0',fontWeight:700,color:'#0f172a',fontSize:'0.88rem'}}>
                  {prescModal.full_name}
                </p>
              </div>
              <div>
                <p style={{margin:0,fontSize:'0.68rem',color:'#64748b',fontWeight:700,
                  textTransform:'uppercase',letterSpacing:0.5}}>Age / Gender</p>
                <p style={{margin:'2px 0 0',fontWeight:600,color:'#0f172a',fontSize:'0.88rem'}}>
                  {prescModal.age} yrs {prescModal.gender ? '· ' + prescModal.gender : ''}
                </p>
              </div>
              <div>
                <p style={{margin:0,fontSize:'0.68rem',color:'#64748b',fontWeight:700,
                  textTransform:'uppercase',letterSpacing:0.5}}>Booking ID</p>
                <p style={{margin:'2px 0 0',fontWeight:600,color:'#0d9488',fontSize:'0.88rem'}}>
                  {prescModal.booking_id}
                </p>
              </div>
            </div>

            {/* Form Body */}
            <div style={{padding:'20px 28px'}}>

              {/* Diagnosis */}
              <div style={{marginBottom:16}}>
                <label style={{fontWeight:700,fontSize:'0.78rem',color:'#475569',
                  display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>
                  Diagnosis *
                </label>
                <textarea rows={2} placeholder="Primary diagnosis / chief complaint..."
                  value={prescForm.diagnosis}
                  onChange={e=>setPrescForm(p=>({...p,diagnosis:e.target.value}))}
                  style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',
                    borderRadius:8,fontSize:'0.88rem',resize:'vertical',
                    boxSizing:'border-box',outline:'none',fontFamily:'inherit'}}
                  onFocus={e=>e.target.style.borderColor='#0d9488'}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>

              {/* Medicines Table */}
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',
                  alignItems:'center',marginBottom:8}}>
                  <label style={{fontWeight:700,fontSize:'0.78rem',color:'#475569',
                    textTransform:'uppercase',letterSpacing:0.5}}>
                    Rx — Medicines
                  </label>
                  <button onClick={()=>setPrescForm(p=>({...p,
                    medicines:[...p.medicines,{name:'',dose:'',frequency:'',duration:''}]}))}
                    style={{background:'#0d9488',color:'#fff',border:'none',
                      borderRadius:6,padding:'5px 12px',fontSize:'0.78rem',
                      cursor:'pointer',fontWeight:600}}>
                    + Add Medicine
                  </button>
                </div>
                <div style={{display:'grid',
                  gridTemplateColumns:'3fr 1fr 1.4fr 1.2fr 24px',
                  gap:'0 8px',background:'#f1f5f9',borderRadius:'8px 8px 0 0',
                  padding:'7px 10px',marginBottom:2}}>
                  {['Medicine Name','Dose','Frequency','Duration',''].map((h,i)=>(
                    <span key={i} style={{fontSize:'0.7rem',fontWeight:700,
                      color:'#475569',textTransform:'uppercase'}}>{h}</span>
                  ))}
                </div>
                {prescForm.medicines.map((m,i)=>(
                  <div key={i} style={{display:'grid',
                    gridTemplateColumns:'3fr 1fr 1.4fr 1.2fr 24px',
                    gap:'0 8px',marginBottom:3,alignItems:'center',
                    background:i%2===0?'#fafafa':'#fff',
                    border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px'}}>
                    <input placeholder="e.g. Paracetamol" value={m.name}
                      onChange={e=>{const ms=[...prescForm.medicines];ms[i].name=e.target.value;setPrescForm(p=>({...p,medicines:ms}));}}
                      style={{padding:'6px 8px',border:'none',borderRadius:4,
                        fontSize:'0.8rem',outline:'none',background:'transparent'}}/>
                    <input placeholder="500mg" value={m.dose}
                      onChange={e=>{const ms=[...prescForm.medicines];ms[i].dose=e.target.value;setPrescForm(p=>({...p,medicines:ms}));}}
                      style={{padding:'6px 8px',border:'none',borderRadius:4,
                        fontSize:'0.8rem',outline:'none',background:'transparent'}}/>
                    <input placeholder="Twice daily" value={m.frequency}
                      onChange={e=>{const ms=[...prescForm.medicines];ms[i].frequency=e.target.value;setPrescForm(p=>({...p,medicines:ms}));}}
                      style={{padding:'6px 8px',border:'none',borderRadius:4,
                        fontSize:'0.8rem',outline:'none',background:'transparent'}}/>
                    <input placeholder="5 days" value={m.duration}
                      onChange={e=>{const ms=[...prescForm.medicines];ms[i].duration=e.target.value;setPrescForm(p=>({...p,medicines:ms}));}}
                      style={{padding:'6px 8px',border:'none',borderRadius:4,
                        fontSize:'0.8rem',outline:'none',background:'transparent'}}/>
                    {prescForm.medicines.length > 1
                      ? <button onClick={()=>{const ms=prescForm.medicines.filter((_,j)=>j!==i);setPrescForm(p=>({...p,medicines:ms}));}}
                          style={{background:'none',border:'none',color:'#ef4444',
                            cursor:'pointer',fontSize:15,padding:0}}>✕</button>
                      : <span/>}
                  </div>
                ))}
              </div>

              {/* Instructions & Follow-up */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',
                gap:14,marginBottom:18}}>
                <div>
                  <label style={{fontWeight:700,fontSize:'0.78rem',color:'#475569',
                    display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>
                    Instructions
                  </label>
                  <textarea rows={3} placeholder="Rest, diet, precautions..."
                    value={prescForm.instructions}
                    onChange={e=>setPrescForm(p=>({...p,instructions:e.target.value}))}
                    style={{width:'100%',padding:'10px 12px',border:'2px solid #e2e8f0',
                      borderRadius:8,fontSize:'0.82rem',resize:'vertical',
                      boxSizing:'border-box',outline:'none',fontFamily:'inherit'}}
                    onFocus={e=>e.target.style.borderColor='#0d9488'}
                    onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div>
                    <label style={{fontWeight:700,fontSize:'0.78rem',color:'#475569',
                      display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>
                      Follow-up Date
                    </label>
                    <input type="date" value={prescForm.follow_up_date}
                      onChange={e=>setPrescForm(p=>({...p,follow_up_date:e.target.value}))}
                      style={{width:'100%',padding:'10px 12px',border:'2px solid #e2e8f0',
                        borderRadius:8,fontSize:'0.85rem',
                        boxSizing:'border-box',outline:'none'}}
                      onFocus={e=>e.target.style.borderColor='#0d9488'}
                      onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                  </div>
                  <div>
                    <label style={{fontWeight:700,fontSize:'0.78rem',color:'#475569',
                      display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>
                      Notes
                    </label>
                    <textarea rows={2} placeholder="Additional notes..."
                      value={prescForm.notes}
                      onChange={e=>setPrescForm(p=>({...p,notes:e.target.value}))}
                      style={{width:'100%',padding:'10px 12px',border:'2px solid #e2e8f0',
                        borderRadius:8,fontSize:'0.82rem',resize:'vertical',
                        boxSizing:'border-box',outline:'none',fontFamily:'inherit'}}
                      onFocus={e=>e.target.style.borderColor='#0d9488'}
                      onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                  </div>
                </div>
              </div>

              {/* Save / Update / Remove Buttons */}
              <div style={{display:'flex',gap:10}}>
                <button onClick={handleSavePresc}
                  disabled={prescSaving || !prescForm.diagnosis.trim()}
                  style={{flex:1,padding:'13px',fontWeight:700,fontSize:'0.92rem',
                    border:'none',borderRadius:10,cursor:'pointer',
                    background:prescSaving||!prescForm.diagnosis.trim()?'#94a3b8':'#0d9488',
                    color:'#fff'}}>
                  {prescSaving ? '⏳ Saving...'
                    : prescSaved[prescModal.id] ? '✏️ Update Prescription'
                    : '💾 Save Prescription'}
                </button>
                {prescSaved[prescModal.id] && (
                  <button onClick={()=>handleRemovePresc(prescModal.id)}
                    style={{padding:'13px 18px',fontWeight:700,fontSize:'0.88rem',
                      border:'2px solid #ef4444',borderRadius:10,
                      cursor:'pointer',background:'none',color:'#ef4444'}}>
                    🗑️ Remove
                  </button>
                )}
              </div>
              {prescSaved[prescModal.id] && (
                <p style={{textAlign:'center',fontSize:'0.74rem',color:'#0d9488',
                  marginTop:8,fontWeight:600}}>
                  ✅ Saved — you can still edit or remove above
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoctorDashboard;