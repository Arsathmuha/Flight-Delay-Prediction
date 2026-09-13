import React, { useState } from 'react';
import { motion } from 'framer-motion';
import API_BASE from '../config';
import './BookingAdvisor.css';

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
  'VNS': 'Varanasi', 'IXR': 'Ranchi', 'BBI': 'Bhubaneswar', 'SXR': 'Srinagar', 'IXM': 'Madurai'
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function BookingAdvisor() {
  const [region, setRegion] = useState('india');
  const [form, setForm] = useState({
    origin: 'DEL',
    dest: 'BOM',
    month: 12,
    preferred_time: 'any',
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const airports = region === 'india' ? INDIA_AIRPORTS : US_AIRPORTS;

  const switchRegion = (r) => {
    setRegion(r);
    setResults(null);
    if (r === 'india') {
      setForm(prev => ({ ...prev, origin: 'DEL', dest: 'BOM' }));
    } else {
      setForm(prev => ({ ...prev, origin: 'JFK', dest: 'LAX' }));
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/booking-advisor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getHeatLevel = (val) => {
    if (val >= 60) return 'extreme';
    if (val >= 40) return 'high';
    if (val >= 25) return 'med';
    return 'low';
  };

  return (
    <div className="booking-advisor">
      <div className="advisor-header">
        <h2 className="section-title">Pre-Booking Delay Advisor</h2>
        <p className="advisor-subtitle">
          Planning a trip? Find the best airline, day, and time slot to minimize delay risk on your route.
        </p>
      </div>

      {/* Form */}
      <div className="advisor-form-card">
        <div className="advisor-region-switch">
          <button className={region === 'india' ? 'active' : ''} onClick={() => switchRegion('india')}>
            <span className="region-flag">IN</span> India Domestic
          </button>
          <button className={region === 'us' ? 'active' : ''} onClick={() => switchRegion('us')}>
            <span className="region-flag">US</span> United States
          </button>
        </div>

        <h3>Select Route & Month</h3>

        <div className="advisor-form-grid">
          <div className="form-group">
            <label>From</label>
            <select value={form.origin} onChange={e => handleChange('origin', e.target.value)}>
              {airports.map(a => <option key={a} value={a}>{a} — {AIRPORT_NAMES[a]}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>To</label>
            <select value={form.dest} onChange={e => handleChange('dest', e.target.value)}>
              {airports.filter(a => a !== form.origin).map(a => (
                <option key={a} value={a}>{a} — {AIRPORT_NAMES[a]}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Travel Month</label>
            <select value={form.month} onChange={e => handleChange('month', parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Time Preference</label>
            <select value={form.preferred_time} onChange={e => handleChange('preferred_time', e.target.value)}>
              <option value="any">Any Time (find best)</option>
              <option value="morning">Morning (5-11 AM)</option>
              <option value="afternoon">Afternoon (12-5 PM)</option>
              <option value="evening">Evening (6-11 PM)</option>
            </select>
          </div>
        </div>

        <button className="predict-btn" onClick={analyze} disabled={loading}>
          {loading ? 'Analyzing all carriers...' : 'Analyze Best Booking Options'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <motion.div
          className="advisor-results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Best Pick */}
          <div className="best-pick-card">
            <div className="best-pick-top">
              <span className="best-badge">RECOMMENDED</span>
              <span className="best-carrier-name">{results.best_option.carrier_name}</span>
            </div>
            <div className="best-stats-row">
              <div className="best-stat">
                <span className="best-stat-value">{results.best_option.best_day}</span>
                <span className="best-stat-label">Best Day</span>
              </div>
              <div className="best-stat">
                <span className="best-stat-value">{results.best_option.best_time}</span>
                <span className="best-stat-label">Departure</span>
              </div>
              <div className="best-stat">
                <span className="best-stat-value green">{results.best_option.delay_risk}%</span>
                <span className="best-stat-label">Delay Risk</span>
              </div>
            </div>
            <p className="best-tip">{results.best_option.tip}</p>
          </div>

          {/* Airlines Comparison */}
          <div className="airlines-card">
            <h3>Airline Comparison — {MONTHS[form.month - 1]} {form.origin} to {form.dest}</h3>
            <div className="airline-header">
              <span>Airline</span>
              <span>Best Day</span>
              <span>Time</span>
              <span>Risk</span>
              <span>Rating</span>
            </div>
            <div className="airline-list">
              {results.carriers.map((c, i) => (
                <motion.div
                  key={c.carrier}
                  className={`airline-row ${i === 0 ? 'rank-1' : ''}`}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <span className="airline-name">
                    <span className="airline-rank">{i + 1}</span>
                    {c.carrier_name}
                  </span>
                  <span className="airline-day">{c.best_day}</span>
                  <span className="airline-time">{c.best_time}</span>
                  <span className={`airline-risk ${c.delay_risk < 25 ? 'low' : c.delay_risk < 40 ? 'med' : 'high'}`}>
                    {c.delay_risk}%
                  </span>
                  <span className="airline-stars">
                    {Array.from({ length: 5 }, (_, s) => (
                      <span key={s} className={`star ${s < c.stars ? 'filled' : 'empty'}`} />
                    ))}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Heatmap */}
          <div className="heatmap-card">
            <h3>Risk Heatmap — {form.origin} to {form.dest}</h3>
            <div className="heatmap-grid">
              <div className="heatmap-header">
                <span></span>
                {DAYS.map(d => (
                  <span key={d} className="heatmap-day-label">{d}</span>
                ))}
              </div>
              {results.heatmap.map((row) => (
                <div key={row.time_slot} className="heatmap-row">
                  <span className="heatmap-slot-label">{row.time_slot}</span>
                  {row.days.map((val, i) => (
                    <div
                      key={i}
                      className={`heatmap-cell level-${getHeatLevel(val)}`}
                      title={`${DAYS[i]} ${row.time_slot}: ${val}% delay risk`}
                    >
                      {val}%
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="tips-card">
            <h3>Smart Booking Tips — {MONTHS[form.month - 1]}</h3>
            <div className="tips-list">
              {results.tips.map((tip, i) => (
                <motion.div
                  key={i}
                  className="tip-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <span className="tip-icon">{i + 1}</span>
                  <span className="tip-text">{tip}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default BookingAdvisor;
