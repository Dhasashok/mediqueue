import React from 'react';
import { ArrowUp, Mail, Phone } from 'lucide-react';
import { LinkedinIcon } from './Icons';
import { personalInfo, navLinks } from '../data/portfolioData';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const navOffset = 72;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        
        {/* Top Grid matching reference .footer__top */}
        <div className="footer__top">
          
          {/* Brand */}
          <a
            href="#home"
            onClick={(e) => handleNavClick(e, '#home')}
            className="footer__brand"
          >
            <div className="footer__brand-mark">A</div>
            <div>
              <strong>{personalInfo.name}</strong>
              <small>{personalInfo.title}</small>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="footer__nav">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Socials */}
          <div className="footer__socials">
            <a
              href={personalInfo.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="footer__social"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="w-3.5 h-3.5" />
            </a>

            <a
              href={`mailto:${personalInfo.email}`}
              className="footer__social"
              aria-label="Email"
            >
              <Mail size={15} />
            </a>

            <a
              href={`tel:${personalInfo.phoneRaw}`}
              className="footer__social"
              aria-label="Phone"
            >
              <Phone size={15} />
            </a>
          </div>

        </div>

        {/* Bottom Bar matching reference .footer__bottom */}
        <div className="footer__bottom">
          <p>© 2026 {personalInfo.name}. All rights reserved.</p>

          <button
            onClick={scrollToTop}
            className="footer__back-top"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <span>Back to top</span>
            <ArrowUp size={13} />
          </button>
        </div>

      </div>
    </footer>
  );
}
