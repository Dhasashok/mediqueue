import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ExternalLink, FileText } from 'lucide-react';
import { personalInfo } from '../data/portfolioData';

export default function ResumeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="resume-modal-backdrop" onClick={onClose}>
        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="resume-modal-box"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="resume-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                }}
              >
                CV
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
                  {personalInfo.name} — Curriculum Vitae
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  Software Developer | Full Stack Developer
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <a
                href={personalInfo.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ minHeight: '34px', padding: '0.35rem 0.85rem', fontSize: '0.72rem' }}
                title="Open in new window"
              >
                <ExternalLink size={13} />
                <span>Open in Tab</span>
              </a>

              <a
                href={personalInfo.resumeUrl}
                download="Ashok_Rohidas_Dhas_Resume.pdf"
                className="btn btn-primary"
                style={{ minHeight: '34px', padding: '0.35rem 0.85rem', fontSize: '0.72rem' }}
              >
                <Download size={13} />
                <span>Download PDF</span>
              </a>

              <button
                onClick={onClose}
                className="project-modal-close-btn"
                style={{ width: '34px', height: '34px' }}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body: Embedded PDF viewer */}
          <div style={{ flex: 1, width: '100%', background: '#525659', position: 'relative', overflow: 'hidden' }}>
            <object
              data={`${personalInfo.resumeUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              style={{ width: '100%', height: '100%', border: 'none' }}
            >
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface)', color: 'var(--color-text)', maxWidth: '400px', margin: '2rem auto', borderRadius: '1rem' }}>
                <FileText size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem auto' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Resume PDF Ready</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
                  Your browser does not support inline PDF preview. You can view or download the attached resume directly.
                </p>
                <a
                  href={personalInfo.resumeUrl}
                  download="Ashok_Rohidas_Dhas_Resume.pdf"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={15} />
                  <span>Download Ashok's Resume</span>
                </a>
              </div>
            </object>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
