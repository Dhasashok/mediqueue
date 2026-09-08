import React, { useState } from 'react';
import { ExternalLink, Layers, ArrowUpRight, Zap, Eye } from 'lucide-react';
import { GithubIcon } from './Icons';
import { projectsData } from '../data/portfolioData';
import ProjectModal from './ProjectModal';

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <section id="projects" className="section projects">
      <div className="container">
        
        {/* Section Heading */}
        <div className="section-heading">
          <span className="section-label">Featured Work</span>
          <h2 className="section-title">Projects</h2>
          <p className="section-description">
            Production-oriented full-stack web applications featuring secure authentication, real-time sync, and relational databases.
          </p>
        </div>

        {/* Project Cards List matching reference .projects__list */}
        <div className="projects__list" style={{ marginTop: '2.5rem' }}>
          {projectsData.map((project) => {
            const isFeatured = project.featured;

            return (
              <div key={project.id} className="project-card">
                
                {/* Visual Header Mockup */}
                <div className="project-card__image-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
                  
                  {/* Stylized App Window */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '650px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '1rem',
                      padding: '1.25rem',
                      boxShadow: 'var(--shadow-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444' }} />
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b' }} />
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                        {project.id === 'royal-orchid' ? 'royal-orchid-pg.vercel.app' : 'mediqueue-opd.app'}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                        {isFeatured ? '★ PRIMARY FLAGSHIP' : 'HEALTHCARE'}
                      </span>
                    </div>

                    {project.image ? (
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '0.6rem', height: '180px' }}>
                        <img
                          src={project.image}
                          alt={project.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block', transition: 'transform 0.4s ease' }}
                          className="project-preview-img"
                        />
                        <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                          <span>Live App Preview</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                        {project.stats.slice(0, 3).map((st, sIdx) => (
                          <div key={sIdx} style={{ background: 'var(--color-surface-soft)', border: '1px solid var(--color-border-light)', borderRadius: '0.6rem', padding: '0.6rem', textAlign: 'center' }}>
                            <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text)' }}>{st.value}</strong>
                            <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{st.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Image Overlay */}
                  <div className="project-card__image-overlay">
                    <span>
                      <Layers size={13} />
                      {project.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="project-card__content">
                  <div className="project-card__header">
                    <div>
                      <span className="project-card__category">{project.category}</span>
                      <h3>{project.title}</h3>
                    </div>

                    <button
                      onClick={() => setSelectedProject(project)}
                      className="project-card__external-icon"
                      aria-label="View Project Details"
                      title="View Details"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>

                  <p className="project-card__description">
                    {project.description}
                  </p>

                  <div className="project-card__features">
                    <h4>Key Features & Achievements</h4>
                    <ul>
                      {(project.achievements ? project.achievements.slice(0, 4) : project.features.slice(0, 4)).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="project-card__bottom">
                    <div className="project-card__technologies">
                      {project.technologies.map((tech, tIdx) => (
                        <span key={tIdx} className="tech-pill">
                          {tech}
                        </span>
                      ))}
                    </div>

                    <div className="project-card__links">
                      <button
                        onClick={() => setSelectedProject(project)}
                        className="project-card__link"
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </button>

                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-card__link project-card__link--live"
                        >
                          <ExternalLink size={13} />
                          <span>Live Demo</span>
                        </a>
                      )}

                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-card__link"
                          aria-label="GitHub Repository"
                        >
                          <GithubIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Project Details Modal */}
      <ProjectModal
        project={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  );
}
