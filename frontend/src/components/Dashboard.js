import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import './Dashboard.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

function Dashboard({ stats }) {
  if (!stats) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  const monthlyData = Object.entries(stats.monthly).map(([month, data]) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(month) - 1],
    delay_rate: (data.delay_rate * 100).toFixed(1),
    flights: data.total_flights,
  }));

  const hourlyData = Object.entries(stats.hourly).map(([hour, data]) => ({
    hour: `${hour}:00`,
    delay_rate: (data.delay_rate * 100).toFixed(1),
    flights: data.total_flights,
  }));

  const carrierData = Object.entries(stats.carriers)
    .map(([code, data]) => ({
      carrier: code,
      delay_rate: (data.delay_rate * 100).toFixed(1),
      flights: data.total_flights,
    }))
    .sort((a, b) => b.delay_rate - a.delay_rate);

  const airportData = Object.entries(stats.airports)
    .map(([code, data]) => ({
      airport: code,
      delay_rate: (data.delay_rate * 100).toFixed(1),
      congestion: data.congestion,
    }))
    .sort((a, b) => b.delay_rate - a.delay_rate)
    .slice(0, 10);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: {p.value}{p.name.includes('rate') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-header"
      >
        <h2 className="section-title">Delay Analytics Dashboard</h2>
        <p className="dashboard-subtitle">Insights from 50,000+ flights across 10 carriers and 20 airports</p>
      </motion.div>

      <div className="stats-grid grid-4">
        <div className="stat-card card">
          <div className="card-title">Overall Delay Rate</div>
          <div className="card-value">
            {(Object.values(stats.carriers).reduce((a, c) => a + c.delay_rate, 0) / Object.keys(stats.carriers).length * 100).toFixed(1)}%
          </div>
        </div>
        <div className="stat-card card">
          <div className="card-title">Worst Month</div>
          <div className="card-value">
            {monthlyData.reduce((a, b) => parseFloat(a.delay_rate) > parseFloat(b.delay_rate) ? a : b).month}
          </div>
        </div>
        <div className="stat-card card">
          <div className="card-title">Peak Hour</div>
          <div className="card-value">
            {hourlyData.reduce((a, b) => parseFloat(a.delay_rate) > parseFloat(b.delay_rate) ? a : b).hour}
          </div>
        </div>
        <div className="stat-card card">
          <div className="card-title">Most Delayed Carrier</div>
          <div className="card-value">{carrierData[0]?.carrier}</div>
        </div>
      </div>

      <div className="charts-grid grid-2">
        <div className="chart-card card">
          <h3>Monthly Delay Rate (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="delay_rate"
                name="Delay Rate"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Hourly Delay Pattern (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={10} angle={-45} textAnchor="end" height={50} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="delay_rate" name="Delay Rate" radius={[4, 4, 0, 0]}>
                {hourlyData.map((entry, i) => (
                  <Cell key={i} fill={parseFloat(entry.delay_rate) > 25 ? '#ef4444' : parseFloat(entry.delay_rate) > 20 ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Carrier Delay Rates (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={carrierData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
              <YAxis type="category" dataKey="carrier" stroke="var(--text-muted)" fontSize={12} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="delay_rate" name="Delay Rate" radius={[0, 4, 4, 0]}>
                {carrierData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Top 10 Airports by Delay Rate (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={airportData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
              <YAxis type="category" dataKey="airport" stroke="var(--text-muted)" fontSize={12} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="delay_rate" name="Delay Rate" radius={[0, 4, 4, 0]}>
                {airportData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
