import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Phone,
  Clock,
  Zap,
  ChevronRight,
  Heart,
  Stethoscope,
  Brain,
  Baby,
  Pill,
  Eye,
  Smile,
  Activity
} from 'lucide-react';
import { getDepartments } from '../services/api';
import './FindHospital.css';

const DEPT_ICONS = {
  'Dentistry':        { icon: <Smile size={28} />, color: '#3b82f6', light: '#eff6ff', wait: '15m' },
  'Cardiology':       { icon: <Heart size={28} />, color: '#ef4444', light: '#fef2f2', wait: '20m' },
  'Orthopedics':      { icon: <Activity size={28} />, color: '#f59e0b', light: '#fffbeb', wait: '12m' },
  'General Medicine': { icon: <Stethoscope size={28} />, color: '#10b981', light: '#ecfdf5', wait: '8m' },
  'Neurology':        { icon: <Brain size={28} />, color: '#8b5cf6', light: '#f5f3ff', wait: '25m' },
  'Pediatrics':       { icon: <Baby size={28} />, color: '#f97316', light: '#fff7ed', wait: '10m' },
  'Dermatology':      { icon: <Pill size={28} />, color: '#ec4899', light: '#fdf2f8', wait: '15m' },
  'ENT':              { icon: <Activity size={28} />, color: '#06b6d4', light: '#ecfeff', wait: '10m' },
  'Ophthalmology':    { icon: <Eye size={28} />, color: '#6366f1', light: '#eef2ff', wait: '18m' },
  'Gynecology':       { icon: <Heart size={28} />, color: '#f43f5e', light: '#fff1f2', wait: '15m' },
  'Radiology':        { icon: <Activity size={28} />, color: '#0ea5e9', light: '#f0f9ff', wait: '5m' },
  'Emergency':        { icon: <Zap size={28} />, color: '#dc2626', light: '#fef2f2', wait: '< 2m' },
};

const CATEGORIES = ['All', 'General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Emergency'];

const FindHospital = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    getDepartments()
      .then(r => setDepartments(r.data.departments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || d.name.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fh-page">

      {/* ── Hero Header ─────────────────────────────── */}
      <section className="fh-hero">
        <div className="fh-hero-bg"></div>
        <div className="container fh-hero-inner">
          <div className="breadcrumb" style={{ marginBottom: 20 }}>
            <a href="/" style={{ color: '#94a3b8' }}>Home</a>
            <span style={{ color: '#475569' }}>›</span>
            <span style={{ color: '#cbd5e1' }}>Find Hospital</span>
          </div>

          <div className="fh-hero-content">
            <div className="fh-hero-left">
              <div className="fh-live-tag">
                <span className="fh-live-dot"></span>
                Online Booking & Queue Active
              </div>
              <h1 className="fh-title">City General Hospital</h1>
              <p className="fh-subtitle">Pune, Maharashtra</p>
              <p className="fh-desc">
                NABH Accredited · 24/7 Emergency Care · 200+ Specialist Doctors
              </p>

              <div className="fh-meta-pills">
                <span className="fh-pill"><MapPin size={13} /> MG Road, Pune – 411001</span>
                <span className="fh-pill"><Phone size={13} /> 020-1234-5678</span>
                <span className="fh-pill"><Clock size={13} /> Mon–Sat 8AM–8PM</span>
                <span className="fh-pill fh-pill-red"><Zap size={13} /> Emergency 24/7</span>
              </div>
            </div>

            {/* Quick stats on right */}
            <div className="fh-hero-stats">
              <div className="fh-hstat">
                <span className="fh-hstat-val">12+</span>
                <span className="fh-hstat-label">Departments</span>
              </div>
              <div className="fh-hstat">
                <span className="fh-hstat-val">200+</span>
                <span className="fh-hstat-label">Doctors</span>
              </div>
              <div className="fh-hstat">
                <span className="fh-hstat-val">50k+</span>
                <span className="fh-hstat-label">Patients</span>
              </div>
              <div className="fh-hstat">
                <span className="fh-hstat-val">24/7</span>
                <span className="fh-hstat-label">Emergency</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search + Quick Filter Chips Bar ──────────────────── */}
      <div className="fh-search-bar">
        <div className="container fh-search-inner">
          <div className="fh-search-left">
            <h3>Select a Department</h3>
            <p>{filtered.length} departments available</p>
          </div>
          <div className="fh-search-box">
            <Search size={18} className="fh-search-icon" color="#0d9488" />
            <input
              type="text"
              placeholder="Search department, specialty or symptom..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem' }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Mobile-Friendly Category Filter Chips */}
        <div className="container fh-category-scroll">
          <div className="fh-category-chips">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`fh-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Department Grid ──────────────────────────── */}
      <section className="fh-depts-section">
        <div className="container">
          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : filtered.length === 0 ? (
            <div className="fh-empty-state">
              <Search size={48} color="#94a3b8" />
              <h3>No departments found</h3>
              <p>We couldn't find any department matching "{search}". Try searching for another symptom or department.</p>
              <button className="btn-primary" onClick={() => { setSearch(''); setSelectedCategory('All'); }}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="fh-dept-grid">
              {filtered.map((d, idx) => {
                const meta = DEPT_ICONS[d.name] || {
                  icon: <Activity size={28} />,
                  color: '#0d9488',
                  light: '#f0fdf4',
                  wait: '15m'
                };
                return (
                  <div
                    key={d.id}
                    className="fh-dept-card"
                    style={{ '--dept-color': meta.color, '--dept-light': meta.light, animationDelay: `${idx * 0.04}s` }}
                    onClick={() => navigate(`/department/${d.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/department/${d.id}`)}
                  >
                    {/* Top color strip */}
                    <div className="fhdc-strip" style={{ background: meta.color }}></div>

                    <div className="fhdc-main-row">
                      {/* Icon */}
                      <div className="fhdc-icon-wrap" style={{ background: meta.light, color: meta.color, borderColor: meta.color + '33' }}>
                        {meta.icon}
                      </div>

                      {/* Info */}
                      <div className="fhdc-info">
                        <div className="fhdc-badge-row">
                          <span className="fhdc-count" style={{ background: meta.light, color: meta.color }}>
                            {d.doctor_count || 1} Doctor{(d.doctor_count || 1) !== 1 ? 's' : ''}
                          </span>
                          <span className="fhdc-wait-pill">
                            <span className="fhdc-live-dot"></span>
                            ~{meta.wait} wait
                          </span>
                        </div>
                        <h3 className="fhdc-name">{d.name}</h3>
                        <p className="fhdc-desc">{d.description}</p>
                      </div>

                      {/* Mobile Arrow */}
                      <div className="fhdc-mobile-arrow">
                        <ChevronRight size={20} color="#94a3b8" />
                      </div>
                    </div>

                    {/* Book button / footer */}
                    <div className="fhdc-btn" style={{ background: meta.color }}>
                      <span>Book Appointment</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default FindHospital;