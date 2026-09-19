import React from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  QrCode,
  ArrowRight,
  Cpu,
  Radio,
  CheckCircle2,
  Zap,
  Activity,
  Sparkles,
  PhoneCall,
  Stethoscope,
  Heart,
  Brain,
  Baby,
  Bone,
  Eye,
  ShieldCheck,
  Clock,
  ChevronRight
} from 'lucide-react';
import './Home.css';

const departmentsList = [
  { name: 'Cardiology', icon: Heart, count: '6 Doctors', color: '#ef4444', bg: '#fef2f2' },
  { name: 'Neurology', icon: Brain, count: '4 Doctors', color: '#8b5cf6', bg: '#f5f3ff' },
  { name: 'General Medicine', icon: Stethoscope, count: '10 Doctors', color: '#0d9488', bg: '#f0fdfa' },
  { name: 'Pediatrics', icon: Baby, count: '5 Doctors', color: '#f59e0b', bg: '#fffbeb' },
  { name: 'Orthopedics', icon: Bone, count: '4 Doctors', color: '#3b82f6', bg: '#eff6ff' },
  { name: 'Ophthalmology', icon: Eye, count: '3 Doctors', color: '#06b6d4', bg: '#ecfeff' },
];

const steps = [
  {
    num: '01',
    icon: <CalendarCheck size={26} color="#0d9488" />,
    title: 'Select Doctor & Slot',
    desc: 'Choose your specialty, doctor, date, and 2-hour OPD slot from home in under 60 seconds.',
    color: '#0d9488',
    bg: '#f0fdfa',
  },
  {
    num: '02',
    icon: <QrCode size={26} color="#0284c7" />,
    title: 'Instant QR Entry Pass',
    desc: 'Your token number, estimated turn time, and offline-ready QR pass are generated instantly.',
    color: '#0284c7',
    bg: '#f0f9ff',
  },
  {
    num: '03',
    icon: <Zap size={26} color="#10b981" />,
    title: 'Walk In on Your Turn',
    desc: 'Watch the live queue tracker from your phone. Scan at reception and walk right into consultation.',
    color: '#10b981',
    bg: '#ecfdf5',
  },
];

const features = [
  {
    icon: <Cpu size={24} />,
    title: 'Self-Learning Wait Times',
    desc: 'Dynamic estimation calibrated against real doctor consultation durations per department.',
    tag: 'ML-Powered',
    color: '#8b5cf6',
    tagBg: '#ede9fe',
    tagColor: '#6d28d9',
  },
  {
    icon: <Radio size={24} />,
    title: 'Real-Time Queue Telemetry',
    desc: 'Monitor live queue movement, patients ahead, and consultation status directly from your phone.',
    tag: 'Live Sync',
    color: '#0d9488',
    tagBg: '#ccfbf1',
    tagColor: '#0f766e',
  },
  {
    icon: <ShieldCheck size={24} />,
    title: 'Encrypted Digital Records',
    desc: 'Instant access to doctor prescriptions, appointment history, and entry passes in one place.',
    tag: 'Secure & Private',
    color: '#0284c7',
    tagBg: '#e0f2fe',
    tagColor: '#0369a1',
  },
  {
    icon: <Activity size={24} />,
    title: 'Congestion Prevention',
    desc: 'Strict 2-hour capacity distribution ensures waiting areas remain relaxed and infection-safe.',
    tag: 'Zero Crowding',
    color: '#f59e0b',
    tagBg: '#fef3c7',
    tagColor: '#b45309',
  },
];

const Home = () => {
  return (
    <div className="home medical-home">

      {/* ════════════════════════════════════════
          1. HERO & CLINICAL QUICK ACCESS
      ════════════════════════════════════════ */}
      <section className="med-hero-section">
        <div className="med-hero-ambient med-ambient-1"></div>
        <div className="med-hero-ambient med-ambient-2"></div>

        <div className="container med-hero-container">
          
          {/* Left Column: Heading, Pulse & Actions */}
          <div className="med-hero-content">
            
            {/* Live Hospital Pulse Banner */}
            <div className="med-hospital-pulse">
              <span className="med-pulse-indicator">
                <span className="med-pulse-dot"></span>
                <span className="med-pulse-ring"></span>
              </span>
              <span className="med-hospital-name">City General Hospital, Pune</span>
              <span className="med-pulse-sep">•</span>
              <span className="med-pulse-status">OPD Active (~14m avg wait)</span>
            </div>

            <h1 className="med-hero-title">
              Smarter Hospital Queues,{' '}
              <span className="med-title-highlight">Zero Waiting Rooms.</span>
            </h1>

            <p className="med-hero-subtitle">
              Book certified specialists online, track your live token from home, and walk in right as the doctor is ready for you.
            </p>

            {/* Desktop Hero Primary Action Bar */}
            <div className="med-hero-cta-group">
              <Link to="/find-hospital" className="med-btn-primary">
                <CalendarCheck size={18} />
                <span>Book OPD Appointment</span>
              </Link>
              <Link to="/login" className="med-btn-secondary">
                <Radio size={17} color="#0d9488" />
                <span>Track Live Queue</span>
              </Link>
            </div>

            {/* Trust highlights */}
            <div className="med-hero-trust-bar">
              <div className="med-trust-pill">
                <CheckCircle2 size={15} color="#10b981" />
                <span>100% Free Service</span>
              </div>
              <div className="med-trust-pill">
                <CheckCircle2 size={15} color="#10b981" />
                <span>Instant QR Token</span>
              </div>
              <div className="med-trust-pill">
                <CheckCircle2 size={15} color="#10b981" />
                <span>Turn Alert Chime</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Animated Live Queue Simulator */}
          <div className="med-hero-visual">
            <div className="med-live-card">
              <div className="med-card-glow"></div>
              
              <div className="med-card-header">
                <div className="med-card-doc-info">
                  <div className="med-doc-avatar">
                    <Stethoscope size={20} color="#0d9488" />
                  </div>
                  <div>
                    <h4 className="med-doc-name">Dr. Vikram Singh</h4>
                    <p className="med-doc-dept">Neurology Outpatient (OPD)</p>
                  </div>
                </div>
                <span className="med-live-tag">
                  <span className="live-dot green"></span> Live OPD
                </span>
              </div>

              {/* Simulated Token Badge */}
              <div className="med-token-display">
                <div className="med-token-top">
                  <span className="med-token-label">YOUR APPOINTMENT TOKEN</span>
                  <span className="med-token-slot">10:00 - 12:00</span>
                </div>
                <div className="med-token-number">
                  <span>MQ-014194-4992</span>
                  <QrCode size={24} color="#0d9488" />
                </div>
              </div>

              {/* Queue Progress Simulation */}
              <div className="med-queue-progress-box">
                <div className="med-qp-row">
                  <div className="med-qp-stat">
                    <span className="med-qp-num">#2</span>
                    <span className="med-qp-text">Queue Position</span>
                  </div>
                  <div className="med-qp-divider"></div>
                  <div className="med-qp-stat">
                    <span className="med-qp-num">1</span>
                    <span className="med-qp-text">Patient Ahead</span>
                  </div>
                  <div className="med-qp-divider"></div>
                  <div className="med-qp-stat">
                    <span className="med-qp-num highlight-teal">~14m</span>
                    <span className="med-qp-text">Est. Wait</span>
                  </div>
                </div>

                <div className="med-progress-track">
                  <div className="med-progress-fill" style={{ width: '75%' }}></div>
                </div>

                <div className="med-consultation-banner">
                  <span className="med-live-pulse-small"></span>
                  <span>Doctor currently in consultation with <strong>Patient #1</strong></span>
                </div>
              </div>

              <div className="med-card-footer">
                <span className="med-turn-alert-note">
                  <Clock size={13} /> You will receive a turn alert when Position #1 finishes
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ════════════════════════════════════════
            2. PATIENT 4-UP QUICK ACCESS MATRIX (MOBILE FIRST)
        ════════════════════════════════════════ */}
        <div className="container med-quick-actions-container">
          <div className="med-quick-grid">
            <Link to="/find-hospital" className="med-quick-card action-book">
              <div className="mq-icon-wrap icon-teal">
                <CalendarCheck size={24} />
              </div>
              <div className="mq-info">
                <h3>Book OPD Specialist</h3>
                <p>Reserve slots across 12 departments</p>
              </div>
              <ChevronRight size={18} className="mq-arrow" />
            </Link>

            <Link to="/login" className="med-quick-card action-queue">
              <div className="mq-icon-wrap icon-cyan">
                <Radio size={24} />
              </div>
              <div className="mq-info">
                <h3>Live Queue Status</h3>
                <p>Check wait time & patients ahead</p>
              </div>
              <ChevronRight size={18} className="mq-arrow" />
            </Link>

            <Link to="/login" className="med-quick-card action-token">
              <div className="mq-icon-wrap icon-purple">
                <QrCode size={24} />
              </div>
              <div className="mq-info">
                <h3>My Digital QR Pass</h3>
                <p>One-tap contactless check-in</p>
              </div>
              <ChevronRight size={18} className="mq-arrow" />
            </Link>

            <a href="tel:108" className="med-quick-card action-emergency">
              <div className="mq-icon-wrap icon-red">
                <PhoneCall size={24} />
              </div>
              <div className="mq-info">
                <div className="mq-title-row">
                  <h3>24/7 Emergency / SOS</h3>
                  <span className="mq-badge-red">Urgent</span>
                </div>
                <p>Direct casualty & ambulance line</p>
              </div>
              <ChevronRight size={18} className="mq-arrow" />
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          3. CLINICAL SPECIALTIES DIRECTORY
      ════════════════════════════════════════ */}
      <section className="med-specialties-section">
        <div className="container">
          <div className="med-section-header">
            <span className="med-chip">OPD Specialties</span>
            <h2>Browse Departments & Find Specialists</h2>
            <p>Select your department for instant doctor availability and capacity slots</p>
          </div>

          <div className="med-specialties-grid">
            {departmentsList.map((d, i) => {
              const IconComp = d.icon;
              return (
                <Link key={i} to={`/find-hospital?dept=${encodeURIComponent(d.name)}`} className="med-spec-card">
                  <div className="med-spec-icon-box" style={{ background: d.bg, color: d.color }}>
                    <IconComp size={24} />
                  </div>
                  <h3 className="med-spec-name">{d.name}</h3>
                  <span className="med-spec-count">{d.count}</span>
                </Link>
              );
            })}
          </div>

          <div className="med-spec-view-all">
            <Link to="/find-hospital" className="btn-view-all-depts">
              <span>View All 12 Hospital Departments</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          4. 3-STEP ANIMATED PROCESS (HOW IT WORKS)
      ════════════════════════════════════════ */}
      <section className="how-section">
        <div className="container">
          <div className="section-title">
            <span className="section-chip">Simple Process</span>
            <h2>How MediQueue Works</h2>
            <p>Three effortless steps to a smarter, stress-free hospital consultation</p>
          </div>

          <div className="steps-row">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className="step-card-v2">
                  <div className="step-num-badge" style={{ color: s.color }}>{s.num}</div>
                  <div className="step-icon-v2" style={{ background: s.bg }}>
                    {s.icon}
                  </div>
                  <h3 style={{ color: s.color }}>{s.title}</h3>
                  <p>{s.desc}</p>
                  <div className="step-line" style={{ background: s.color }}></div>
                </div>
                {i < steps.length - 1 && (
                  <div className="step-arrow"><ArrowRight size={22} /></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          5. FEATURES — WHY CHOOSE
      ════════════════════════════════════════ */}
      <section className="features-v2">
        <div className="container">
          <div className="section-title">
            <span className="section-chip">Why MediQueue</span>
            <h2>Engineered for Modern Clinical Care</h2>
            <p>Smart queue intelligence eliminating delays for patients and clinical staff</p>
          </div>

          <div className="features-grid-v2">
            {features.map((f, i) => (
              <div key={i} className="feature-card-v2">
                <div className="fc-top">
                  <div className="fc-icon" style={{ background: 'linear-gradient(135deg,#ccfbf1,#e0f2fe)', color: f.color }}>
                    {f.icon}
                  </div>
                  <span className="fc-tag" style={{ background: f.tagBg, color: f.tagColor }}>
                    {f.tag}
                  </span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="fc-bar" style={{ background: f.color }}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          6. HOSPITAL STATS & VERIFIED IMPACT
      ════════════════════════════════════════ */}
      <section className="med-impact-section">
        <div className="container">
          <div className="med-impact-grid">
            <div className="med-impact-box">
              <span className="med-impact-val">2x</span>
              <span className="med-impact-title">Faster OPD Service</span>
              <p className="med-impact-desc">Compared to legacy paper token queues</p>
            </div>
            <div className="med-impact-box">
              <span className="med-impact-val">85%</span>
              <span className="med-impact-title">Less Waiting Room Crowding</span>
              <p className="med-impact-desc">Infection-safe, relaxed waiting</p>
            </div>
            <div className="med-impact-box">
              <span className="med-impact-val">12</span>
              <span className="med-impact-title">Clinical Departments</span>
              <p className="med-impact-desc">Covering 100% outpatient services</p>
            </div>
            <div className="med-impact-box">
              <span className="med-impact-val">24/7</span>
              <span className="med-impact-title">Emergency Readiness</span>
              <p className="med-impact-desc">Direct casualty admission pipeline</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          7. BOTTOM CTA
      ════════════════════════════════════════ */}
      <section className="cta-v2">
        <div className="cta-v2-glow cta-glow-1"></div>
        <div className="cta-v2-glow cta-glow-2"></div>
        <div className="container cta-v2-inner">
          <div className="cta-v2-badge"><Sparkles size={16} color="#facc15" /> Instant & Contactless Service</div>
          <h2>Ready to Skip the Waiting Room?</h2>
          <p>Join thousands of patients who book and track outpatient appointments online at City General Hospital.</p>
          <div className="cta-v2-btns">
            <Link to="/register" className="btn-hero-primary">
              Create Patient Account <ArrowRight size={18} />
            </Link>
            <Link to="/find-hospital" className="btn-hero-outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
              Browse Available Doctors
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;