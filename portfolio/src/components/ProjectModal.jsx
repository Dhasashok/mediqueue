import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Code2,
  Play,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { GithubIcon } from './Icons';

export default function ProjectModal({ project, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <div className="project-modal-backdrop" onClick={onClose}>
        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="project-modal-box"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="project-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-primary)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Code2 size={20} />
              </div>
              <div>
                <span className="project-modal-category">{project.category}</span>
                <h3 className="project-modal-title">{project.title}</h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="project-modal-close-btn"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="project-modal-tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`project-modal-tab-btn ${activeTab === 'overview' ? 'project-modal-tab-btn--active' : ''}`}
            >
              Overview & Impact
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`project-modal-tab-btn ${activeTab === 'media' ? 'project-modal-tab-btn--active' : ''}`}
            >
              Screenshots & Demo
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`project-modal-tab-btn ${activeTab === 'architecture' ? 'project-modal-tab-btn--active' : ''}`}
            >
              System Architecture
            </button>
            <button
              onClick={() => setActiveTab('tech')}
              className={`project-modal-tab-btn ${activeTab === 'tech' ? 'project-modal-tab-btn--active' : ''}`}
            >
              Tech Stack & Badges
            </button>
          </div>

          {/* Body Content */}
          <div className="project-modal-body">
            {activeTab === 'overview' && (
              <>
                <div>
                  <span className="project-modal-section-title">Project Summary</span>
                  <p className="project-modal-desc">
                    {project.description}
                  </p>
                </div>

                {project.stats && (
                  <div>
                    <span className="project-modal-section-title">Engineering Metrics</span>
                    <div className="project-modal-stat-grid">
                      {project.stats.map((st, idx) => (
                        <div key={idx} className="project-modal-stat-card">
                          <strong>{st.value}</strong>
                          <span>{st.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="project-modal-section-title">
                    {project.achievements ? 'Key Highlights & Deliverables' : 'System Capabilities'}
                  </span>
                  <ul className="project-modal-checklist">
                    {(project.achievements || project.features || []).map((item, idx) => (
                      <li key={idx} className="project-modal-check-item">
                        <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'media' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Video Demo Section */}
                <div>
                  <span className="project-modal-section-title">
                    Walkthrough & Video Demo
                  </span>

                  {project.videoUrl ? (
                    <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--color-border)', background: '#000', boxShadow: 'var(--shadow-md)' }}>
                      {project.videoUrl.endsWith('.mp4') || project.videoUrl.endsWith('.webm') ? (
                        <video controls style={{ width: '100%', maxHeight: '420px', display: 'block' }}>
                          <source src={project.videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <iframe
                          src={project.videoUrl}
                          title={`${project.title} Video Demo`}
                          style={{ width: '100%', height: '360px', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '1rem',
                        background: 'var(--color-surface-soft)',
                        border: '1px dashed var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'var(--color-primary-soft)',
                          color: 'var(--color-primary)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Video size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                          Add Walkthrough Video (MP4 / Loom / YouTube)
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                          Place an MP4 video in <code style={{ color: 'var(--color-primary)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>public/projects/</code> or paste a Loom/YouTube link in <code style={{ color: 'var(--color-primary)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>portfolioData.js</code>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Screenshots Gallery */}
                <div>
                  <span className="project-modal-section-title">
                    Application Screenshots & Interface
                  </span>

                  {(project.screenshots && project.screenshots.length > 0) || project.image ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                      {(project.screenshots && project.screenshots.length > 0 ? project.screenshots : [{ url: project.image, title: project.title, caption: project.description }]).map((scr, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid var(--color-border)',
                            borderRadius: '1rem',
                            overflow: 'hidden',
                            background: 'var(--color-surface)',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ maxHeight: '380px', overflow: 'hidden', background: '#0f0c1b' }}>
                            <img
                              src={scr.url}
                              alt={scr.title || `Screenshot ${idx + 1}`}
                              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                            />
                          </div>
                          <div style={{ padding: '0.9rem 1.1rem', background: 'var(--color-surface-soft)', borderTop: '1px solid var(--color-border-light)' }}>
                            <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                              {scr.title || `Screenshot ${idx + 1}`}
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                              {scr.caption}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '1rem',
                        background: 'var(--color-surface-soft)',
                        border: '1px dashed var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'var(--color-primary-soft)',
                          color: 'var(--color-primary)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <ImageIcon size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                          Add Project Screenshots
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                          Save your project images in <code style={{ color: 'var(--color-primary)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>public/projects/</code> and list them under <code style={{ color: 'var(--color-primary)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>screenshots</code> in <code style={{ color: 'var(--color-primary)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>portfolioData.js</code>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'architecture' && project.architecture && (
              <div>
                <span className="project-modal-section-title">Full Stack Architecture Breakdown</span>
                {Object.entries(project.architecture).map(([layer, desc], idx) => (
                  <div key={idx} className="project-modal-arch-item">
                    <span className="project-modal-arch-layer">{layer}</span>
                    <p className="project-modal-arch-desc">{desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tech' && (
              <div>
                <span className="project-modal-section-title">Technologies & Cloud Infrastructure</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {project.technologies.map((t, idx) => (
                    <span key={idx} className="tech-pill" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'var(--color-surface-soft)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.82rem',
                    lineHeight: '1.6',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                    <ShieldCheck size={16} color="#10b981" />
                    <span>Production Grade Architecture</span>
                  </div>
                  <p style={{ margin: 0 }}>
                    Engineered with secure stateless authentication, relational database schema integrity, role-based access control, and automated API verification.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="project-modal-footer">
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
              Verified Production Stack
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ minHeight: '38px', padding: '0.45rem 1rem', fontSize: '0.75rem' }}
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ minHeight: '38px', padding: '0.45rem 1rem', fontSize: '0.75rem' }}
                >
                  <ExternalLink size={13} />
                  <span>Live Demo</span>
                </a>
              )}
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ minHeight: '38px', padding: '0.45rem 1rem', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
