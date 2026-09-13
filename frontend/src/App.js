import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from './components/ParticlesBackground';
import HeroSection from './components/HeroSection';
import PredictionPanel from './components/PredictionPanel';
import BookingAdvisor from './components/BookingAdvisor';
import FlightBoard from './components/FlightBoard';
import './App.css';
import './components/HeroSection.css';

const TABS = [
  { id: 'predict', label: 'Predict Delay', icon: '✈' },
  { id: 'flights', label: 'Live Flights', icon: '📡' },
  { id: 'booking', label: 'Pre-Book Advisor', icon: '🎯' },
];

function App() {
  const [activeTab, setActiveTab] = useState('predict');
  const [showHero, setShowHero] = useState(true);
  const mainRef = useRef(null);

  const handleExplore = () => {
    setShowHero(false);
    setTimeout(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="app">
      <ParticlesBackground />

      {showHero && <HeroSection onExplore={handleExplore} />}

      <div ref={mainRef}>
        <header className="header">
          <div className="header-content">
            <div className="header-left">
              {!showHero && (
                <button className="back-to-hero" onClick={() => setShowHero(true)} title="Back to home">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
                </button>
              )}
              <h1 className="logo-title">SkyPredict AI</h1>
              <span className="logo-sub">Flight Delay Intelligence</span>
            </div>
            <div className="header-right">
              <div className="header-chip">
                <span className="chip-val">350+</span> airports
              </div>
              <div className="header-live">
                <span className="live-dot"></span>
                Live
              </div>
            </div>
          </div>
        </header>

        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div className="tab-indicator" layoutId="tab-indicator" />
              )}
            </button>
          ))}
        </nav>

        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'predict' && <PredictionPanel />}
              {activeTab === 'flights' && <FlightBoard />}
              {activeTab === 'booking' && <BookingAdvisor />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="footer">
          <div className="footer-content">
            <span className="footer-brand">SkyPredict AI</span>
            <span className="footer-sep">|</span>
            <span>Dual-Model: US BTS + India DGCA Data</span>
            <span className="footer-sep">|</span>
            <span>XGBoost ML</span>
            <span className="footer-sep">|</span>
            <span>Live Weather & Flight APIs</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
