import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import { certificationsData } from '../data/portfolioData';

export default function Certifications() {
  return (
    <section id="certifications" className="section" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container">
        
        {/* Section Heading */}
        <div className="section-heading">
          <span className="section-label">Credentials</span>
          <h2 className="section-title">Certifications</h2>
          <p className="section-description">
            Verified course completions and technical specializations.
          </p>
        </div>

        {/* Certifications Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '2.5rem' }}>
          {certificationsData.map((cert) => (
            <div
              key={cert.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
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
                    <Award size={20} />
                  </div>
                  <span className="tech-pill" style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>
                    {cert.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                  {cert.title}
                </h3>
                <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  {cert.issuer}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                  {cert.skills.map((skill, sIdx) => (
                    <span key={sIdx} className="tech-pill" style={{ fontSize: '0.68rem' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
                  <ShieldCheck size={14} />
                  Verified
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontWeight: '600' }}>
                  {cert.year}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
