import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingDoctors, approveDoctor, getAllDoctors, getAnalytics } from '../services/api';

import {
  QrCode, Camera, RefreshCw, CheckCircle2, XCircle, X, ArrowRight, AlertCircle,
  CalendarCheck, Clock, Users, FileText, BarChart3, UserCheck, Stethoscope, Cpu, CalendarX, Menu, ChevronRight, Search
} from 'lucide-react';
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

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
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
        {/* Header */}
        <div className="qr-scanner-header">
          <div className="qr-scanner-title-wrap">
            <div className="qr-scanner-icon-badge">
              <QrCode size={18} color="#0d9488" />
            </div>
            <h3 className="qr-scanner-title">Scan QR Code</h3>
          </div>
          <button className="modal-close qr-close-btn" onClick={handleClose} aria-label="Close Scanner">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="qr-error-box">
            <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        ) : (
          <div className="qr-camera-wrap">
            {/* Single video container — html5-qrcode renders exactly once here */}
            <div
              id="qr-reader"
              className="qr-reader-container"
            />
            {!started && (
              <div className="qr-loading-box">
                <div className="spinner" style={{ margin: '0 auto 10px' }} />
                <span>Starting camera...</span>
              </div>
            )}
            {started && (
              <div className="qr-active-pill">
                <span className="live-dot green"></span>
              </div>
            )}
          </div>
        )}

        <div className="qr-manual-box">
          <div className="qr-divider-line">
            <span>OR ENTER BOOKING ID</span>
          </div>
          <ManualEntry onScan={id => { stopScanner(); onScanRef.current(id); }} onClose={handleClose} />
        </div>
      </div>
    </div>
  );
};

// ── Manual Booking ID entry ────────────────────────────────────────────────────
const ManualEntry = ({ onScan, onClose }) => {
  const [val, setVal] = useState('');
  const handleSubmit = () => {
    if (val.trim()) {
      onScan(val.trim());
      onClose();
    }
  };

  return (
    <div className="qr-manual-form">
      <input
        value={val}
        onChange={e => setVal(e.target.value.toUpperCase())}
        placeholder="e.g. MQ-725240-4562"
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        className="qr-manual-input"
      />
      <button 
        type="button"
        className="btn btn-primary qr-manual-btn" 
        onClick={handleSubmit}
        disabled={!val.trim()}
      >
        <span>Check In</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
};

// ── Main AdminDashboard ────────────────────────────────────────────────────────
const AdminDashboard = () => {

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
  const [filterDept, setFilterDept]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate]     = useState(() => {
    // Default to today (IST) so admin sees today's appointments first
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60000);
    return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`;
  });
  const [showScanner, setShowScanner] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leaves, setLeaves]           = useState([]);
  const [leaveForm, setLeaveForm]     = useState({ doctor_id: '', leave_date: '', reason: '' });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveCheckDoctor, setLeaveCheckDoctor] = useState('');
  const [leaveCheckDate, setLeaveCheckDate]     = useState('');
  const [mlStats, setMlStats] = useState([]);
  const [mlLoading, setMlLoading] = useState(false);

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
  const loadMlStats = useCallback(() => {
    setMlLoading(true);
    API.get('/queue/dept-stats')
      .then(r => setMlStats(r.data.stats || []))
      .catch(() => {})
      .finally(() => setMlLoading(false));
  }, []);

  const loadLeaves = useCallback(() => {
    API.get('/admin/doctor-leaves')
      .then(r => setLeaves(r.data.leaves || []))
      .catch(() => {});
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
    loadUpcomingAppointments(); loadAllAppointments(); loadMlStats(); loadLeaves();
  }, [loadMeta, loadQueues, loadTodayAppointments, loadUpcomingAppointments, loadAllAppointments, loadMlStats, loadLeaves]);

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

  // Debounce ref: prevents double-fire if scanner reads same QR twice within 3s
  const lastScannedRef = useRef({ id: null, time: 0 });

  const handleQRScan = useCallback(async (bookingId) => {
    const now = Date.now();
    // Debounce: ignore same booking_id within 3 seconds
    if (lastScannedRef.current.id === bookingId &&
        now - lastScannedRef.current.time < 3000) return;
    lastScannedRef.current = { id: bookingId, time: now };

    setShowScanner(false);   // close scanner immediately

    // Auto check-in directly — no extra button click needed
    const bid = bookingId.trim().toUpperCase();
    setCheckingIn(bid);
    try {
      const res = await API.post('/queue/checkin', { booking_id: bid });
      toast.success(`✅ ${res.data.message}`);
      setTodayAppointments(prev => prev.filter(a => a.booking_id !== bid));
      loadQueues(); loadAllAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed. Verify Booking ID.');
      setCheckInId(bookingId);  // fallback: put in text field so admin can retry manually
    } finally { setCheckingIn(null); }
  }, [loadQueues, loadAllAppointments]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Normalize any date string to clean YYYY-MM-DD for reliable comparison
  // Handles both "2026-03-30" (DATE_FORMAT) and "2026-03-30T00:00:00.000Z" (raw MySQL)
  const normalizeDate = (dateStr) => {
    if (!dateStr) return '';
    const s = String(dateStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;       // already clean
    return s.substring(0, 10);                           // strip time portion
  };

  const todayIST = (() => {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60000);
    return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`;
  })();

  const filteredAppointments = allAppointments.filter(a => {
    const apptDate = normalizeDate(a.appointment_date);
    // Date filter — default is today, so only today shows unless changed
    if (filterDate && apptDate !== filterDate) return false;
    if (filterDept   && !(a.dept_name || '').toLowerCase().includes(filterDept.toLowerCase())) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (a.booking_id || '').toLowerCase().includes(q) ||
      (a.full_name || '').toLowerCase().includes(q) ||
      (`${a.p_first} ${a.p_last}`).toLowerCase().includes(q) ||
      (a.dept_name || '').toLowerCase().includes(q) ||
      (a.status || '').toLowerCase().includes(q) ||
      apptDate.includes(q)
    );
  });
  const allDepts = [...new Set(allAppointments.map(a => a.dept_name).filter(Boolean))].sort();
  const STATUS_OPTIONS = ['Booked','Checked-In','In-Progress','Completed','Cancelled','No-Show'];

  const ApptRow = ({ a, showCheckin = false, showCancel = false }) => {
    const patientName = `${a.p_first || ''} ${a.p_last || ''}`.trim() || a.full_name || 'Patient';
    const showBookedBy = a.full_name && patientName && a.full_name.trim().toLowerCase() !== patientName.toLowerCase();

    return (
      <div className="appt-row">
        <div className="appt-dept-icon">{(a.dept_name || 'A')[0]}</div>
        <div className="appt-main">
          <div className="appt-top-row">
            <p className="appt-doc">
              {patientName}
              {showBookedBy && (
                <span className="appt-booked-by">
                  (Booked by: {a.full_name})
                </span>
              )}
            </p>
            <span className={`badge ${statusColor[a.status] || 'badge-gray'}`}>{a.status}</span>
          </div>
          <p className="appt-dept">{a.dept_name} · Dr. {a.doc_first} {a.doc_last} · {a.time_slot}</p>
          <p className="appt-date">🎫 {a.booking_id} · 📅 {a.appointment_date?.substring(0,10)} · Age: {a.age || 'N/A'}</p>
        </div>
        <div className="appt-actions-col">
          {showCheckin && (
            <button className="btn btn-primary btn-sm appt-btn-checkin" disabled={checkingIn === a.booking_id}
              onClick={() => handleCheckIn(a.booking_id)}>
              {checkingIn === a.booking_id ? '⏳' : <><CheckCircle2 size={14} /> <span>Check In</span></>}
            </button>
          )}
          {showCancel && (
            <button className="btn btn-danger btn-sm appt-btn-cancel" onClick={() => handleCancelAppointment(a.id, a.booking_id)}>
              <XCircle size={14} /> <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const NAV_ITEMS = [
    { key: 'reception',       label: "Today's Arrivals",   icon: CalendarCheck, count: todayAppointments.length },
    { key: 'livequeue',       label: 'Live Queue',        icon: Users,         count: allQueues.length, badgeType: 'live' },
    { key: 'upcoming',        label: 'Upcoming',          icon: Clock,         count: upcomingAppointments.length },
    { key: 'allappointments', label: 'All Appointments',  icon: FileText },
    { key: 'overview',        label: 'Analytics',         icon: BarChart3 },
    { key: 'pending',         label: 'Doctor Approvals',  icon: UserCheck,     count: pending.length, badgeType: 'warning' },
    { key: 'doctors',         label: 'Doctors Directory', icon: Stethoscope },
    { key: 'mlstats',         label: 'ML Wait Times',     icon: Cpu },
    { key: 'leaves',          label: 'Doctor Leaves',     icon: CalendarX,     count: leaves.length },
  ];

  return (
    <ToastContext.Provider value={addToast}>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} remove={removeToast} />

      <div className="dashboard-page">

        {/* Header */}
        <div className="dashboard-header admin-header">
          <div className="container">
            <div className="dash-header-row">
              <div className="dash-title-block">
                <h1>Reception & Queue Desk</h1>
              </div>
              <div className="dash-header-actions">
                <button type="button" className="btn-refresh" onClick={loadAll} title="Reload live data">
                  <RefreshCw size={13} className={loading ? "spin-slow" : ""} />
                  <span>Refresh</span>
                </button>
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
                <div className="ds-content">
                  <p className="ds-val">{analytics.total_patients}</p>
                  <p className="ds-label">Total Patients</p>
                </div>
              </div>
              <div className="dash-stat-card">
                <div className="stat-icon-box teal"><span>🩺</span></div>
                <div className="ds-content">
                  <p className="ds-val">{analytics.total_doctors}</p>
                  <p className="ds-label">Active Doctors</p>
                </div>
              </div>
              <div className="dash-stat-card">
                <div className="stat-icon-box green"><span>📅</span></div>
                <div className="ds-content">
                  <p className="ds-val">{analytics.today_appointments}</p>
                  <p className="ds-label">Today's Bookings</p>
                </div>
              </div>
              <div className="dash-stat-card">
                <div className="stat-icon-box red"><span>🔴</span></div>
                <div className="ds-content">
                  <p className="ds-val">{allQueues.length}</p>
                  <p className="ds-label">In Queue Now</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending alert */}
          {pending.length > 0 && (
            <div className="pending-doctor-banner">
              <div className="pdb-text">
                <span>🔔</span>
                <strong>{pending.length} doctor{pending.length > 1 ? 's' : ''} awaiting approval</strong>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('pending')}>Review Now</button>
            </div>
          )}

          {/* Check-In Card: Compact, Perfectly Aligned */}
          <div className="checkin-box">
            <div className="checkin-header-row">
              <h3 className="checkin-title">🏥 Patient Check-In</h3>
            </div>
            <div className="checkin-action-group">
              <div className="checkin-input-wrapper">
                <Search size={15} className="checkin-input-icon" />
                <input
                  placeholder="e.g. MQ-725240-4562"
                  value={checkInId}
                  onChange={e => setCheckInId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleCheckIn()}
                  className="checkin-input"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary checkin-submit-btn"
                onClick={() => handleCheckIn()}
                disabled={!!checkingIn || !checkInId.trim()}
              >
                {checkingIn ? '⏳ Checking in...' : <><CheckCircle2 size={15} /> <span>Check In</span></>}
              </button>
              <span className="checkin-or-divider">OR</span>
              <button
                type="button"
                className="btn btn-outline checkin-scan-btn"
                onClick={() => setShowScanner(true)}
              >
                <Camera size={15} />
                <span>Scan QR Code</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Dashboard Shell with Left Sidebar */}
          <div className="dash-shell">
            {/* Mobile Section Switcher Bar */}
            <div className="dash-mobile-nav-bar">
              <button
                type="button"
                className="dash-mobile-nav-toggle"
                onClick={() => setMobileMenuOpen(prev => !prev)}
              >
                <div className="dash-mobile-nav-current">
                  <Menu size={16} />
                  <span>{NAV_ITEMS.find(n => n.key === activeTab)?.label}</span>
                </div>
                <div className="dash-mobile-nav-switch-hint">
                  <span>Switch</span>
                  <ChevronRight size={14} style={{ transform: mobileMenuOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </button>
            </div>

            {/* Backdrop for mobile drawer */}
            {mobileMenuOpen && (
              <div className="dash-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Left Sidebar */}
            <aside className={`dash-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
              <div className="dash-sidebar-header">
                <span className="dash-sidebar-title">NAVIGATION</span>
                {mobileMenuOpen && (
                  <button type="button" className="dash-sidebar-close-btn" onClick={() => setMobileMenuOpen(false)}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <nav className="dash-sidebar-nav">
                {NAV_ITEMS.map(t => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      className={`dash-sidebar-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab(t.key);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div className="dash-sidebar-item-left">
                        <Icon size={16} className="dash-sidebar-icon" />
                        <span className="dash-sidebar-label">{t.label}</span>
                      </div>
                      {typeof t.count === 'number' && t.count > 0 && (
                        <span className={`dash-sidebar-badge ${t.badgeType || ''}`}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="dash-content-area">
              <div className="dash-section-header">
                <h2 className="dash-section-title">
                  {NAV_ITEMS.find(n => n.key === activeTab)?.label}
                </h2>
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
                  ) : (() => {
                    // Group by department so admin can clearly see which dept each patient belongs to
                    const byDept = todayAppointments.reduce((acc, a) => {
                      const dept = a.dept_name || 'Unknown';
                      if (!acc[dept]) acc[dept] = [];
                      acc[dept].push(a);
                      return acc;
                    }, {});
                    return (
                      <div>
                        <div className="admin-notice-banner">
                          <div className="admin-notice-text">
                            <span className="admin-notice-icon">💡</span>
                            <span>Click <strong>Check In</strong> when patient arrives, or use <strong>📷 Scan QR</strong> above</span>
                          </div>
                          <span className="admin-notice-badge">
                            {todayAppointments.length} patient{todayAppointments.length !== 1 ? 's' : ''} today
                          </span>
                        </div>
                        {Object.entries(byDept).map(([dept, patients]) => (
                          <div key={dept} style={{ marginBottom: 20 }}>
                            <div className="admin-dept-header">
                              <span className="admin-dept-title">
                                🏥 {dept}
                              </span>
                              <span className="admin-dept-count">
                                {patients.length} patient{patients.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="appt-list" style={{ marginBottom: 0 }}>
                              {patients.map(a => <ApptRow key={a.id} a={a} showCheckin showCancel />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
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
                                  <p className="appt-date">
                                    🎫 {p.booking_id} ·{' '}
                                    {idx === 0
                                      ? <span style={{color:'#0d9488',fontWeight:700}}>In Progress</span>
                                      : <span>~{Math.round((p.queue_position - 1) * (parseFloat(p.distributed_mins) || 20))} min wait</span>
                                    }
                                  </p>
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
                    {/* Search bar */}
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔍</span>
                      <input
                        style={{ width: '100%', padding: '11px 14px 11px 36px', border: '2px solid var(--border)', borderRadius: 10, fontSize: '0.875rem', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                        placeholder="Search by name, booking ID..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#0d9488'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>

                    {/* Filter row */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                      {/* Date picker */}
                      <div style={{ position: 'relative' }}>
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                          style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: '0.82rem', outline: 'none', color: filterDate ? 'var(--navy)' : 'var(--muted)', background: filterDate ? '#f0fdf4' : '#fff', cursor: 'pointer' }}
                          onFocus={e => e.target.style.borderColor='#0d9488'}
                          onBlur={e => e.target.style.borderColor='var(--border)'}
                        />
                      </div>
                      {/* Department dropdown */}
                      <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                        style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: '0.82rem', outline: 'none', background: filterDept ? '#f0fdf4' : '#fff', color: filterDept ? 'var(--navy)' : 'var(--muted)', cursor: 'pointer' }}>
                        <option value="">All Departments</option>
                        {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {/* Status chips */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {STATUS_OPTIONS.map(s => (
                          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                            style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${filterStatus === s ? '#0d9488' : 'var(--border)'}`, background: filterStatus === s ? '#0d9488' : '#fff', color: filterStatus === s ? '#fff' : 'var(--muted)', fontSize: '0.75rem', fontWeight: filterStatus === s ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {s}
                          </button>
                        ))}
                      </div>
                      {/* Clear all */}
                      {(filterDept || filterStatus || filterDate !== todayIST || searchFilter) && (
                        <button onClick={() => { setFilterDept(''); setFilterStatus(''); setFilterDate(todayIST); setSearchFilter(''); }}
                          style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid #e11d48', background: '#fff', color: '#e11d48', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                          ✕ Reset to today
                        </button>
                      )}
                    </div>

                    {/* Result count */}
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
                      {filterDate === todayIST && !filterDept && !filterStatus && !searchFilter
                        ? `Showing ${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''} for today · Use filters to see other dates`
                        : `Showing ${filteredAppointments.length} of ${allAppointments.length} appointments`
                      }
                    </p>

                    {filteredAppointments.length === 0 ? (
                      <div className="empty-dash"><div className="empty-icon">🔍</div><p>No appointments match the filters</p></div>
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

                {/* ML STATS TAB */}
                {activeTab === 'mlstats' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          Slot capacity auto-updates nightly at 23:59 based on real consultation times
                        </p>
                      </div>
                      <button className="btn btn-outline btn-sm" onClick={loadMlStats} disabled={mlLoading}>
                        {mlLoading ? '⏳' : '↻ Refresh'}
                      </button>
                    </div>

                    {mlLoading ? (
                      <div className="loading-screen"><div className="spinner"></div></div>
                    ) : mlStats.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon">🤖</div>
                        <p>No ML stats yet</p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 8 }}>
                          Run ml_migration.sql in MySQL Workbench, then complete some appointments.
                          Stats update every night at 23:59.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0d9488', display: 'inline-block' }}></span>
                            Real data (self-learned)
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}></span>
                            Default (no data yet)
                          </span>
                        </div>

                        {/* Stats grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                          {mlStats.map(s => {
                            const isReal = s.total_samples > 0;
                            const barPct = Math.min(100, Math.round((s.avg_consultation_mins / 30) * 100));
                            const lastUpdated = s.last_updated
                              ? new Date(s.last_updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : 'Never';
                            return (
                              <div key={s.department_id} style={{
                                background: '#f8fafc',
                                border: `1.5px solid ${isReal ? '#0d9488' : '#e2e8f0'}`,
                                borderRadius: 12, padding: 16,
                              }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                  <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)', margin: 0 }}>
                                      {s.dept_name}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                                      {isReal ? `${s.total_samples} real consultations` : 'Using dataset default'}
                                    </p>
                                  </div>
                                  <span style={{
                                    background: isReal ? '#ccfbf1' : '#f1f5f9',
                                    color: isReal ? '#0f766e' : '#64748b',
                                    fontSize: '0.72rem', fontWeight: 600,
                                    padding: '3px 10px', borderRadius: 20
                                  }}>
                                    {isReal ? 'LIVE' : 'DEFAULT'}
                                  </span>
                                </div>

                                {/* Key metrics */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                  <div style={{ textAlign: 'center', background: 'var(--color-background-primary)', borderRadius: 8, padding: '10px 8px' }}>
                                    <p style={{ fontSize: '1.4rem', fontWeight: 700, color: isReal ? '#0d9488' : '#64748b', margin: 0, lineHeight: 1 }}>
                                      {parseFloat(s.avg_consultation_mins).toFixed(1)}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>min avg / patient</p>
                                  </div>
                                  <div style={{ textAlign: 'center', background: 'var(--color-background-primary)', borderRadius: 8, padding: '10px 8px' }}>
                                    <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d4ed8', margin: 0, lineHeight: 1 }}>
                                      {s.slot_capacity}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>patients / 2hr slot</p>
                                  </div>
                                </div>

                                {/* Consultation time bar */}
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Avg consultation time</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>30 min max</span>
                                  </div>
                                  <div style={{ height: 6, background: 'var(--color-border-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%', width: `${barPct}%`,
                                      background: isReal ? '#0d9488' : '#94a3b8',
                                      borderRadius: 4, transition: 'width 0.5s ease'
                                    }} />
                                  </div>
                                </div>

                                {/* Footer */}
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: 0, textAlign: 'right' }}>
                                  Updated: {lastUpdated}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* How it works box */}
                        <div style={{ marginTop: 24, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e40af', margin: '0 0 8px' }}>How self-learning works</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                            {[
                              { step: '1', text: 'Patient checks in → timer starts' },
                              { step: '2', text: 'Doctor clicks Complete → timer stops' },
                              { step: '3', text: 'Real mins saved to DB per dept' },
                              { step: '4', text: 'Every 23:59 → avg recalculated' },
                              { step: '5', text: 'Next day slot capacity auto-adjusts' },
                            ].map(s => (
                              <div key={s.step} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span style={{ background: '#1d4ed8', color: '#fff', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{s.step}</span>
                                <p style={{ fontSize: '0.78rem', color: '#1e40af', margin: 0, lineHeight: 1.4 }}>{s.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* DOCTOR LEAVE MANAGEMENT */}
                {activeTab === 'leaves' && (
                  <div>
                    {/* Add Leave Form */}
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                      <h4 style={{ margin: '0 0 14px', color: 'var(--navy)', fontSize: '0.95rem', fontWeight: 700 }}>
                        ➕ Mark Doctor as Unavailable
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 10, alignItems: 'end' }}>
                        {/* Doctor dropdown */}
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Doctor</label>
                          <select value={leaveForm.doctor_id}
                            onChange={e => setLeaveForm(p => ({ ...p, doctor_id: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: '0.85rem', outline: 'none', background: '#fff' }}
                            onFocus={e => e.target.style.borderColor = '#0d9488'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}>
                            <option value="">Select Doctor</option>
                            {allDoctors.map(d => (
                              <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} · {d.dept_name}</option>
                            ))}
                          </select>
                        </div>
                        {/* Date picker */}
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Leave Date</label>
                          <input type="date" value={leaveForm.leave_date}
                            onChange={e => setLeaveForm(p => ({ ...p, leave_date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            style={{ width: '100%', padding: '9px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={e => e.target.style.borderColor = '#0d9488'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                        </div>
                        {/* Reason */}
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Reason (optional)</label>
                          <input type="text" value={leaveForm.reason}
                            placeholder="e.g. Medical leave, Conference..."
                            onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', border: '2px solid var(--border)', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={e => e.target.style.borderColor = '#0d9488'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                        </div>
                        {/* Submit */}
                        <button
                          disabled={!leaveForm.doctor_id || !leaveForm.leave_date || leaveLoading}
                          onClick={async () => {
                            if (!leaveForm.doctor_id || !leaveForm.leave_date) return;
                            setLeaveLoading(true);
                            try {
                              await API.post('/admin/doctor-leave', leaveForm);
                              toast.success('Leave marked successfully.');
                              setLeaveForm({ doctor_id: '', leave_date: '', reason: '' });
                              loadLeaves();
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Could not set leave.');
                            } finally { setLeaveLoading(false); }
                          }}
                          style={{ padding: '9px 18px', background: !leaveForm.doctor_id || !leaveForm.leave_date ? '#94a3b8' : '#0d9488', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                          {leaveLoading ? '⏳' : '✓ Set Leave'}
                        </button>
                      </div>
                    </div>

                    {/* Leave list */}
                    {/* Quick availability check — admin/receptionist can look up any doctor+date */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                      padding: '14px 16px', marginBottom: 16 }}>
                      <p style={{ fontWeight: 700, color: '#15803d', margin: '0 0 10px',
                        fontSize: '0.88rem' }}>
                        🔍 Check Doctor Availability
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534',
                            display: 'block', marginBottom: 4 }}>Doctor</label>
                          <select
                            value={leaveCheckDoctor} onChange={e => setLeaveCheckDoctor(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #86efac',
                              borderRadius: 8, fontSize: '0.85rem', outline: 'none', background: '#fff' }}>
                            <option value="">All Doctors</option>
                            {allDoctors.map(d => (
                              <option key={d.id} value={d.id}>
                                Dr. {d.first_name} {d.last_name} · {d.dept_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534',
                            display: 'block', marginBottom: 4 }}>Date</label>
                          <input type="date" value={leaveCheckDate}
                            onChange={e => setLeaveCheckDate(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #86efac',
                              borderRadius: 8, fontSize: '0.85rem', outline: 'none',
                              boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      {(leaveCheckDoctor || leaveCheckDate) && (() => {
                        const filtered = leaves.filter(l =>
                          (!leaveCheckDoctor || String(l.doctor_id) === leaveCheckDoctor) &&
                          (!leaveCheckDate   || l.leave_date === leaveCheckDate)
                        );
                        const doctorName = leaveCheckDoctor
                          ? allDoctors.find(d => String(d.id) === leaveCheckDoctor)
                          : null;
                        return (
                          <div style={{ marginTop: 10, padding: '10px 14px',
                            background: filtered.length > 0 ? '#fef3c7' : '#f0fdf4',
                            borderRadius: 8, border: `1px solid ${filtered.length > 0 ? '#fde68a' : '#bbf7d0'}` }}>
                            {filtered.length > 0 ? (
                              <div>
                                <p style={{ fontWeight: 700, color: '#92400e', margin: 0, fontSize: '0.88rem' }}>
                                  ❌ Unavailable on {filtered.map(l => l.leave_date).join(', ')}
                                </p>
                                {filtered.map((l, i) => (
                                  <p key={i} style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#b45309' }}>
                                    Dr. {l.first_name} {l.last_name} · {l.leave_date}
                                    {l.reason && ` · ${l.reason}`}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontWeight: 700, color: '#15803d', margin: 0, fontSize: '0.88rem' }}>
                                ✅ {doctorName ? `Dr. ${doctorName.first_name} ${doctorName.last_name} is` : 'All doctors are'} available
                                {leaveCheckDate ? ` on ${leaveCheckDate}` : ' (no leaves found)'}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {leaves.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon">🏖️</div>
                        <p>No upcoming leaves scheduled</p>
                        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Mark a doctor as unavailable above — their slots will be auto-blocked on the booking page</span>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
                          {leaves.length} upcoming leave{leaves.length !== 1 ? 's' : ''} · Patients cannot book these dates
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {leaves.map((l, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14,
                              background: '#fff', border: '1.5px solid #fde68a',
                              borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: '12px 16px' }}>
                              <div style={{ fontSize: 28 }}>🏖️</div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 600, margin: 0, color: 'var(--navy)', fontSize: '0.9rem' }}>
                                  Dr. {l.first_name} {l.last_name}
                                  <span style={{ marginLeft: 8, fontSize: '0.75rem',
                                    color: 'var(--muted)', fontWeight: 400 }}>{l.dept_name}</span>
                                </p>
                                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#92400e' }}>
                                  📅 {l.leave_date} {l.reason && `· ${l.reason}`}
                                </p>
                              </div>
                              <span style={{ background: '#fef3c7', color: '#92400e',
                                fontSize: '0.72rem', fontWeight: 600,
                                padding: '3px 10px', borderRadius: 20 }}>
                                Slots Blocked
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    await API.delete('/admin/doctor-leave', { data: { doctor_id: l.doctor_id, leave_date: l.leave_date } });
                                    toast.success('Leave removed.');
                                    loadLeaves();
                                  } catch { toast.error('Could not remove leave.'); }
                                }}
                                style={{ background: 'none', border: '1.5px solid #ef4444', color: '#ef4444', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                                ✕ Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
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