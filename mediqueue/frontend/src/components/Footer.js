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
            Smart hospital queue management & ML wait predictions.
          </p>
          <div className="footer-badges">
            <span className="footer-badge"><Award size={12} /> NABH Accredited</span>
            <span className="footer-badge"><ShieldCheck size={12} /> ISO Certified</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-col-v2">
          <h4 className="footer-col-title">Navigation</h4>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/find-hospital">Find Hospital</Link>
            <Link to="/about">About Hospital</Link>
            <Link to="/login">Sign In / Register</Link>
          </div>
        </div>

        {/* Hospital Contact */}
        <div className="footer-col-v2">
          <h4 className="footer-col-title">Hospital Info</h4>
          <div className="footer-info-list">
            <div className="footer-info-item">
              <MapPin size={14} className="fi-icon" />
              <span>MG Road, Pune – 411001</span>
            </div>
            <div className="footer-info-item">
              <Phone size={14} className="fi-icon" />
              <span>020-1234-5678</span>
            </div>
            <div className="footer-info-item">
              <Clock size={14} className="fi-icon" />
              <span>Mon–Sat: 8AM – 8PM</span>
            </div>
          </div>
        </div>

        {/* Emergency Hotline */}
        <div className="footer-col-v2 footer-emergency-col">
          <h4 className="footer-col-title">24/7 Emergency</h4>
          <a href="tel:102" className="footer-emergency-pill">
            <div className="fep-icon">
              <Zap size={16} />
            </div>
            <div className="fep-text">
              <span className="fep-label">Immediate Ambulance</span>
              <strong className="fep-number">102 / 108</strong>
            </div>
          </a>
          <p className="fep-note">Available 24/7 round the clock</p>
        </div>

      </div>
    </div>

    {/* Bottom bar */}
    <div className="footer-bottom-v2">
      <div className="container footer-bottom-inner">
        <p>© 2026 MediQueue · City General Hospital, Pune</p>
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