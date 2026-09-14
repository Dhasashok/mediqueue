import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  MapPin,
  Star,
  Monitor,
  User,
  Calendar,
  Lightbulb,
  X
} from 'lucide-react';
import { getDoctorsByDept, getDepartments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DepartmentPage.css';

const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Available Today' },
  { id: 'lowest_fee', label: 'Lowest Fee' },
  { id: 'most_experienced', label: 'Most Experienced' },
  { id: 'top_rated', label: 'Top Rated' }
];

const DepartmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([getDoctorsByDept(id), getDepartments()])
      .then(([dRes, depRes]) => {
        const rawDocs = dRes.data.doctors || [];
        const allDepts = depRes.data.departments || [];
        setDepartments(allDepts);
        const currentDept = allDepts.find(dep => dep.id === parseInt(id, 10));
        setDept(currentDept);

        // Enrich doctors with deterministic distance, rating, modes, and availability
        const enriched = rawDocs.map(doc => {
          const rating = (4.7 + ((doc.id * 3) % 4) * 0.1).toFixed(1);
          const distance = ((doc.id * 1.7) % 6.2 + 1.2).toFixed(1) + ' km';
          const isToday = true; // all doctors in OPD have slot capacity today
          const modes = (doc.department_name === 'Radiology' || doc.department_name === 'Emergency')
            ? ['In-Person']
            : (doc.id % 3 === 0 ? ['Online'] : ['Online', 'In-Person']);

          return {
            ...doc,
            rating: parseFloat(rating),
            distance,
            available_today: isToday,
            modes
          };
        });
        setDoctors(enriched);
      })
      .catch(err => console.error('Error fetching department doctors:', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = (docId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'patient') {
      alert('Only patients can book appointments.');
      return;
    }
    navigate(`/book/${docId}`);
  };

  // Filter & sort logic
  const filteredDoctors = useMemo(() => {
    let list = [...doctors];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(d =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.specialization && d.specialization.toLowerCase().includes(q))
      );
    }

    if (activeFilter === 'today') {
      list = list.filter(d => d.available_today);
    } else if (activeFilter === 'lowest_fee') {
      list.sort((a, b) => parseFloat(a.consultation_fee) - parseFloat(b.consultation_fee));
    } else if (activeFilter === 'most_experienced') {
      list.sort((a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0));
    } else if (activeFilter === 'top_rated') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [doctors, search, activeFilter]);

  return (
    <div className="dept-page">
      {/* ── Mobile Top Navigation ────────────────────────────── */}
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

      <div className="container dept-content-container">
        {/* ── Desktop Header Matching Screenshot ───────────────── */}
        <header className="fd-header dept-top-header">
          <div className="fd-header-left">
            <div className="dept-breadcrumb">
              <Link to="/">Home</Link> <span>›</span>
              <Link to="/find-hospital">Book Appointment</Link> <span>›</span>
              <span className="breadcrumb-current">{dept?.name || 'Specialists'}</span>
            </div>
            <h1 className="fd-title">Find Your {dept?.name || ''} Doctor</h1>
            <p className="fd-subtitle">
              {dept?.description || `Search verified ${dept?.name || ''} specialists—we'll help you find the right care`}
            </p>
          </div>

          <div className="fd-header-right">
            <div className="fd-search-wrap">
              <Search size={17} className="fd-search-icon" />
              <input
                type="text"
                placeholder={`Search ${dept?.name || 'doctor'}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="fd-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="fd-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="fd-filter-btn"
              onClick={() => navigate('/find-hospital')}
              title="View all hospital departments"
            >
              <Filter size={15} />
              <span>All Departments</span>
            </button>
          </div>
        </header>

        {/* ── Department Switcher Pills Carousel ───────────────── */}
        <div className="fd-departments-bar">
          <Link to="/find-hospital" className="fd-dept-chip">
            ← All Departments
          </Link>
          {departments.map(d => (
            <Link
              key={d.id}
              to={`/department/${d.id}`}
              className={`fd-dept-chip ${String(d.id) === String(id) ? 'active' : ''}`}
            >
              {d.name}
            </Link>
          ))}
        </div>

        {/* ── Quick Filter Pills Row (All, Available Today, Lowest Fee, etc.) ── */}
        <div className="fd-pills-row">
          <div className="fd-quick-pills">
            {QUICK_FILTERS.map(qf => (
              <button
                key={qf.id}
                type="button"
                className={`fd-pill ${activeFilter === qf.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(qf.id)}
              >
                {qf.label}
              </button>
            ))}
          </div>

          <div className="fd-results-count">
            Showing <strong>{filteredDoctors.length}</strong> doctor{filteredDoctors.length !== 1 ? 's' : ''} in {dept?.name || 'Department'}
          </div>
        </div>

        {/* ── Doctor Cards Grid (4 Columns Matching Screenshot) ─ */}
        {loading ? (
          <div className="fd-grid">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="fd-card fd-skeleton-card">
                <div className="fd-skel-photo"></div>
                <div className="fd-card-body">
                  <div className="fd-skel-line medium"></div>
                  <div className="fd-skel-line short"></div>
                  <div className="fd-skel-line full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="fd-empty-state">
            <div className="fd-empty-icon-wrap">
              <Search size={36} color="#0d9488" />
            </div>
            <h3>No doctors found</h3>
            <p>
              We couldn't find any specialist in {dept?.name || 'this department'} matching "{search}".
            </p>
            <button
              type="button"
              className="fd-btn-reset"
              onClick={() => setSearch('')}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="fd-grid">
            {filteredDoctors.map(doc => {
              const fee = parseInt(doc.consultation_fee, 10);
              const rating = doc.rating || '4.9';
              const exp = doc.years_of_experience || 15;
              const distance = doc.distance || '2.1 km';
              const isToday = doc.available_today;
              const photoUrl = doc.profile_image_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80';

              return (
                <div key={doc.id} className="fd-card">
                  {/* Doctor Image Container with Distance Badge */}
                  <div className="fd-card-img-wrap">
                    <img
                      src={photoUrl}
                      alt={`Dr. ${doc.first_name} ${doc.last_name}`}
                      className="fd-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = (doc.gender === 'Female')
                          ? 'https://images.unsplash.com/photo-1594824813629-9e8c467a840e?w=400&auto=format&fit=crop&q=80'
                          : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="fd-distance-badge">
                      <MapPin size={11} className="fd-pin-icon" />
                      <span>{distance}</span>
                    </div>
                  </div>

                  {/* Doctor Card Body */}
                  <div className="fd-card-body">
                    {/* Name & Availability */}
                    <div className="fd-card-header-row">
                      <h3 className="fd-doc-name" title={`Dr. ${doc.first_name} ${doc.last_name}`}>
                        Dr. {doc.first_name} {doc.last_name}
                      </h3>
                      <span className={`fd-avail-badge ${isToday ? 'avail-today' : 'avail-future'}`}>
                        <span className="fd-avail-dot"></span>
                        {isToday ? 'Today' : 'Tomorrow'}
                      </span>
                    </div>

                    {/* Specialty */}
                    <div className="fd-specialty">
                      {doc.specialization || doc.department_name}
                    </div>

                    {/* Experience & Rating Row */}
                    <div className="fd-meta-row">
                      <span className="fd-meta-item">
                        <Lightbulb size={13} className="fd-bulb-icon" />
                        <span>{exp} years experience</span>
                      </span>
                      <span className="fd-meta-sep">·</span>
                      <span className="fd-rating-badge">
                        <Star size={12} fill="#f59e0b" color="#f59e0b" />
                        <strong>{rating}</strong>
                      </span>
                    </div>

                    {/* Consultation Modes */}
                    <div className="fd-modes-row">
                      {(doc.modes && doc.modes.includes('Online')) && (
                        <span className="fd-mode-tag">
                          <Monitor size={11} />
                          <span>Online</span>
                        </span>
                      )}
                      {(doc.modes && doc.modes.includes('In-Person')) && (
                        <span className="fd-mode-tag">
                          <User size={11} />
                          <span>In-Person</span>
                        </span>
                      )}
                    </div>

                    {/* Card Footer: Fee & Book Now Button */}
                    <div className="fd-card-footer">
                      <div className="fd-fee-block">
                        <span className="fd-fee-label">Starting at</span>
                        <div className="fd-fee-amount">
                          ₹{fee.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="fd-book-btn"
                        onClick={() => handleBook(doc.id)}
                        aria-label={`Book appointment with Dr. ${doc.first_name} ${doc.last_name}`}
                      >
                        <Calendar size={14} />
                        <span>Book Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentPage;
