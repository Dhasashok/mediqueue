import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  UserCheck,
  Heart,
  Zap,
  Search,
  CalendarCheck,
  QrCode,
  ArrowRight,
  Clock,
  Cpu,
  Radio,
  Lock,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  Activity
} from 'lucide-react';
import './Home.css';

const stats = [
  { value: '12+',  label: 'Departments',      icon: <Building2 size={24} color="#5eead4" /> },
  { value: '200+', label: 'Expert Doctors',    icon: <UserCheck size={24} color="#38bdf8" /> },
  { value: '50k+', label: 'Patients Served',   icon: <Heart size={24} color="#f472b6" /> },
  { value: '70%',  label: 'Wait Time Reduced', icon: <Zap size={24} color="#facc15" /> },
];

const steps = [
  {
    num: '01',
    icon: <CalendarCheck size={28} color="#0d9488" />,
    title: 'Book Online',
    desc: 'Select your department, doctor, date & time slot from home in under 2 minutes.',
    color: '#0d9488',
    bg: 'linear-gradient(135deg, #ccfbf1, #e0f2fe)',
  },
  {
    num: '02',
    icon: <QrCode size={28} color="#8b5cf6" />,
    title: 'Get QR Pass',
    desc: 'Receive an instant QR code as your digital entry pass. No printout needed.',
    color: '#8b5cf6',
    bg: 'linear-gradient(135deg, #ede9fe, #fce7f3)',
  },
  {
    num: '03',
    icon: <Zap size={28} color="#f59e0b" />,
    title: 'Skip the Line',
    desc: 'Arrive at hospital, scan QR at reception and join the queue seamlessly.',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #fef3c7, #ffedd5)',
  },
];

const features = [
  {
    icon: <Cpu size={26} />,
    title: 'ML-Predicted Wait Times',
    desc: 'Random Forest model predicts wait times accurate to ±5 minutes.',
    tag: 'AI Powered',
    color: '#8b5cf6',
    tagBg: '#ede9fe',
    tagColor: '#6d28d9',
  },
  {
    icon: <Radio size={26} />,
    title: 'Real-Time Queue Tracking',
    desc: 'Watch your position update live — know exactly who\'s ahead of you.',
    tag: 'Real-Time',
    color: '#0d9488',
    tagBg: '#ccfbf1',
    tagColor: '#0f766e',
  },
  {
    icon: <Lock size={26} />,
    title: 'QR Code Entry Pass',
    desc: 'Secure QR code per booking. Scan at reception for instant queue entry.',
    tag: 'Secure',
    color: '#2563eb',
    tagBg: '#dbeafe',
    tagColor: '#1d4ed8',
  },
  {
    icon: <Activity size={26} />,
    title: 'Smart Department Queuing',
    desc: 'Separate queues per department and doctor. Zero cross-department confusion.',
    tag: 'Smart System',
    color: '#f59e0b',
    tagBg: '#fef3c7',
    tagColor: '#b45309',
  },
];

const Home = () => {
  const countersRef = useRef([]);

  // Animate counters on mount
  useEffect(() => {
    const targets = [12, 200, 50000, 70];
    const suffixes = ['+', '+', 'k+', '%'];
    countersRef.current.forEach((el, i) => {
      if (!el) return;
      let start = 0;
      const end = targets[i];
      const duration = 1800;
      const step = end / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= end) { start = end; clearInterval(timer); }
        const display = i === 2 ? Math.floor(start / 1000) : Math.floor(start);
        el.textContent = display + suffixes[i];
      }, 16);
    });
  }, []);

  return (
    <div className="home">

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section className="hero-v2">
        {/* Animated background blobs */}
        <div className="hero-blob hero-blob-1"></div>
        <div className="hero-blob hero-blob-2"></div>
        <div className="hero-blob hero-blob-3"></div>

        <div className="container hero-v2-inner">
          <div className="hero-v2-text">
            {/* Hospital badge */}
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              City General Hospital, Pune
            </div>

            <h1 className="hero-v2-title">
              Skip the Wait,<br />
              <span className="hero-gradient-text">Not the Care</span>
            </h1>

            <p className="hero-v2-desc">
              Book hospital appointments online, get your QR token instantly, and join the queue —
              all from your phone. Our AI predicts real-time wait times.
            </p>

            {/* Mobile 4-Up Quick Actions Grid */}
            <div className="quick-actions-mobile">
              <Link to="/find-hospital" className="qa-item">
                <div className="qa-icon-circle qa-teal"><CalendarCheck size={20} /></div>
                <span>Book Slot</span>
              </Link>
              <Link to="/patient/dashboard" className="qa-item">
                <div className="qa-icon-circle qa-blue"><QrCode size={20} /></div>
                <span>My Token</span>
              </Link>
              <Link to="/find-hospital" className="qa-item">
                <div className="qa-icon-circle qa-purple"><Clock size={20} /></div>
                <span>Wait Times</span>
              </Link>
              <a href="tel:102" className="qa-item">
                <div className="qa-icon-circle qa-red"><PhoneCall size={20} /></div>
                <span>Emergency</span>
              </a>
            </div>

            {/* Hero Buttons */}
            <div className="hero-v2-btns">
              <Link to="/find-hospital" className="btn-hero-primary">
                <Search size={18} /> Find Hospital & Book
              </Link>
              <Link to="/about" className="btn-hero-outline">
                Learn More <ArrowRight size={16} />
              </Link>
            </div>

            {/* Trust badges */}
            <div className="hero-trust">
              <span className="trust-item"><CheckCircle2 size={15} color="#22c55e" /> Free to use</span>
              <span className="trust-item"><CheckCircle2 size={15} color="#22c55e" /> Instant QR</span>
              <span className="trust-item"><CheckCircle2 size={15} color="#22c55e" /> No waiting</span>
            </div>
          </div>

          {/* Right side card (Desktop) */}
          <div className="hero-v2-card-wrap">
            <div className="hero-v2-card">
              <div className="hcard-header">
                <div className="hcard-icon"><Building2 size={24} color="#0d9488" /></div>
                <div>
                  <p className="hcard-title">City General Hospital</p>
                  <p className="hcard-sub">Pune, Maharashtra</p>
                </div>
              </div>

              <div className="hcard-stats">
                <div className="hcard-stat hcard-teal">
                  <span className="hcard-stat-val">2x</span>
                  <span className="hcard-stat-label">Faster Service</span>
                </div>
                <div className="hcard-stat hcard-navy">
                  <span className="hcard-stat-val">85%</span>
                  <span className="hcard-stat-label">Less Waiting</span>
                </div>
                <div className="hcard-stat hcard-green">
                  <span className="hcard-stat-val">24/7</span>
                  <span className="hcard-stat-label">Always Open</span>
                </div>
              </div>

              <div className="hcard-queue">
                <div className="hcard-queue-label">Queue Status</div>
                <div className="hcard-queue-bars">
                  <div className="hcard-dept">
                    <span>Cardiology</span>
                    <div className="hbar-wrap"><div className="hbar" style={{width:'40%', background:'#0d9488'}}></div></div>
                    <span className="hbar-val">4 waiting</span>
                  </div>
                  <div className="hcard-dept">
                    <span>Orthopedics</span>
                    <div className="hbar-wrap"><div className="hbar" style={{width:'70%', background:'#f59e0b'}}></div></div>
                    <span className="hbar-val">7 waiting</span>
                  </div>
                  <div className="hcard-dept">
                    <span>Pediatrics</span>
                    <div className="hbar-wrap"><div className="hbar" style={{width:'25%', background:'#22c55e'}}></div></div>
                    <span className="hbar-val">2 waiting</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="hero-stats-bar">
          <div className="container hero-stats-inner">
            {stats.map((s, i) => (
              <div key={i} className="hero-stat-item">
                <span className="hero-stat-icon">{s.icon}</span>
                <span
                  className="hero-stat-val"
                  ref={el => countersRef.current[i] = el}
                >
                  {s.value}
                </span>
                <span className="hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════ */}
      <section className="how-section">
        <div className="container">
          <div className="section-title">
            <span className="section-chip">Simple Process</span>
            <h2>How MediQueue Works</h2>
            <p>Three steps to a smarter, faster hospital visit</p>
          </div>

          <div className="steps-row horizontal-scroll-mobile">
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
          FEATURES — WHY CHOOSE
      ════════════════════════════════════════ */}
      <section className="features-v2">
        <div className="container">
          <div className="section-title">
            <span className="section-chip">Why MediQueue</span>
            <h2>Built for Smarter Healthcare</h2>
            <p>Cutting-edge technology meets compassionate care</p>
          </div>

          <div className="features-grid-v2 horizontal-scroll-mobile">
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
          CTA
      ════════════════════════════════════════ */}
      <section className="cta-v2">
        <div className="cta-v2-glow cta-glow-1"></div>
        <div className="cta-v2-glow cta-glow-2"></div>
        <div className="container cta-v2-inner">
          <div className="cta-v2-badge"><Sparkles size={16} color="#facc15" /> Get Started Today — It's Free</div>
          <h2>Ready to Skip the Wait?</h2>
          <p>Join 50,000+ patients who've experienced smarter healthcare at City General Hospital.</p>
          <div className="cta-v2-btns">
            <Link to="/register" className="btn-hero-primary">
              Create Free Account <ArrowRight size={18} />
            </Link>
            <Link to="/find-hospital" className="btn-hero-outline" style={{borderColor:'rgba(255,255,255,0.3)', color:'white'}}>
              Browse Departments
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;