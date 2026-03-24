import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingDoctors, approveDoctor, getAllDoctors, getAnalytics } from '../services/api';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import './Dashboard.css';

// ── Custom Toast System (replaces react-toastify) ─────────────────────────────
const ToastContext = React.createContext(null);

const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: '📷' };
const TOAST_COLORS = {
  success: { border: '#0d9488', bg: '#f0fdf4', icon: '#0d9488', title: '#0f766e' },
  error:   { border: '#e11d48', bg: '#fff1f2', icon: '#e11d48', title: '#be123c' },
  warning: { border: '#f59e0b', bg: '#fffbeb', icon: '#f59e0b', title: '#b45309' },
  info:    { border: '#3b82f6', bg: '#eff6ff', icon: '#3b82f6', title: '#1d4ed8' },
};

const ToastContainer = ({ toasts, remove }) => (
  <div style={{
    position: 'fixed', top: 20, right: 20, zIndex: 99999,
    display: 'flex', flexDirection: 'column', gap: 10,
    pointerEvents: 'none', maxWidth: 360
  }}>
    {toasts.map(t => {
      const c = TOAST_COLORS[t.type] || TOAST_COLORS.info;
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
          {/* Icon circle */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `${c.border}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0
          }}>
            {TOAST_ICONS[t.type]}
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: c.title, lineHeight: 1.3 }}>
              {t.title}
            </p>
            {t.message && (
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, wordBreak: 'break-word' }}>
                {t.message}
              </p>
            )}
          </div>
          {/* Close */}
          <button onClick={() => remove(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: 16, padding: '0 0 0 4px',
            lineHeight: 1, flexShrink: 0, marginTop: 1
          }}>✕</button>
        </div>
      );
    })}
    <style>{`
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(32px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  </div>
);

const useToast = () => React.useContext(ToastContext);

// ── Status badge color map ─────────────────────────────────────────────────────
const statusColor = {
  'Booked': 'badge-blue', 'Checked-In': 'badge-amber',
  'In-Progress': 'badge-green', 'Completed': 'badge-teal',
  'No-Show': 'badge-red', 'Cancelled': 'badge-gray'
};

// ── QR Scanner Component ───────────────────────────────────────────────────────
const QRScanner = ({ onScan, onClose }) => {
  const html5QrRef = useRef(null);
  const startedRef = useRef(false);   // ← guard: prevent double-start
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');

  // Stable refs so useEffect deps don't change on every render
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    const initScanner = () => {
      if (cancelled || startedRef.current) return;   // ← never init twice
      const el = document.getElementById('qr-reader');
      if (!window.Html5Qrcode || !el) {
        setTimeout(initScanner, 150);
        return;
      }

      startedRef.current = true;   // ← lock immediately before async start

      // Clear any leftover content html5-qrcode may have injected before
      el.innerHTML = '';

      try {
        html5QrRef.current = new window.Html5Qrcode('qr-reader');
        html5QrRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (cancelled) return;
            try {
              const data = JSON.parse(decodedText);
              if (data.booking_id) {
                stopScanner();
                onScanRef.current(data.booking_id);
                onCloseRef.current();
                return;
              }
            } catch {}
            if (decodedText.startsWith('MQ-')) {
              stopScanner();
              onScanRef.current(decodedText);
              onCloseRef.current();
            }
          },
          () => {}
        )
          .then(() => { if (!cancelled) setStarted(true); })
          .catch(() => {
            startedRef.current = false;
            if (!cancelled) setError('Camera access denied. Please allow camera permission and try again.');
          });
      } catch (e) {
        startedRef.current = false;
        if (!cancelled) setError('QR scanner failed to start. Use manual entry below.');
      }
    };

    if (window.Html5Qrcode) {
      initScanner();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.onload = () => initScanner();
      script.onerror = () => { if (!cancelled) setError('Could not load QR scanner. Use manual entry below.'); };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, []); // ← empty deps: runs once on mount, cleans up on unmount

  const stopScanner = () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.getState() === 2) {
          html5QrRef.current.stop().catch(() => {});
        }
      } catch {}
      html5QrRef.current = null;
    }
    startedRef.current = false;
  };

  const handleClose = () => { stopScanner(); onCloseRef.current(); };

  return (
    <div className="qr-scanner-overlay" onClick={handleClose}>
      <div className="qr-scanner-modal" onClick={e => e.stopPropagation()}>
        <div className="qr-scanner-header">
          <h3>📷 Scan Patient QR Code</h3>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
          Point camera at the patient's QR code from their email or dashboard
        </p>

        {error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 14, marginBottom: 12, color: '#b91c1c', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Single video container — html5-qrcode renders exactly once here */}
            <div
              id="qr-reader"
              style={{ width: '100%', borderRadius: 12, overflow: 'hidden', minHeight: 100 }}
            />
            {!started && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                <div className="spinner" style={{ margin: '0 auto 10px' }} />
                Starting camera...
              </div>
            )}
            {started && (
              <p style={{ textAlign: 'center', color: '#15803d', fontSize: '0.78rem', marginTop: 8, fontWeight: 600 }}>
                🟢 Camera active — align QR code in the box
              </p>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>Or enter Booking ID manually:</p>
          <ManualEntry onScan={id => { stopScanner(); onScanRef.current(id); }} onClose={handleClose} />
        </div>
      </div>
    </div>
  );
};

// ── Manual Booking ID entry ────────────────────────────────────────────────────
const ManualEntry = ({ onScan, onClose }) => {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value.toUpperCase())}
        placeholder="MQ-XXXXXX-XXXX"
        autoFocus
        onKeyDown={e => e.key === 'Enter' && val && (onScan(val), onClose())}
        style={{ flex: 1, padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = '#0d9488'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <button className="btn btn-primary btn-sm" onClick={() => { if (val) { onScan(val); onClose(); } }}>
        Check In
      </button>
    </div>
  );
};

// ── Main AdminDashboard ────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();

  // Toast state
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, title, message = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const removeToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const toast = {
    success: (msg)  => addToast('success', 'Success', msg),
    error:   (msg)  => addToast('error',   'Error',   msg),
    warning: (msg)  => addToast('warning', 'Warning', msg),
    info:    (msg)  => addToast('info',    'Info',    msg),
  };

  // Dashboard state
  const [pending, setPending] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reception');
  const [checkInId, setCheckInId] = useState('');
  const [checkingIn, setCheckingIn] = useState(null);
  const [allQueues, setAllQueues] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const loadQueues = useCallback(() => {
    API.get('/queue/all').then(r => setAllQueues(r.data.queue || [])).catch(() => {});
  }, []);
  const loadTodayAppointments = useCallback(() => {
    API.get('/admin/today-appointments').then(r => setTodayAppointments(r.data.appointments || [])).catch(() => {});
  }, []);
  const loadUpcomingAppointments = useCallback(() => {
    API.get('/admin/upcoming-appointments').then(r => setUpcomingAppointments(r.data.appointments || [])).catch(() => {});
  }, []);
  const loadAllAppointments = useCallback(() => {
    API.get('/admin/all-appointments').then(r => setAllAppointments(r.data.appointments || [])).catch(() => {});
  }, []);
  const loadMeta = useCallback(() => {
    Promise.all([getPendingDoctors(), getAllDoctors(), getAnalytics()])
      .then(([pRes, dRes, aRes]) => {
        setPending(pRes.data.doctors || []);
        setAllDoctors(dRes.data.doctors || []);
        setAnalytics(aRes.data.analytics || null);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const loadAll = useCallback(() => {
    loadMeta(); loadQueues(); loadTodayAppointments();
    loadUpcomingAppointments(); loadAllAppointments();
  }, [loadMeta, loadQueues, loadTodayAppointments, loadUpcomingAppointments, loadAllAppointments]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueues(); loadTodayAppointments(); loadUpcomingAppointments();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadQueues, loadTodayAppointments, loadUpcomingAppointments]);

  const handleCheckIn = async (bookingId) => {
    const bid = (bookingId || checkInId).trim().toUpperCase();
    if (!bid) { toast.error('Please enter a Booking ID'); return; }
    setCheckingIn(bid);
    try {
      const res = await API.post('/queue/checkin', { booking_id: bid });
      toast.success(res.data.message);
      setCheckInId('');
      setTodayAppointments(prev => prev.filter(a => a.booking_id !== bid));
      loadQueues(); loadAllAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed. Verify Booking ID.');
    } finally { setCheckingIn(null); }
  };

  const handleQRScan = useCallback((bookingId) => {
    setShowScanner(false);
    setCheckInId(bookingId);
    addToast('info', 'QR Scanned', `${bookingId} — Click Check In to confirm`);
  }, [addToast]);

  const handleCancelAppointment = async (id, bookingId) => {
    if (!window.confirm(`Cancel appointment ${bookingId}?`)) return;
    try {
      await API.put(`/admin/appointments/${id}/cancel`);
      toast.success('Appointment cancelled.');
      setTodayAppointments(prev => prev.filter(a => a.id !== id));
      setUpcomingAppointments(prev => prev.filter(a => a.id !== id));
      loadAllAppointments(); loadQueues();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot cancel.'); }
  };

  const handleNoShow = async (appointmentId) => {
    if (!window.confirm('Mark as No-Show?')) return;
    try {
      await API.put(`/queue/${appointmentId}/noshow`);
      toast.warning('Marked as No-Show');
      loadQueues(); loadAllAppointments();
    } catch { toast.error('Error marking No-Show'); }
  };

  const handleApprove = async (id) => {
    try {
      await approveDoctor(id);
      toast.success('Doctor approved!');
      loadMeta();
    } catch { toast.error('Error approving doctor'); }
  };

  const queueByDept = allQueues.reduce((acc, item) => {
    const dept = item.dept_name || 'Unknown';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(item);
    return acc;
  }, {});

  const filteredAppointments = allAppointments.filter(a => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (a.booking_id || '').toLowerCase().includes(q) ||
      (a.full_name || '').toLowerCase().includes(q) ||
      (`${a.p_first} ${a.p_last}`).toLowerCase().includes(q) ||
      (a.dept_name || '').toLowerCase().includes(q) ||
      (a.status || '').toLowerCase().includes(q) ||
      (a.appointment_date || '').includes(q)
    );
  });

  const ApptRow = ({ a, showCheckin = false, showCancel = false }) => (
    <div className="appt-row">
      <div className="appt-dept-icon">{(a.dept_name || 'A')[0]}</div>
      <div className="appt-main">
        <div className="appt-top-row">
          <p className="appt-doc">
            {a.full_name}
            <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>
              ({a.p_first} {a.p_last})
            </span>
          </p>
          <span className={`badge ${statusColor[a.status] || 'badge-gray'}`}>{a.status}</span>
        </div>
        <p className="appt-dept">{a.dept_name} · Dr. {a.doc_first} {a.doc_last} · {a.time_slot}</p>
        <p className="appt-date">🎫 {a.booking_id} · 📅 {a.appointment_date?.split('T')[0]} · Age: {a.age}</p>
      </div>
      <div className="appt-actions-col">
        {showCheckin && (
          <button className="btn btn-primary btn-sm" disabled={checkingIn === a.booking_id}
            onClick={() => handleCheckIn(a.booking_id)}>
            {checkingIn === a.booking_id ? '⏳' : '✅ Check In'}
          </button>
        )}
        {showCancel && (
          <button className="btn btn-danger btn-sm" onClick={() => handleCancelAppointment(a.id, a.booking_id)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ToastContext.Provider value={addToast}>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} remove={removeToast} />

      <div className="dashboard-page">

        {/* Header */}
        <div className="dashboard-header admin-header">
          <div className="container">
            <div className="dash-header-row">
              <div>
                <h1>Admin / Receptionist Panel</h1>
                <p>Welcome, <strong>{user?.name}</strong> · Manage check-ins, queues & appointments</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Auto-refresh every 15s</span>
                <button className="btn-refresh" onClick={loadAll}>↻ Refresh</button>
              </div>
            </div>
          </div>
        </div>

        <div className="container dashboard-body">

          {/* Stats */}
          {analytics && (
            <div className="dash-stats">
              <div className="dash-stat-card">
                <div className="stat-icon-box blue"><span>👥</span></div>
                <div><p className="ds-val">{analytics.total_patients}</p><p className="ds-label">Total Patients</p></div>
              </div>
              <div className="dash-stat-card">
                <div className="stat-icon-box teal"><span>🩺</span></div>
                <div><p className="ds-val">{analytics.total_doctors}</p><p className="ds-label">Active Doctors</p></div>
              </div>
              <div className="dash-stat-card">
                <div className="stat-icon-box green"><span>📅</span></div>
                <div><p className="ds-val">{analytics.today_appointments}</p><p className="ds-label">Today's Bookings</p></div>
              </div>
              <div className="dash-stat-card">
                <div className="stat-icon-box red"><span>🔴</span></div>
                <div><p className="ds-val">{allQueues.length}</p><p className="ds-label">In Queue Now</p></div>
              </div>
            </div>
          )}

          {/* Pending alert */}
          {pending.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde047', borderLeft: '4px solid #f59e0b', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: '0.875rem', color: '#a16207', fontWeight: 600 }}>
                🔔 {pending.length} doctor{pending.length > 1 ? 's' : ''} waiting for approval
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('pending')}>Review Now</button>
            </div>
          )}

          {/* Check-In Box */}
          <div className="checkin-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--navy)' }}>🏥 Patient Check-In</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📷 Scan QR Code
              </button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 14 }}>
              Enter Booking ID manually or scan the patient's QR code
            </p>
            <div className="checkin-input-row">
              <input
                placeholder="Enter Booking ID — e.g. MQ-725240-4562"
                value={checkInId}
                onChange={e => setCheckInId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleCheckIn()}
                style={{ fontFamily: 'monospace' }}
              />
              <button className="btn btn-primary" onClick={() => handleCheckIn()} disabled={!!checkingIn}>
                {checkingIn ? '⏳ Checking in...' : '✅ Check In Patient'}
              </button>
            </div>
          </div>

          {/* Main Tabs Card */}
          <div className="card">
            <div className="dash-tabs">
              {[
                { key: 'reception',       label: `🏥 Today's Arrivals`, count: todayAppointments.length },
                { key: 'upcoming',        label: '📆 Upcoming',          count: upcomingAppointments.length },
                { key: 'livequeue',       label: '🔴 Live Queue',        count: allQueues.length },
                { key: 'allappointments', label: '📋 All Appointments',  count: null },
                { key: 'overview',        label: '📊 Analytics',         count: null },
                { key: 'pending',         label: '⏳ Approvals',         count: pending.length },
                { key: 'doctors',         label: '🩺 Doctors',           count: null },
              ].map(t => (
                <button key={t.key}
                  className={`dash-tab ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}>
                  {t.label}{t.count !== null ? ` (${t.count})` : ''}
                </button>
              ))}
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
              <>
                {/* TODAY'S ARRIVALS */}
                {activeTab === 'reception' && (
                  todayAppointments.length === 0 ? (
                    <div className="empty-dash">
                      <div className="empty-icon">✅</div>
                      <p>No patients waiting for check-in today</p>
                      <span>All patients are checked in or no bookings for today</span>
                      <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('upcoming')}>
                        View Upcoming →
                      </button>
                    </div>
                  ) : (
                    <div className="appt-list">
                      <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: '#a16207' }}>
                        💡 Click <strong>Check In</strong> when patient arrives, or use <strong>📷 Scan QR</strong> above
                      </div>
                      {todayAppointments.map(a => <ApptRow key={a.id} a={a} showCheckin showCancel />)}
                    </div>
                  )
                )}

                {/* UPCOMING */}
                {activeTab === 'upcoming' && (
                  upcomingAppointments.length === 0 ? (
                    <div className="empty-dash">
                      <div className="empty-icon">📆</div>
                      <p>No upcoming appointments</p>
                    </div>
                  ) : (
                    <div className="appt-list">
                      {upcomingAppointments.map(a => <ApptRow key={a.id} a={a} showCancel />)}
                    </div>
                  )
                )}

                {/* LIVE QUEUE */}
                {activeTab === 'livequeue' && (
                  allQueues.length === 0 ? (
                    <div className="empty-dash">
                      <div className="empty-icon">😊</div>
                      <p>No patients in queue right now</p>
                      <span>Check in patients from Today's Arrivals tab</span>
                    </div>
                  ) : (
                    <div>
                      {Object.entries(queueByDept).map(([deptName, patients]) => (
                        <div key={deptName} style={{ marginBottom: 24 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid var(--border)', marginBottom: 8 }}>
                            <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)' }}>🏥 {deptName}</h4>
                            <span className="badge badge-teal">{patients.length} waiting</span>
                          </div>
                          <div className="appt-list">
                            {patients.map((p, idx) => (
                              <div key={p.id} className="appt-row" style={{ background: idx === 0 ? '#f0fdf4' : 'white', borderRadius: idx === 0 ? 10 : 0, padding: idx === 0 ? '12px' : '12px 0' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: idx === 0 ? '#0d9488' : '#e2e8f0', color: idx === 0 ? 'white' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                                  #{p.queue_position}
                                </div>
                                <div className="appt-main">
                                  <div className="appt-top-row">
                                    <p className="appt-doc">{p.full_name} {idx === 0 && <span className="badge badge-green" style={{ marginLeft: 6 }}>Current</span>}</p>
                                    <span className="badge badge-amber">{p.status}</span>
                                  </div>
                                  <p className="appt-dept">Dr. {p.doc_first} {p.doc_last} · {p.time_slot}</p>
                                  <p className="appt-date">🎫 {p.booking_id} · ~{p.predicted_wait_time} min wait</p>
                                </div>
                                <button className="btn btn-danger btn-sm" onClick={() => handleNoShow(p.appointment_id)}>No Show</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* ALL APPOINTMENTS */}
                {activeTab === 'allappointments' && (
                  <div>
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔍</span>
                      <input
                        style={{ width: '100%', padding: '11px 14px 11px 36px', border: '2px solid var(--border)', borderRadius: 10, fontSize: '0.875rem', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                        placeholder="Search by name, booking ID, date, department, status..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#0d9488'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>
                    {filteredAppointments.length === 0 ? (
                      <div className="empty-dash"><div className="empty-icon">🔍</div><p>No appointments found</p></div>
                    ) : (
                      <div className="appt-list">
                        {filteredAppointments.map(a => (
                          <ApptRow key={a.id} a={a} showCancel={['Booked', 'Checked-In'].includes(a.status)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ANALYTICS */}
                {activeTab === 'overview' && analytics && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
                      {[
                        { label: 'Total Appointments', val: analytics.total_appointments, color: '#0d9488', bg: '#ccfbf1' },
                        { label: 'Completed',          val: analytics.completed,          color: '#15803d', bg: '#dcfce7' },
                        { label: 'No-Shows',           val: analytics.no_shows,           color: '#b45309', bg: '#fef3c7' },
                        { label: 'Cancelled',          val: analytics.cancelled,          color: '#b91c1c', bg: '#fee2e2' },
                        { label: 'Today',              val: analytics.today_appointments, color: '#1d4ed8', bg: '#dbeafe' },
                        { label: 'Doctors',            val: analytics.total_doctors,      color: '#6d28d9', bg: '#ede9fe' },
                      ].map((s, i) => (
                        <div key={i} style={{ background: s.bg, borderRadius: 14, padding: '16px 18px', border: `1px solid ${s.color}20` }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</p>
                          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, fontFamily: 'Fraunces, serif', lineHeight: 1 }}>{s.val}</p>
                        </div>
                      ))}
                    </div>
                    <h3 style={{ marginBottom: 14, fontSize: '1rem' }}>Appointments by Department</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(analytics.department_stats || []).map((d, i) => {
                        const max = Math.max(...analytics.department_stats.map(x => x.total), 1);
                        const pct = Math.min(100, (d.total / max) * 100);
                        return (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--slate)', fontWeight: 600 }}>{d.name}</span>
                            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#0d9488,#0891b2)', borderRadius: 4, transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'right' }}>{d.total} appts</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PENDING APPROVALS */}
                {activeTab === 'pending' && (
                  pending.length === 0 ? (
                    <div className="empty-dash"><div className="empty-icon">✅</div><p>No pending doctor approvals</p></div>
                  ) : (
                    <div className="appt-list">
                      {pending.map(d => (
                        <div key={d.id} className="appt-row">
                          <div className="doctor-avatar">{d.first_name[0]}</div>
                          <div className="appt-main">
                            <div className="appt-top-row">
                              <p className="appt-doc">Dr. {d.first_name} {d.last_name}</p>
                              <span className="badge badge-amber">Pending</span>
                            </div>
                            <p className="appt-dept">{d.specialization} · {d.dept_name} · License: {d.medical_license_no}</p>
                            <p className="appt-date">{d.email} · {d.phone}</p>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => handleApprove(d.id)}>✓ Approve</button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* DOCTORS */}
                {activeTab === 'doctors' && (
                  <div className="appt-list">
                    {allDoctors.map(d => (
                      <div key={d.id} className="appt-row">
                        <div className="doctor-avatar">{d.first_name[0]}</div>
                        <div className="appt-main">
                          <div className="appt-top-row">
                            <p className="appt-doc">Dr. {d.first_name} {d.last_name}</p>
                            <span className={`badge ${d.is_approved ? 'badge-teal' : 'badge-amber'}`}>
                              {d.is_approved ? '✅ Active' : '⏳ Pending'}
                            </span>
                          </div>
                          <p className="appt-dept">{d.specialization} · {d.dept_name} · {d.years_of_experience} yrs exp</p>
                          <p className="appt-date">{d.email} · ₹{d.consultation_fee} fee</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* QR Scanner Modal — only mount when showScanner is true */}
        {showScanner && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
};

export default AdminDashboard;