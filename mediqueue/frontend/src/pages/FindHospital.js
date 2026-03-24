import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepartments } from '../services/api';
import './FindHospital.css';

const DEPT_ICONS = {
  'Dentistry':        { icon: '🦷', color: '#3b82f6', light: '#eff6ff' },
  'Cardiology':       { icon: '❤️', color: '#ef4444', light: '#fef2f2' },
  'Orthopedics':      { icon: '🦴', color: '#f59e0b', light: '#fffbeb' },
  'General Medicine': { icon: '🩺', color: '#10b981', light: '#ecfdf5' },
  'Neurology':        { icon: '🧠', color: '#8b5cf6', light: '#f5f3ff' },
  'Pediatrics':       { icon: '👶', color: '#f97316', light: '#fff7ed' },
  'Dermatology':      { icon: '💊', color: '#ec4899', light: '#fdf2f8' },
  'ENT':              { icon: '👂', color: '#06b6d4', light: '#ecfeff' },
  'Ophthalmology':    { icon: '👁️', color: '#6366f1', light: '#eef2ff' },
  'Gynecology':       { icon: '🌸', color: '#f43f5e', light: '#fff1f2' },
  'Radiology':        { icon: '🔬', color: '#0ea5e9', light: '#f0f9ff' },
  'Emergency':        { icon: '🚑', color: '#dc2626', light: '#fef2f2' },
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

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

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
                Online Booking Active
              </div>
              <h1 className="fh-title">City General Hospital</h1>
              <p className="fh-subtitle">Pune, Maharashtra</p>
              <p className="fh-desc">
                NABH Accredited · 24/7 Emergency · 200+ Doctors
              </p>

              <div className="fh-meta-pills">
                <span className="fh-pill">📍 MG Road, Pune – 411001</span>
                <span className="fh-pill">📞 020-1234-5678</span>
                <span className="fh-pill">⏰ Mon–Sat 8AM–8PM</span>
                <span className="fh-pill fh-pill-red">🚨 Emergency 24/7</span>
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

      {/* ── Search + Dept Count Bar ──────────────────── */}
      <div className="fh-search-bar">
        <div className="container fh-search-inner">
          <div className="fh-search-left">
            <h3>Select a Department</h3>
            <p>{filtered.length} departments available</p>
          </div>
          <div className="fh-search-box">
            <span className="fh-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Department Grid ──────────────────────────── */}
      <section className="fh-depts-section">
        <div className="container">
          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <p style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</p>
              <p>No departments found for "{search}"</p>
            </div>
          ) : (
            <div className="fh-dept-grid">
              {filtered.map((d, idx) => {
                const meta = DEPT_ICONS[d.name] || { icon: '🏥', color: '#0d9488', light: '#f0fdf4' };
                return (
                  <div
                    key={d.id}
                    className="fh-dept-card"
                    style={{ '--dept-color': meta.color, '--dept-light': meta.light, animationDelay: `${idx * 0.05}s` }}
                    onClick={() => navigate(`/department/${d.id}`)}
                  >
                    {/* Top color strip */}
                    <div className="fhdc-strip" style={{ background: meta.color }}></div>

                    {/* Icon */}
                    <div className="fhdc-icon-wrap" style={{ background: meta.light, borderColor: meta.color + '30' }}>
                      <span className="fhdc-icon">{meta.icon}</span>
                    </div>

                    {/* Info */}
                    <div className="fhdc-info">
                      <h3 className="fhdc-name">{d.name}</h3>
                      <span className="fhdc-count" style={{ background: meta.light, color: meta.color }}>
                        {d.doctor_count || 1} Doctor{(d.doctor_count || 1) !== 1 ? 's' : ''}
                      </span>
                      <p className="fhdc-desc">{d.description}</p>
                    </div>

                    {/* Book button */}
                    <div className="fhdc-btn" style={{ background: meta.color }}>
                      Book Appointment →
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