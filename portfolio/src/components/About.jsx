import React from 'react';
import { 
  GraduationCap, 
  MapPin, 
  Mail, 
  Phone, 
  FileText, 
  Sparkles,
  Award,
  Layers,
  Code2
} from 'lucide-react';
import { LinkedinIcon } from './Icons';
import { personalInfo } from '../data/portfolioData';

export default function About({ onOpenResume }) {
  return (
    <section id="about" className="section about">
      <div className="container">
        
        {/* Section Heading */}
        <div className="section-heading">
          <span className="section-label">Who I Am</span>
          <h2 className="section-title">About Me</h2>
          <p className="section-description">
            A glance into my academic background, technical focus, and passion for software development.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="about__grid" style={{ marginTop: '2.5rem' }}>
          
          {/* Left Profile Card */}
          <div className="about__profile-card card">
            <div className="about__profile-top">
              <div className="about__avatar">
                <span>{personalInfo.initials}</span>
              </div>
              <div className="about__identity">
                <h3>{personalInfo.name}</h3>
                <p>{personalInfo.title}</p>
                <div className="about__status">
                  <span className="about__status-dot" />
                  <span>Available for Hire</span>
                </div>
              </div>
            </div>

            <div className="about__details">
              <div className="about__detail">
                <div className="about__detail-icon">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <span className="about__detail-label">Education</span>
                  <strong>{personalInfo.degree} (SPPU)</strong>
                </div>
              </div>

              <div className="about__detail">
                <div className="about__detail-icon">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="about__detail-label">Location</span>
                  <strong>{personalInfo.location}</strong>
                </div>
              </div>

              <div className="about__detail">
                <div className="about__detail-icon">
                  <Mail size={16} />
                </div>
                <div>
                  <span className="about__detail-label">Email</span>
                  <a href={`mailto:${personalInfo.email}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <strong>{personalInfo.email}</strong>
                  </a>
                </div>
              </div>

              <div className="about__detail">
                <div className="about__detail-icon">
                  <Phone size={16} />
                </div>
                <div>
                  <span className="about__detail-label">Phone</span>
                  <a href={`tel:${personalInfo.phoneRaw}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <strong>{personalInfo.phone}</strong>
                  </a>
                </div>
              </div>

              <div className="about__detail">
                <div className="about__detail-icon">
                  <LinkedinIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="about__detail-label">LinkedIn</span>
                  <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--color-primary)' }}>
                    <strong>linkedin.com/in/ashok-dhas</strong>
                  </a>
                </div>
              </div>
            </div>

            {/* Resume Button linked directly to attached PDF and modal */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <a
                href={personalInfo.resumeUrl}
                download="Ashok_Rohidas_Dhas_Resume.pdf"
                className="btn btn-primary about__resume"
              >
                <FileText size={16} />
                <span>Download Resume</span>
              </a>

              <button
                onClick={onOpenResume}
                className="btn btn-secondary"
                style={{ minHeight: '46px', padding: '0.75rem 1rem' }}
                title="Preview Resume PDF"
              >
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Right Column: Bio and Highlights */}
          <div className="about__content">
            <div className="about__bio card">
              <span className="about__small-label">Background & Aspirations</span>
              <h3>
                Engineering Practical & <span>Scalable Software</span>
              </h3>
              <p>{personalInfo.aboutBio[0]}</p>
              <p>{personalInfo.aboutBio[1]}</p>
              <p>{personalInfo.aboutBio[2]}</p>
            </div>

            {/* Statistics / Learning Summary */}
            <div className="about__learning card">
              <div className="about__learning-heading">
                <div>
                  <span className="about__small-label">Academic & Industry</span>
                  <h3>Key Metrics</h3>
                </div>
                <div className="about__learning-icon">
                  <Award size={18} />
                </div>
              </div>

              <div className="about__learning-list">
                {personalInfo.stats.map((st, sIdx) => (
                  <div key={sIdx} className="about__learning-item">
                    <div className="about__learning-meta">
                      <span>{st.label} ({st.subtext})</span>
                      <strong>{st.value}</strong>
                    </div>
                    <div className="about__progress">
                      <span style={{ width: sIdx === 0 ? '85%' : sIdx === 1 ? '100%' : '90%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
