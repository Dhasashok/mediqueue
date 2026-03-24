import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

const departments = [
  { name: 'Cardiology',     desc: 'Heart & vascular care',   icon: '❤️' },
  { name: 'Neurology',      desc: 'Brain & nervous system',  icon: '🧠' },
  { name: 'Orthopedics',    desc: 'Bones, joints & muscles', icon: '🦴' },
  { name: 'Pediatrics',     desc: "Children's health",       icon: '👶' },
  { name: 'Dermatology',    desc: 'Skin care & treatment',   icon: '💊' },
  { name: 'Gynecology',     desc: "Women's health",          icon: '🌸' },
  { name: 'ENT',            desc: 'Ear, Nose & Throat',      icon: '👂' },
  { name: 'Ophthalmology',  desc: 'Eye care & surgery',      icon: '👁️' },
];

const accreditations = [
  'NABH Accredited Hospital',
  'ISO 9001:2015 Certified',
  '24/7 Emergency Services',
  'Online Appointment Booking',
  'Digital Health Records',
  'Cashless Insurance Facility',
];

const About = () => (
  <div>

    {/* ── Hero ──────────────────────────────────────────── */}
    <section className="about-hero">
      <div className="container about-hero-inner">
        <div className="breadcrumb" style={{ marginBottom: 20 }}>
          <Link to="/" style={{ color: '#94a3b8' }}>Home</Link>
          <span style={{ color: '#64748b' }}>›</span>
          <span style={{ color: '#cbd5e1' }}>About</span>
        </div>
        <h1>About City General Hospital</h1>
        <p>NABH Accredited · 24/7 Emergency · 200+ Doctors · Pune, Maharashtra</p>

        {/* Pill Bar */}
        <div className="about-pill-bar">
          <span className="about-pill">📍 MG Road, Pune – 411001</span>
          <span className="about-pill">📞 020-1234-5678</span>
          <span className="about-pill">⏰ Mon–Sat: 8AM–8PM</span>
          <span className="about-pill emergency">🚨 Emergency: 24/7</span>
          <span className="about-pill active">🟢 Online Booking Active</span>
        </div>
      </div>
    </section>

    {/* ── Mission + Vision ──────────────────────────────── */}
    <section className="mission-section">
      <div className="container">
        <div className="mission-grid">

          {/* Left: Mission */}
          <div>
            <div className="mission-label">Our Mission</div>
            <h2>Healthcare with Heart, Powered by Technology</h2>
            <p>City General Hospital is dedicated to delivering world-class healthcare to the people of Pune. We combine cutting-edge medical technology with compassionate care to transform patient outcomes.</p>
            <p style={{ marginTop: 16 }}>Every patient deserves timely, quality care. Our smart queue system eliminates unnecessary waiting — giving you more time for what matters.</p>

            {/* Stats */}
            <div className="mission-stats">
              <div className="m-stat"><span className="m-stat-val">50k+</span><span className="m-stat-label">Patients</span></div>
              <div className="m-stat"><span className="m-stat-val">200+</span><span className="m-stat-label">Doctors</span></div>
              <div className="m-stat"><span className="m-stat-val">12</span><span className="m-stat-label">Depts</span></div>
              <div className="m-stat"><span className="m-stat-val">24/7</span><span className="m-stat-label">Emergency</span></div>
            </div>
          </div>

          {/* Right: Vision + Accreditations */}
          <div className="vision-box">
            <div className="vision-tag">🎯 Our Vision</div>
            <h3>India's Most Patient-Centric Hospital</h3>
            <p>To become India's most patient-centric hospital, where every patient receives timely, quality care with dignity and compassion.</p>

            <div className="divider"></div>

            <div className="accred-title">🏆 Accreditations & Certifications</div>
            <ul className="accred-list">
              {accreditations.map((a, i) => (
                <li key={i} className="accred-item">
                  <span className="accred-check">✓</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>

    {/* ── Departments ───────────────────────────────────── */}
    <section className="depts-section">
      <div className="container">
        <div className="section-title">
          <h2>Our Departments</h2>
          <p>12 specialized departments staffed by expert doctors and modern equipment</p>
        </div>
        <div className="dept-cards-grid">
          {departments.map((d, i) => (
            <div key={i} className="dept-card-mini">
              <div className="dept-card-icon">{d.icon}</div>
              <h3>{d.name}</h3>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/find-hospital" className="btn btn-primary btn-lg">
            View All Departments & Book →
          </Link>
        </div>
      </div>
    </section>

    {/* ── Contact ───────────────────────────────────────── */}
    <section className="contact-section">
      <div className="container">
        <div className="section-title">
          <h2>Contact Us</h2>
          <p>We're here for you around the clock</p>
        </div>
        <div className="contact-grid-new">
          <div className="contact-card-new">
            <div className="contact-icon-box">📍</div>
            <h3>Address</h3>
            <p>MG Road, Pune – 411001<br />Maharashtra, India</p>
          </div>
          <div className="contact-card-new">
            <div className="contact-icon-box">📞</div>
            <h3>Phone</h3>
            <p>General: 020-1234-5678<br />Emergency: 102 / 108</p>
          </div>
          <div className="contact-card-new">
            <div className="contact-icon-box">⏰</div>
            <h3>Working Hours</h3>
            <p>Mon–Sat: 8AM – 8PM<br />Emergency: 24/7</p>
          </div>
        </div>
      </div>
    </section>

  </div>
);

export default About;