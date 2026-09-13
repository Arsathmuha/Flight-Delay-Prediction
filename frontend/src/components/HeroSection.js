import { useEffect, useState } from 'react';
import { useSpring, animated, useTrail } from '@react-spring/web';
import CountUp from 'react-countup';
import FlightGlobe from './FlightGlobe';

const STATS = [
  { value: 5.7, suffix: 'M', label: 'Flights Analyzed', decimals: 1, icon: '📊' },
  { value: 350, suffix: '+', label: 'Airports Covered', decimals: 0, icon: '🌐' },
  { value: 24, suffix: '/7', label: 'Real-Time Monitoring', decimals: 0, icon: '📡' },
  { value: 45, suffix: 'min', label: 'Advance Warning', decimals: 0, icon: '⏱' },
];

function FlyingPlanes() {
  return (
    <div className="hero-flying-planes">
      {[1, 3, 5].map(i => (
        <div key={i} className={`hero-plane hero-plane-${i}`}>
          <svg viewBox="0 0 40 12" fill="currentColor">
            <path d="M38,6 L32,4 L18,4 L14,0.5 L12,0.5 L14,4 L4,4 L2,2 L0.5,2 L2,5 L0.5,6 L2,7 L0.5,10 L2,10 L4,8 L14,8 L12,11.5 L14,11.5 L18,8 L32,8 L38,6 Z"/>
          </svg>
          <div className="hero-contrail"></div>
        </div>
      ))}
    </div>
  );
}

function AnimatedClouds() {
  return (
    <div className="hero-clouds">
      <div className="hero-cloud hero-cloud-1">
        <svg viewBox="0 0 120 40" fill="rgba(255,255,255,0.7)">
          <ellipse cx="60" cy="25" rx="50" ry="15"/>
          <ellipse cx="35" cy="18" rx="25" ry="18"/>
          <ellipse cx="75" cy="15" rx="30" ry="20"/>
          <ellipse cx="55" cy="12" rx="20" ry="15"/>
        </svg>
      </div>
      <div className="hero-cloud hero-cloud-2">
        <svg viewBox="0 0 100 35" fill="rgba(255,255,255,0.5)">
          <ellipse cx="50" cy="22" rx="40" ry="12"/>
          <ellipse cx="30" cy="15" rx="22" ry="15"/>
          <ellipse cx="65" cy="13" rx="25" ry="16"/>
        </svg>
      </div>
      <div className="hero-cloud hero-cloud-3">
        <svg viewBox="0 0 90 30" fill="rgba(255,255,255,0.6)">
          <ellipse cx="45" cy="18" rx="38" ry="11"/>
          <ellipse cx="28" cy="12" rx="20" ry="13"/>
          <ellipse cx="60" cy="10" rx="22" ry="14"/>
        </svg>
      </div>
    </div>
  );
}

function RadarDisplay() {
  return (
    <div className="hero-radar">
      <div className="radar-ring radar-ring-1"></div>
      <div className="radar-ring radar-ring-2"></div>
      <div className="radar-ring radar-ring-3"></div>
      <div className="radar-sweep"></div>
      <div className="radar-dot radar-dot-1"></div>
      <div className="radar-dot radar-dot-2"></div>
      <div className="radar-dot radar-dot-3"></div>
      <div className="radar-dot radar-dot-4"></div>
    </div>
  );
}

function HeroSection({ onExplore }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const titleSpring = useSpring({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0px)' : 'translateY(40px)',
    config: { tension: 80, friction: 12 },
  });

  const subtitleSpring = useSpring({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0px)' : 'translateY(25px)',
    delay: 400,
    config: { tension: 80, friction: 12 },
  });

  const globeSpring = useSpring({
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(0.8)',
    delay: 600,
    config: { tension: 100, friction: 16 },
  });

  const trail = useTrail(STATS.length, {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0px) scale(1)' : 'translateY(30px) scale(0.85)',
    delay: 800,
    config: { tension: 180, friction: 18 },
  });

  return (
    <section className="hero-section">
      <FlyingPlanes />

      <div className="hero-bg-effects">
        <div className="hero-gradient-orb hero-orb-1"></div>
        <div className="hero-gradient-orb hero-orb-2"></div>
        <div className="hero-gradient-orb hero-orb-3"></div>
      </div>

      <div className="hero-content">
        <div className="hero-text-side">
          <animated.div style={titleSpring}>
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              AI-Powered Prediction Engine
            </div>
            <h1 className="hero-title">
              <span className="hero-title-line1">Predict Flight</span>
              <span className="hero-title-line2">Delays in Real-Time</span>
            </h1>
          </animated.div>

          <animated.p className="hero-description" style={subtitleSpring}>
            Know your delay <strong>before you book</strong>.
            Analyzes weather patterns, airline operations, air traffic,
            and historical data across <strong>5.7 million flights</strong>.
          </animated.p>

          <animated.div className="hero-cta" style={subtitleSpring}>
            <button className="hero-btn-primary" onClick={onExplore}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              <span>Start Predicting</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="hero-btn-secondary" onClick={onExplore}>
              <span>View Live Flights</span>
            </button>
          </animated.div>

          <animated.div className="hero-features" style={subtitleSpring}>
            <div className="hero-feature-tag">
              <span className="hf-icon">🌦</span> Weather Impact
            </div>
            <div className="hero-feature-tag">
              <span className="hf-icon">🔗</span> Cascade Effects
            </div>
            <div className="hero-feature-tag">
              <span className="hf-icon">👨‍✈️</span> Crew Duty Rules
            </div>
            <div className="hero-feature-tag">
              <span className="hf-icon">📡</span> Real-Time APIs
            </div>
          </animated.div>
        </div>

        <animated.div className="hero-globe-side" style={globeSpring}>
          <RadarDisplay />
          <FlightGlobe />
        </animated.div>
      </div>

      <div className="hero-stats">
        {trail.map((style, i) => (
          <animated.div key={i} className="hero-stat-card" style={style}>
            <span className="hero-stat-icon">{STATS[i].icon}</span>
            <div className="hero-stat-value">
              {visible && (
                <CountUp
                  end={STATS[i].value}
                  decimals={STATS[i].decimals}
                  duration={2.5}
                  delay={1 + i * 0.2}
                  suffix={STATS[i].suffix}
                />
              )}
            </div>
            <div className="hero-stat-label">{STATS[i].label}</div>
          </animated.div>
        ))}
      </div>

      <div className="hero-scroll-indicator">
        <span className="scroll-text">Explore</span>
        <div className="scroll-arrow"></div>
      </div>
    </section>
  );
}

export default HeroSection;
