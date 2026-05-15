import { useEffect, useState } from 'react';
import { Row, Col } from 'react-bootstrap';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { analyticsApi } from '../api';
import { useTheme } from '../context/ThemeContext';

/* ── Formatters ──────────────────────────────────────────────── */
const fmt = (v) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
}).format(v || 0);
const fmtFull = (v) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(v || 0);
const fmtNum = (v) => new Intl.NumberFormat('en-US').format(v || 0);

/* ── Config ──────────────────────────────────────────────────── */
const PERIODS = [
  { label: '7d',  value: 7  },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '6M',  value: 180 },
  { label: '1Y',  value: 365 },
];

const MODE_COLORS = {
  sea: '#1a56db', air: '#dc2626', road: '#059669',
  rail: '#7c3aed', multimodal: '#d97706', courier: '#0891b2',
};

const AR_COLORS = ['#16a34a', '#ca8a04', '#d97706', '#dc2626', '#7c3aed'];

/* ── KPI card ────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, sub, accent, badge, badgeColor }) => (
  <div className="analytics-kpi-card" style={{ '--kpi-accent': accent }}>
    <div className="analytics-kpi-top">
      <div className="analytics-kpi-icon">
        <i className={`bi ${icon}`}></i>
      </div>
      {badge && (
        <span
          className="analytics-kpi-badge"
          style={{ background: `${badgeColor || accent}18`, color: badgeColor || accent }}
        >
          {badge}
        </span>
      )}
    </div>
    <div className="analytics-kpi-label">{label}</div>
    <div className="analytics-kpi-value">{value}</div>
    {sub && <div className="analytics-kpi-sub">{sub}</div>}
  </div>
);

/* ── Chart tooltip ───────────────────────────────────────────── */
const ChartTip = ({ active, payload, label, isDark, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: isDark ? '#161b22' : '#fff',
      border: `1px solid ${isDark ? '#30363d' : '#e9ecef'}`,
      borderRadius: 10,
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,.15)',
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: isDark ? '#e6edf3' : '#0d1117' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{formatter ? formatter(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Analytics page ──────────────────────────────────────────── */
const Analytics = () => {
  const { isDark } = useTheme();
  const [days, setDays]             = useState(30);
  const [overview, setOverview]     = useState(null);
  const [trend, setTrend]           = useState([]);
  const [byMode, setByMode]         = useState([]);
  const [topCustomers, setTop]      = useState([]);
  const [arAging, setArAging]       = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [o, t, m, c, a] = await Promise.all([
          analyticsApi.overview({ days }),
          analyticsApi.trend({ days }),
          analyticsApi.revenueByMode({ days }),
          analyticsApi.topCustomers({ days, limit: 6 }),
          analyticsApi.arAging(),
        ]);
        if (cancelled) return;
        setOverview(o.kpis);
        setTrend(t.data || []);
        setByMode((m.data || []).map((d) => ({ mode: d._id, ...d })));
        setTop(c.data || []);
        setArAging(a.data || []);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [days]);

  const grid = isDark ? '#30363d' : '#e9ecef';
  const tick = isDark ? '#8b949e' : '#6c757d';

  const arTotal = arAging.reduce((s, b) => s + b.total, 0);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-graph-up-arrow"></i></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <h4 className="ss-page-title" style={{ margin: 0 }}>Business Analytics</h4>
            <span className="ss-info-tip" data-tip="KPIs, trends, and performance across all operations">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25"/>
                <circle cx="8" cy="5.2" r="0.85" fill="currentColor"/>
                <path d="M8 7.5v3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>
        <div className="analytics-period-bar">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`analytics-period-pill${days === p.value ? ' active' : ''}`}
              onClick={() => setDays(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !overview ? (
        <div className="ss-loading">
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring"></div>
            <i className="bi bi-graph-up-arrow dashboard-loader-icon"></i>
          </div>
          <span>Loading analytics…</span>
        </div>
      ) : (
        <>
          {/* ── KPI Grid ─────────────────────────────────── */}
          <div className="analytics-kpi-grid">
            <KpiCard
              icon="bi-box-seam"
              label="Total Shipments"
              value={fmtNum(overview.shipments)}
              sub={`In last ${days} days`}
              accent="#7c3aed"
            />
            <KpiCard
              icon="bi-cash-stack"
              label="Revenue"
              value={fmt(overview.revenue)}
              sub={`Margin ${overview.profitMargin}%`}
              accent="#1a56db"
              badge={`${overview.profitMargin}% margin`}
              badgeColor="#1a56db"
            />
            <KpiCard
              icon="bi-graph-up"
              label="Gross Profit"
              value={fmt(overview.profit)}
              sub={`Cost ${fmt(overview.revenue - overview.profit)}`}
              accent="#16a34a"
            />
            <KpiCard
              icon="bi-clock-history"
              label="On-Time Delivery"
              value={overview.onTimeDeliveryPct !== null ? `${overview.onTimeDeliveryPct}%` : '—'}
              accent={overview.onTimeDeliveryPct >= 90 ? '#16a34a' : overview.onTimeDeliveryPct >= 70 ? '#d97706' : '#dc2626'}
              badge={overview.onTimeDeliveryPct >= 90 ? 'Excellent' : overview.onTimeDeliveryPct >= 70 ? 'Fair' : 'Low'}
              badgeColor={overview.onTimeDeliveryPct >= 90 ? '#16a34a' : overview.onTimeDeliveryPct >= 70 ? '#d97706' : '#dc2626'}
            />
            <KpiCard
              icon="bi-receipt"
              label="Invoiced"
              value={fmt(overview.invoicedAmount)}
              sub={`${overview.invoicesIssued} invoices issued`}
              accent="#0891b2"
            />
            <KpiCard
              icon="bi-wallet2"
              label="Collected"
              value={fmt(overview.collectedAmount)}
              sub="Cash received in period"
              accent="#059669"
            />
            <KpiCard
              icon="bi-exclamation-triangle"
              label="Outstanding AR"
              value={fmt(overview.outstandingAR)}
              sub={`${overview.openInvoices} open invoices`}
              accent="#d97706"
              badge={overview.openInvoices > 0 ? 'Action needed' : undefined}
              badgeColor="#d97706"
            />
            <KpiCard
              icon="bi-percent"
              label="Profit Margin"
              value={`${overview.profitMargin}%`}
              sub="Revenue − cost / revenue"
              accent="#7c3aed"
            />
          </div>

          {/* ── Trend + Mode ─────────────────────────────── */}
          <Row className="g-3 mb-3">
            <Col lg={8}>
              <div className="erp-card">
                <div className="erp-card-header">
                  <span className="erp-card-title">
                    <i className="bi bi-activity me-2 opacity-50"></i>
                    Shipment Volume Trend
                  </span>
                  <span className="text-muted" style={{ fontSize: 12 }}>daily · {days}d window</span>
                </div>
                <div className="erp-card-body" style={{ height: 260 }}>
                  {trend.length === 0 ? (
                    <div className="dash-empty-state">
                      <i className="bi bi-bar-chart"></i>
                      <span>No trend data for this period</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#1a56db" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#1a56db" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                        <XAxis
                          dataKey="_id"
                          tick={{ fill: tick, fontSize: 10 }}
                          axisLine={false} tickLine={false}
                          interval={Math.floor(trend.length / 6)}
                        />
                        <YAxis tick={{ fill: tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip content={<ChartTip isDark={isDark} />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Shipments"
                          stroke="#1a56db"
                          strokeWidth={2}
                          fill="url(#trendGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#1a56db' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Col>

            <Col lg={4}>
              <div className="erp-card h-100">
                <div className="erp-card-header">
                  <span className="erp-card-title">
                    <i className="bi bi-pie-chart me-2 opacity-50"></i>
                    Revenue by Mode
                  </span>
                </div>
                <div className="erp-card-body" style={{ height: 260 }}>
                  {byMode.length === 0 ? (
                    <div className="dash-empty-state">
                      <i className="bi bi-pie-chart"></i>
                      <span>No mode data</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byMode}
                          dataKey="revenue"
                          nameKey="mode"
                          cx="50%" cy="46%"
                          innerRadius={52}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {byMode.map((d) => (
                            <Cell key={d.mode} fill={MODE_COLORS[d.mode] || '#6c757d'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [fmtFull(v), 'Revenue']}
                          contentStyle={{
                            background: isDark ? '#161b22' : '#fff',
                            border: `1px solid ${grid}`,
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(val) => (
                            <span style={{ fontSize: 11, color: tick, textTransform: 'capitalize' }}>{val}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* ── Top Customers + AR Aging ──────────────── */}
          <Row className="g-3">
            <Col lg={7}>
              <div className="erp-card">
                <div className="erp-card-header">
                  <span className="erp-card-title">
                    <i className="bi bi-people me-2 opacity-50"></i>
                    Top Customers by Revenue
                  </span>
                  <span className="text-muted" style={{ fontSize: 12 }}>top 6</span>
                </div>
                <div className="erp-card-body" style={{ height: 280 }}>
                  {topCustomers.length === 0 ? (
                    <div className="dash-empty-state">
                      <i className="bi bi-people"></i>
                      <span>No customer data</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topCustomers}
                        layout="vertical"
                        margin={{ left: 10, right: 10, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: tick, fontSize: 10 }}
                          tickFormatter={fmt}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="companyName"
                          tick={{ fill: tick, fontSize: 11 }}
                          width={130}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => [fmtFull(v), 'Revenue']}
                          contentStyle={{
                            background: isDark ? '#161b22' : '#fff',
                            border: `1px solid ${grid}`,
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
                          {topCustomers.map((_, i) => (
                            <Cell
                              key={i}
                              fill={`hsl(${215 + i * 18}, 72%, ${50 + i * 4}%)`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Col>

            <Col lg={5}>
              <div className="erp-card h-100">
                <div className="erp-card-header">
                  <span className="erp-card-title">
                    <i className="bi bi-alarm me-2 opacity-50"></i>
                    AR Aging Analysis
                  </span>
                  {arTotal > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>
                      {fmtFull(arTotal)} total
                    </span>
                  )}
                </div>
                {arAging.length === 0 ? (
                  <div className="erp-card-body">
                    <div className="dash-empty-state">
                      <i className="bi bi-check-circle" style={{ color: '#16a34a' }}></i>
                      <span>No outstanding AR</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="erp-card-body" style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={arAging} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                          <XAxis dataKey="bucket" tick={{ fill: tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: tick, fontSize: 10 }} tickFormatter={fmt} axisLine={false} tickLine={false} width={44} />
                          <Tooltip
                            formatter={(v) => [fmtFull(v), 'Outstanding']}
                            contentStyle={{
                              background: isDark ? '#161b22' : '#fff',
                              border: `1px solid ${grid}`,
                              borderRadius: 10,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {arAging.map((_, i) => <Cell key={i} fill={AR_COLORS[i] || '#6c757d'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ padding: '0 18px 14px' }}>
                      {arAging.map((b, i) => {
                        const pct = arTotal > 0 ? (b.total / arTotal) * 100 : 0;
                        return (
                          <div key={b.bucket} className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <div className="d-flex align-items-center gap-2">
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: AR_COLORS[i], display: 'inline-block' }}></span>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{b.bucket}</span>
                                <span style={{ fontSize: 11, color: tick }}>({b.count})</span>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtFull(b.total)}</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: AR_COLORS[i], borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Analytics;
