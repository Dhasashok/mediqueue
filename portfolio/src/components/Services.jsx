import React from 'react';
import { Layers, Layout, Server, Database } from 'lucide-react';
import { servicesData } from '../data/portfolioData';

const iconMap = {
  'full-stack': Layers,
  'frontend': Layout,
  'backend': Server,
  'database': Database,
};

const modifierMap = {
  purple: 'expertise-card--purple',
  blue: 'expertise-card--blue',
  green: 'expertise-card--green',
  orange: 'expertise-card--orange',
};

export default function Services() {
  return (
    <section id="services" className="expertise section">
      <div className="container">
        
        {/* Section Heading */}
        <div className="section-heading expertise__heading">
          <span className="section-label">Services & Expertise</span>
          <h2 className="section-title">What I Can Build</h2>
          <p className="section-description">
            End-to-end software development capabilities tailored for production systems.
          </p>
        </div>

        {/* 4 Cards in Grid matching reference .expertise__grid */}
        <div className="expertise__grid" style={{ marginTop: '2.5rem' }}>
          {servicesData.map((service, index) => {
            const Icon = iconMap[service.id] || Layers;
            const modClass = modifierMap[service.color] || 'expertise-card--purple';

            return (
              <div
                key={service.id}
                className={`expertise-card ${modClass}`}
                style={{ gridColumn: 'span 3' }}
              >
                <div className="expertise-card__top">
                  <span className="expertise-card__number">0{index + 1}</span>
                  <div className="expertise-card__icon">
                    <Icon size={22} />
                  </div>
                </div>

                <div className="expertise-card__content">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>

                <div className="expertise-card__technologies">
                  {service.technologies.map((tech, tIdx) => (
                    <span key={tIdx} className="tech-pill">
                      {tech}
                    </span>
                  ))}
                </div>

                <span className="expertise-card__corner" />
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
