import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Brain,
  Activity,
  Baby,
  Pill,
  Eye,
  MapPin,
  Phone,
  Clock,
  Zap,
  Target,
  Award,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import './About.css';

const departments = [
  { id: 1, name: 'Cardiology',     desc: 'Heart & vascular care',   icon: <Heart size={24} color="#ef4444" />, bg: '#fef2f2' },
  { id: 2, name: 'Neurology',      desc: 'Brain & nervous system',  icon: <Brain size={24} color="#8b5cf6" />, bg: '#f5f3ff' },
  { id: 3, name: 'Orthopedics',    desc: 'Bones, joints & muscles', icon: <Activity size={24} color="#f59e0b" />, bg: '#fffbeb' },
  { id: 4, name: 'Pediatrics',     desc: "Children's health",       icon: <Baby size={24} color="#f97316" />, bg: '#fff7ed' },
  { id: 5, name: 'Dermatology',    desc: 'Skin care & treatment',   icon: <Pill size={24} color="#ec4899" />, bg: '#fdf2f8' },
  { id: 6, name: 'Gynecology',     desc: "Women's health",          icon: <Heart size={24} color="#f43f5e" />, bg: '#fff1f2' },
  { id: 7, name: 'ENT',            desc: 'Ear, Nose & Throat',      icon: <Activity size={24} color="#06b6d4" />, bg: '#ecfeff' },
  { id: 8, name: 'Ophthalmology',  desc: 'Eye care & surgery',      icon: <Eye size={24} color="#6366f1" />, bg: '#eef2ff' },
];

const accreditations = [
  'NABH Accredited Tertiary Hospital',
  'ISO 9001:2015 Quality Certified',
  '24/7 Advanced Emergency & Trauma',
  'Real-time Digital Queue & QR Pass',
  'Encrypted Electronic Health Records',
  'Cashless Insurance & TPA Desk',
];

const About = () => (
  <div className="about-page">

    {/* ── Hero ──────────────────────────────────────────── */}
    <section className="about-hero">
      <div className="container about-hero-inner">
        <div className="breadcrumb" style={{ marginBottom: 16 }}>
          <Link to="/" style={{ color: '#94a3b8' }}>Home</Link>
          <span style={{ color: '#64748b', margin: '0 6px' }}>›</span>
          <span style={{ color: '#cbd5e1' }}>About</span>
        </div>
        <div className="about-hero-header">
          <div className="about-hero-text">
            <h1>About City General Hospital</h1>
            <p className="about-hero-sub">
              NABH Accredited · 24/7 Emergency Care · 200+ Specialist Doctors · Pune, Maharashtra
            </p>
          </div>
          <div className="about-hero-seal">
            <ShieldCheck size={28} color="#5eead4" />
            <span>NABH & ISO Certified</span>
          </div>
        </div>

        {/* Swipeable Pill Bar on Mobile, Wrapped on Desktop */}
        <div className="about-pill-bar">
          <span className="about-pill"><MapPin size={13} /> MG Road, Pune – 411001</span>
          <a href="tel:02012345678" className="about-pill"><Phone size={13} /> 020-1234-5678</a>
          <span className="about-pill"><Clock size={13} /> Mon–Sat: 8AM–8PM</span>
          <a href="tel:102" className="about-pill emergency"><Zap size={13} /> Emergency: 24/7</a>
          <span className="about-pill active">
            <span className="hero-badge-dot" style={{ display: 'inline-block', marginRight: 4 }}></span>
            Online Booking Active
          </span>
        </div>
      </div>
    </section>

    {/* ── Mission + Vision ──────────────────────────────── */}
    <section className="mission-section">
      <div className="container">
        <div className="mission-grid">

          {/* Left: Mission & Stats */}
          <div>
            <div className="mission-label">Our Mission</div>
            <h2>Healthcare with Heart, Powered by Technology</h2>
            <p>City General Hospital is dedicated to delivering world-class healthcare to the people of Pune. We combine cutting-edge medical technology with compassionate care to transform patient outcomes.</p>
            <p style={{ marginTop: 14 }}>Every patient deserves timely, quality care. Our smart queue system eliminates unnecessary waiting — giving you more time for what matters.</p>

            {/* Impact Stats */}
            <div className="mission-stats">
              <div className="m-stat">
                <span className="m-stat-val">50k+</span>
                <span className="m-stat-label">Patients</span>
              </div>
              <div className="m-stat">
                <span className="m-stat-val">200+</span>
                <span className="m-stat-label">Doctors</span>
              </div>
              <div className="m-stat">
                <span className="m-stat-val">12</span>
                <span className="m-stat-label">Depts</span>
              </div>
              <div className="m-stat">
                <span className="m-stat-val">24/7</span>
                <span className="m-stat-label">Emergency</span>
              </div>
            </div>
          </div>

          {/* Right: Vision + Accreditations */}
          <div className="vision-box">
            <div className="vision-tag">
              <Target size={15} color="#0d9488" />
              <span>Our Vision</span>
            </div>
            <h3>India's Most Patient-Centric Hospital</h3>
            <p>To become India's benchmark hospital for compassionate care and operational excellence, where technology empowers healing without delays.</p>

            <div className="divider" style={{ margin: '22px 0 16px', height: '1px', background: '#e2e8f0' }}></div>

            <div className="accred-title">
              <Award size={18} color="#0d9488" />
              <span>Accreditations & Standards</span>
            </div>
            <ul className="accred-list">
              {accreditations.map((a, i) => (
                <li key={i} className="accred-item">
                  <CheckCircle2 size={16} color="#0d9488" style={{ flexShrink: 0 }} />
                  <span>{a}</span>
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
          <p>12 specialized departments staffed by expert doctors and modern medical technology</p>
        </div>

        {/* Desktop 4-Col Grid, Mobile 1-Col Touch Cards */}
        <div className="dept-cards-grid">
          {departments.map((d, i) => (
            <Link key={i} to="/find-hospital" className="dept-card-mini">
              <div className="dept-card-icon" style={{ background: d.bg }}>
                {d.icon}
              </div>
              <div className="dept-card-body">
                <h3>{d.name}</h3>
                <p>{d.desc}</p>
              </div>
              <div className="dept-card-action">
                <span>Book</span>
                <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link to="/find-hospital" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
            <span>View All 12 Departments</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>

    {/* ── Contact Us ────────────────────────────────────── */}
    <section className="contact-section">
      <div className="container">
        <div className="section-title">
          <h2>Contact & Location</h2>
          <p>We're here for you around the clock with immediate medical assistance</p>
        </div>

        <div className="contact-grid-new">
          <div className="contact-card-new">
            <div className="contact-card-main">
              <div className="contact-icon-box"><MapPin size={24} color="#0d9488" /></div>
              <div className="contact-card-body">
                <h3>Hospital Address</h3>
                <p>MG Road, Pune – 411001<br />Maharashtra, India</p>
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=Pune"
              target="_blank"
              rel="noreferrer"
              className="contact-action-link"
            >
              Get Directions →
            </a>
          </div>

          <div className="contact-card-new">
            <div className="contact-card-main">
              <div className="contact-icon-box"><Phone size={24} color="#0d9488" /></div>
              <div className="contact-card-body">
                <h3>Helpline & Inquiries</h3>
                <p>General: 020-1234-5678<br />OPD Desk: Mon–Sat 8AM–8PM</p>
              </div>
            </div>
            <a href="tel:02012345678" className="contact-action-link">
              Call Helpline →
            </a>
          </div>

          <div className="contact-card-new emergency-card">
            <div className="contact-card-main">
              <div className="contact-icon-box emergency"><Zap size={24} color="#ef4444" /></div>
              <div className="contact-card-body">
                <h3>24/7 Emergency</h3>
                <p>Direct Casualty & Trauma Desk<br />Ambulance: 102 / 108</p>
              </div>
            </div>
            <a href="tel:102" className="contact-action-link emergency-btn">
              🚨 Call Emergency (102 / 108)
            </a>
          </div>
        </div>
      </div>
    </section>

  </div>
);

export default About;