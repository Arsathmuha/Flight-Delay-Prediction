import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import API_BASE from '../config';
import './FlightBoard.css';

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

function FlightBoard() {
  const [flights, setFlights] = useState([]);
  const [origin, setOrigin] = useState('DEL');
  const [region, setRegion] = useState('india');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const [countdown, setCountdown] = useState(30);

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/realtime-board?origin=${origin}`);
      const data = await res.json();
      setFlights(data.flights);
      setWeather(data.weather);
      setDataSource(data.data_source || 'simulated');
      setLastUpdate(new Date().toLocaleTimeString());
      setCountdown(30);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [origin]);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, 30000);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flight-board">
      <div className="board-header">
        <div>
          <h2 className="section-title">Real-Time Departure Board</h2>
          <p className="board-subtitle">
            Live flight data + weather + ML prediction — auto-updates every 30s
          </p>
        </div>
        <div className="board-controls">
          <div className="region-toggle-sm">
            <button className={region === 'india' ? 'active' : ''} onClick={() => { setRegion('india'); setOrigin('DEL'); }}>India</button>
            <button className={region === 'us' ? 'active' : ''} onClick={() => { setRegion('us'); setOrigin('ORD'); }}>US</button>
          </div>
          <select value={origin} onChange={e => setOrigin(e.target.value)}>
            {(region === 'india' ? INDIA_AIRPORTS : US_AIRPORTS).map(a => (
              <option key={a} value={a}>{a} — {AIRPORT_NAMES[a] || a}</option>
            ))}
          </select>
          <button className="refresh-btn" onClick={fetchFlights}>
            Refresh Now
          </button>
        </div>
      </div>

      {/* Live weather strip */}
      {weather && (
        <div className="weather-strip">
          <div className="weather-info">
            <span className="weather-icon">
              {weather.weather_risk_score > 0.3 ? '⛈️' :
               weather.weather_risk_score > 0.15 ? '🌧️' :
               weather.weather_risk_score > 0.05 ? '⛅' : '☀️'}
            </span>
            <span className="weather-desc">{weather.weather_desc}</span>
            <span className="weather-temp">{Math.round(weather.temperature_c)}°C</span>
            <span className="weather-wind">Wind: {Math.round(weather.wind_speed_kmh)} km/h</span>
            {weather.precipitation_mm > 0 && (
              <span className="weather-precip">Precip: {weather.precipitation_mm}mm</span>
            )}
          </div>
          <div className={`weather-risk ${weather.weather_risk_score > 0.2 ? 'elevated' : 'normal'}`}>
            Weather Delay Risk: {(weather.weather_risk_score * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="update-bar">
        <div className="update-left">
          <span className="live-dot"></span>
          <span>Updated: {lastUpdate || '...'}</span>
          <span className="countdown">Refresh in {countdown}s</span>
        </div>
        <div className="data-source">
          Data: <strong>{dataSource === 'airlabs' ? 'AirLabs Live Feed' :
                        dataSource === 'opensky' ? 'OpenSky Network' :
                        'ML Simulation'}</strong>
          {dataSource !== 'simulated' && <span className="live-badge">LIVE</span>}
        </div>
      </div>

      {loading && flights.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Fetching live flights...</p>
        </div>
      ) : (
        <div className="board-table">
          <div className="table-header">
            <span>Flight</span>
            <span>Airline</span>
            <span>Destination</span>
            <span>Departure</span>
            <span>AI Delay Prediction</span>
            <span>Risk</span>
            <span>Est. Delay</span>
            <span>Reason</span>
          </div>
          {flights.map((flight, i) => (
            <motion.div
              key={flight.flight_number + i}
              className={`table-row ${flight.actual_status === 'DELAYED' ? 'row-delayed' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <span className="flight-number">
                {flight.flight_number}
                {flight.gate && flight.gate !== '-' && (
                  <small className="gate-info">Gate {flight.gate}</small>
                )}
              </span>
              <span className="flight-carrier">{flight.carrier_name}</span>
              <span className="flight-dest">
                <strong>{flight.dest}</strong>
                <small>{flight.dest_city}</small>
              </span>
              <span className="flight-time">
                {flight.dep_time}
                {flight.actual_status === 'DELAYED' && (
                  <small className="actual-delayed">DELAYED</small>
                )}
              </span>
              <span className="flight-prob">
                <div className="prob-bar-wrapper">
                  <div
                    className="prob-bar"
                    style={{
                      width: `${flight.delay_probability * 100}%`,
                      background: flight.risk_level === 'HIGH' ? '#ef4444' :
                                  flight.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
                <span className="prob-value">{(flight.delay_probability * 100).toFixed(0)}%</span>
              </span>
              <span>
                <span className={`risk-badge ${flight.risk_level.toLowerCase()}`}>
                  {flight.risk_level}
                </span>
              </span>
              <span className="flight-delay-est">
                {flight.estimated_delay && flight.estimated_delay !== 'On time' ? (
                  <span className="delay-time">{flight.estimated_delay}</span>
                ) : (
                  <span className="on-time">On time</span>
                )}
              </span>
              <span className="flight-reason">
                {flight.delay_reason || '-'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FlightBoard;
