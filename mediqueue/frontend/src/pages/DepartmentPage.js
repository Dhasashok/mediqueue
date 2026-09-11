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

  return (
    <div className="dept-page">
      {/* Mobile Back Navigation Header */}
      <div className="dept-mobile-topbar">
        <div className="container dept-topbar-inner">
          <Link to="/find-hospital" className="dept-back-link">
            <ArrowLeft size={20} />
            <span>All Departments</span>
          </Link>
          <span className="dept-topbar-title">{dept?.name || 'Department'}</span>
        </div>
      </div>

      <section className="page-header dept-page-header">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link> <span>›</span> <Link to="/find-hospital">Find Hospital</Link> <span>›</span> <span>{dept?.name}</span>
          </div>
          <h1>{dept?.name || 'Department'} Specialists</h1>
          <p>{dept?.description || 'Browse expert doctors and book instant appointments.'}</p>
        </div>
      </section>

      <div className="container" style={{ padding: '14px 24px 0' }}>
        <div className="ml-banner">
          <div className="ml-banner-icon">
            <Bot size={20} color="#0d9488" />
          </div>
          <div className="ml-banner-text">
            <strong>ML Live Prediction Active</strong>
            <span>Wait times are calculated with ±5 min accuracy using real-time OPD hospital traffic.</span>
          </div>
        </div>
      </div>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="dept-search-bar">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--navy)' }}>
                {filtered.length} Doctor{filtered.length !== 1 ? 's' : ''} Available
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Select a doctor to join queue</span>
            </div>
            <div className="dept-search-wrap">
              <Search size={18} color="#94a3b8" />
              <input
                className="search-input"
                placeholder="Search by doctor name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
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
                        <Star size={14} color="#f59e0b" fill="#f59e0b" />
                        {doc.years_of_experience} Yrs Exp.
                      </span>
                      <span className="doc-meta-item">
                        <Globe size={14} color="#64748b" />
                        {doc.languages_known}
                      </span>
                      <span className="doc-meta-item doc-fee">
                        <IndianRupee size={14} color="#0d9488" />
                        ₹{doc.consultation_fee}
                      </span>
                    </div>

                    <div className="doc-stats">
                      <span className="doc-wait">
                        <Clock size={14} />
                        Est. Wait: ~{doc.estimated_wait} min
                      </span>
                      <span className={`badge ${loadColors[doc.load_level] || 'badge-gray'}`}>
                        {doc.load_level} Demand
                      </span>
                      <span className="badge badge-gray doc-queue-badge">
                        <Users size={13} />
                        {doc.current_queue} waiting
                      </span>
                    </div>
                  </div>

                  <div className="doc-action">
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
