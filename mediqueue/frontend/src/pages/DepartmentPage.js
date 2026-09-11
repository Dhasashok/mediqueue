import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Star,
  Globe,
  ShieldCheck,
  Calendar,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { getDoctorsByDept, getDepartments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DepartmentPage.css';

const DEPT_ICONS = {
  Cardiology: { icon: '❤️', color: '#ef4444', light: 'rgba(239, 68, 68, 0.15)' },
  Dermatology: { icon: '💊', color: '#ec4899', light: 'rgba(236, 72, 153, 0.15)' },
  Emergency: { icon: '🚑', color: '#dc2626', light: 'rgba(220, 38, 38, 0.15)' },
  ENT: { icon: '👂', color: '#06b6d4', light: 'rgba(6, 182, 212, 0.15)' },
  'General Medicine': { icon: '🩺', color: '#0d9488', light: 'rgba(13, 148, 136, 0.15)' },
  Gynecology: { icon: '🌸', color: '#f43f5e', light: 'rgba(244, 63, 94, 0.15)' },
  Neurology: { icon: '🧠', color: '#8b5cf6', light: 'rgba(139, 92, 246, 0.15)' },
  Ophthalmology: { icon: '👁️', color: '#3b82f6', light: 'rgba(59, 130, 246, 0.15)' },
  Orthopedics: { icon: '🦴', color: '#f59e0b', light: 'rgba(245, 158, 11, 0.15)' },
  Pediatrics: { icon: '👶', color: '#f97316', light: 'rgba(249, 115, 22, 0.15)' },
  Psychiatry: { icon: '🌱', color: '#10b981', light: 'rgba(16, 185, 129, 0.15)' },
  Radiology: { icon: '🔬', color: '#0ea5e9', light: 'rgba(14, 165, 233, 0.15)' }
};

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

  const deptMeta = dept?.name ? DEPT_ICONS[dept.name] || { icon: '🏥', color: '#0d9488', light: 'rgba(13, 148, 136, 0.15)' } : null;

  return (
    <div className="dept-page">
      {/* Mobile Top Navigation Header */}
      <div className="dept-mobile-topbar">
        <div className="dept-topbar-inner">
          <Link to="/find-hospital" className="dept-back-btn" aria-label="Back to departments">
            <ArrowLeft size={18} />
          </Link>
          <div className="dept-topbar-center">
            <h1 className="dept-topbar-title">{dept?.name || 'Department'}</h1>
            <span className="dept-topbar-subtitle">
              {doctors.length} Specialist{doctors.length !== 1 ? 's' : ''} available
            </span>
          </div>
          <div className="dept-topbar-dummy"></div>
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
            <p>{dept?.description || 'Browse verified doctors and book instant appointments.'}</p>
          </div>
          {deptMeta && (
            <div className="dept-header-icon-badge" style={{ background: deptMeta.light, borderColor: deptMeta.color }}>
              <span className="dept-header-emoji">{deptMeta.icon}</span>
            </div>
          )}
        </div>
      </section>

      {/* Main Section */}
      <section className="section dept-main-section">
        <div className="container">
          {/* Section Header Row */}
          <div className="dept-sec-row">
            <div className="dept-sec-left">
              <h2 className="dept-sec-title">
                {filtered.length} Doctor{filtered.length !== 1 ? 's' : ''} Available
              </h2>
              <span className="dept-sec-sub">Verified hospital specialists ready for consultation</span>
            </div>

            {doctors.length > 2 && (
              <div className="dept-search-wrap">
                <Search size={15} color="#94a3b8" />
                <input
                  className="search-input"
                  placeholder="Search doctor name..."
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
                  {/* Left Column: Doctor Profile & Credentials */}
                  <div className="doc-profile-section">
                    <div className="doc-avatar-wrap">
                      <div className="doc-photo">{doc.first_name[0]}{doc.last_name[0]}</div>
                      <span className="doc-online-dot" title="Available for consultation"></span>
                    </div>

                    <div className="doc-profile-info">
                      {/* Name & Verified Badge */}
                      <div className="doc-name-row">
                        <h3>Dr. {doc.first_name} {doc.last_name}</h3>
                        <span className="doc-verified-badge" title="Verified Hospital Specialist">
                          <ShieldCheck size={16} color="#0d9488" />
                          <span className="verified-text">Verified</span>
                        </span>
                      </div>

                      {/* Specialization & Experience */}
                      <div className="doc-tag-line">
                        <span className="badge badge-teal">{doc.specialization}</span>
                        <span className="doc-exp-tag">
                          {doc.years_of_experience} Years Experience
                        </span>
                      </div>

                      {/* Trust & Review Metric */}
                      <div className="doc-trust-row">
                        <span className="doc-rating-badge">
                          <Star size={13} color="#f59e0b" fill="#f59e0b" />
                          <strong>4.9</strong>
                          <span className="review-count">(120+ reviews)</span>
                        </span>
                        <span className="doc-dot-sep">•</span>
                        <span className="doc-lang-tag">
                          <Globe size={13} color="#64748b" />
                          <span>{doc.languages_known}</span>
                        </span>
                      </div>

                      {/* Hospital & Availability Perks */}
                      <div className="doc-perks-row">
                        <span className="doc-perk-item">
                          <Building2 size={13} color="#0f766e" />
                          <span>City General OPD</span>
                        </span>
                        <span className="doc-perk-item active">
                          <CheckCircle2 size={13} color="#16a34a" />
                          <span>Available Today</span>
                        </span>
                      </div>
                    </div>

                    {/* Mobile Price Highlight (Top right of card on mobile) */}
                    <div className="doc-mobile-price">
                      <span className="dmp-amount">₹{parseFloat(doc.consultation_fee).toLocaleString('en-IN')}</span>
                      <span className="dmp-label">Fee</span>
                    </div>
                  </div>

                  {/* Right Column: Pricing & Action Button */}
                  <div className="doc-booking-section">
                    <div className="doc-desktop-price">
                      <span className="ddp-label">Consultation Fee</span>
                      <span className="ddp-amount">₹{parseFloat(doc.consultation_fee).toLocaleString('en-IN')}</span>
                      <span className="ddp-sub">Per Visit · No Extra Fee</span>
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
