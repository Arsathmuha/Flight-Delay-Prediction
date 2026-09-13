import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API_BASE from '../config';
import './PropagationView.css';

function PropagationView() {
  const [chain, setChain] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchChain = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/propagation`);
      const data = await res.json();
      setChain(data.chain);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChain();
  }, []);

  return (
    <div className="propagation-view">
      <div className="prop-header">
        <div>
          <h2 className="section-title">Delay Cascade Propagation</h2>
          <p className="prop-subtitle">
            One aircraft flies multiple legs per day. A delay on leg 1 eats into turnaround time,
            propagating forward. Each leg's risk is computed by the real XGBoost model + cascade amplification.
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchChain}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          New Scenario
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Running ML model on each leg...</p>
        </div>
      ) : (
        <>
          {summary && (
            <div className="chain-summary card">
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Aircraft</span>
                  <span className="summary-value">{summary.aircraft_tail}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Legs</span>
                  <span className="summary-value">{summary.total_legs}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Legs Delayed</span>
                  <span className={`summary-value ${summary.legs_delayed > 0 ? 'warn' : 'good'}`}>
                    {summary.legs_delayed}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Peak Delay</span>
                  <span className={`summary-value ${summary.peak_delay_minutes >= 30 ? 'bad' : summary.peak_delay_minutes >= 15 ? 'warn' : 'good'}`}>
                    {summary.peak_delay_minutes} min
                  </span>
                </div>
                <div className="summary-item full">
                  <span className="summary-insight">{summary.insight}</span>
                </div>
              </div>
            </div>
          )}

          <div className="chain-visual">
            {chain.map((leg, i) => (
              <React.Fragment key={i}>
                <motion.div
                  className={`chain-node ${leg.status === 'DELAYED' ? 'delayed' : 'ontime'}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="node-header">
                    <span className="node-leg">LEG {leg.leg}</span>
                    <span className={`node-status ${leg.status === 'DELAYED' ? 'delayed' : 'ontime'}`}>
                      {leg.status}
                    </span>
                  </div>
                  <div className="node-route">
                    <span className="node-airport">{leg.origin}</span>
                    <span className="node-arrow">→</span>
                    <span className="node-airport">{leg.dest}</span>
                  </div>
                  <div className="node-time">{leg.dep_hour} • {leg.carrier_name}</div>
                  <div className="node-metrics">
                    <div className="node-metric">
                      <span className="metric-lbl">Model Risk</span>
                      <span className="metric-val">{leg.model_base_risk}%</span>
                    </div>
                    {leg.cascade_boost > 0 && (
                      <div className="node-metric cascade">
                        <span className="metric-lbl">Cascade +</span>
                        <span className="metric-val">+{leg.cascade_boost}%</span>
                      </div>
                    )}
                  </div>
                  <div className="node-delay">
                    {leg.delay_minutes > 0 ? (
                      <span className="delay-value">+{leg.delay_minutes} min accumulated</span>
                    ) : (
                      <span className="no-delay">On Schedule</span>
                    )}
                  </div>
                  <div className="node-bar">
                    <div
                      className="node-bar-fill"
                      style={{
                        width: `${Math.min(100, leg.delay_probability * 100)}%`,
                        background: leg.delay_probability >= 0.40 ? '#ef4444' :
                                    leg.delay_probability >= 0.20 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </motion.div>
                {i < chain.length - 1 && (
                  <div className="chain-connector">
                    <div className="connector-line" />
                    <div className="connector-label">
                      {chain[i + 1].delay_minutes > leg.delay_minutes ? '↑ Growing' :
                       chain[i + 1].delay_minutes < leg.delay_minutes ? '↓ Recovering' : '→ Stable'}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="prop-insight card">
            <h3>How This Works</h3>
            <div className="insight-grid">
              <div className="insight-item">
                <div className="insight-icon">ML</div>
                <div>
                  <strong>Real Model Predictions</strong>
                  <p>Each leg runs through the trained XGBoost model with actual route, time, and airline features. "Model Risk" shows what the ML predicts independently.</p>
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-icon">++</div>
                <div>
                  <strong>Cascade Amplification</strong>
                  <p>When prior legs are delayed, the accumulated delay eats into the 35-minute turnaround buffer. Once overflow occurs, the next leg's delay risk jumps sharply — this is the "Cascade +" value.</p>
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-icon">BTS</div>
                <div>
                  <strong>Real-World Validation</strong>
                  <p>Late Aircraft is the #1 delay cause in BTS data (26 min avg). Our dataset confirms 84.7% feature importance for PRIOR_LEG_DELAY — cascade effects dominate real airline operations.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PropagationView;
