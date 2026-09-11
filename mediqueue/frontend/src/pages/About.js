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
  ArrowRight
} from 'lucide-react';
import './About.css';

const departments = [
  { name: 'Cardiology',     desc: 'Heart & vascular care',   icon: <Heart size={26} color="#ef4444" /> },
  { name: 'Neurology',      desc: 'Brain & nervous system',  icon: <Brain size={26} color="#8b5cf6" /> },
  { name: 'Orthopedics',    desc: 'Bones, joints & muscles', icon: <Activity size={26} color="#f59e0b" /> },
  { name: 'Pediatrics',     desc: "Children's health",       icon: <Baby size={26} color="#f97316" /> },
  { name: 'Dermatology',    desc: 'Skin care & treatment',   icon: <Pill size={26} color="#ec4899" /> },
  { name: 'Gynecology',     desc: "Women's health",          icon: <Heart size={26} color="#f43f5e" /> },
  { name: 'ENT',            desc: 'Ear, Nose & Throat',      icon: <Activity size={26} color="#06b6d4" /> },
  { name: 'Ophthalmology',  desc: 'Eye care & surgery',      icon: <Eye size={26} color="#6366f1" /> },
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
  <div className="about-page">

    {/* ── Hero ──────────────────────────────────────────── */}
    <section className="about-hero">
      <div className="container about-hero-inner">
        <div className="breadcrumb" style={{ marginBottom: 20 }}>
          <Link to="/" style={{ color: '#94a3b8' }}>Home</Link>
          <span style={{ color: '#64748b' }}>›</span>
          <span style={{ color: '#cbd5e1' }}>About</span>
        </div>
        <h1>About City General Hospital</h1>
        <p>NABH Accredited · 24/7 Emergency Care · 200+ Specialist Doctors · Pune, Maharashtra</p>

        {/* Pill Bar */}
        <div className="about-pill-bar">
          <span className="about-pill"><MapPin size={13} /> MG Road, Pune – 411001</span>
          <span className="about-pill"><Phone size={13} /> 020-1234-5678</span>
          <span className="about-pill"><Clock size={13} /> Mon–Sat: 8AM–8PM</span>
          <span className="about-pill emergency"><Zap size={13} /> Emergency: 24/7</span>
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
            <div className="vision-tag">
              <Target size={15} color="#0d9488" />
              <span>Our Vision</span>
            </div>
            <h3>India's Most Patient-Centric Hospital</h3>
            <p>To become India's most patient-centric hospital, where every patient receives timely, quality care with dignity and compassion.</p>

            <div className="divider"></div>

            <div className="accred-title">
              <Award size={18} color="#0d9488" />
              <span>Accreditations & Certifications</span>
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
          <Link to="/find-hospital" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>View All Departments & Book</span>
            <ArrowRight size={18} />
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
            <div className="contact-icon-box"><MapPin size={24} color="#0d9488" /></div>
            <h3>Address</h3>
            <p>MG Road, Pune – 411001<br />Maharashtra, India</p>
          </div>
          <div className="contact-card-new">
            <div className="contact-icon-box"><Phone size={24} color="#0d9488" /></div>
            <h3>Phone</h3>
            <p>General: 020-1234-5678<br />Emergency: 102 / 108</p>
          </div>
          <div className="contact-card-new">
            <div className="contact-icon-box"><Clock size={24} color="#0d9488" /></div>
            <h3>Working Hours</h3>
            <p>Mon–Sat: 8AM – 8PM<br />Emergency: 24/7</p>
          </div>
        </div>
      </div>
    </section>

  </div>
);

export default About;