import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPendingDoctors, approveDoctor, getAllDoctors, getAnalytics } from '../services/api';

import {
  QrCode, Camera, RefreshCw, CheckCircle2, XCircle, X, ArrowRight, AlertCircle,
  CalendarCheck, Clock, Users, FileText, BarChart3, UserCheck, Stethoscope, Cpu, CalendarX, Calendar, Menu, Search, LogOut,
  Building2, Sparkles, Sliders, Zap
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

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
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);
  const [leaves, setLeaves]           = useState([]);
  const [leaveForm, setLeaveForm]     = useState({ doctor_id: '', leave_date: '', reason: '' });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveCheckDoctor, setLeaveCheckDoctor] = useState('');
  const [leaveCheckDate, setLeaveCheckDate]     = useState('');
  const [mlStats, setMlStats] = useState([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [recalLoading, setRecalLoading] = useState(false);
  const [simDeptId, setSimDeptId] = useState('');
  const [simMins, setSimMins] = useState(15);
  const [simLoading, setSimLoading] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');

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
      .then(r => {
        const stats = r.data.stats || [];
        setMlStats(stats);
        if (stats.length > 0 && !simDeptId) {
          setSimDeptId(stats[0].department_id);
          setSimMins(parseFloat(stats[0].avg_consultation_mins) || 15);
        }
      })
      .catch(() => {})
      .finally(() => setMlLoading(false));
  }, [simDeptId]);

  const handleRecalculateML = async () => {
    setRecalLoading(true);
    try {
      const res = await API.post('/admin/recalculate-ml', { minSamples: 1 });
      toast.success(res.data.message || 'ML Recalculation completed successfully!');
      if (res.data.stats && res.data.stats.length > 0) {
        setMlStats(res.data.stats);
      } else {
        loadMlStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'ML Recalculation failed.');
    } finally {
      setRecalLoading(false);
    }
  };

  const handleApplySimulatedCapacity = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!simDeptId) {
      toast.warning('Please select a department to apply dynamic capacity.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await API.post('/admin/update-dept-capacity', {
        department_id: simDeptId,
        avg_consultation_mins: simMins
      });
      toast.success(res.data.message);
      loadMlStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update department capacity.');
    } finally {
      setSimLoading(false);
    }
  };

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

  const SectionHeader = ({ icon: Icon, iconClass, title, badgeText, badgeClass }) => (
    <div className="pvh-compact-header">
      <div className="pvh-left">
        <div className={`pvh-icon-wrap ${iconClass}`}>
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
          <p className="appt-date">Token: <strong style={{ color: 'var(--navy)' }}>{a.booking_id}</strong> · {a.appointment_date?.substring(0,10)} · Age: {a.age || 'N/A'}</p>
        </div>
        <div className="appt-actions-col">
          {showCheckin && (
            <button className="btn btn-primary btn-sm appt-btn-checkin" disabled={checkingIn === a.booking_id}
              onClick={() => handleCheckIn(a.booking_id)}>
              {checkingIn === a.booking_id ? 'Checking in...' : <><CheckCircle2 size={14} /> <span>Check In</span></>}
            </button>
          )}
          {showCancel && (
            <button className="appt-btn-cancel" onClick={() => handleCancelAppointment(a.id, a.booking_id)}>
              <XCircle size={13} /> <span>Cancel</span>
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

      <div className="dash-portal-layout">

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div className="dash-portal-backdrop" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Unified Left Navigation Drawer */}
        <aside className={`dash-portal-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="dash-portal-sidebar-header">
            <div className="dash-portal-brand">
              <span className="dash-portal-brand-icon">
                <Building2 size={20} color="var(--teal)" />
              </span>
              <div>
                <span className="dash-portal-brand-title">MediQueue</span>
                <span className="dash-portal-brand-sub">Reception Desk</span>
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

          <div className="dash-portal-nav-wrap">
            <span className="dash-portal-section-label">MAIN NAVIGATION</span>
            <nav className="dash-portal-nav">
              {NAV_ITEMS.map(t => {
                const Icon = t.icon;
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={`dash-portal-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(t.key);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <div className="dash-portal-item-left">
                      <Icon size={16} className="dash-portal-icon" />
                      <span className="dash-portal-label">{t.label}</span>
                    </div>
                    {typeof t.count === 'number' && t.count > 0 && (
                      <span className={`dash-portal-badge ${t.badgeType || ''}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Drawer Footer with Single Logout Option */}
          <div className="dash-portal-sidebar-footer">
            <div className="portal-user-card">
              <div className="portal-user-avatar">
                {(user?.name || user?.first_name || 'R')[0].toUpperCase()}
              </div>
              <div className="portal-user-info">
                <p className="portal-user-name">{user?.name || user?.first_name || 'Reception Staff'}</p>
                <span className="portal-user-role">Hospital Admin</span>
              </div>
            </div>
            <button
              type="button"
              className="portal-logout-btn"
              onClick={handleLogout}
              title="Log out of reception portal"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Right Main Portal Area */}
        <div className="dash-portal-main">
          {/* Top Application Bar */}
          <header className="dash-portal-topbar">
            <div className="dpt-left">
              <button
                type="button"
                className="dpt-hamburger"
                onClick={() => setMobileMenuOpen(prev => !prev)}
                aria-label="Toggle navigation drawer"
              >
                <Menu size={20} />
              </button>
              <div className="dpt-breadcrumbs">
                <span className="dpt-crumb-brand">MediQueue</span>
                <span className="dpt-crumb-sep">/</span>
                <span className="dpt-crumb-current">
                  {NAV_ITEMS.find(n => n.key === activeTab)?.label || 'Reception'}
                </span>
              </div>
            </div>

            <div className="dpt-right">
              <div className="dpt-clock" title="Indian Standard Time (Live)">
                <Clock size={13} />
                <span>{currentTime}</span>
              </div>
              <div className="dpt-status-chip">
                <span className="live-dot"></span>
                <span className="dpt-status-text">OPD Online</span>
              </div>
              <button
                type="button"
                className="dpt-refresh-btn"
                onClick={loadAll}
                title="Refresh live portal data"
              >
                <RefreshCw size={13} className={loading ? "spin-slow" : ""} />
                <span>Sync</span>
              </button>
            </div>
          </header>

          {/* Scrollable View Body */}
          <main className="dash-portal-body">
            {loading ? (
              <div className="loading-screen"><div className="spinner"></div></div>
            ) : (
              <div className="dash-portal-card-body">
                <>
                {/* TODAY'S ARRIVALS */}
                {activeTab === 'reception' && (
                  <div>
                    <SectionHeader
                      icon={CalendarCheck}
                      iconClass="arrival"
                      title="Today's Patient Arrivals"
                      badgeText={`${todayAppointments.length} Booked Today`}
                      badgeClass="badge-teal"
                    />

                    {/* Check-In Card: Compact, Clean Action Group */}
                    <div className="checkin-box">
                      <div className="checkin-header-row">
                        <div className="checkin-title-block">
                          <h3 className="checkin-title">
                            <CheckCircle2 size={16} color="var(--teal)" />
                            <span>Patient Check-In</span>
                          </h3>
                        </div>
                      </div>
                      <div className="checkin-action-group">
                        <div className="checkin-input-wrapper">
                          <Search size={15} className="checkin-input-icon" />
                          <input
                            placeholder="Enter Booking ID (e.g. MQ-725240-4562)"
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
                          {checkingIn ? 'Checking in...' : <><CheckCircle2 size={14} /> <span>Check In</span></>}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline checkin-scan-btn"
                          onClick={() => setShowScanner(true)}
                        >
                          <Camera size={14} />
                          <span>Scan QR Code</span>
                        </button>
                      </div>
                    </div>

                    {todayAppointments.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon-wrap"><CheckCircle2 size={34} color="#0d9488" /></div>
                        <p>No Patients Waiting for Check-In</p>
                        <span>All patients are checked in or no more bookings scheduled for today</span>
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('upcoming')}>
                          View Upcoming Appointments
                        </button>
                      </div>
                    ) : (() => {
                      const byDept = todayAppointments.reduce((acc, a) => {
                        const dept = a.dept_name || 'General';
                        if (!acc[dept]) acc[dept] = [];
                        acc[dept].push(a);
                        return acc;
                      }, {});
                      return (
                        <div>
                          {Object.entries(byDept).map(([dept, patients]) => (
                            <div key={dept} style={{ marginBottom: 18 }}>
                              <div className="admin-dept-header">
                                <span className="admin-dept-title">
                                  <Building2 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                  {dept}
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
                    })()}
                  </div>
                )}

                {/* UPCOMING */}
                {activeTab === 'upcoming' && (
                  <div>
                    <SectionHeader
                      icon={Clock}
                      iconClass="upcoming"
                      title="Upcoming Appointments"
                      badgeText={`${upcomingAppointments.length} Scheduled`}
                      badgeClass="badge-amber"
                    />

                    {upcomingAppointments.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon-wrap"><Clock size={34} color="#d97706" /></div>
                        <p>No Upcoming Appointments</p>
                        <span>Future outpatient bookings across all hospital departments will appear here</span>
                      </div>
                    ) : (
                      <div className="appt-list">
                        {upcomingAppointments.map(a => <ApptRow key={a.id} a={a} showCancel />)}
                      </div>
                    )}
                  </div>
                )}

                {/* LIVE QUEUE */}
                {activeTab === 'livequeue' && (
                  <div>
                    <SectionHeader
                      icon={Users}
                      iconClass="queue"
                      title="Live OPD Queues"
                      badgeText={`${allQueues.length} in Queue`}
                      badgeClass="badge-teal live"
                    />

                    {allQueues.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon-wrap"><Users size={34} color="#0d9488" /></div>
                        <p>OPD Queue is Clear</p>
                        <span>No patients currently waiting. Check in patients from Today's Arrivals tab.</span>
                      </div>
                    ) : (
                    <div>
                      {Object.entries(queueByDept).map(([deptName, patients]) => (
                        <div key={deptName} style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid var(--border)', marginBottom: 8 }}>
                            <h4 style={{ fontSize: '0.92rem', color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Building2 size={16} />
                              <span>{deptName}</span>
                            </h4>
                            <span className="badge badge-teal">{patients.length} waiting</span>
                          </div>
                          <div className="appt-list">
                            {patients.map((p, idx) => (
                              <div key={p.id} className="appt-row" style={{ background: idx === 0 ? '#f0fdf4' : 'white', borderRadius: 12, padding: '12px 14px' }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: idx === 0 ? '#0d9488' : '#e2e8f0', color: idx === 0 ? 'white' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.86rem', flexShrink: 0 }}>
                                  #{p.queue_position}
                                </div>
                                <div className="appt-main">
                                  <div className="appt-top-row">
                                    <p className="appt-doc">{p.full_name} {idx === 0 && <span className="badge badge-green" style={{ marginLeft: 6 }}>Current</span>}</p>
                                    <span className="badge badge-amber">{p.status}</span>
                                  </div>
                                  <p className="appt-dept">Dr. {p.doc_first} {p.doc_last} · {p.time_slot}</p>
                                  <p className="appt-date">
                                    Token: <strong style={{ color: 'var(--navy)' }}>{p.booking_id}</strong> ·{' '}
                                    {idx === 0
                                      ? <span style={{color:'#0d9488',fontWeight:700}}>In Consultation</span>
                                      : <span>~{Math.round((p.queue_position - 1) * (parseFloat(p.distributed_mins) || 20))} min wait</span>
                                    }
                                  </p>
                                </div>
                                <button className="appt-btn-cancel" onClick={() => handleNoShow(p.appointment_id)}>No Show</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

                {/* ALL APPOINTMENTS */}
                {activeTab === 'allappointments' && (
                  <div>
                    <SectionHeader
                      icon={FileText}
                      iconClass="register"
                      title="Appointments Register"
                      badgeText={`${filteredAppointments.length} Records`}
                      badgeClass="badge-indigo"
                    />

                    {/* Compact Filter Card */}
                    <div className="reg-filters-card">
                      <div className="reg-search-row">
                        <div className="reg-search-box">
                          <Search size={15} className="reg-search-icon" />
                          <input
                            placeholder="Search by patient name, booking ID..."
                            value={searchFilter}
                            onChange={e => setSearchFilter(e.target.value)}
                            className="reg-search-input"
                          />
                        </div>
                        <input
                          type="date"
                          value={filterDate}
                          onChange={e => setFilterDate(e.target.value)}
                          className="reg-date-input"
                          title="Filter by appointment date"
                        />
                        <select
                          value={filterDept}
                          onChange={e => setFilterDept(e.target.value)}
                          className="reg-dept-select"
                        >
                          <option value="">All Departments</option>
                          {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="reg-status-pills">
                        {STATUS_OPTIONS.map(s => (
                          <button
                            key={s}
                            type="button"
                            className={`reg-pill ${filterStatus === s ? 'active' : ''}`}
                            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                          >
                            {s}
                          </button>
                        ))}
                        {(filterDept || filterStatus || filterDate !== todayIST || searchFilter) && (
                          <button
                            type="button"
                            className="reg-reset-btn"
                            onClick={() => { setFilterDept(''); setFilterStatus(''); setFilterDate(todayIST); setSearchFilter(''); }}
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Result count */}
                    <p style={{ fontSize: '0.76rem', color: 'var(--muted)', margin: '0 0 10px 2px' }}>
                      {filterDate === todayIST && !filterDept && !filterStatus && !searchFilter
                        ? `Showing ${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''} for today`
                        : `Showing ${filteredAppointments.length} of ${allAppointments.length} appointments`
                      }
                    </p>

                    {filteredAppointments.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon-wrap"><Search size={34} color="#6366f1" /></div>
                        <p>No Appointments Found</p>
                        <span>No records match the current filter criteria</span>
                      </div>
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
                    <SectionHeader
                      icon={BarChart3}
                      iconClass="analytics"
                      title="Hospital Operations & Analytics"
                    />

                    {/* Primary Unified 4 KPI Cards */}
                    <div className="analytics-kpi-grid">
                      <div className="kpi-card">
                        <div className="kpi-icon-box blue"><FileText size={18} /></div>
                        <div className="kpi-info">
                          <span className="kpi-val">{analytics.total_appointments}</span>
                          <span className="kpi-label">Total Bookings</span>
                        </div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-icon-box teal"><Users size={18} /></div>
                        <div className="kpi-info">
                          <span className="kpi-val">{analytics.total_patients}</span>
                          <span className="kpi-label">Total Patients</span>
                        </div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-icon-box green"><CalendarCheck size={18} /></div>
                        <div className="kpi-info">
                          <span className="kpi-val">{analytics.today_appointments}</span>
                          <span className="kpi-label">Today's Bookings</span>
                        </div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-icon-box amber"><Clock size={18} /></div>
                        <div className="kpi-info">
                          <span className="kpi-val">{allQueues.length}</span>
                          <span className="kpi-label">In Queue Now</span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Status Breakdown Grid */}
                    <div className="analytics-breakdown-grid">
                      <div className="breakdown-stat-card completed">
                        <span className="bsc-label">Completed</span>
                        <span className="bsc-val">{analytics.completed}</span>
                      </div>
                      <div className="breakdown-stat-card noshow">
                        <span className="bsc-label">No-Shows</span>
                        <span className="bsc-val">{analytics.no_shows}</span>
                      </div>
                      <div className="breakdown-stat-card cancelled">
                        <span className="bsc-label">Cancelled</span>
                        <span className="bsc-val">{analytics.cancelled}</span>
                      </div>
                      <div className="breakdown-stat-card doctors">
                        <span className="bsc-label">Active Doctors</span>
                        <span className="bsc-val">{analytics.total_doctors}</span>
                      </div>
                    </div>

                    <h3 className="analytics-section-title">Appointments by Department</h3>
                    <div className="dept-bars-list">
                      {(analytics.department_stats || []).map((d, i) => {
                        const max = Math.max(...analytics.department_stats.map(x => x.total), 1);
                        const pct = Math.min(100, Math.round((d.total / max) * 100));
                        return (
                          <div key={i} className="dept-bar-row">
                            <span className="dept-bar-name">{d.name}</span>
                            <div className="dept-bar-track">
                              <div className="dept-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="dept-bar-count">{d.total} appts</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PENDING APPROVALS */}
                {activeTab === 'pending' && (
                  <div>
                    <SectionHeader
                      icon={UserCheck}
                      iconType="approvals"
                      title="Doctor Verification & Approvals"
                      badge={pending.length > 0 ? `${pending.length} Pending Review` : null}
                      badgeType="red"
                    />

                    {pending.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon"><CheckCircle2 size={36} color="var(--primary)" /></div>
                        <p>No pending doctor approvals</p>
                      </div>
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
                            <button className="btn btn-primary btn-sm" onClick={() => handleApprove(d.id)}>Approve</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* DOCTORS DIRECTORY */}
                {activeTab === 'doctors' && (() => {
                  const filteredDoctors = allDoctors.filter(d => {
                    if (!doctorSearch) return true;
                    const q = doctorSearch.toLowerCase();
                    const name = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase();
                    const dept = (d.dept_name || '').toLowerCase();
                    const spec = (d.specialization || '').toLowerCase();
                    return name.includes(q) || dept.includes(q) || spec.includes(q);
                  });

                  return (
                    <div>
                      <SectionHeader
                        icon={Stethoscope}
                        iconType="doctors"
                        title="Medical Staff & Directory"
                        badge={`${allDoctors.length} Registered`}
                        badgeType="teal"
                      />

                      {/* Modern Clean Search Bar */}
                      <div className="dash-search-container">
                        <div className="dash-search-field">
                          <Search size={16} className="dash-search-icon" />
                          <input
                            type="text"
                            className="dash-search-input"
                            placeholder="Search doctors by name, specialization, or department..."
                            value={doctorSearch}
                            onChange={e => setDoctorSearch(e.target.value)}
                          />
                          {doctorSearch && (
                            <button
                              type="button"
                              className="dash-search-clear"
                              onClick={() => setDoctorSearch('')}
                              aria-label="Clear search"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {doctorSearch && (
                          <span className="dash-search-result-count">
                            {filteredDoctors.length} {filteredDoctors.length === 1 ? 'match' : 'matches'}
                          </span>
                        )}
                      </div>

                      {filteredDoctors.length === 0 ? (
                        <div className="empty-dash">
                          <div className="empty-icon-circle">
                            <Search size={28} color="#0d9488" />
                          </div>
                          <p className="empty-dash-title">
                            {doctorSearch ? 'No doctors match your search' : 'No doctors registered'}
                          </p>
                          {doctorSearch && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ marginTop: 12, borderColor: '#cbd5e1', color: '#64748b' }}
                              onClick={() => setDoctorSearch('')}
                            >
                              Clear Search
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="appt-list">
                          {filteredDoctors.map(d => (
                            <div key={d.id} className="appt-row">
                              <div className="doctor-avatar">{d.first_name[0]}</div>
                              <div className="appt-main">
                                <div className="appt-top-row">
                                  <p className="appt-doc">Dr. {d.first_name} {d.last_name}</p>
                                  <span className={`badge ${d.is_approved ? 'badge-teal' : 'badge-amber'}`}>
                                    {d.is_approved ? 'Active' : 'Pending'}
                                  </span>
                                </div>
                                <p className="appt-dept">{d.specialization} · {d.dept_name} · {d.years_of_experience} yrs exp</p>
                                <p className="appt-date">{d.email} · ₹{d.consultation_fee} fee</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ML STATS TAB */}
                {activeTab === 'mlstats' && (
                  <div>
                    <SectionHeader
                      icon={Cpu}
                      iconType="ml"
                      title="AI Wait Time Intelligence"
                      action={
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ background: '#0d9488', borderColor: '#0d9488', display: 'flex', alignItems: 'center', gap: 6, color: '#ffffff' }}
                            onClick={handleRecalculateML}
                            disabled={recalLoading || mlLoading}
                          >
                            <Sparkles size={14} />
                            <span>{recalLoading ? 'Recalculating...' : '⚡ Recalculate AI Capacities'}</span>
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={loadMlStats} disabled={mlLoading}>
                            {mlLoading ? 'Refreshing...' : '↻ Refresh Models'}
                          </button>
                        </div>
                      }
                    />

                    {mlLoading ? (
                      <div className="loading-screen"><div className="spinner"></div></div>
                    ) : mlStats.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon"><Cpu size={36} color="#7c3aed" /></div>
                        <p>No consultation intelligence models available yet</p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 8 }}>
                          Slot capacity and consultation time models will calculate automatically as appointments are completed.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Dynamic Treatment Duration & Slot Capacity Simulator */}
                        <div style={{
                          background: '#f0fdfa',
                          border: '1.5px solid #99f6e4',
                          borderRadius: 14,
                          padding: '16px 20px',
                          marginBottom: 20
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Sliders size={18} color="#0d9488" />
                              <strong style={{ fontSize: '0.95rem', color: '#0f766e' }}>Interactive Treatment Duration & Capacity Calibrator</strong>
                            </div>
                            <span style={{ fontSize: '0.74rem', background: '#ccfbf1', color: '#0f766e', fontWeight: 600, padding: '4px 10px', borderRadius: 6 }}>
                              🛡️ Applies Tomorrow — Today's active queue is locked & safe
                            </span>
                          </div>

                          <form onSubmit={handleApplySimulatedCapacity} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, alignItems: 'end' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                                Select Department
                              </label>
                              <select
                                className="form-control"
                                style={{ fontSize: '0.85rem', height: 38, background: '#ffffff' }}
                                value={simDeptId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setSimDeptId(id);
                                  const found = mlStats.find(s => String(s.department_id) === String(id));
                                  if (found) setSimMins(parseFloat(found.avg_consultation_mins) || 15);
                                }}
                              >
                                <option value="">-- Select Department --</option>
                                {mlStats.map(s => (
                                  <option key={s.department_id} value={s.department_id}>
                                    {s.dept_name} (Current: {parseFloat(s.avg_consultation_mins).toFixed(1)}m → {s.slot_capacity} cap)
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                                  Treatment Time per Patient
                                </label>
                                <strong style={{ fontSize: '0.82rem', color: '#0d9488' }}>{simMins} minutes</strong>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="range"
                                  min="5"
                                  max="40"
                                  step="1"
                                  value={simMins}
                                  onChange={(e) => setSimMins(parseFloat(e.target.value))}
                                  style={{ flex: 1, accentColor: '#0d9488' }}
                                />
                                <input
                                  type="number"
                                  min="5"
                                  max="60"
                                  value={simMins}
                                  onChange={(e) => setSimMins(parseFloat(e.target.value) || 15)}
                                  style={{ width: 55, height: 36, padding: '0 6px', fontSize: '0.85rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                              </div>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                                Calculated Slot Capacity
                              </label>
                              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 10px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                                  <strong>{Math.max(3, Math.floor(120 / (simMins || 15)))}</strong> patients / 2hr
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  (~{Math.max(3, Math.floor(120 / (simMins || 15))) * 6}/day)
                                </span>
                              </div>
                            </div>

                            <div>
                              <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ height: 38, width: '100%', background: '#0d9488', borderColor: '#0d9488', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                disabled={simLoading || !simDeptId}
                              >
                                <Zap size={14} />
                                <span>{simLoading ? 'Saving...' : '💾 Apply Dynamic Capacity (Effective Tomorrow)'}</span>
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0d9488', display: 'inline-block' }}></span>
                            Active consultation data
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}></span>
                            Baseline default
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
                                      {isReal ? `${s.total_samples} recorded consultations` : 'Using baseline default'}
                                    </p>
                                  </div>
                                  <span style={{
                                    background: isReal ? '#ccfbf1' : '#f1f5f9',
                                    color: isReal ? '#0f766e' : '#64748b',
                                    fontSize: '0.72rem', fontWeight: 600,
                                    padding: '3px 10px', borderRadius: 20
                                  }}>
                                    {isReal ? 'ACTIVE' : 'BASELINE'}
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
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                                      {s.today_slot_capacity && s.today_slot_capacity !== s.slot_capacity
                                        ? `tomorrow (today: ${s.today_slot_capacity})`
                                        : 'capacity / 2hr slot'}
                                    </p>
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
                      </div>
                    )}
                  </div>
                )}

                {/* DOCTOR LEAVE MANAGEMENT */}
                {activeTab === 'leaves' && (
                  <div>
                    <SectionHeader
                      icon={CalendarX}
                      iconType="leaves"
                      title="Doctor Availability & Leaves"
                      badge={leaves.length > 0 ? `${leaves.length} Scheduled` : null}
                      badgeType="amber"
                    />

                    {/* Add Leave Form */}
                    <div className="leave-form-card">
                      <h4 className="leave-form-title">
                        <CalendarX size={18} color="var(--primary)" />
                        <span>Schedule Doctor Leave</span>
                      </h4>
                      <div className="leave-form-grid">
                        {/* Doctor dropdown */}
                        <div className="form-field">
                          <label className="form-label">Doctor</label>
                          <select
                            value={leaveForm.doctor_id}
                            onChange={e => setLeaveForm(p => ({ ...p, doctor_id: e.target.value }))}
                            className="form-select"
                          >
                            <option value="">Select Doctor</option>
                            {allDoctors.map(d => (
                              <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} · {d.dept_name}</option>
                            ))}
                          </select>
                        </div>
                        {/* Date picker */}
                        <div className="form-field">
                          <label className="form-label">Leave Date</label>
                          <input
                            type="date"
                            value={leaveForm.leave_date}
                            onChange={e => setLeaveForm(p => ({ ...p, leave_date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="form-input"
                          />
                        </div>
                        {/* Reason */}
                        <div className="form-field reason-field">
                          <label className="form-label">Reason (optional)</label>
                          <input
                            type="text"
                            value={leaveForm.reason}
                            placeholder="e.g. Medical leave, Conference..."
                            onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                            className="form-input"
                          />
                        </div>
                        {/* Submit */}
                        <div className="form-submit-wrap">
                          <button
                            className="btn btn-primary"
                            disabled={!leaveForm.doctor_id || !leaveForm.leave_date || leaveLoading}
                            onClick={async () => {
                              if (!leaveForm.doctor_id || !leaveForm.leave_date) return;
                              setLeaveLoading(true);
                              try {
                                await API.post('/admin/doctor-leave', leaveForm);
                                toast.success('Leave scheduled successfully.');
                                setLeaveForm({ doctor_id: '', leave_date: '', reason: '' });
                                loadLeaves();
                              } catch (err) {
                                toast.error(err.response?.data?.message || 'Could not set leave.');
                              } finally { setLeaveLoading(false); }
                            }}
                          >
                            {leaveLoading ? 'Scheduling...' : 'Set Leave'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick availability check */}
                    <div className="leave-check-card">
                      <p className="leave-check-title">
                        <Search size={16} color="#15803d" />
                        <span>Check Doctor Availability</span>
                      </p>
                      <div className="leave-check-grid">
                        <div>
                          <label className="leave-check-label">Doctor</label>
                          <select
                            value={leaveCheckDoctor}
                            onChange={e => setLeaveCheckDoctor(e.target.value)}
                            className="form-select"
                          >
                            <option value="">All Doctors</option>
                            {allDoctors.map(d => (
                              <option key={d.id} value={d.id}>
                                Dr. {d.first_name} {d.last_name} · {d.dept_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="leave-check-label">Date</label>
                          <input
                            type="date"
                            value={leaveCheckDate}
                            onChange={e => setLeaveCheckDate(e.target.value)}
                            className="form-input"
                          />
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
                          <div className={`leave-result-box ${filtered.length > 0 ? 'unavailable' : 'available'}`}>
                            {filtered.length > 0 ? (
                              <div>
                                <p className="leave-result-status error">
                                  <AlertCircle size={16} /> Unavailable on {filtered.map(l => l.leave_date).join(', ')}
                                </p>
                                {filtered.map((l, i) => (
                                  <p key={i} className="leave-result-detail">
                                    Dr. {l.first_name} {l.last_name} · {l.leave_date}
                                    {l.reason && ` · ${l.reason}`}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="leave-result-status success">
                                <CheckCircle2 size={16} /> {doctorName ? `Dr. ${doctorName.first_name} ${doctorName.last_name} is` : 'All doctors are'} available
                                {leaveCheckDate ? ` on ${leaveCheckDate}` : ' (no leaves scheduled)'}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {leaves.length === 0 ? (
                      <div className="empty-dash">
                        <div className="empty-icon-circle">
                          <CalendarX size={28} color="#0d9488" />
                        </div>
                        <p className="empty-dash-title">No upcoming leaves scheduled</p>
                        <span className="empty-dash-sub">Doctor schedule is fully open for appointments.</span>
                      </div>
                    ) : (
                      <div>
                        <div className="leaves-list">
                          {leaves.map((l, i) => (
                            <div key={i} className="leave-item-card">
                              <div className="leave-item-icon">
                                <Calendar size={20} color="#ea580c" />
                              </div>
                              <div className="leave-item-info">
                                <p className="leave-item-doc">
                                  Dr. {l.first_name} {l.last_name}
                                  <span className="leave-item-dept">{l.dept_name}</span>
                                </p>
                                <p className="leave-item-date">
                                  {l.leave_date} {l.reason && `· ${l.reason}`}
                                </p>
                              </div>
                              <span className="badge badge-amber">Slots Blocked</span>
                              <button
                                className="btn btn-outline btn-sm remove-leave-btn"
                                onClick={async () => {
                                  try {
                                    await API.delete('/admin/doctor-leave', { data: { doctor_id: l.doctor_id, leave_date: l.leave_date } });
                                    toast.success('Leave removed.');
                                    loadLeaves();
                                  } catch { toast.error('Could not remove leave.'); }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </>
            </div>
          )}
        </main>
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