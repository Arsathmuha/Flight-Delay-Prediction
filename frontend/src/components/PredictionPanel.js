import React, { useState } from 'react';
import { motion } from 'framer-motion';
import API_BASE from '../config';
import './PredictionPanel.css';

const US_CARRIERS = {
  'AA': 'American Airlines', 'DL': 'Delta Air Lines', 'UA': 'United Airlines',
  'WN': 'Southwest Airlines', 'B6': 'JetBlue Airways', 'AS': 'Alaska Airlines',
  'NK': 'Spirit Airlines', 'F9': 'Frontier Airlines', 'G4': 'Allegiant Air',
  'HA': 'Hawaiian Airlines'
};

const INDIA_CARRIERS = {
  '6E': 'IndiGo', 'AI': 'Air India', 'SG': 'SpiceJet', 'UK': 'Vistara',
  'G8': 'GoFirst', 'I5': 'AirAsia India', 'QP': 'Akasa Air', 'IX': 'Air India Express'
};

const US_AIRPORTS = [
  'ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'SFO', 'SEA', 'LAS', 'MCO',
  'EWR', 'BOS', 'MIA', 'PHX', 'IAH', 'MSP', 'DTW', 'CLT', 'LGA', 'BWI'
];

const INDIA_AIRPORTS = [
  'DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'GOI', 'PNQ', 'AMD', 'COK',
  'JAI', 'LKO', 'PAT', 'GAU', 'IXC', 'TRV', 'VNS', 'IXR', 'BBI', 'SXR', 'IXM'
];

const AIRPORT_NAMES = {
  'ATL': 'Atlanta', 'ORD': 'Chicago', 'DFW': 'Dallas', 'DEN': 'Denver',
  'LAX': 'Los Angeles', 'JFK': 'New York', 'SFO': 'San Francisco', 'SEA': 'Seattle',
  'LAS': 'Las Vegas', 'MCO': 'Orlando', 'EWR': 'Newark', 'BOS': 'Boston',
  'MIA': 'Miami', 'PHX': 'Phoenix', 'IAH': 'Houston', 'MSP': 'Minneapolis',
  'DTW': 'Detroit', 'CLT': 'Charlotte', 'LGA': 'LaGuardia', 'BWI': 'Baltimore',
  'DEL': 'New Delhi', 'BOM': 'Mumbai', 'BLR': 'Bangalore', 'HYD': 'Hyderabad',
  'MAA': 'Chennai', 'CCU': 'Kolkata', 'GOI': 'Goa', 'PNQ': 'Pune',
  'AMD': 'Ahmedabad', 'COK': 'Kochi', 'JAI': 'Jaipur', 'LKO': 'Lucknow',
  'PAT': 'Patna', 'GAU': 'Guwahati', 'IXC': 'Chandigarh', 'TRV': 'Trivandrum',
  'VNS': 'Varanasi', 'IXR': 'Ranchi', 'BBI': 'Bhubaneswar', 'SXR': 'Srinagar',
  'IXM': 'Madurai'
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function PredictionPanel() {
  const now = new Date();
  const [region, setRegion] = useState('india');
  const [form, setForm] = useState({
    carrier: '6E',
    origin: 'DEL',
    dest: 'BOM',
    dep_hour: Math.min(23, now.getHours() + 2),
    day_of_week: (now.getDay() + 6) % 7,  // JS Sunday=0, we want Monday=0
    month: now.getMonth() + 1,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const CARRIERS = region === 'india' ? INDIA_CARRIERS : US_CARRIERS;
  const AIRPORTS = region === 'india' ? INDIA_AIRPORTS : US_AIRPORTS;

  const switchRegion = (newRegion) => {
    setRegion(newRegion);
    setResult(null);
    if (newRegion === 'india') {
      setForm(prev => ({ ...prev, carrier: '6E', origin: 'DEL', dest: 'BOM' }));
    } else {
      setForm(prev => ({ ...prev, carrier: 'NK', origin: 'ORD', dest: 'JFK' }));
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const predict = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getRiskColor = (level) => {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="prediction-panel">
      <div className="predict-grid">
        <div className="predict-form card">
          <h2 className="section-title">Predict Flight Delay</h2>
          <p className="form-desc">
            Select your flight details — the system automatically computes congestion scores,
            historical carrier reliability, and cascade propagation risk from operational data.
          </p>

          <div className="region-toggle">
            <button
              className={`region-btn ${region === 'india' ? 'active' : ''}`}
              onClick={() => switchRegion('india')}
            >
              India
            </button>
            <button
              className={`region-btn ${region === 'us' ? 'active' : ''}`}
              onClick={() => switchRegion('us')}
            >
              United States
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Airline</label>
              <select value={form.carrier} onChange={e => handleChange('carrier', e.target.value)}>
                {Object.entries(CARRIERS).map(([code, name]) => (
                  <option key={code} value={code}>{code} — {name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>From</label>
              <select value={form.origin} onChange={e => handleChange('origin', e.target.value)}>
                {AIRPORTS.map(a => <option key={a} value={a}>{a} — {AIRPORT_NAMES[a] || a}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>To</label>
              <select value={form.dest} onChange={e => handleChange('dest', e.target.value)}>
                {AIRPORTS.filter(a => a !== form.origin).map(a => (
                  <option key={a} value={a}>{a} — {AIRPORT_NAMES[a] || a}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Departure Time: {form.dep_hour}:00</label>
              <input
                type="range"
                min="5"
                max="23"
                value={form.dep_hour}
                onChange={e => handleChange('dep_hour', parseInt(e.target.value))}
              />
              <div className="range-labels">
                <span>5 AM</span>
                <span>11 PM</span>
              </div>
            </div>

            <div className="form-group">
              <label>Day of Travel</label>
              <select value={form.day_of_week} onChange={e => handleChange('day_of_week', parseInt(e.target.value))}>
                {DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Month</label>
              <select value={form.month} onChange={e => handleChange('month', parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="auto-features">
            <h4>Auto-Computed from BTS Data (5.7M flights)</h4>
            <div className="auto-tags">
              <span className="auto-tag">Cascade Propagation</span>
              <span className="auto-tag">ATC Congestion</span>
              <span className="auto-tag">Fuel Load Factor</span>
              <span className="auto-tag">Aircraft Utilization</span>
              <span className="auto-tag">Crew Fatigue Rules</span>
              <span className="auto-tag">Weather Impact</span>
            </div>
          </div>

          <button className="predict-btn" onClick={predict} disabled={loading}>
            {loading ? (
              <span className="btn-loading">Analyzing Flight Risk...</span>
            ) : (
              <>
                <span>Predict Delay Risk</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </div>

        <div className="predict-result">
          {result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="result-card card"
            >
              <div className="result-header">
                <div className="result-route">
                  <span className="route-airport">{result.flight_details.origin}</span>
                  <div className="route-flight-path">
                    <div className="flight-path-line"></div>
                    <svg className="route-plane-icon" viewBox="0 0 24 24" fill="var(--accent-blue)">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                    <div className="flight-path-line"></div>
                  </div>
                  <span className="route-airport">{result.flight_details.dest}</span>
                </div>
                <span className="result-carrier">{result.flight_details.carrier_name}</span>
              </div>

              <div className="risk-gauge">
                <div className="gauge-circle" style={{ '--risk-color': getRiskColor(result.risk_level) }}>
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8"/>
                    <circle
                      cx="60" cy="60" r="54" fill="none"
                      stroke={getRiskColor(result.risk_level)}
                      strokeWidth="8"
                      strokeDasharray={`${result.delay_probability * 339} 339`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                  </svg>
                  <div className="gauge-value">
                    <span className="gauge-percent">{Math.round(result.delay_probability * 100)}%</span>
                    <span className="gauge-label">Delay Risk</span>
                  </div>
                </div>
              </div>

              <div className={`risk-badge ${result.risk_level.toLowerCase()}`} style={{ alignSelf: 'center' }}>
                <span className="risk-dot"></span>
                {result.risk_level} RISK
              </div>

              {result.estimated_delay && result.estimated_delay.min_minutes > 0 && (
                <div className="delay-estimate">
                  <div className="delay-estimate-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div className="delay-estimate-text">
                    <span className="delay-estimate-label">Estimated Delay</span>
                    <span className="delay-estimate-value" style={{ color: getRiskColor(result.risk_level) }}>
                      {result.estimated_delay.display}
                    </span>
                  </div>
                </div>
              )}

              <div className="result-action">
                <p>{result.recommended_action}</p>
              </div>

              {/* Hourly Risk Line Chart */}
              {result.hourly_risk && result.hourly_risk.length > 0 && (() => {
                const data = result.hourly_risk;
                const W = 460, H = 160, padL = 36, padR = 12, padT = 20, padB = 30;
                const chartW = W - padL - padR;
                const chartH = H - padT - padB;
                const maxProb = Math.max(...data.map(d => d.probability), 0.5);
                const getX = (i) => padL + (i / (data.length - 1)) * chartW;
                const getY = (p) => padT + chartH - (p / maxProb) * chartH;

                const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(d.probability).toFixed(1)}`).join(' ');
                const areaPath = linePath + ` L${getX(data.length - 1).toFixed(1)},${padT + chartH} L${padL},${padT + chartH} Z`;

                const selectedIdx = data.findIndex(d => d.hour === Number(form.dep_hour));
                const selectedPoint = selectedIdx >= 0 ? data[selectedIdx] : null;

                const threshMed = getY(0.25);
                const threshHigh = getY(0.40);

                return (
                  <div className="hourly-chart-section">
                    <h4>Delay Risk by Hour of Day</h4>
                    <p className="chart-desc">Same route & carrier — find the safest departure time</p>
                    <svg viewBox={`0 0 ${W} ${H}`} className="hourly-svg">
                      {/* Grid lines */}
                      <line x1={padL} y1={threshMed} x2={W - padR} y2={threshMed} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5"/>
                      <line x1={padL} y1={threshHigh} x2={W - padR} y2={threshHigh} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5"/>
                      <text x={padL - 4} y={threshMed + 3} textAnchor="end" fontSize="8" fill="#f59e0b" opacity="0.8">25%</text>
                      <text x={padL - 4} y={threshHigh + 3} textAnchor="end" fontSize="8" fill="#ef4444" opacity="0.8">40%</text>
                      <text x={padL - 4} y={getY(0) + 3} textAnchor="end" fontSize="8" fill="#64748b">0%</text>

                      {/* Gradient area fill */}
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02"/>
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#areaGrad)"/>

                      {/* Line */}
                      <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

                      {/* Data points */}
                      {data.map((d, i) => (
                        <circle key={i} cx={getX(i)} cy={getY(d.probability)} r="3"
                          fill={d.probability >= 0.4 ? '#ef4444' : d.probability >= 0.25 ? '#f59e0b' : '#10b981'}
                          stroke="white" strokeWidth="1.5"
                        />
                      ))}

                      {/* Selected hour highlight */}
                      {selectedPoint && (
                        <>
                          <line x1={getX(selectedIdx)} y1={padT} x2={getX(selectedIdx)} y2={padT + chartH} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="3,2" opacity="0.6"/>
                          <circle cx={getX(selectedIdx)} cy={getY(selectedPoint.probability)} r="6" fill="#0ea5e9" stroke="white" strokeWidth="2"/>
                          <rect x={getX(selectedIdx) - 22} y={getY(selectedPoint.probability) - 22} width="44" height="16" rx="4" fill="#0f172a" opacity="0.85"/>
                          <text x={getX(selectedIdx)} y={getY(selectedPoint.probability) - 11} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                            {Math.round(selectedPoint.probability * 100)}%
                          </text>
                        </>
                      )}

                      {/* X-axis labels */}
                      {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map((d, i) => {
                        const idx = data.indexOf(d);
                        return (
                          <text key={i} x={getX(idx)} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748b">
                            {d.hour}:00
                          </text>
                        );
                      })}

                      {/* Axis lines */}
                      <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#e2e8f0" strokeWidth="1"/>
                      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#e2e8f0" strokeWidth="1"/>
                    </svg>
                    <div className="hourly-legend">
                      <span className="legend-item"><span className="legend-dot" style={{background:'#10b981'}}></span>Low</span>
                      <span className="legend-item"><span className="legend-dot" style={{background:'#f59e0b'}}></span>Medium</span>
                      <span className="legend-item"><span className="legend-dot" style={{background:'#ef4444'}}></span>High</span>
                      <span className="legend-item" style={{marginLeft:'auto', color:'#0ea5e9', fontWeight:600}}>● Your flight</span>
                    </div>
                  </div>
                );
              })()}

              {result.computed_features && (
                <div className="risk-factors-breakdown">
                  <h4>Risk Factor Breakdown</h4>
                  <div className="risk-factors-grid">
                    <div className="risk-factor-item">
                      <div className="rf-header">
                        <span className="rf-icon">⛽</span>
                        <span className="rf-label">Fuel Load Factor</span>
                      </div>
                      <div className="rf-bar-bg">
                        <div className="rf-bar" style={{ width: `${(result.computed_features.fuel_load_factor || 0.5) * 100}%` }}></div>
                      </div>
                      <span className="rf-detail">~{result.computed_features.refuel_time_min || 3}min refuel</span>
                    </div>
                    <div className="risk-factor-item">
                      <div className="rf-header">
                        <span className="rf-icon">🔄</span>
                        <span className="rf-label">Aircraft Utilization</span>
                      </div>
                      <div className="rf-bar-bg">
                        <div className="rf-bar" style={{ width: `${Math.min(100, (result.computed_features.aircraft_leg_number || 1) / 6 * 100)}%` }}></div>
                      </div>
                      <span className="rf-detail">Leg #{result.computed_features.aircraft_leg_number || 1} of the day</span>
                    </div>
                    <div className="risk-factor-item">
                      <div className="rf-header">
                        <span className="rf-icon">⚡</span>
                        <span className="rf-label">Cumulative Fatigue</span>
                      </div>
                      <div className="rf-bar-bg">
                        <div className="rf-bar" style={{ width: `${Math.min(100, (result.computed_features.cumulative_fatigue_min || 0) / 500 * 100)}%` }}></div>
                      </div>
                      <span className="rf-detail">{result.computed_features.cumulative_fatigue_min || 0}min air time today</span>
                    </div>
                    <div className="risk-factor-item">
                      <div className="rf-header">
                        <span className="rf-icon">⏱</span>
                        <span className="rf-label">Turnaround Time</span>
                      </div>
                      <div className="rf-bar-bg">
                        <div className="rf-bar turnaround" style={{ width: `${Math.min(100, (result.computed_features.turnaround_time_min || 45) / 90 * 100)}%` }}></div>
                      </div>
                      <span className="rf-detail">{result.computed_features.turnaround_time_min || 45}min ground time</span>
                    </div>
                  </div>
                </div>
              )}

              {result.delay_reasons && result.delay_reasons.length > 0 && (
                <div className="delay-reasons">
                  <h4>Delay Risk Factors</h4>
                  <div className="reasons-list">
                    {result.delay_reasons.map((r, i) => (
                      <div key={i} className={`reason-item impact-${r.impact}`}>
                        <div className="reason-header">
                          <span className={`reason-category cat-${r.category}`}>{r.category}</span>
                          <span className="reason-title">{r.reason}</span>
                          <span className={`reason-impact impact-${r.impact}`}>
                            {r.impact === 'high' ? 'HIGH' : r.impact === 'medium' ? 'MED' : r.impact === 'none' ? '' : 'LOW'}
                          </span>
                        </div>
                        <p className="reason-detail">{r.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.live_weather && (
                <div className="live-weather-card">
                  <h4>Live Weather at {result.flight_details.origin}</h4>
                  <div className="weather-details">
                    <span>{result.live_weather.weather_desc}</span>
                    <span>{Math.round(result.live_weather.temperature_c)}°C</span>
                    <span>Wind: {Math.round(result.live_weather.wind_speed_kmh)} km/h</span>
                    <span className={`weather-impact ${result.live_weather.weather_risk_score > 0.2 ? 'bad' : 'good'}`}>
                      Impact: {(result.live_weather.weather_risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Cascade Propagation Chain */}
              {result.cascade_chain && result.cascade_chain.length > 0 && (
                <div className="cascade-section">
                  <h4>Downstream Cascade Impact</h4>
                  <p className="cascade-desc">
                    If this flight delays, the same aircraft's next legs are affected.
                    {region === 'india' ? 'DGCA requires 10hr crew rest — late delays risk crew timeout.' : 'FAA requires 10hr crew rest — late delays risk crew timeout.'}
                  </p>
                  <div className="cascade-chain">
                    <div className="cascade-origin">
                      <span className="cascade-apt">{result.flight_details.dest}</span>
                      <span className="cascade-delay-start">+{result.cascade_chain[0]?.accumulated_delay || 0} min inherited</span>
                    </div>
                    {result.cascade_chain.map((leg, i) => (
                      <div key={i} className={`cascade-leg ${leg.status === 'DELAYED' ? 'delayed' : leg.status === 'CREW TIMEOUT' ? 'timeout' : 'ontime'}`}>
                        <div className="cascade-connector">
                          <div className="cascade-line" />
                        </div>
                        <div className="cascade-leg-card">
                          <div className="cascade-leg-header">
                            <span className="cascade-route">{leg.dest}</span>
                            <span className="cascade-time">{leg.dep_hour}</span>
                            <span className={`cascade-status ${leg.status === 'DELAYED' ? 'delayed' : leg.status === 'CREW TIMEOUT' ? 'timeout' : 'ontime'}`}>
                              {leg.status}
                            </span>
                          </div>
                          <div className="cascade-metrics">
                            <span className="cascade-metric">Model: {leg.model_base_risk}%</span>
                            {leg.cascade_boost > 0 && (
                              <span className="cascade-metric boost">+{leg.cascade_boost}% cascade</span>
                            )}
                            <span className="cascade-metric total">Total: {leg.total_risk}%</span>
                          </div>
                          {leg.crew_timeout_risk && (
                            <div className="crew-warning">
                              {region === 'india' ? 'DGCA' : 'FAA'} crew duty limit approaching — replacement crew may be needed
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* SHAP Waterfall Chart */}
              {result.shap_explanation && result.shap_explanation.length > 0 && (
                <div className="shap-section">
                  <h4>SHAP Feature Impact (XGBoost Explainability)</h4>
                  <p className="shap-desc">How each feature pushed the prediction higher or lower from baseline</p>
                  <div className="shap-chart">
                    {result.shap_explanation.map((s, i) => (
                      <div key={i} className="shap-row">
                        <span className="shap-label">{s.feature}</span>
                        <div className="shap-bar-wrapper">
                          <div className="shap-center-line" />
                          <div
                            className={`shap-bar ${s.impact > 0 ? 'positive' : 'negative'}`}
                            style={{
                              width: `${Math.min(Math.abs(s.impact) / 4 * 100, 48)}%`,
                              [s.impact > 0 ? 'left' : 'right']: '50%',
                            }}
                          />
                        </div>
                        <span className={`shap-value ${s.impact > 0 ? 'positive' : 'negative'}`}>
                          {s.impact > 0 ? '+' : ''}{s.impact.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="shap-note">
                    Red bars push toward delay | Green bars push toward on-time
                  </p>
                </div>
              )}

              {/* Alternative Suggestions */}
              {result.alternatives && result.alternatives.length > 0 && (
                <div className="alternatives-section">
                  <h4>Better Options Available</h4>
                  <p className="alt-desc">Lower-risk alternatives for the same route</p>
                  <div className="alt-grid">
                    {result.alternatives.map((alt, i) => (
                      <div key={i} className="alt-card">
                        <div className="alt-carrier">{alt.carrier_name}</div>
                        <div className="alt-time">{alt.dep_hour}:00 departure</div>
                        <div className="alt-risk">
                          <span className={`risk-badge ${alt.risk_level.toLowerCase()}`}>
                            <span className="risk-dot"></span>
                            {Math.round(alt.delay_probability * 100)}%
                          </span>
                          <span className="alt-savings">{alt.savings}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Route History Insights */}
              {result.route_insights && result.route_insights.length > 0 && (
                <div className="route-insights-section">
                  <h4>Historical Route Analysis</h4>
                  <div className="insights-list">
                    {result.route_insights.map((insight, i) => (
                      <div key={i} className="insight-item">
                        <span className="insight-icon">
                          {i === 0 ? '⚠' : i === 1 ? '✅' : 'ℹ️'}
                        </span>
                        <span className="insight-text">{insight}</span>
                      </div>
                    ))}
                  </div>
                  {result.season_risks && (
                    <div className="season-chart">
                      <div className="season-bars">
                        {Object.entries(result.season_risks).map(([season, risk]) => (
                          <div key={season} className="season-bar-item">
                            <div className="season-bar-bg">
                              <div
                                className="season-bar-fill"
                                style={{
                                  height: `${risk}%`,
                                  background: risk >= 40 ? '#ef4444' : risk >= 25 ? '#f59e0b' : '#10b981'
                                }}
                              />
                            </div>
                            <span className="season-label">{season}</span>
                            <span className="season-value">{risk}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="result-placeholder card">
              <div className="placeholder-plane">
                <svg viewBox="0 0 24 24" fill="none" className="placeholder-plane-svg">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="url(#planeGrad)"/>
                  <defs>
                    <linearGradient id="planeGrad" x1="0" y1="0" x2="24" y2="24">
                      <stop offset="0%" stopColor="#667eea"/>
                      <stop offset="100%" stopColor="#764ba2"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="placeholder-rings">
                  <div className="ring ring-1"></div>
                  <div className="ring ring-2"></div>
                  <div className="ring ring-3"></div>
                </div>
              </div>
              <h3>Select Your Flight</h3>
              <p>Choose airline, route, and schedule — AI predicts delay risk using dual-region models.</p>
              <div className="placeholder-features">
                <span>XGBoost ML</span>
                <span>US + India Models</span>
                <span>Live Weather</span>
                <span>Crew Rules</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictionPanel;
