import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Stethoscope, QrCode, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './BottomNav.css';

const BottomNav = () => {
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();

  // Hide bottom nav inside booking page on mobile if sticky action bar takes priority,
  // but keep it on primary pages
  const queuePath = isLoggedIn
    ? user.role === 'patient'
      ? '/patient/dashboard'
      : `/${user.role}/dashboard`
    : '/login';

  const accountPath = isLoggedIn
    ? `/${user.role}/dashboard`
    : '/login';

  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/"
        end
        className={({ isActive }) => isActive ? 'bnav-item active' : 'bnav-item'}
      >
        <div className="bnav-icon-wrap">
          <Home size={20} strokeWidth={2.2} />
        </div>
        <span className="bnav-label">Home</span>
      </NavLink>

      <NavLink
        to="/find-hospital"
        className={({ isActive }) => isActive ? 'bnav-item active' : 'bnav-item'}
      >
        <div className="bnav-icon-wrap">
          <Stethoscope size={20} strokeWidth={2.2} />
        </div>
        <span className="bnav-label">Doctors</span>
      </NavLink>

      <NavLink
        to={queuePath}
        className={({ isActive }) =>
          (location.pathname === '/patient/dashboard' || location.pathname.startsWith('/book/'))
            ? 'bnav-item active bnav-highlight'
            : 'bnav-item bnav-highlight'
        }
      >
        <div className="bnav-highlight-btn">
          <QrCode size={22} strokeWidth={2.4} />
        </div>
        <span className="bnav-label">My Queue</span>
      </NavLink>

      <NavLink
        to={accountPath}
        className={({ isActive }) =>
          (location.pathname === '/login' || location.pathname === '/register' || location.pathname.includes('dashboard')) && location.pathname !== '/patient/dashboard'
            ? 'bnav-item active'
            : 'bnav-item'
        }
      >
        <div className="bnav-icon-wrap">
          <User size={20} strokeWidth={2.2} />
        </div>
        <span className="bnav-label">{isLoggedIn ? 'Account' : 'Sign In'}</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
