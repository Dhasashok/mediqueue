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
            {(!user || (user.role !== 'admin' && user.role !== 'doctor')) && (
              <>
                <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>Home</NavLink>
                <NavLink to="/find-hospital" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>Book Appointment</NavLink>
                <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>About</NavLink>
              </>
            )}

            {isLoggedIn ? (
              <>
                {/* Desktop User Dropdown */}
                <div
                  className="nav-user desktop-only-user"
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
                    <span className="user-avatar">{(user.name || user.first_name || 'U')[0].toUpperCase()}</span>
                    <span className="user-name">{(user.name || user.first_name || 'User').split(' ')[0]}</span>
                    <span>▾</span>
                  </button>
                  {dropOpen && (
                    <div className="dropdown">
                      <div className="dropdown-header">
                        <p className="drop-name">{user.name || user.first_name || 'User'}</p>
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

                {/* Mobile Drawer User Card */}
                <div className="mobile-only-user">
                  <div className="mobile-user-profile">
                    <div className="mobile-user-avatar">
                      {(user.name || user.first_name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="mobile-user-info">
                      <p className="mup-name">{user.name || user.first_name || 'User'}</p>
                      <span className="mup-role">{user.role}</span>
                    </div>
                  </div>
                  <div className="mobile-user-links">
                    <Link to={dashboardPath} className="mobile-user-link" onClick={() => setMenuOpen(false)}>
                      <LayoutDashboard size={16} />
                      <span>Dashboard</span>
                    </Link>
                    <button className="mobile-user-link danger" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                Login / Register
              </Link>
            )}
          </div>

          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            type="button"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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