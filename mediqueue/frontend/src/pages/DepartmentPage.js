import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Star,
  Globe,
  IndianRupee,
  Clock,
  Users,
  ShieldCheck,
  Calendar,
  Bot
} from 'lucide-react';
import { getDoctorsByDept, getDepartments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DepartmentPage.css';

const DEPT_ICONS = {
  Cardiology: { icon: '❤️', color: '#ef4444', light: '#fef2f2' },
  Dermatology: { icon: '💊', color: '#ec4899', light: '#fdf2f8' },
  Emergency: { icon: '🚑', color: '#dc2626', light: '#fef2f2' },
  ENT: { icon: '👂', color: '#06b6d4', light: '#ecfeff' },
  'General Medicine': { icon: '🩺', color: '#0d9488', light: '#f0fdf4' },
  Gynecology: { icon: '🌸', color: '#f43f5e', light: '#fff1f2' },
  Neurology: { icon: '🧠', color: '#8b5cf6', light: '#f5f3ff' },
  Ophthalmology: { icon: '👁️', color: '#3b82f6', light: '#eff6ff' },
  Orthopedics: { icon: '🦴', color: '#f59e0b', light: '#fffbeb' },
  Pediatrics: { icon: '👶', color: '#f97316', light: '#fff7ed' },
  Psychiatry: { icon: '🌱', color: '#10b981', light: '#ecfdf5' },
  Radiology: { icon: '🔬', color: '#0ea5e9', light: '#f0f9ff' }
};

const loadColors = { Low: 'badge-green', Medium: 'badge-amber', High: 'badge-red' };

const DepartmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([getDoctorsByDept(id), getDepartments()])
      .then(([dRes, depRes]) => {
        setDoctors(dRes.data.doctors || []);
        const d = (depRes.data.departments || []).find(dep => dep.id === parseInt(id));
        setDept(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = (docId) => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'patient') { alert('Only patients can book appointments.'); return; }
    navigate(`/book/${docId}`);
  };

  const filtered = doctors.filter(d =>
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialization && d.specialization.toLowerCase().includes(search.toLowerCase()))
  );

  const deptMeta = dept?.name ? DEPT_ICONS[dept.name] || { icon: '🏥', color: '#0d9488', light: '#f0fdf4' } : null;

  return (
    <div className="dept-page">
      {/* Mobile Back Navigation Header */}
      <div className="dept-mobile-topbar">
        <div className="dept-topbar-inner">
          <Link to="/find-hospital" className="dept-back-link">
            <ArrowLeft size={18} />
            <span>Departments</span>
          </Link>
          <div className="dept-topbar-right">
            <span className="dept-topbar-title">{dept?.name || 'Department'}</span>
            <span className="dept-topbar-badge">{doctors.length} Doctor{doctors.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Desktop Hero Banner (Hidden on mobile) */}
      <section className="page-header dept-page-header">
        <div className="container dept-header-container">
          <div className="dept-header-left">
            <div className="breadcrumb">
              <Link to="/">Home</Link> <span>›</span> <Link to="/find-hospital">Book Appointment</Link> <span>›</span> <span>{dept?.name}</span>
            </div>
            <h1>{dept?.name || 'Department'} Specialists</h1>
            <p>{dept?.description || 'Browse expert doctors and book instant appointments.'}</p>
          </div>
          {deptMeta && (
            <div className="dept-header-icon-badge" style={{ background: deptMeta.light, color: deptMeta.color }}>
              <span className="dept-header-emoji">{deptMeta.icon}</span>
            </div>
          )}
        </div>
      </section>

      {/* ML Prediction Banner */}
      <div className="container dept-ml-container">
        <div className="ml-banner">
          <div className="ml-banner-icon">
            <Bot size={18} color="#0d9488" />
          </div>
          <div className="ml-banner-text">
            <strong>ML Live Prediction Active</strong>
            <span>Wait times are calculated with ±5 min accuracy using real-time OPD hospital traffic.</span>
          </div>
        </div>
      </div>

      {/* Doctors Section */}
      <section className="section dept-main-section">
        <div className="container">
          <div className="dept-search-bar">
            <div>
              <h2 className="dept-sec-title">
                {filtered.length} Doctor{filtered.length !== 1 ? 's' : ''} Available
              </h2>
              <span className="dept-sec-sub">Select a doctor to join queue</span>
            </div>
            {doctors.length > 2 && (
              <div className="dept-search-wrap">
                <Search size={16} color="#94a3b8" />
                <input
                  className="search-input"
                  placeholder="Search by doctor name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No doctors found matching "{search}".</p>
              <button className="btn btn-outline" onClick={() => setSearch('')}>Clear Search</button>
            </div>
          ) : (
            <div className="doctors-list">
              {filtered.map(doc => (
                <div key={doc.id} className="doctor-card card">
                  {/* Doctor Left Column: Avatar + Info */}
                  <div className="doc-left-col">
                    <div className="doc-avatar-wrap">
                      <div className="doc-photo">{doc.first_name[0]}{doc.last_name[0]}</div>
                      <span className="doc-online-dot" title="Available for OPD"></span>
                    </div>

                    <div className="doc-info">
                      <div className="doc-name-row">
                        <div className="doc-name-title">
                          <h3>Dr. {doc.first_name} {doc.last_name}</h3>
                          <span className="doc-verified-badge" title="Verified Specialist">
                            <ShieldCheck size={16} color="#0d9488" />
                          </span>
                        </div>
                        <span className="badge badge-teal">{doc.specialization}</span>
                      </div>

                      <div className="doc-meta">
                        <span className="doc-meta-item">
                          <Star size={13} color="#f59e0b" fill="#f59e0b" />
                          {doc.years_of_experience} Yrs Exp.
                        </span>
                        <span className="doc-meta-item">
                          <Globe size={13} color="#64748b" />
                          {doc.languages_known}
                        </span>
                        <span className="doc-meta-item doc-fee doc-mobile-fee">
                          <IndianRupee size={13} color="#0d9488" />
                          {parseFloat(doc.consultation_fee).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="doc-stats">
                        <span className="doc-wait">
                          <Clock size={13} />
                          Est. Wait: ~{doc.estimated_wait} min
                        </span>
                        <span className={`badge ${loadColors[doc.load_level] || 'badge-gray'}`}>
                          {doc.load_level} Demand
                        </span>
                        <span className="badge badge-gray doc-queue-badge">
                          <Users size={12} />
                          {doc.current_queue} waiting
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Right Column: Pricing & Booking Action */}
                  <div className="doc-action-col">
                    <div className="doc-desktop-fee">
                      <span className="doc-fee-label">Consultation Fee</span>
                      <span className="doc-fee-amount">
                        <IndianRupee size={16} />
                        {parseFloat(doc.consultation_fee).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button className="btn btn-primary doc-book-btn" onClick={() => handleBook(doc.id)}>
                      <Calendar size={16} />
                      <span>Book Appointment</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DepartmentPage;
