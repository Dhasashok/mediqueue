import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Lock body scroll on mobile when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
    setMenuOpen(false);
    setDropOpen(false);
  };

  const dashboardPath = user ? `/${user.role}/dashboard` : '/login';

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo" onClick={() => { setMenuOpen(false); setDropOpen(false); }}>
            <span className="logo-icon">🏥</span>
            <span className="logo-text">Medi<span className="logo-accent">Queue</span></span>
          </Link>

          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink to="/find-hospital" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>Find Hospital</NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>About</NavLink>

            {isLoggedIn ? (
              <div
                className="nav-user"
                ref={userMenuRef}
                onMouseEnter={() => setDropOpen(true)}
                onMouseLeave={() => setDropOpen(false)}
              >
                <button
                  className="user-btn"
                  onClick={() => setDropOpen(prev => !prev)}
                  aria-expanded={dropOpen}
                  aria-label="User menu"
                  type="button"
                >
                  <span className="user-avatar">{user.name?.[0]?.toUpperCase()}</span>
                  <span className="user-name">{user.name?.split(' ')[0]}</span>
                  <span>▾</span>
                </button>
                {dropOpen && (
                  <div className="dropdown">
                    <div className="dropdown-header">
                      <p className="drop-name">{user.name}</p>
                      <p className="drop-role">{user.role}</p>
                    </div>
                    <Link to={dashboardPath} className="dropdown-item" onClick={() => { setDropOpen(false); setMenuOpen(false); }}>
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                Login / Register
              </Link>
            )}
          </div>

          <div className="nav-right-wrap">
            <a href="tel:102" className="nav-sos-pill" aria-label="Emergency Ambulance 102">
              <span className="sos-pulse-dot"></span>
              <span className="sos-text">102</span>
            </a>

            <button
              className={`hamburger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              type="button"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile backdrop scrim */}
      {menuOpen && (
        <div
          className="nav-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Navbar;