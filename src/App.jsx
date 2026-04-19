import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import { fetchBPData, getSummary } from './utils/dataProcessor';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] }
});

const BPTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      fontSize: '0.78rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      <p style={{ color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {p.value} {p.dataKey === 'hr' ? 'bpm' : 'mmHg'}
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ label, value, unit, icon, color, bg, badge, trend, delay }) => (
  <motion.div className="card-glass" {...fadeUp(delay)}>
    <div className="card-icon-wrap" style={{ background: bg }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
    </div>
    <div className="card-label">{label}</div>
    <div className="card-value" style={{ color }}>
      {value}
      {unit && <span className="card-unit">{unit}</span>}
    </div>
    {badge}
    {trend !== undefined && (
      <div className="stat-change" style={{ color: trend <= 0 ? '#10b981' : '#f43f5e' }}>
        <span className="trend-arrow">{trend <= 0 ? '▼' : '▲'}</span>
        {Math.abs(trend)} mmHg vs prev 14d
      </div>
    )}
  </motion.div>
);

const Pill = ({ status }) => (
  <span className="status-pill" style={{ background: status.bg, color: status.color }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: status.color, display: 'inline-block'
    }} />
    {status.label}
  </span>
);

export default function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBPData()
      .then(d => { setData(d); setSummary(getSummary(d)); })
      .catch(() => setError('Unable to load data. Check your internet connection or ensure the Sheet is public.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loader">
      <div className="loader-ring" />
      <p className="loader-text">Syncing health data…</p>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: '8rem auto', textAlign: 'center' }} className="card-glass">
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
      <h3 style={{ marginBottom: '0.5rem' }}>Connection Error</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{error}</p>
    </div>
  );

  if (!summary) return null;

  const chartData = data.map(d => ({
    date: d.dateLabel,
    dateFull: d.dateFull,
    time: d.time,
    sys: d.sys,
    dia: d.dia,
    hr: d.hr,
    pp: d.pp,
  }));

  const statusOrder = ['Normal', 'Elevated', 'Stage 1 High', 'Stage 2 High', 'Crisis'];
  const statusColors = {
    'Normal': '#10b981',
    'Elevated': '#f59e0b',
    'Stage 1 High': '#f97316',
    'Stage 2 High': '#ef4444',
    'Crisis': '#dc2626',
  };

  const latestStatus = summary.latest.status;

  const timeSlots = [
    { key: 'morning', label: 'Morning', icon: '🌅', bg: 'rgba(245,158,11,0.1)', data: summary.morning },
    { key: 'midDay', label: 'Mid-Day', icon: '☀️', bg: 'rgba(56,189,248,0.1)', data: summary.midDay },
    { key: 'evening', label: 'Evening', icon: '🌙', bg: 'rgba(139,92,246,0.1)', data: summary.evening },
  ];

  const insights = buildInsights(summary, data);

  return (
    <div>
      <motion.header className="header" {...fadeUp(0)}>
        <div className="header-left">
          <h1>Blood Pressure Dashboard</h1>
          <p>
            {summary.total} readings · {data[0]?.dateFull} – {summary.latest.dateFull}
          </p>
        </div>
        <div className="header-badge">
          <div className="pulse-dot" />
          Live · Google Sheets
        </div>
      </motion.header>

      <div className="stats-row">
        <StatCard
          label="Latest Reading"
          value={`${summary.latest.sys}/${summary.latest.dia}`}
          unit="mmHg"
          icon="❤️"
          color={latestStatus.color}
          bg={latestStatus.bg}
          badge={<Pill status={latestStatus} />}
          delay={0.05}
        />
        <StatCard
          label="Average BP"
          value={`${summary.avgSys}/${summary.avgDia}`}
          unit="mmHg"
          icon="📊"
          color="#38bdf8"
          bg="rgba(56,189,248,0.1)"
          trend={summary.trendSys}
          delay={0.1}
        />
        <StatCard
          label="Avg Heart Rate"
          value={summary.avgHr}
          unit="bpm"
          icon="💓"
          color="#f43f5e"
          bg="rgba(244,63,94,0.1)"
          delay={0.15}
        />
        <StatCard
          label="Range (Systolic)"
          value={`${summary.minSys}–${summary.maxSys}`}
          unit="mmHg"
          icon="📈"
          color="#f59e0b"
          bg="rgba(245,158,11,0.1)"
          delay={0.2}
        />
      </div>

      <div className="charts-row">
        <motion.div className="card-glass" {...fadeUp(0.25)}>
          <div className="chart-title">
            <span>Blood Pressure Trend</span>
            <div className="chart-legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: '#10b981' }} />Systolic</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#38bdf8' }} />Diastolic</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="gSys" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis domain={[50, 180]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={120} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 3" />
              <ReferenceLine y={130} stroke="rgba(249,115,22,0.3)" strokeDasharray="4 3" />
              <ReferenceLine y={140} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 3" />
              <Tooltip content={<BPTooltip />} />
              <Area type="monotone" dataKey="sys" name="Systolic" stroke="#10b981" strokeWidth={2.5} fill="url(#gSys)" dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
              <Area type="monotone" dataKey="dia" name="Diastolic" stroke="#38bdf8" strokeWidth={2.5} fill="url(#gDia)" dot={false} activeDot={{ r: 5, fill: '#38bdf8' }} />
            </AreaChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.75rem', textAlign: 'right' }}>
            Dashed lines: normal (120) · elevated (130) · stage 1 (140)
          </p>
        </motion.div>

        <motion.div className="card-glass" {...fadeUp(0.3)}>
          <div className="chart-title"><span>By Time of Day</span></div>
          <div>
            {timeSlots.map(({ label, icon, bg, data: td }) => (
              td ? (
                <div className="time-row" key={label}>
                  <div className="time-label">
                    <div className="time-icon" style={{ background: bg }}>{icon}</div>
                    {label}
                  </div>
                  <div className="time-val">
                    <div className="time-bp">{td.sys}/{td.dia}</div>
                    <div className="time-sub">{td.hr} bpm · {td.count} readings</div>
                  </div>
                </div>
              ) : null
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <div className="card-label" style={{ marginBottom: '0.75rem' }}>Heart Rate Trend</div>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={chartData.slice(-20)} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <Line type="monotone" dataKey="hr" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip content={<BPTooltip />} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="bottom-row">
        <motion.div className="card-glass" {...fadeUp(0.35)}>
          <div className="chart-title"><span>Readings Breakdown</span></div>
          {statusOrder.map(label => {
            const count = summary.statusCounts[label] || 0;
            const pct = Math.round((count / summary.total) * 100);
            if (count === 0) return null;
            return (
              <div className="status-bar-item" key={label}>
                <div className="status-bar-header">
                  <span style={{ color: statusColors[label], fontWeight: 600, fontSize: '0.75rem' }}>{label}</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{count} ({pct}%)</span>
                </div>
                <div className="status-bar-track">
                  <motion.div
                    className="status-bar-fill"
                    style={{ background: statusColors[label], width: `${pct}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div className="card-glass" {...fadeUp(0.4)}>
          <div className="chart-title">
            <span>Pulse Pressure</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>Sys − Dia</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData.slice(-30)} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={15} />
              <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<BPTooltip />} />
              <ReferenceLine y={40} stroke="rgba(245,158,11,0.35)" strokeDasharray="4 3" />
              <Bar dataKey="pp" name="Pulse Pressure" radius={[4,4,0,0]}>
                {chartData.slice(-30).map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.pp > 60 ? '#ef4444' : entry.pp > 40 ? '#f59e0b' : '#10b981'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.6rem' }}>
            Healthy range: 40–60 mmHg · Last 30 readings
          </p>
        </motion.div>

        <motion.div className="card-glass" {...fadeUp(0.45)}>
          <div className="chart-title"><span>Insights</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {insights.map((ins, i) => (
              <div className="insight-card" key={i}>
                <div className="insight-icon" style={{ background: ins.bg }}>
                  {ins.icon}
                </div>
                <div>
                  <div className="insight-title">{ins.title}</div>
                  <div className="insight-text">{ins.text}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function buildInsights(summary, data) {
  const insights = [];

  if (summary.trendSys !== 0) {
    const improving = summary.trendSys < 0;
    insights.push({
      icon: improving ? '📉' : '📈',
      title: improving ? 'Improving Trend' : 'Rising Trend',
      text: `Your systolic average is ${Math.abs(summary.trendSys)} mmHg ${improving ? 'lower' : 'higher'} compared to the previous 14-day window.`,
      bg: improving ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
    });
  }

  const times = [
    { label: 'Morning', d: summary.morning },
    { label: 'Mid-Day', d: summary.midDay },
    { label: 'Evening', d: summary.evening },
  ].filter(t => t.d);
  if (times.length > 1) {
    const best = times.reduce((a, b) => a.d.sys < b.d.sys ? a : b);
    insights.push({
      icon: '🕐',
      title: `${best.label} Is Your Best Time`,
      text: `Your average BP is lowest in the ${best.label.toLowerCase()} at ${best.d.sys}/${best.d.dia} mmHg.`,
      bg: 'rgba(56,189,248,0.1)',
    });
  }

  const normalPct = Math.round(((summary.statusCounts['Normal'] || 0) / summary.total) * 100);
  insights.push({
    icon: normalPct >= 50 ? '✅' : '⚠️',
    title: `${normalPct}% Normal Readings`,
    text: normalPct >= 50
      ? 'Good progress! More than half of your readings are in the normal range.'
      : 'Most of your readings are above normal. Consider discussing with your doctor.',
    bg: normalPct >= 50 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
  });

  return insights;
}