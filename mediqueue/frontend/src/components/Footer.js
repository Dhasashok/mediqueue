import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Clock,
  Zap,
  ShieldCheck,
  Award
} from 'lucide-react';
import './Footer.css';

const Footer = () => (
  <footer className="footer-v2">
    <div className="footer-body">
      <div className="container footer-grid-v2">

        {/* Brand column */}
        <div className="footer-brand-col">
          <div className="footer-logo-v2">
            <span className="footer-logo-icon">🏥</span>
            <span className="footer-logo-text">Medi<span>Queue</span></span>
          </div>
          <p className="footer-tagline">
            Smart hospital OPD queue management & AI wait predictions.
          </p>
          <div className="footer-badges">
            <span className="footer-badge"><Award size={11} /> NABH Accredited</span>
            <span className="footer-badge"><ShieldCheck size={11} /> ISO 9001</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-col-v2 footer-nav-col">
          <h4 className="footer-col-title">Quick Links</h4>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/find-hospital">Find Hospital</Link>
            <Link to="/about">About Hospital</Link>
            <Link to="/login">Sign In / Register</Link>
          </div>
        </div>

        {/* Hospital Contact */}
        <div className="footer-col-v2 footer-contact-col">
          <h4 className="footer-col-title">Hospital Info</h4>
          <div className="footer-info-list">
            <div className="footer-info-item">
              <MapPin size={13} className="fi-icon" />
              <span>MG Road, Pune – 411001</span>
            </div>
            <div className="footer-info-item">
              <Phone size={13} className="fi-icon" />
              <span>020-1234-5678</span>
            </div>
            <div className="footer-info-item">
              <Clock size={13} className="fi-icon" />
              <span>Mon–Sat: 8AM – 8PM</span>
            </div>
          </div>
        </div>

        {/* Emergency Hotline */}
        <div className="footer-col-v2 footer-emergency-col">
          <h4 className="footer-col-title">24/7 Emergency</h4>
          <a href="tel:102" className="footer-emergency-pill">
            <div className="fep-icon">
              <Zap size={15} />
            </div>
            <div className="fep-text">
              <span className="fep-label">Immediate Ambulance</span>
              <strong className="fep-number">102 / 108</strong>
            </div>
          </a>
          <p className="fep-note">Toll-free 24/7 emergency dispatch</p>
        </div>

      </div>

      {/* Mobile-Only Micro Layout (< 768px) */}
      <div className="container footer-mobile-micro">
        <div className="fmm-top">
          <div className="footer-logo-v2">
            <span className="footer-logo-icon">🏥</span>
            <span className="footer-logo-text">Medi<span>Queue</span></span>
          </div>
          <div className="fmm-badges">
            <span className="fmm-badge"><Award size={10} /> NABH</span>
            <span className="fmm-badge"><ShieldCheck size={10} /> ISO</span>
          </div>
        </div>

        <div className="fmm-chips">
          <Link to="/" className="fmm-chip">Home</Link>
          <Link to="/find-hospital" className="fmm-chip">Find Hospital</Link>
          <Link to="/about" className="fmm-chip">About</Link>
          <Link to="/login" className="fmm-chip">Sign In</Link>
        </div>

        <a href="tel:102" className="fmm-emergency-bar">
          <div className="fmm-emergency-left">
            <span className="fmm-pulse-dot"></span>
            <Zap size={14} className="fmm-emergency-icon" />
            <span className="fmm-emergency-title">24/7 Ambulance Hotline</span>
          </div>
          <strong className="fmm-emergency-num">102 / 108</strong>
        </a>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="footer-bottom-v2">
      <div className="container footer-bottom-inner">
        <p>© 2026 MediQueue · City General Hospital</p>
        <div className="footer-bottom-links">
          <a href="#!">Privacy</a>
          <span>·</span>
          <a href="#!">Terms</a>
          <span>·</span>
          <a href="#!">NABH Standards</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;