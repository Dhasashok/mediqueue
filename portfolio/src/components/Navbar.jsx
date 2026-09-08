import React, { useState, useEffect } from 'react';
import { Sun, Moon, FileText, Menu, X, ArrowRight } from 'lucide-react';
import { navLinks, personalInfo } from '../data/portfolioData';

export default function Navbar({ onOpenResume, isDark, onToggleTheme }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);

      const sections = navLinks.map((link) => link.href.substring(1));
      const scrollPosition = window.scrollY + 140;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const navOffset = 72;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__container">
        {/* Brand */}
        <a
          href="#home"
          onClick={(e) => handleNavClick(e, '#home')}
          className="navbar__brand"
          aria-label="Ashok Dhas"
        >
          <span className="navbar__brand-mark">A</span>
          <span className="navbar__brand-name">Ashok</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="navbar__desktop-nav">
          {navLinks.map((link) => {
            const isActive = activeSection === link.href.substring(1);
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`navbar__link ${isActive ? 'navbar__link--active text-[var(--color-primary)] font-semibold' : ''}`}
              >
                {link.name}
              </a>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="navbar__actions">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="navbar__theme-button"
            aria-label="Toggle theme"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Download Resume Button */}
          <button
            onClick={onOpenResume}
            className="btn btn-primary hidden sm:inline-flex"
            style={{ minHeight: '38px', padding: '0.45rem 1rem', fontSize: 'var(--text-xs)' }}
          >
            <FileText size={14} />
            <span>Resume</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="navbar__menu-button"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`navbar__mobile-menu ${mobileMenuOpen ? 'navbar__mobile-menu--open' : ''}`}>
        <div className="container">
          <nav className="navbar__mobile-nav">
            {navLinks.map((link, idx) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="navbar__mobile-link"
                style={{ '--menu-delay': `${idx * 0.04}s` }}
              >
                <span>{link.name}</span>
                <span className="navbar__mobile-arrow">→</span>
              </a>
            ))}
            <div style={{ padding: '0.5rem', marginTop: '0.3rem', borderTop: '1px solid var(--color-border-light)' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenResume();
                }}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '40px' }}
              >
                <FileText size={15} />
                <span>Download Resume (PDF)</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
