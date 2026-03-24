import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => (
  <footer className="footer-v2">

    {/* Top wave divider */}
    <div className="footer-wave">
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,60 C360,0 1080,60 1440,0 L1440,60 Z" fill="#0f172a"/>
      </svg>
    </div>

    <div className="footer-body">
      <div className="container footer-grid-v2">

        {/* Brand column */}
        <div className="footer-brand-col">
          <div className="footer-logo-v2">
            <span className="footer-logo-icon">🏥</span>
            <span className="footer-logo-text">Medi<span>Queue</span></span>
          </div>
          <p className="footer-tagline">
            India's smartest hospital queue management system. Skip the wait, not the care.
          </p>
          <div className="footer-badges">
            <span className="footer-badge">🏆 NABH Accredited</span>
            <span className="footer-badge">✅ ISO Certified</span>
          </div>
        </div>

        {/* Links */}
        <div className="footer-col-v2">
          <h4 className="footer-col-title">Quick Links</h4>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/find-hospital">Find Hospital</Link>
            <Link to="/about">About Us</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>

        {/* Hospital */}
        <div className="footer-col-v2">
          <h4 className="footer-col-title">Hospital</h4>
          <div className="footer-info-list">
            <div className="footer-info-item">
              <span className="fi-icon">🏥</span>
              <span>City General Hospital</span>
            </div>
            <div className="footer-info-item">
              <span className="fi-icon">📍</span>
              <span>MG Road, Pune – 411001</span>
            </div>
            <div className="footer-info-item">
              <span className="fi-icon">📞</span>
              <span>020-1234-5678</span>
            </div>
            <div className="footer-info-item">
              <span className="fi-icon">⏰</span>
              <span>Mon–Sat: 8AM – 8PM</span>
            </div>
          </div>
        </div>

        {/* Emergency */}
        <div className="footer-col-v2">
          <h4 className="footer-col-title">Emergency</h4>
          <div className="footer-emergency-card">
            <div className="fe-header">
              <span>🚨</span>
              <span>24/7 Emergency</span>
            </div>
            <div className="fe-number">102 / 108</div>
            <p className="fe-sub">Available round the clock</p>
          </div>
          <div className="footer-info-list" style={{ marginTop: 16 }}>
            <div className="footer-info-item">
              <span className="fi-icon">✅</span>
              <span>NABH Accredited</span>
            </div>
            <div className="footer-info-item">
              <span className="fi-icon">👨‍⚕️</span>
              <span>200+ Doctors Online</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    {/* Bottom bar */}
    <div className="footer-bottom-v2">
      <div className="container footer-bottom-inner">
        <p>© 2024 MediQueue · City General Hospital, Pune · All Rights Reserved</p>
        <div className="footer-bottom-links">
          <a href="#!">Privacy Policy</a>
          <span>·</span>
          <a href="#!">Terms of Service</a>
        </div>
      </div>
    </div>

  </footer>
);

export default Footer;