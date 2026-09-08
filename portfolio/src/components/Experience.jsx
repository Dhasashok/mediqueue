import React from 'react';
import { Briefcase, Calendar, MapPin } from 'lucide-react';
import { experienceData } from '../data/portfolioData';

export default function Experience() {
  return (
    <section id="experience" className="section experience">
      <div className="container">
        
        {/* Section Heading */}
        <div className="section-heading">
          <span className="section-label">Career Journey</span>
          <h2 className="section-title">Work Experience</h2>
          <p className="section-description">
            Practical full-stack and web development internships delivering user interfaces and backend tasks.
          </p>
        </div>

        {/* 2-Column Experience Layout */}
        <div className="experience__layout" style={{ marginTop: '2.5rem' }}>
          
          {/* Left Sticky Intro Card */}
          <div className="experience__intro card">
            <div className="experience__intro-icon">
              <Briefcase size={22} />
            </div>
            <span className="experience__intro-label">Career Path</span>
            <h3>Practical Industry Exposure</h3>
            <p>
              Gained hands-on experience in production web workflows, component design, DOM manipulation, and full-stack modules.
            </p>
            <div className="experience__line" />
            <span className="experience__note">2 Verified Internships Completed</span>
          </div>

          {/* Right Timeline List */}
          <div className="experience__timeline">
            {experienceData.map((item) => (
              <div key={item.id} className="experience-card card" style={{ marginBottom: '1.5rem' }}>
                <span className="experience-card__marker">
                  <span />
                </span>

                <div className="experience-card__header">
                  <div>
                    <span className="experience-card__type">{item.type}</span>
                    <h3>{item.role}</h3>
                    <p className="experience-card__company">{item.company}</p>
                  </div>
                  <span className="experience-card__current">Verified</span>
                </div>

                <div className="experience-card__meta">
                  <span>
                    <Calendar size={13} />
                    {item.period}
                  </span>
                  <span>
                    <MapPin size={13} />
                    {item.location}
                  </span>
                </div>

                <div className="experience-card__responsibilities">
                  <h4>Key Contributions</h4>
                  <ul>
                    {item.responsibilities.map((resp, rIdx) => (
                      <li key={rIdx}>{resp}</li>
                    ))}
                  </ul>
                </div>

                <div className="experience-card__technologies" style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {item.technologies.map((t, tIdx) => (
                    <span key={tIdx} className="tech-pill">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
