import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Filter,
  MapPin,
  Star,
  Monitor,
  User,
  Calendar,
  Lightbulb,
  X,
  Check
} from 'lucide-react';
import { getDoctorsByDept, getDepartments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DepartmentPage.css';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Doctors' },
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
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getDoctorsByDept(id), getDepartments()])
      .then(([dRes, depRes]) => {
        const rawDocs = dRes.data.doctors || [];
        const allDepts = depRes.data.departments || [];
        const currentDept = allDepts.find(dep => dep.id === parseInt(id, 10));
        setDept(currentDept);

        // Enrich doctors with deterministic distance, rating, modes, and availability
        const enriched = rawDocs.map(doc => {
          const rating = (4.7 + ((doc.id * 3) % 4) * 0.1).toFixed(1);
          const distance = ((doc.id * 1.7) % 6.2 + 1.2).toFixed(1) + ' km';
          const isToday = true;
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

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  // Filter logic: strict filtering to match selected filter
  const filteredDoctors = useMemo(() => {
    let list = [...doctors];

    if (activeFilter === 'today') {
      list = list.filter(d => d.available_today);
    } else if (activeFilter === 'lowest_fee') {
      if (list.length > 0) {
        const minFee = Math.min(...list.map(d => parseFloat(d.consultation_fee) || 0));
        list = list.filter(d => (parseFloat(d.consultation_fee) || 0) === minFee);
      }
    } else if (activeFilter === 'most_experienced') {
      if (list.length > 0) {
        const maxExp = Math.max(...list.map(d => d.years_of_experience || 0));
        list = list.filter(d => (d.years_of_experience || 0) === maxExp);
      }
    } else if (activeFilter === 'top_rated') {
      if (list.length > 0) {
        const maxRating = Math.max(...list.map(d => parseFloat(d.rating) || 0));
        list = list.filter(d => (parseFloat(d.rating) || 0) === maxRating);
      }
    }

    return list;
  }, [doctors, activeFilter]);

  const activeFilterLabel = FILTER_OPTIONS.find(f => f.id === activeFilter)?.label;

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
        {/* ── Desktop Clean Header (Clean spacing, no redundant button) ── */}
        <header className="dept-page-header-clean">
          <div className="dept-breadcrumb">
            <Link to="/">Home</Link>
            <span className="breadcrumb-sep">›</span>
            <Link to="/find-hospital">Book Appointment</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{dept?.name || 'Specialists'}</span>
          </div>

          <h1 className="dept-main-title">Find Your {dept?.name || ''} Doctor</h1>
          <p className="dept-main-subtitle">
            {dept?.description || `Verified ${dept?.name || ''} specialists at City General Hospital ready for consultation`}
          </p>
        </header>

        {/* ── Filter Menu Action Bar ──────────────────────────── */}
        <div className="dept-filter-bar">
          <div className="dept-filter-controls" ref={filterRef}>
            {/* Filter Toggle Menu Button */}
            <button
              type="button"
              className={`dept-filter-menu-btn ${filterMenuOpen ? 'open' : ''} ${activeFilter !== 'all' ? 'has-active' : ''}`}
              onClick={() => setFilterMenuOpen(prev => !prev)}
              aria-label="Toggle filter menu"
            >
              <Filter size={15} />
              <span>Filter Doctors</span>
              <span className="filter-chevron">▾</span>
            </button>

            {/* Active Filter Pill with Clear option */}
            {activeFilter !== 'all' && (
              <span className="dept-active-chip">
                <span>{activeFilterLabel}</span>
                <button
                  type="button"
                  className="dept-chip-remove"
                  onClick={() => setActiveFilter('all')}
                  aria-label="Remove filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Filter Dropdown Menu */}
            {filterMenuOpen && (
              <div className="dept-filter-dropdown">
                <div className="dept-dropdown-title">Filter by criteria</div>
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`dept-dropdown-item ${activeFilter === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveFilter(opt.id);
                      setFilterMenuOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {activeFilter === opt.id && <Check size={14} className="dropdown-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="dept-count-text">
            Showing <strong>{filteredDoctors.length}</strong> {activeFilter === 'lowest_fee' ? 'lowest fee ' : ''}doctor{filteredDoctors.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Doctor Cards Grid (4 Columns) ───────────────────── */}
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
            <h3>No doctors found</h3>
            <p>
              No specialist currently matches the selected filter in {dept?.name || 'this department'}.
            </p>
            <button
              type="button"
              className="fd-btn-reset"
              onClick={() => setActiveFilter('all')}
            >
              Show All Doctors
            </button>
          </div>
        ) : (
          <div className="fd-grid">
            {filteredDoctors.map(doc => {
              const fee = parseInt(doc.consultation_fee, 10);
              const rating = parseFloat(doc.rating || 4.9).toFixed(1);
              const exp = doc.years_of_experience || 15;
              const distance = doc.distance || '2.1 km';
              const isToday = doc.available_today;
              const fallbackPhoto = (doc.gender === 'Female')
                ? 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80';
              const photoUrl = doc.profile_image_url || fallbackPhoto;

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
                        e.target.src = fallbackPhoto;
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

                    {/* Card Footer: Fee & Green Book Now Button */}
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
