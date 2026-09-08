import React from 'react';
import { GraduationCap, MapPin } from 'lucide-react';
import { educationData } from '../data/portfolioData';

export default function Education() {
  return (
    <section id="education" className="section" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container">
        
        {/* Section Heading */}
        <div className="section-heading">
          <span className="section-label">Academic Background</span>
          <h2 className="section-title">Education</h2>
          <p className="section-description">
            Computer engineering qualifications, marks, and academic achievements.
          </p>
        </div>

        {/* Education Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '2.5rem' }}>
          {educationData.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'var(--color-surface-soft)',
                      color: 'var(--color-primary)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <GraduationCap size={20} />
                  </div>
                  <span className="tech-pill" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                    {item.period}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                  {item.degree}
                </h3>
                <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  {item.institution}
                </p>
                {item.university && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'monospace', marginBottom: '1rem' }}>
                    {item.university}
                  </p>
                )}
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      fontFamily: 'monospace',
                    }}
                  >
                    {item.grade}
                  </span>
                  {item.highlight && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      • {item.highlight}
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} />
                  {item.location.split(',')[0]}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
