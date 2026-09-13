import React from 'react';
import { motion } from 'framer-motion';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <motion.div
          className="header-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M20 4L36 20L20 36L4 20L20 4Z" stroke="url(#grad)" strokeWidth="2" fill="rgba(59,130,246,0.1)"/>
                <path d="M12 20L18 14L28 20L18 26L12 20Z" fill="url(#grad)"/>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-text">
              <h1>SkyPredict AI</h1>
              <span className="logo-subtitle">Flight Delay Intelligence Platform</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="header-right"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="header-stat">
            <span className="stat-value">50K+</span>
            <span className="stat-label">Flights Analyzed</span>
          </div>
          <div className="header-stat">
            <span className="stat-value">XGBoost</span>
            <span className="stat-label">ML Engine</span>
          </div>
          <div className="header-badge">
            <span className="badge-dot"></span>
            Live Model
          </div>
        </motion.div>
      </div>
    </header>
  );
}

export default Header;
