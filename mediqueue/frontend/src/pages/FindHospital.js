import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
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
import { getDepartments, getPublicDoctors } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './FindHospital.css';

const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Available Today' },
  { id: 'lowest_fee', label: 'Lowest Fee' },
  { id: 'most_experienced', label: 'Most Experienced' },
  { id: 'top_rated', label: 'Top Rated' }
];

const FindHospital = () => {
  const [searchParams] = useSearchParams();
  const initialDept = searchParams.get('dept') || 'all';

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(initialDept);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Load initial departments and doctors
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, docRes] = await Promise.all([
        getDepartments(),
        getPublicDoctors()
      ]);
      setDepartments(deptRes.data.departments || []);
      setDoctors(docRes.data.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors/departments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & sort logic
  const filteredDoctors = useMemo(() => {
    let list = [...doctors];

    // Department filter
    if (selectedDept !== 'all') {
      list = list.filter(d => d.department_id === parseInt(selectedDept, 10));
    }

    // Search query filter (name, specialization, department)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(d =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.specialization && d.specialization.toLowerCase().includes(q)) ||
        (d.department_name && d.department_name.toLowerCase().includes(q))
      );
    }

    // Quick category filters
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
  }, [doctors, selectedDept, search, activeFilter]);

  const handleBookNow = (docId) => {
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

  return (
    <div className="find-doctor-page">
      <div className="container">
        {/* ── Top Header Section ─────────────────────────────── */}
        <header className="fd-header">
          <div className="fd-header-left">
            <h1 className="fd-title">Find Your Doctor</h1>
            <p className="fd-subtitle">
              Search by name, specialty, or location—we'll help you find the right care
            </p>
          </div>

          <div className="fd-header-right">
            <div className="fd-search-wrap">
              <Search size={17} className="fd-search-icon" />
              <input
                type="text"
                placeholder="Try 'cardiologist' or 'Dr. Smith'..."
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
              className={`fd-filter-btn ${showFilterPanel ? 'active' : ''}`}
              onClick={() => setShowFilterPanel(prev => !prev)}
            >
              <Filter size={15} />
              <span>Filter</span>
            </button>
          </div>
        </header>

        {/* ── Department Selector Chips (Dynamic Department Filtering) ── */}
        <div className="fd-departments-bar">
          <button
            type="button"
            className={`fd-dept-chip ${selectedDept === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedDept('all')}
          >
            All Departments
          </button>
          {departments.map(dept => (
            <button
              key={dept.id}
              type="button"
              className={`fd-dept-chip ${selectedDept === String(dept.id) ? 'active' : ''}`}
              onClick={() => setSelectedDept(String(dept.id))}
            >
              {dept.name}
            </button>
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
            Showing <strong>{filteredDoctors.length}</strong> doctor{filteredDoctors.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Doctor Cards Grid (4 Columns) ────────────────────── */}
        {loading ? (
          <div className="fd-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
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
              We couldn't find any specialist matching your criteria. Try adjusting your search or clearing department filters.
            </p>
            <button
              type="button"
              className="fd-btn-reset"
              onClick={() => {
                setSearch('');
                setSelectedDept('all');
                setActiveFilter('all');
              }}
            >
              Reset All Filters
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
                    />
                    <div className="fd-distance-badge">
                      <MapPin size={11} className="fd-pin-icon" />
                      <span>{distance}</span>
                    </div>
                  </div>

                  {/* Doctor Card Content */}
                  <div className="fd-card-body">
                    {/* Name & Availability Pill */}
                    <div className="fd-card-header-row">
                      <h3 className="fd-doc-name" title={`Dr. ${doc.first_name} ${doc.last_name}`}>
                        Dr. {doc.first_name} {doc.last_name}
                      </h3>
                      <span className={`fd-avail-badge ${isToday ? 'avail-today' : 'avail-future'}`}>
                        <span className="fd-avail-dot"></span>
                        {isToday ? 'Today' : (doc.availability_label || 'Tomorrow')}
                      </span>
                    </div>

                    {/* Specialty / Department */}
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

                    {/* Consultation Modes (Online / In-Person) */}
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
                        onClick={() => handleBookNow(doc.id)}
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

export default FindHospital;