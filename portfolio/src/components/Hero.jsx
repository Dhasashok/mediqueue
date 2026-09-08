import React from 'react';
import { 
  ArrowRight, 
  FileText, 
  Mail, 
  Phone, 
  Layers, 
  Server, 
  Database 
} from 'lucide-react';
import { LinkedinIcon } from './Icons';
import { personalInfo } from '../data/portfolioData';

export default function Hero({ onOpenResume }) {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 72;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section id="home" className="hero">
      <div className="container hero__container">
        <div className="hero__content">
          
          {/* Animated Profile Ring */}
          <div className="hero__profile">
            <div className="hero__profile-ring">
              <div className="hero__profile-image">
                <img
                  src="/profile.jpg"
                  alt={personalInfo.name}
                  loading="eager"
                />
              </div>
            </div>

            {/* Orbiting dots */}
            <span className="hero__dot hero__dot--one" />
            <span className="hero__dot hero__dot--two" />
            <span className="hero__dot hero__dot--three" />
          </div>

          {/* Intro text */}
          <div className="hero__intro">
            <p className="hero__greeting">Hi, I'm</p>
            <h1 className="hero__name hero__name--single-line">
              Ashok Dhas
            </h1>
            <h2 className="hero__role">Software Developer</h2>
            <p className="hero__description">
              {personalInfo.heroBio}
            </p>
          </div>

          {/* 3 Quick Cards matching reference */}
          <div className="hero__quick-links">
            <div
              onClick={() => scrollToSection('projects')}
              className="hero__quick-card"
              role="button"
              tabIndex={0}
            >
              <div className="hero__quick-icon">
                <Layers size={18} />
              </div>
              <div className="hero__quick-content">
                <strong>Full Stack Apps</strong>
                <span>React & Node.js Projects</span>
              </div>
            </div>

            <div
              onClick={() => scrollToSection('skills')}
              className="hero__quick-card"
              role="button"
              tabIndex={0}
            >
              <div className="hero__quick-icon">
                <Server size={18} />
              </div>
              <div className="hero__quick-content">
                <strong>40+ REST APIs</strong>
                <span>JWT & Cloud DB</span>
              </div>
            </div>

            <div
              onClick={() => scrollToSection('about')}
              className="hero__quick-card"
              role="button"
              tabIndex={0}
            >
              <div className="hero__quick-icon">
                <Database size={18} />
              </div>
              <div className="hero__quick-content">
                <strong>8.50 CGPA</strong>
                <span>B.E. Computer Eng.</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="hero__actions">
            <button
              onClick={() => scrollToSection('projects')}
              className="btn btn-primary"
            >
              <span>View My Projects</span>
              <ArrowRight size={15} />
            </button>

            <a
              href={personalInfo.resumeUrl}
              download="Ashok_Rohidas_Dhas_Resume.pdf"
              className="btn btn-secondary"
            >
              <FileText size={15} />
              <span>Download Resume</span>
            </a>

            <button
              onClick={() => scrollToSection('contact')}
              className="btn btn-secondary"
            >
              <Mail size={15} />
              <span>Contact Me</span>
            </button>
          </div>

          {/* Socials */}
          <div className="hero__socials">
            <a
              href={personalInfo.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hero__social-link"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>

            <a
              href={`mailto:${personalInfo.email}`}
              className="hero__social-link"
              aria-label="Email"
            >
              <Mail size={16} />
            </a>

            <a
              href={`tel:${personalInfo.phoneRaw}`}
              className="hero__social-link"
              aria-label="Phone"
            >
              <Phone size={16} />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
