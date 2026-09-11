import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Phone,
  Clock,
  Zap
} from 'lucide-react';
import { getDepartments } from '../services/api';
import './FindHospital.css';

const DEPT_ICONS = {
  'Dentistry':        { icon: '🦷', color: '#3b82f6', light: '#eff6ff', wait: '15m' },
  'Cardiology':       { icon: '❤️', color: '#ef4444', light: '#fef2f2', wait: '20m' },
  'Orthopedics':      { icon: '🦴', color: '#f59e0b', light: '#fffbeb', wait: '12m' },
  'General Medicine': { icon: '🩺', color: '#10b981', light: '#ecfdf5', wait: '8m' },
  'Neurology':        { icon: '🧠', color: '#8b5cf6', light: '#f5f3ff', wait: '25m' },
  'Pediatrics':       { icon: '👶', color: '#f97316', light: '#fff7ed', wait: '10m' },
  'Dermatology':      { icon: '💊', color: '#ec4899', light: '#fdf2f8', wait: '15m' },
  'ENT':              { icon: '👂', color: '#06b6d4', light: '#ecfeff', wait: '10m' },
  'Ophthalmology':    { icon: '👁️', color: '#6366f1', light: '#eef2ff', wait: '18m' },
  'Gynecology':       { icon: '🌸', color: '#f43f5e', light: '#fff1f2', wait: '15m' },
  'Radiology':        { icon: '🔬', color: '#0ea5e9', light: '#f0f9ff', wait: '5m' },
  'Emergency':        { icon: '🚑', color: '#dc2626', light: '#fef2f2', wait: '< 2m' },
};

const FindHospital = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getDepartments()
      .then(r => setDepartments(r.data.departments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && window.location.hash === '#bottom') {
      const cards = document.querySelectorAll('.fh-dept-card');
      if (cards.length > 0) {
        cards[cards.length - 1].scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }
  }, [loading]);

  const filtered = departments.filter(d => {
    return d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="fh-page">

      {/* ── Compact Professional Hospital Header ─────────────────────────────── */}
      <section className="fh-hero">
        <div className="fh-hero-bg"></div>
        <div className="container fh-hero-inner">
          <div className="breadcrumb">
            <a href="/">Home</a>
            <span>›</span>
            <span>Book Appointment</span>
          </div>

          <div className="fh-hero-compact">
            <div className="fh-hero-main">
              <div className="fh-title-row">
                <h1 className="fh-title">City General Hospital</h1>
                <span className="fh-live-badge">
                  <span className="fh-live-dot"></span> Online Booking Active
                </span>
              </div>
              <p className="fh-subtitle">Pune, Maharashtra · NABH Accredited</p>
            </div>

            <div className="fh-meta-pills">
              <span className="fh-pill"><MapPin size={13} /> MG Road, Pune – 411001</span>
              <span className="fh-pill"><Phone size={13} /> 020-1234-5678</span>
              <span className="fh-pill"><Clock size={13} /> Mon–Sat 8AM–8PM</span>
              <span className="fh-pill fh-pill-red"><Zap size={13} /> Emergency 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search Bar ──────────────────── */}
      <div className="fh-search-bar">
        <div className="container fh-search-inner">
          <div className="fh-search-left">
            <h2 className="fh-search-title">Book Appointment</h2>
            <p className="fh-search-sub">
              City General Hospital, Pune · {filtered.length} department{filtered.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <div className="fh-search-box">
            <Search size={16} className="fh-search-icon" color="#0d9488" />
            <input
              type="text"
              placeholder="Search department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="fh-search-clear"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
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
              <button className="btn-primary" onClick={() => setSearch('')}>
                Reset Search
              </button>
            </div>
          ) : (
            <div className="fh-dept-grid">
              {filtered.map((d, idx) => {
                const meta = DEPT_ICONS[d.name] || {
                  icon: '🏥',
                  color: '#0d9488',
                  light: '#f0fdf4'
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
                        <h3 className="fhdc-name">{d.name}</h3>
                        <p className="fhdc-desc">{d.description}</p>
                      </div>

                      {/* Mobile action button */}
                      <span className="fhdc-mobile-tap-btn">
                        Book
                      </span>
                    </div>

                    {/* Book button / footer */}
                    <div className="fhdc-btn">
                      <span>Book Appointment</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Guaranteed mobile bottom clearance spacer with anchor id */}
      <div id="fh-bottom-anchor" className="fh-bottom-safe-spacer" style={{ height: '110px', width: '100%', clear: 'both' }}></div>
    </div>
  );
};

export default FindHospital;