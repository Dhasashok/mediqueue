import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <div className="breadcrumb">
            <a href="/">Home</a> <span>›</span> <a href="/find-hospital">Find Hospital</a> <span>›</span> <span>{dept?.name}</span>
          </div>
          <h1>{dept?.icon} {dept?.name || 'Department'} — Doctors</h1>
          <p>{dept?.description}</p>
        </div>
      </section>

      <div className="container" style={{ padding: '12px 24px' }}>
        <div className="ml-banner">
          <span>🤖</span>
          <span><strong>ML Prediction Active</strong> — Wait times are predicted using our Random Forest model trained on hospital data. Load levels update in real-time.</span>
        </div>
      </div>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="dept-search-bar">
            <h2 style={{ margin: 0 }}>{dept?.icon} {dept?.name} Doctors</h2>
            <input className="search-input" placeholder="🔍 Search doctors..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>😕 No doctors found in this department.</p>
            </div>
          ) : (
            <div className="doctors-list">
              {filtered.map(doc => (
                <div key={doc.id} className="doctor-card card">
                  <div className="doc-photo">{doc.first_name[0]}{doc.last_name[0]}</div>
                  <div className="doc-info">
                    <div className="doc-name-row">
                      <h3>Dr. {doc.first_name} {doc.last_name}</h3>
                      <span className="badge badge-teal">{doc.specialization}</span>
                    </div>
                    <div className="doc-meta">
                      <span>⭐ {doc.years_of_experience} Years Exp.</span>
                      <span>🗣️ {doc.languages_known}</span>
                      <span>💰 ₹{doc.consultation_fee}</span>
                    </div>
                    <div className="doc-stats">
                      <span className="doc-wait">⏱️ Est. Wait: ~{doc.estimated_wait} min</span>
                      <span className={`badge ${loadColors[doc.load_level] || 'badge-gray'}`}>
                        {doc.load_level} Demand
                      </span>
                      <span className="badge badge-gray">Queue: {doc.current_queue} waiting</span>
                    </div>
                  </div>
                  <div className="doc-action">
                    <button className="btn btn-primary" onClick={() => handleBook(doc.id)}>
                      📅 Book Appointment
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
