import React from 'react';
import { 
  Code2, 
  Layout, 
  Server, 
  Database, 
  Wrench, 
  Cpu 
} from 'lucide-react';
import { skillsData } from '../data/portfolioData';

const categoryIcons = {
  LANGUAGES: Code2,
  FRONTEND: Layout,
  BACKEND: Server,
  DATABASE: Database,
  TOOLS: Wrench,
  CONCEPTS: Cpu,
};

const modifierMap = {
  purple: 'skill-card--purple',
  blue: 'skill-card--blue',
  green: 'skill-card--green',
  orange: 'skill-card--orange',
  pink: 'skill-card--pink',
  indigo: 'skill-card--indigo',
};

export default function Skills() {
  return (
    <section id="skills" className="section skills">
      <div className="container">
        
        {/* Section Heading */}
        <div className="section-heading">
          <span className="section-label">Technical Stack</span>
          <h2 className="section-title">Skills & Abilities</h2>
          <p className="section-description">
            Categorized technologies and tools I utilize for software engineering.
          </p>
        </div>

        {/* 3-Column Skills Grid matching reference .skills__grid */}
        <div className="skills__grid" style={{ marginTop: '2.5rem' }}>
          {skillsData.map((categoryItem, idx) => {
            const Icon = categoryIcons[categoryItem.category] || Code2;
            const modClass = modifierMap[categoryItem.accent] || 'skill-card--purple';

            return (
              <div key={categoryItem.category} className={`skill-card ${modClass}`}>
                <div className="skill-card__header">
                  <div className="skill-card__icon">
                    <Icon size={20} />
                  </div>
                  <span className="skill-card__index">0{idx + 1}</span>
                </div>

                <h3>{categoryItem.category}</h3>

                <div className="skill-card__list">
                  {categoryItem.skills.map((skill, sIdx) => (
                    <span key={sIdx} className="skill-card__skill">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
