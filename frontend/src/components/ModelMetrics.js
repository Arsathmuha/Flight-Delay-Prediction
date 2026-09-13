import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import './ModelMetrics.css';

function ModelMetrics({ metrics, stats }) {
  if (!metrics) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading model metrics...</p>
      </div>
    );
  }

  const performanceData = [
    { metric: 'AUC-ROC', value: (metrics.auc_roc * 100), color: '#3b82f6' },
    { metric: 'Accuracy', value: (metrics.accuracy * 100), color: '#8b5cf6' },
    { metric: 'Precision', value: (metrics.precision * 100), color: '#06b6d4' },
    { metric: 'Recall', value: (metrics.recall * 100), color: '#10b981' },
    { metric: 'F1-Score', value: (metrics.f1_score * 100), color: '#f59e0b' },
  ];

  const cm = metrics.confusion_matrix || {};
  const total = (cm.tn || 0) + (cm.fp || 0) + (cm.fn || 0) + (cm.tp || 0);

  const featureData = metrics.feature_importance
    ? Object.entries(metrics.feature_importance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({
          feature: name.replace(/_/g, ' ').replace('ENC', '').replace('PRIOR LEG DELAY', 'Late Aircraft'),
          importance: (value * 100).toFixed(1),
        }))
    : [];

  return (
    <div className="model-metrics">
      <h2 className="section-title">Model Performance</h2>
      <p className="metrics-sub">
        XGBoost classifier trained on {metrics.dataset?.total_flights?.toLocaleString() || '500,000'} real US flights (BTS 2015)
      </p>

      <div className="metrics-cards">
        {performanceData.map((item, i) => (
          <motion.div
            key={item.metric}
            className="metric-card card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="metric-label">{item.metric}</div>
            <div className="metric-value" style={{ color: item.color }}>
              {item.value.toFixed(1)}%
            </div>
            <div className="metric-bar">
              <div className="metric-bar-fill" style={{ width: `${item.value}%`, background: item.color }} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="metrics-body">
        <div className="card cm-card">
          <h3>Confusion Matrix</h3>
          <p className="cm-note">Test set: {total.toLocaleString()} flights</p>
          <div className="confusion-matrix">
            <div className="cm-grid">
              <div className="cm-corner"></div>
              <div className="cm-head">Predicted On-Time</div>
              <div className="cm-head">Predicted Delayed</div>
              <div className="cm-side">Actual On-Time</div>
              <div className="cm-cell tn">
                <span className="cm-val">{(cm.tn || 0).toLocaleString()}</span>
                <span className="cm-pct">{total ? ((cm.tn / total) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="cm-cell fp">
                <span className="cm-val">{(cm.fp || 0).toLocaleString()}</span>
                <span className="cm-pct">{total ? ((cm.fp / total) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="cm-side">Actual Delayed</div>
              <div className="cm-cell fn">
                <span className="cm-val">{(cm.fn || 0).toLocaleString()}</span>
                <span className="cm-pct">{total ? ((cm.fn / total) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="cm-cell tp">
                <span className="cm-val">{(cm.tp || 0).toLocaleString()}</span>
                <span className="cm-pct">{total ? ((cm.tp / total) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card feat-card">
          <h3>Feature Importance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={featureData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
              <YAxis type="category" dataKey="feature" stroke="var(--text-muted)" fontSize={11} width={100} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Bar dataKey="importance" name="Importance %" radius={[0, 4, 4, 0]}>
                {featureData.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats && (
        <div className="stats-section">
          <h3>Dataset Summary</h3>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-num">{stats.total_flights_analyzed?.toLocaleString()}</span>
              <span className="stat-desc">Flights in dataset</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{stats.delay_rate}%</span>
              <span className="stat-desc">Overall delay rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{stats.avg_delay_minutes} min</span>
              <span className="stat-desc">Avg delay when late</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{stats.carriers_analyzed}</span>
              <span className="stat-desc">Airlines</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{stats.routes_analyzed?.toLocaleString()}</span>
              <span className="stat-desc">Routes</span>
            </div>
          </div>
          {stats.top_delay_causes && (
            <div className="causes-section">
              <h4>Top Delay Causes (avg minutes when delayed)</h4>
              <div className="causes-list">
                {Object.entries(stats.top_delay_causes).map(([cause, mins]) => (
                  <div key={cause} className="cause-item">
                    <span className="cause-name">{cause}</span>
                    <div className="cause-bar-wrap">
                      <div className="cause-bar" style={{ width: `${Math.min(100, mins / 25 * 100)}%` }} />
                    </div>
                    <span className="cause-val">{mins} min</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModelMetrics;
