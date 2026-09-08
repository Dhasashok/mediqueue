import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Check, 
  Copy, 
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { LinkedinIcon } from './Icons';
import { personalInfo } from '../data/portfolioData';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Please enter your name.';
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.subject.trim()) newErrors.subject = 'Please enter a subject.';
    if (!formData.message.trim()) newErrors.message = 'Please enter a message.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCopyEmail = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(personalInfo.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(personalInfo.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    }, 800);
  };

  return (
    <section id="contact" className="section contact">
      <div className="container">
        
        {/* Contact Card matching reference .contact__card */}
        <div className="contact__card card">
          
          {/* Main Left Area: Heading, Intro & Form */}
          <div className="contact__main">
            <span className="contact__label">GET IN TOUCH</span>
            <h3>Let's Build Something Great</h3>
            <p>
              I'm currently open to Software Developer, Full Stack Developer and SDE opportunities. If you're looking for a motivated developer who enjoys building practical software solutions, let's connect.
            </p>

            {submitStatus === 'success' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1.25rem', fontSize: 'var(--text-xs)' }}>
                <strong>Message Dispatched!</strong> Thank you for reaching out, Ashok will respond soon.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your Name *"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.65rem',
                      border: errors.name ? '1px solid #ef4444' : '1px solid var(--color-border)',
                      background: 'var(--color-surface-soft)',
                      color: 'var(--color-text)',
                      fontSize: 'var(--text-xs)'
                    }}
                  />
                  {errors.name && <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>{errors.name}</span>}
                </div>

                <div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Your Email *"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.65rem',
                      border: errors.email ? '1px solid #ef4444' : '1px solid var(--color-border)',
                      background: 'var(--color-surface-soft)',
                      color: 'var(--color-text)',
                      fontSize: 'var(--text-xs)'
                    }}
                  />
                  {errors.email && <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>{errors.email}</span>}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Subject / Opportunity *"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.65rem',
                    border: errors.subject ? '1px solid #ef4444' : '1px solid var(--color-border)',
                    background: 'var(--color-surface-soft)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--text-xs)'
                  }}
                />
                {errors.subject && <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>{errors.subject}</span>}
              </div>

              <div>
                <textarea
                  rows="3"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Your message..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.65rem',
                    border: errors.message ? '1px solid #ef4444' : '1px solid var(--color-border)',
                    background: 'var(--color-surface-soft)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--text-xs)',
                    resize: 'none'
                  }}
                />
                {errors.message && <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>{errors.message}</span>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary contact__button"
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
              </button>
            </form>
          </div>

          {/* Right Details List matching reference .contact__details */}
          <div className="contact__details">
            {/* Email Card */}
            <a
              href={`mailto:${personalInfo.email}`}
              className="contact__detail"
            >
              <div className="contact__detail-icon">
                <Mail size={16} />
              </div>
              <div className="contact__detail-content">
                <small>Email</small>
                <strong>{personalInfo.email}</strong>
              </div>
              <button
                onClick={handleCopyEmail}
                style={{ background: 'transparent', border: 'none', padding: '0.35rem', cursor: 'pointer' }}
                title="Copy Email"
                aria-label="Copy Email"
              >
                {copiedEmail ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
            </a>

            {/* Phone Card */}
            <a
              href={`tel:${personalInfo.phoneRaw}`}
              className="contact__detail"
            >
              <div className="contact__detail-icon">
                <Phone size={16} />
              </div>
              <div className="contact__detail-content">
                <small>Phone</small>
                <strong>{personalInfo.phone}</strong>
              </div>
              <button
                onClick={handleCopyPhone}
                style={{ background: 'transparent', border: 'none', padding: '0.35rem', cursor: 'pointer' }}
                title="Copy Phone"
                aria-label="Copy Phone"
              >
                {copiedPhone ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
            </a>

            {/* Location Card */}
            <div className="contact__detail" style={{ cursor: 'default' }}>
              <div className="contact__detail-icon">
                <MapPin size={16} />
              </div>
              <div className="contact__detail-content">
                <small>Location</small>
                <strong>{personalInfo.location}</strong>
              </div>
            </div>

            {/* LinkedIn Card */}
            <a
              href={personalInfo.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="contact__social-card"
            >
              <div className="contact__social-brand contact__social-brand--linkedin">
                <LinkedinIcon className="w-4 h-4" />
              </div>
              <div className="contact__detail-content">
                <small>LinkedIn</small>
                <strong>Ashok Dhas</strong>
              </div>
              <ArrowUpRight size={16} className="contact__detail-arrow" />
            </a>
          </div>

        </div>

      </div>
    </section>
  );
}
