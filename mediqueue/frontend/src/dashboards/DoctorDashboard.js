import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDoctorAppointments, completeAppointment, markInProgress, markNoShow } from '../services/api';
import API from '../services/api';
import {
  Users, Clock, CheckCircle2, XCircle, CalendarX, Calendar,
  BarChart3, User, FileText, Building2, Search, LogOut, Menu, X,
  Play, Check, Plus, Trash2, AlertCircle, RefreshCw,
  Phone, Mail, Award, DollarSign
} from 'lucide-react';
import './Dashboard.css';

// ── Custom Toast System (sleek in-component notification) ──────────────────────
const ToastContext = React.createContext(null);

const TOAST_COLORS = {
  success: { border: '#0d9488', bg: '#f0fdf4', title: '#0f766e', icon: CheckCircle2 },
  error:   { border: '#e11d48', bg: '#fff1f2', title: '#be123c', icon: XCircle },
  warning: { border: '#f59e0b', bg: '#fffbeb', title: '#b45309', icon: AlertCircle },
  info:    { border: '#3b82f6', bg: '#eff6ff', title: '#1d4ed8', icon: Clock },
};

const ToastContainer = ({ toasts }) => (
  <div style={{
    position: 'fixed', top: 20, right: 20, zIndex: 99999,
    display: 'flex', flexDirection: 'column', gap: 10,
    pointerEvents: 'none', maxWidth: 360
  }}>
    {toasts.map(t => {
      const c = TOAST_COLORS[t.type] || TOAST_COLORS.info;
      const IconComponent = c.icon;
      return (
        <div key={t.id} style={{
          pointerEvents: 'all',
          background: c.bg,
          border: `1px solid ${c.border}30`,
          borderLeft: `4px solid ${c.border}`,
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          animation: 'toastIn 0.25s ease',
          minWidth: 280,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `${c.border}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <IconComponent size={17} color={c.border} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: c.title, lineHeight: 1.3 }}>
              {t.title}
            </p>
            {t.message && (
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                {t.message}
              </p>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

// ── Reusable Compact Section Header ───────────────────────────────────────────
const SectionHeader = ({ icon: Icon, iconClass, title, badgeText, badgeClass }) => (
  <div className="pvh-compact-header">
    <div className="pvh-left">
      <div className={`pvh-icon-wrap ${iconClass || 'today'}`}>
        <Icon size={18} />
      </div>
      <div className="pvh-title-wrap">
        <h2 className="pvh-title">{title}</h2>
      </div>
    </div>
    {badgeText && (
      <div className={`pvh-badge ${badgeClass || ''}`}>
        {badgeClass?.includes('live') && <span className="live-dot" style={{ marginRight: 6 }} />}
        <span>{badgeText}</span>
      </div>
    )}
  </div>
);

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Toast System
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, title, message = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const toast = {
    success: (msg) => addToast('success', 'Success', msg),
    error:   (msg) => addToast('error',   'Error',   msg),
    warning: (msg) => addToast('warning', 'Notice',  msg),
    info:    (msg) => addToast('info',    'Info',    msg),
  };

  // Dashboard Data States
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchUpcoming, setSearchUpcoming] = useState('');

  // Live IST Clock
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  });

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Prescription States
  const [prescModal, setPrescModal]   = useState(null);
  const [prescSaved, setPrescSaved]   = useState({});
  const [prescSaving, setPrescSaving] = useState(false);
  const [prescForm, setPrescForm]     = useState({
    diagnosis: '', instructions: '', notes: '', follow_up_date: '',
    medicines: [{ name: '', dose: '', frequency: '', duration: '' }]
  });

  // Doctor Leave States
  const [myLeaves, setMyLeaves]       = useState([]);
  const [leaveDate, setLeaveDate]     = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Load Data Callbacks
  const loadMyLeaves = useCallback(() => {
    API.get('/doctor/my-leaves')
      .then(r => setMyLeaves(r.data.leaves || []))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    getDoctorAppointments()
      .then(r => {
        setAppointments(r.data.appointments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    loadMyLeaves();
  }, [load, loadMyLeaves]);

  // Auto-refresh queue every 12 seconds
  useEffect(() => {
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [load]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeAppointment(id);
      toast.success('Patient consultation completed successfully.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error completing consultation.');
    }
  };

  const handleStartTreatment = async (id) => {
    try {
      await markInProgress(id);
      toast.info('Consultation started. Duration timer active for wait-time model.');
      load();
    } catch {
      toast.error('Error starting treatment.');
    }
  };

  const handleNoShow = async (id) => {
    if (!window.confirm('Mark this patient as No-Show?')) return;
    try {
      await markNoShow(id);
      toast.warning('Patient marked as No-Show.');
      load();
    } catch {
      toast.error('Error marking as No-Show.');
    }
  };

  // Prescription Handlers
  const handleOpenPresc = async (appt) => {
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
          follow_up_date: rx.follow_up_date ? rx.follow_up_date.substring(0, 10) : '',
          medicines:      rx.medicines?.length ? rx.medicines : [{ name: '', dose: '', frequency: '', duration: '' }]
        };
        hasSaved = true;
      }
    } catch { /* fresh form */ }
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
      toast.success('Prescription saved successfully.');
      setPrescSaved(p => ({ ...p, [prescModal.id]: true }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save prescription.');
    } finally {
      setPrescSaving(false);
    }
  };

  const handleRemovePresc = async (apptId) => {
    if (!window.confirm('Remove this prescription?')) return;
    try {
      await API.delete(`/prescriptions/appointment/${apptId}`);
      toast.success('Prescription removed.');
      setPrescSaved(p => {
        const n = { ...p };
        delete n[apptId];
        return n;
      });
      setPrescModal(null);
    } catch {
      toast.error('Could not remove prescription.');
    }
  };

  // Filter queue groups
  const queue = appointments
    .filter(a => ['Checked-In', 'In-Progress'].includes(a.status) || (['Waiting', 'In-Progress'].includes(a.queue_status)))
    .sort((a, b) => (a.queue_position || 99) - (b.queue_position || 99));

  const booked = appointments.filter(a => a.status === 'Booked');
  const completed = appointments.filter(a => a.status === 'Completed');
  const noShows = appointments.filter(a => a.status === 'No-Show');

  // Dynamic dept average consultation minutes from backend ML model
  const deptAvgMins = parseFloat(queue[0]?.dept_avg_mins) || 20;
  const baseTime = Math.round(deptAvgMins * 10) / 10;

  const getWaitForPosition = (pos) => {
    if (pos <= 1) return 0;
    return Math.round((pos - 1) * deptAvgMins);
  };

  // Safe doctor display credentials
  const doctorName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : (user?.name || 'Doctor');
  const doctorDept = user?.dept_name || appointments[0]?.dept_name || 'Clinical Department';
  const doctorSpecialization = user?.specialization || 'Clinical Specialist';

  // Navigation Items Tailored for Doctors
  const NAV_ITEMS = [
    { key: 'queue',     label: 'Live Queue',        icon: Users,        count: queue.length, badgeType: 'live' },
    { key: 'booked',    label: 'Upcoming (Today)',  icon: Clock,        count: booked.length },
    { key: 'completed', label: 'Completed Today',   icon: CheckCircle2, count: completed.length, badgeType: 'teal' },
    { key: 'noshow',    label: 'No-Show Patients',  icon: XCircle,      count: noShows.length, badgeType: 'warning' },
    { key: 'myleave',   label: 'Schedule & Leaves', icon: CalendarX,    count: myLeaves.length },
    { key: 'analytics', label: 'OPD Analytics',     icon: BarChart3 },
    { key: 'profile',   label: 'Doctor Profile',    icon: User },
  ];

  const currentNavItem = NAV_ITEMS.find(i => i.key === activeTab);
  const currentNavTitle = currentNavItem ? currentNavItem.label : 'Live Queue';

  // Filtered upcoming appointments
  const filteredBooked = booked.filter(a => {
    if (!searchUpcoming) return true;
    const q = searchUpcoming.toLowerCase();
    return (
      (a.full_name || '').toLowerCase().includes(q) ||
      (a.booking_id || '').toLowerCase().includes(q) ||
      (a.time_slot || '').toLowerCase().includes(q)
    );
  });

  return (
    <ToastContext.Provider value={addToast}>
      <ToastContainer toasts={toasts} />

      <div className="dash-portal-layout">
        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div className="dash-portal-backdrop" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* ── Persistent Left Navigation Drawer ────────────────────────── */}
        <aside className={`dash-portal-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="dash-portal-sidebar-header">
            <div className="dash-portal-brand">
              <span className="dash-portal-brand-icon">
                <Building2 size={20} color="var(--teal)" />
              </span>
              <div>
                <span className="dash-portal-brand-title">MediQueue</span>
                <span className="dash-portal-brand-sub">Doctor Portal</span>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                type="button"
                className="dash-portal-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="dash-portal-nav">
            <div className="dash-portal-nav-group-label">Clinical Practice</div>
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                type="button"
                className={`dash-portal-item ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.key);
                  setMobileMenuOpen(false);
                }}
              >
                <item.icon size={17} className="dash-portal-item-icon" />
                <span className="dash-portal-item-label">{item.label}</span>
                {item.count > 0 && (
                  <span className={`dash-portal-badge ${item.badgeType || 'teal'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Doctor Profile Card + Logout pinned at bottom */}
          <div className="dash-portal-footer">
            <div className="dash-portal-user-card">
              <div className="dash-portal-avatar">
                {(doctorName[0] || 'D').toUpperCase()}
              </div>
              <div className="dash-portal-user-meta">
                <span className="dash-portal-user-name">Dr. {doctorName}</span>
                <span className="dash-portal-user-role">{doctorSpecialization}</span>
              </div>
            </div>
            <button type="button" className="dash-portal-logout-btn" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ────────────────────────────────────────── */}
        <div className="dash-portal-main">
          {/* Top Header Bar */}
          <header className="dash-portal-topbar">
            <div className="dpt-left">
              <button
                type="button"
                className="dpt-hamburger"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Navigation"
              >
                <Menu size={20} />
              </button>
              <div className="dpt-breadcrumb">
                <span className="dpt-bc-root">MediQueue</span>
                <span className="dpt-bc-sep">/</span>
                <span className="dpt-bc-curr">{currentNavTitle}</span>
              </div>
            </div>

            <div className="dpt-right">
              <div className="dpt-clock" title="Indian Standard Time (Live)">
                <Clock size={13} />
                <span>{currentTime}</span>
              </div>
              <div className="dpt-status-chip">
                <span className="live-dot green"></span>
                <span className="dpt-status-text">OPD Active</span>
              </div>
              <button
                type="button"
                className="dpt-refresh-btn"
                onClick={load}
                title="Refresh live queue"
              >
                <RefreshCw size={13} className={loading ? "spin-slow" : ""} />
                <span>Sync</span>
              </button>
            </div>
          </header>

          {/* Scrollable View Body */}
          <main className="dash-portal-body">
            <div className="dash-portal-card-body">
              {loading ? (
                <div className="loading-screen"><div className="spinner"></div></div>
              ) : (
                <>
                  {/* ────────────────────────────────────────────────────────
                      TAB 1: LIVE QUEUE (Clinical Workspace)
                  ──────────────────────────────────────────────────────── */}
                  {activeTab === 'queue' && (
                    <div>
                      <SectionHeader
                        icon={Users}
                        iconClass="queue"
                        title="Live Consultation Queue"
                        badgeText={queue.length > 0 ? `${queue.length} in Queue` : 'Queue Clear'}
                        badgeClass={queue.length > 0 ? 'badge-teal live' : 'badge-gray'}
                      />

                      {/* 4-Stat Queue Velocity Summary Banner */}
                      {queue.length > 0 && (
                        <div className="doctor-qs-grid">
                          <div className="doctor-qs-item">
                            <span className="doctor-qs-label">Next Patient</span>
                            <span className="doctor-qs-val">{queue[0]?.full_name || 'None'}</span>
                          </div>
                          <div className="doctor-qs-item">
                            <span className="doctor-qs-label">Avg Wait</span>
                            <span className="doctor-qs-val">{baseTime} min</span>
                          </div>
                          <div className="doctor-qs-item">
                            <span className="doctor-qs-label">Est. Queue Time</span>
                            <span className="doctor-qs-val">~{Math.round(queue.length * baseTime)} min</span>
                          </div>
                          <div className="doctor-qs-item">
                            <span className="doctor-qs-label">In Queue</span>
                            <span className="doctor-qs-val">{queue.length}</span>
                          </div>
                        </div>
                      )}

                      {queue.length === 0 ? (
                        <div className="empty-dash">
                          <div className="empty-icon"><Users size={36} color="var(--primary)" /></div>
                          <p>No Patients Waiting in Queue</p>
                          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                            Patients will appear here in real-time as soon as receptionist checks them in.
                          </span>
                          <button className="btn btn-outline btn-sm" onClick={load} style={{ marginTop: 12 }}>
                            <RefreshCw size={13} /> <span>Refresh Queue</span>
                          </button>
                        </div>
                      ) : (
                        <div className="doctor-queue-container">
                          {/* Active Current Patient (#1 NOW) */}
                          {(() => {
                            const current = queue[0];
                            const isInProgress = current.queue_status?.includes('Progress');
                            return (
                              <div className="doctor-active-hero-card">
                                <div className="dah-header">
                                  <div className="dah-pos-badge">
                                    <span className="dah-pos-dot"></span>
                                    <span>#1 Current Patient</span>
                                  </div>
                                  <div className="dah-meta-right">
                                    <span className="dah-token">Token: {current.booking_id}</span>
                                    <span className={`badge ${isInProgress ? 'badge-green' : 'badge-teal'}`}>
                                      {isInProgress ? 'In Consultation' : 'Ready'}
                                    </span>
                                  </div>
                                </div>

                                <div className="dah-body">
                                  <div className="dah-patient-main">
                                    <h3 className="dah-patient-name">{current.full_name}</h3>
                                    <div className="dah-tags">
                                      <span className="dah-tag">Age: {current.age || 'N/A'}</span>
                                      <span className="dah-tag">{current.gender || 'Not specified'}</span>
                                      <span className="dah-tag">Slot: {current.time_slot}</span>
                                    </div>
                                    {current.reason_for_visit && (
                                      <p className="dah-reason">
                                        <strong>Chief Complaint:</strong> {current.reason_for_visit}
                                      </p>
                                    )}
                                  </div>

                                  {/* Action Controls */}
                                  <div className="dah-actions">
                                    {!isInProgress && (
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-sm btn-dah-start"
                                        onClick={() => handleStartTreatment(current.id)}
                                        title="Start treatment timer for accurate self-learning ML wait times"
                                      >
                                        <Play size={14} />
                                        <span>Start Consultation</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      className="btn btn-outline btn-sm btn-dah-rx"
                                      onClick={() => handleOpenPresc(current)}
                                    >
                                      <FileText size={14} />
                                      <span>{prescSaved[current.id] ? 'Edit Prescription' : 'Prescription'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-primary btn-dah-complete"
                                      onClick={() => handleComplete(current.id)}
                                    >
                                      <Check size={14} />
                                      <span>Complete</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Waiting Queue List (#2, #3, ...) */}
                          {queue.length > 1 && (
                            <div className="doctor-waiting-list">
                              <h4 className="doctor-subheading">
                                <span>Waiting in Hall ({queue.length - 1})</span>
                              </h4>

                              {queue.slice(1).map((a, idx) => {
                                const waitMins = getWaitForPosition(idx + 2);
                                return (
                                  <div key={a.id} className="doctor-waiting-row">
                                    <div className="dwr-pos">#{idx + 2}</div>
                                    <div className="dwr-info">
                                      <div className="dwr-top">
                                        <span className="dwr-name">{a.full_name}</span>
                                        <span className="dwr-slot">{a.time_slot}</span>
                                      </div>
                                      <div className="dwr-meta">
                                        <span>Token: <strong>{a.booking_id}</strong></span>
                                        <span>·</span>
                                        <span>Age: {a.age}</span>
                                        {a.gender && <span>· {a.gender}</span>}
                                        {a.reason_for_visit && <span>· {a.reason_for_visit}</span>}
                                      </div>
                                    </div>
                                    <div className="dwr-wait">
                                      <span className="dwr-wait-num">~{waitMins} min</span>
                                      <span className="dwr-wait-label">est. wait</span>
                                    </div>
                                    <div className="dwr-action">
                                      <button
                                        type="button"
                                        className="appt-btn-cancel"
                                        onClick={() => handleNoShow(a.id)}
                                        title="Mark patient as absent"
                                      >
                                        <XCircle size={13} />
                                        <span>No-Show</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      TAB 2: UPCOMING APPOINTMENTS
                  ──────────────────────────────────────────────────────── */}
                  {activeTab === 'booked' && (
                    <div>
                      <SectionHeader
                        icon={Clock}
                        iconClass="upcoming"
                        title="Today's Upcoming Appointments"
                        badgeText={`${booked.length} Booked`}
                        badgeClass="badge-blue"
                      />

                      <div className="reg-filters-card" style={{ marginBottom: 16 }}>
                        <div className="search-input-wrap" style={{ flex: 1 }}>
                          <Search size={16} className="search-icon" />
                          <input
                            type="text"
                            placeholder="Search upcoming appointments by patient name or token..."
                            value={searchUpcoming}
                            onChange={e => setSearchUpcoming(e.target.value)}
                          />
                        </div>
                      </div>

                      {filteredBooked.length === 0 ? (
                        <div className="empty-dash">
                          <div className="empty-icon"><Clock size={36} color="var(--color-text-secondary)" /></div>
                          <p>No upcoming appointments found</p>
                          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                            All scheduled appointments have either checked in or been processed.
                          </span>
                        </div>
                      ) : (
                        <div className="appt-list">
                          {filteredBooked.map(a => (
                            <div key={a.id} className="appt-row">
                              <div className="appt-dept-icon">
                                <Clock size={16} color="var(--teal)" />
                              </div>
                              <div className="appt-main">
                                <div className="appt-top-row">
                                  <p className="appt-doc">{a.full_name}</p>
                                  <span className="badge badge-blue">Booked</span>
                                </div>
                                <p className="appt-dept">
                                  Slot: {a.time_slot} · Age: {a.age || 'N/A'} {a.gender ? `· ${a.gender}` : ''}
                                </p>
                                <p className="appt-date">
                                  Token: <strong style={{ color: 'var(--navy)' }}>{a.booking_id}</strong>
                                  {a.reason_for_visit && ` · ${a.reason_for_visit}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      TAB 3: COMPLETED CONSULTATIONS
                  ──────────────────────────────────────────────────────── */}
                  {activeTab === 'completed' && (
                    <div>
                      <SectionHeader
                        icon={CheckCircle2}
                        iconClass="approvals"
                        title="Completed Consultations"
                        badgeText={`${completed.length} Completed Today`}
                        badgeClass="badge-teal"
                      />

                      {completed.length === 0 ? (
                        <div className="empty-dash">
                          <div className="empty-icon"><CheckCircle2 size={36} color="var(--color-text-secondary)" /></div>
                          <p>No completed consultations yet today</p>
                          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                            Completed consultations will appear here with instant access to prescriptions.
                          </span>
                        </div>
                      ) : (
                        <div className="appt-list">
                          {completed.map(a => (
                            <div key={a.id} className="appt-row">
                              <div className="appt-dept-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
                                <Check size={16} />
                              </div>
                              <div className="appt-main">
                                <div className="appt-top-row">
                                  <p className="appt-doc">{a.full_name}</p>
                                  <span className="badge badge-teal">Completed</span>
                                </div>
                                <p className="appt-dept">
                                  Slot: {a.time_slot} · Age: {a.age || 'N/A'} {a.gender ? `· ${a.gender}` : ''}
                                </p>
                                <p className="appt-date">
                                  Token: <strong style={{ color: 'var(--navy)' }}>{a.booking_id}</strong>
                                </p>
                              </div>
                              <div className="appt-actions-col">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: '#0d9488', color: '#0d9488' }}
                                  onClick={() => handleOpenPresc(a)}
                                >
                                  <FileText size={13} />
                                  <span>{prescSaved[a.id] ? 'Edit Rx' : 'Add Rx'}</span>
                                </button>
                                {prescSaved[a.id] && (
                                  <button
                                    type="button"
                                    className="appt-btn-cancel"
                                    onClick={() => handleRemovePresc(a.id)}
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      TAB 4: NO-SHOW PATIENTS
                  ──────────────────────────────────────────────────────── */}
                  {activeTab === 'noshow' && (
                    <div>
                      <SectionHeader
                        icon={XCircle}
                        iconClass="noshow"
                        title="No-Show Patients"
                        badgeText={`${noShows.length} Absent`}
                        badgeClass="badge-red"
                      />

                      {noShows.length === 0 ? (
                        <div className="empty-dash">
                          <div className="empty-icon"><CheckCircle2 size={36} color="var(--teal)" /></div>
                          <p>No Missed Appointments Today</p>
                          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                            All arriving patients have attended their consultation on schedule.
                          </span>
                        </div>
                      ) : (
                        <div className="appt-list">
                          {noShows.map(a => (
                            <div key={a.id} className="appt-row">
                              <div className="appt-dept-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                                <X size={16} />
                              </div>
                              <div className="appt-main">
                                <div className="appt-top-row">
                                  <p className="appt-doc">{a.full_name}</p>
                                  <span className="badge badge-red">No-Show</span>
                                </div>
                                <p className="appt-dept">Scheduled Slot: {a.time_slot}</p>
                                <p className="appt-date">Token: {a.booking_id}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      TAB 5: SCHEDULE & LEAVES (Availability Management)
                  ──────────────────────────────────────────────────────── */}
                  {activeTab === 'myleave' && (
                    <div>
                      <SectionHeader
                        icon={CalendarX}
                        iconClass="leaves"
                        title="Doctor Availability & Leaves"
                        badgeText={myLeaves.length > 0 ? `${myLeaves.length} Scheduled` : null}
                        badgeClass="badge-amber"
                      />

                      {/* Notice Banner */}
                      <div style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                        padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center'
                      }}>
                        <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                        <p style={{ color: '#166534', margin: 0, fontSize: '0.84rem', lineHeight: 1.4 }}>
                          When you schedule a leave date, all appointment slots on that date are <strong>automatically blocked</strong> for patients on the public booking portal.
                        </p>
                      </div>

                      {/* Schedule Leave Form */}
                      <div className="leave-form-card">
                        <h4 className="leave-form-title">
                          <CalendarX size={18} color="var(--primary)" />
                          <span>Schedule Doctor Leave</span>
                        </h4>
                        <div className="leave-form-grid">
                          <div className="form-field">
                            <label className="form-label">Leave Date</label>
                            <input
                              type="date"
                              value={leaveDate}
                              onChange={e => setLeaveDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="form-input"
                            />
                          </div>
                          <div className="form-field reason-field">
                            <label className="form-label">Reason (optional)</label>
                            <input
                              type="text"
                              value={leaveReason}
                              placeholder="e.g. Medical conference, Annual leave..."
                              onChange={e => setLeaveReason(e.target.value)}
                              className="form-input"
                            />
                          </div>
                          <div className="form-submit-wrap">
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={!leaveDate || leaveLoading}
                              onClick={async () => {
                                if (!leaveDate) return;
                                setLeaveLoading(true);
                                try {
                                  const res = await API.post('/doctor/my-leave', { leave_date: leaveDate, reason: leaveReason });
                                  toast.success(res.data.message || 'Leave scheduled successfully.');
                                  setLeaveDate('');
                                  setLeaveReason('');
                                  loadMyLeaves();
                                } catch (err) {
                                  toast.error(err.response?.data?.message || 'Could not set leave.');
                                } finally {
                                  setLeaveLoading(false);
                                }
                              }}
                            >
                              {leaveLoading ? 'Scheduling...' : 'Set Leave'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Leaves List */}
                      {myLeaves.length === 0 ? (
                        <div className="empty-dash">
                          <div className="empty-icon"><Calendar size={36} color="var(--color-text-secondary)" /></div>
                          <p>No Leaves Scheduled</p>
                          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                            Your appointment calendar is fully available for patient bookings.
                          </span>
                        </div>
                      ) : (
                        <div className="leaves-list">
                          {myLeaves.map((l, i) => {
                            const isPast = new Date(l.leave_date) < new Date(new Date().toISOString().split('T')[0]);
                            return (
                              <div key={i} className="leave-item-card" style={{ opacity: isPast ? 0.7 : 1 }}>
                                <div className="leave-item-icon">
                                  <Calendar size={18} color="#ea580c" />
                                </div>
                                <div className="leave-item-info">
                                  <p className="leave-item-doc">
                                    {l.leave_date}
                                    <span className="leave-item-dept">
                                      {isPast ? '(past date)' : '(upcoming leave)'}
                                    </span>
                                  </p>
                                  {l.reason && <p className="leave-item-date">{l.reason}</p>}
                                </div>
                                <span className={`badge ${isPast ? 'badge-gray' : 'badge-amber'}`}>
                                  {isPast ? 'Completed' : 'Slots Blocked'}
                                </span>
                                {!isPast && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm remove-leave-btn"
                                    onClick={async () => {
                                      try {
                                        await API.delete('/doctor/my-leave', { data: { leave_date: l.leave_date } });
                                        toast.success('Leave removed successfully.');
                                        loadMyLeaves();
                                      } catch {
                                        toast.error('Could not remove leave.');
                                      }
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      TAB 6: OPD CLINICAL ANALYTICS
                  ──────────────────────────────────────────────────────── */}
                  {activeTab === 'analytics' && (
                    <div>
                      <SectionHeader
                        icon={BarChart3}
                        iconClass="analytics"
                        title="OPD Clinical Analytics & Throughput"
                      />

                      {/* 4-Card Primary KPI Row */}
                      <div className="analytics-kpi-grid">
                        <div className="kpi-card">
                          <div className="kpi-icon-box blue"><FileText size={18} /></div>
                          <div className="kpi-info">
                            <span className="kpi-val">{appointments.length}</span>
                            <span className="kpi-label">Total Today</span>
                          </div>
                        </div>
                        <div className="kpi-card">
                          <div className="kpi-icon-box teal"><CheckCircle2 size={18} /></div>
                          <div className="kpi-info">
                            <span className="kpi-val">{completed.length}</span>
                            <span className="kpi-label">Completed</span>
                          </div>
                        </div>
                        <div className="kpi-card">
                          <div className="kpi-icon-box amber"><Users size={18} /></div>
                          <div className="kpi-info">
                            <span className="kpi-val">{queue.length}</span>
                            <span className="kpi-label">In Queue Now</span>
                          </div>
                        </div>
                        <div className="kpi-card">
                          <div className="kpi-icon-box green"><Clock size={18} /></div>
                          <div className="kpi-info">
                            <span className="kpi-val">{baseTime}m</span>
                            <span className="kpi-label">Avg Consult Duration</span>
                          </div>
                        </div>
                      </div>

                      {/* Secondary Status Breakdown */}
                      <div className="analytics-breakdown-grid">
                        <div className="breakdown-stat-card completed">
                          <span className="bsc-label">Consultations Done</span>
                          <span className="bsc-val">{completed.length}</span>
                        </div>
                        <div className="breakdown-stat-card noshow">
                          <span className="bsc-label">Patient No-Shows</span>
                          <span className="bsc-val">{noShows.length}</span>
                        </div>
                        <div className="breakdown-stat-card cancelled">
                          <span className="bsc-label">Waiting to Check-In</span>
                          <span className="bsc-val">{booked.length}</span>
                        </div>
                        <div className="breakdown-stat-card doctors">
                          <span className="bsc-label">Est. Queue Clearance</span>
                          <span className="bsc-val">~{Math.round(queue.length * baseTime)}m</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      TAB 7: DOCTOR PROFILE & CREDENTIALS
                  ──────────────────────────────────────────────────────── */}
                  {activeTab === 'profile' && (
                    <div>
                      <SectionHeader
                        icon={User}
                        iconClass="doctors"
                        title="Doctor Clinical Profile & OPD Settings"
                      />

                      <div className="doctor-profile-card">
                        <div className="dpc-top">
                          <div className="dpc-avatar">
                            {(doctorName[0] || 'D').toUpperCase()}
                          </div>
                          <div className="dpc-meta">
                            <h3 className="dpc-name">Dr. {doctorName}</h3>
                            <p className="dpc-spec">{doctorSpecialization} · {doctorDept}</p>
                            <span className="badge badge-teal">Registered Specialist</span>
                          </div>
                        </div>

                        <div className="dpc-grid">
                          <div className="dpc-item">
                            <Award size={16} className="dpc-icon" />
                            <div>
                              <span className="dpc-label">Medical License</span>
                              <span className="dpc-val">{user?.medical_license_no || 'Verified on Record'}</span>
                            </div>
                          </div>
                          <div className="dpc-item">
                            <DollarSign size={16} className="dpc-icon" />
                            <div>
                              <span className="dpc-label">Consultation Fee</span>
                              <span className="dpc-val">₹{user?.consultation_fee || 500}</span>
                            </div>
                          </div>
                          <div className="dpc-item">
                            <Clock size={16} className="dpc-icon" />
                            <div>
                              <span className="dpc-label">Years of Experience</span>
                              <span className="dpc-val">{user?.years_of_experience || 5} Years</span>
                            </div>
                          </div>
                          <div className="dpc-item">
                            <Mail size={16} className="dpc-icon" />
                            <div>
                              <span className="dpc-label">Registered Email</span>
                              <span className="dpc-val">{user?.email || 'doctor@mediqueue.com'}</span>
                            </div>
                          </div>
                          <div className="dpc-item">
                            <Phone size={16} className="dpc-icon" />
                            <div>
                              <span className="dpc-label">Contact Phone</span>
                              <span className="dpc-val">{user?.phone || 'On Record'}</span>
                            </div>
                          </div>
                          <div className="dpc-item">
                            <Building2 size={16} className="dpc-icon" />
                            <div>
                              <span className="dpc-label">Department</span>
                              <span className="dpc-val">{doctorDept}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          HOSPITAL PRESCRIPTION MODAL
      ──────────────────────────────────────────────────────────── */}
      {prescModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px', overflowY: 'auto'
          }}
          onClick={() => setPrescModal(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640,
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)', margin: 'auto',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Hospital Letterhead */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a, #0d9488)',
              padding: '18px 24px', color: '#fff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 size={20} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: 0.3 }}>
                      City General Hospital
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.85 }}>
                      Dr. {doctorName} · {prescModal.dept_name || doctorDept}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setPrescModal(null)}
                    style={{
                      background: 'rgba(255,255,255,0.2)', border: 'none',
                      color: '#fff', borderRadius: 6, padding: '5px 8px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Info Strip */}
            <div style={{
              background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              padding: '12px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Patient</p>
                <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                  {prescModal.full_name}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Age / Gender</p>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
                  {prescModal.age} yrs {prescModal.gender ? `· ${prescModal.gender}` : ''}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Token ID</p>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0d9488', fontSize: '0.88rem' }}>
                  {prescModal.booking_id}
                </p>
              </div>
            </div>

            {/* Form Body */}
            <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Diagnosis */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                  Primary Diagnosis *
                </label>
                <textarea
                  rows={2}
                  placeholder="Primary diagnosis / chief symptoms..."
                  value={prescForm.diagnosis}
                  onChange={e => setPrescForm(p => ({ ...p, diagnosis: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1',
                    borderRadius: 8, fontSize: '0.85rem', resize: 'vertical',
                    boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              {/* Medicines Table */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase' }}>
                    Prescribed Medicines (Rx)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPrescForm(p => ({ ...p, medicines: [...p.medicines, { name: '', dose: '', frequency: '', duration: '' }] }))}
                    style={{
                      background: '#0d9488', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '5px 12px', fontSize: '0.78rem',
                      cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '3fr 1fr 1.4fr 1.2fr 24px',
                  gap: '0 8px', background: '#f1f5f9', borderRadius: '8px 8px 0 0',
                  padding: '7px 10px', marginBottom: 2
                }}>
                  {['Medicine Name', 'Dose', 'Frequency', 'Duration', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {prescForm.medicines.map((m, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '3fr 1fr 1.4fr 1.2fr 24px',
                    gap: '0 8px', marginBottom: 4, alignItems: 'center',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                    border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px'
                  }}>
                    <input
                      placeholder="e.g. Paracetamol"
                      value={m.name}
                      onChange={e => {
                        const ms = [...prescForm.medicines];
                        ms[i].name = e.target.value;
                        setPrescForm(p => ({ ...p, medicines: ms }));
                      }}
                      style={{ padding: '6px 8px', border: 'none', borderRadius: 4, fontSize: '0.8rem', outline: 'none', background: 'transparent' }}
                    />
                    <input
                      placeholder="500mg"
                      value={m.dose}
                      onChange={e => {
                        const ms = [...prescForm.medicines];
                        ms[i].dose = e.target.value;
                        setPrescForm(p => ({ ...p, medicines: ms }));
                      }}
                      style={{ padding: '6px 8px', border: 'none', borderRadius: 4, fontSize: '0.8rem', outline: 'none', background: 'transparent' }}
                    />
                    <input
                      placeholder="Twice daily"
                      value={m.frequency}
                      onChange={e => {
                        const ms = [...prescForm.medicines];
                        ms[i].frequency = e.target.value;
                        setPrescForm(p => ({ ...p, medicines: ms }));
                      }}
                      style={{ padding: '6px 8px', border: 'none', borderRadius: 4, fontSize: '0.8rem', outline: 'none', background: 'transparent' }}
                    />
                    <input
                      placeholder="5 days"
                      value={m.duration}
                      onChange={e => {
                        const ms = [...prescForm.medicines];
                        ms[i].duration = e.target.value;
                        setPrescForm(p => ({ ...p, medicines: ms }));
                      }}
                      style={{ padding: '6px 8px', border: 'none', borderRadius: 4, fontSize: '0.8rem', outline: 'none', background: 'transparent' }}
                    />
                    {prescForm.medicines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const ms = prescForm.medicines.filter((_, j) => j !== i);
                          setPrescForm(p => ({ ...p, medicines: ms }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>

              {/* Instructions & Follow-up */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                    Special Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Diet, precautions, hydration..."
                    value={prescForm.instructions}
                    onChange={e => setPrescForm(p => ({ ...p, instructions: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1',
                      borderRadius: 8, fontSize: '0.82rem', resize: 'vertical',
                      boxSizing: 'border-box', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={prescForm.follow_up_date}
                      onChange={e => setPrescForm(p => ({ ...p, follow_up_date: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1',
                        borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                      Clinical Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Confidential clinical notes..."
                      value={prescForm.notes}
                      onChange={e => setPrescForm(p => ({ ...p, notes: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1',
                        borderRadius: 8, fontSize: '0.82rem', resize: 'vertical',
                        boxSizing: 'border-box', outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleSavePresc}
                  disabled={prescSaving || !prescForm.diagnosis.trim()}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: 12, fontSize: '0.9rem' }}
                >
                  {prescSaving ? 'Saving...' : prescSaved[prescModal.id] ? 'Update Prescription' : 'Save Prescription'}
                </button>
                {prescSaved[prescModal.id] && (
                  <button
                    type="button"
                    onClick={() => handleRemovePresc(prescModal.id)}
                    className="btn btn-outline"
                    style={{ borderColor: '#ef4444', color: '#ef4444', padding: '12px 18px' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default DoctorDashboard;