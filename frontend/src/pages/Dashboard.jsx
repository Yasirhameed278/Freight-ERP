import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, Row, Col, Badge } from 'react-bootstrap';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { analyticsApi } from '../api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

/* ── helpers ────────────────────────────────────────────────── */
const fmtMoney = (v, compact = true) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(v || 0);

const fmtNum = (v) => new Intl.NumberFormat('en-US').format(v || 0);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

/* ── Mode config ─────────────────────────────────────────────── */
const MODES = [
  { key: 'sea',  dir: 'export', label: 'Sea Export', icon: 'bi-water',            color: '#1a56db', unit: 'TEUs',  gradient: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)' },
  { key: 'sea',  dir: 'import', label: 'Sea Import', icon: 'bi-water',            color: '#0891b2', unit: 'TEUs',  gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)' },
  { key: 'air',  dir: 'export', label: 'Air Export', icon: 'bi-airplane',         color: '#dc2626', unit: 'Tons',  gradient: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)' },
  { key: 'air',  dir: 'import', label: 'Air Import', icon: 'bi-airplane-engines', color: '#ea580c', unit: 'Tons',  gradient: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)' },
  { key: 'road', dir: null,     label: 'Logistics',  icon: 'bi-truck',            color: '#059669', unit: 'Jobs',  gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' },
];

const PIE_COLORS = ['#1a56db','#0891b2','#dc2626','#ea580c','#059669','#7c3aed','#d97706','#db2777'];

/* Simulated sparkline data per mode (would be real data in Phase 3) */
const makeSparkline = (base, n = 7) =>
  Array.from({ length: n }, (_, i) => ({
    i,
    v: Math.max(0, base + (Math.random() - 0.4) * base * 0.6),
  }));

/* ── Mode KPI Card ──────────────────────────────────────────── */
const ModeCard = ({ label, icon, color, gradient, jobCount, teuCount, totalGrossWeight, unit }) => {
  const sparkData = makeSparkline(jobCount || 3);
  const sub =
    unit === 'TEUs' ? `${fmtNum(teuCount)} TEUs`
    : unit === 'Tons' ? `${fmtNum(Math.round(totalGrossWeight / 1000))} Tons`
    : 'Active jobs';

  return (
    <div className="mode-kpi-card-v2" style={{ '--mode-color': color, '--mode-gradient': gradient }}>
      <div className="mode-kpi-v2-top">
        <div className="mode-kpi-v2-icon">
          <i className={`bi ${icon}`}></i>
        </div>
        <div className="mode-kpi-v2-body">
          <div className="mode-kpi-v2-label">{label}</div>
          <div className="mode-kpi-v2-count">{fmtNum(jobCount)}</div>
          <div className="mode-kpi-v2-sub">{sub}</div>
        </div>
      </div>
      {/* Mini sparkline */}
      <div className="mode-kpi-v2-spark">
        <ResponsiveContainer width="100%" height={36}>
          <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
              fill={`url(#sg-${color.replace('#','')})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ── Financial KPI Card ─────────────────────────────────────── */
const FinCard = ({ label, value, icon, color, sub, badge, to }) => {
  const inner = (
    <div className="fin-kpi-v2 h-100">
      <div className="fin-kpi-v2-header">
        <span className="fin-kpi-v2-label">{label}</span>
        <div className="fin-kpi-v2-iconwrap" style={{ background: `${color}15`, color }}>
          <i className={`bi ${icon}`}></i>
        </div>
      </div>
      <div className="fin-kpi-v2-value" style={{ color }}>{value}</div>
      <div className="fin-kpi-v2-footer">
        <span className="fin-kpi-v2-sub">{sub}</span>
        {badge && <span className="fin-kpi-v2-badge" style={{ background: `${color}15`, color }}>{badge}</span>}
        {to && <span className="fin-kpi-v2-link"><i className="bi bi-arrow-right-short"></i></span>}
      </div>
    </div>
  );

  return to
    ? <Link to={to} className="text-decoration-none d-block h-100">{inner}</Link>
    : inner;
};

/* ── Recent Activity Feed ───────────────────────────────────── */
const ACTIVITY_FEED = [
  { id: 1, type: 'shipment',  icon: 'bi-boxes',           color: '#1a56db', title: 'SEA-2025-0041 created',          sub: 'Sea Export · Dubai → Hamburg',         time: '8m ago' },
  { id: 2, type: 'invoice',   icon: 'bi-receipt',         color: '#7c3aed', title: 'INV-0089 sent to Acme Corp',      sub: 'USD 14,200 · Due in 30 days',          time: '22m ago' },
  { id: 3, type: 'milestone', icon: 'bi-geo-alt-fill',    color: '#059669', title: 'Cargo Received — AIR-2025-0012', sub: 'Milestone updated by ops team',         time: '1h ago' },
  { id: 4, type: 'approval',  icon: 'bi-check-circle-fill', color: '#16a34a', title: 'SEA-2025-0039 approved',       sub: 'Approved by Manager',                  time: '2h ago' },
  { id: 5, type: 'client',    icon: 'bi-building-add',    color: '#0891b2', title: 'New client: Global Trade Ltd',   sub: 'Added by sales team',                  time: '3h ago' },
  { id: 6, type: 'payment',   icon: 'bi-wallet2',         color: '#d97706', title: 'Payment received — USD 8,500',  sub: 'INV-0084 · Partial payment',           time: '5h ago' },
];

/* ── Custom Tooltip ─────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: isDark ? '#161b22' : '#fff',
      border: `1px solid ${isDark ? '#30363d' : '#e9ecef'}`,
      borderRadius: 10,
      padding: '8px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      fontSize: 12,
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: isDark ? '#fff' : '#111' }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: isDark ? '#8b949e' : '#6c757d' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }}></span>
            {p.name === 'revenue' ? 'Revenue' : p.name === 'profit' ? 'Profit' : p.name === 'total' ? 'Amount' : p.name}
          </span>
          <strong style={{ color: isDark ? '#fff' : '#111' }}>{fmtMoney(p.value, false)}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Dashboard ──────────────────────────────────────────────── */
const Dashboard = () => {
  const { isDark } = useTheme();
  const { user }   = useAuth();

  const [opsKPIs,      setOpsKPIs]      = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [arAging,      setArAging]      = useState([]);
  const [byMode,       setByMode]       = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ops, cust, aging, mode] = await Promise.all([
          analyticsApi.operationalKPIs(),
          analyticsApi.topCustomers({ days: 365, limit: 8 }),
          analyticsApi.arAging(),
          analyticsApi.revenueByMode({ days: 365 }),
        ]);
        if (cancelled) return;
        setOpsKPIs(ops);
        setTopCustomers(cust.data || []);
        setArAging(aging.data || []);
        setByMode(mode.data || []);
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const chartGrid = isDark ? '#30363d' : '#e9ecef';
  const chartTick = isDark ? '#8b949e' : '#6c757d';

  const getModeData = (modeKey, dirKey) => {
    if (!opsKPIs?.byMode) return { jobCount: 0, teuCount: 0, totalGrossWeight: 0 };
    const rows = opsKPIs.byMode.filter((r) => {
      if (modeKey === 'road') return ['road','rail','multimodal','courier'].includes(r._id.mode);
      return r._id.mode === modeKey && (dirKey ? r._id.direction === dirKey : true);
    });
    return rows.reduce(
      (acc, r) => ({
        jobCount:         acc.jobCount + r.jobCount,
        teuCount:         acc.teuCount + r.teuCount,
        totalGrossWeight: acc.totalGrossWeight + r.totalGrossWeight,
      }),
      { jobCount: 0, teuCount: 0, totalGrossWeight: 0 }
    );
  };

  const opTypePieData = MODES.map((m) => {
    const d = getModeData(m.key, m.dir);
    return { name: m.label, value: d.jobCount, color: m.color };
  }).filter((d) => d.value > 0);

  const customerPieData = topCustomers.slice(0, 7).map((c, i) => ({
    name: c.companyName, value: c.revenue, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const financials = opsKPIs?.financials || { outstandingAR: 0, outstandingAP: 0, totalCollected: 0 };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 500, gap: 16 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-truck-front-fill dashboard-loader-icon"></i>
        </div>
        <div className="text-muted" style={{ fontSize: 13 }}>Loading your dashboard…</div>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      {/* ── PHASE 1: Greeting & Header ──────────────────────────── */}
      <div className="dash-greeting">
        <div className="dash-greeting-left">
          <div className="dash-greeting-emoji">
            {new Date().getHours() < 12 ? '🌅' : new Date().getHours() < 17 ? '☀️' : '🌙'}
          </div>
          <div>
            <h5 className="dash-greeting-text">
              {greeting()}, {user?.firstName || 'there'}
            </h5>
            <div className="dash-greeting-date">
              <i className="bi bi-calendar3 me-2 opacity-50"></i>
              {todayLabel()}
            </div>
          </div>
        </div>
        <div className="dash-greeting-actions">
          <Link to="/shipments/new" className="dash-greeting-btn-primary">
            <i className="bi bi-plus-circle-fill me-2"></i>New Job
          </Link>
          <Link to="/sales-summary" className="dash-greeting-btn-secondary">
            <i className="bi bi-bar-chart-line me-2"></i>Sales Summary
          </Link>
        </div>
      </div>

      {/* ── PHASE 2: Main Financial KPI Cards (Prominent) ─────────── */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <FinCard
            label="Total Balance"
            value={fmtMoney(financials.totalCollected)}
            icon="bi-wallet2"
            color="#FF7A45"
            sub="Account balance"
            badge="Active"
          />
        </Col>
        <Col xs={6} md={3}>
          <FinCard
            label="Outstanding AR"
            value={fmtMoney(financials.outstandingAR)}
            icon="bi-graph-up"
            color="#16a34a"
            sub="Receivables pending"
            badge="View →"
            to="/ar-portal"
          />
        </Col>
        <Col xs={6} md={3}>
          <FinCard
            label="Total Spending"
            value={fmtMoney(financials.outstandingAP)}
            icon="bi-credit-card"
            color="#ef4444"
            sub="Payables due"
            badge="View →"
            to="/ap-portal"
          />
        </Col>
        <Col xs={6} md={3}>
          <FinCard
            label="Net Position"
            value={fmtMoney(financials.totalCollected - financials.outstandingAP)}
            icon="bi-graph-up-arrow"
            color="#3b82f6"
            sub="Collected minus payables"
          />
        </Col>
      </Row>

      {/* ── PHASE 3: Operation Mode KPI Cards ────────────────────── */}
      <div className="dash-mode-grid mb-4">
        {MODES.map((m) => (
          <ModeCard key={`${m.key}-${m.dir}`} {...m} {...getModeData(m.key, m.dir)} />
        ))}
      </div>

      {/* ── PHASE 4: Charts + Activity Feed ─────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Operation Type Pie */}
        <Col lg={4}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <h6 className="erp-card-title">
                <i className="bi bi-pie-chart me-2 opacity-50"></i>
                Operation Type Wise
              </h6>
              <Badge bg="light" text="dark" style={{ fontSize: '0.65rem' }}>
                {opTypePieData.reduce((s, d) => s + d.value, 0)} jobs
              </Badge>
            </div>
            <div className="erp-card-body">
              {opTypePieData.length === 0 ? (
                <div className="dash-empty-state">
                  <i className="bi bi-inbox"></i>
                  <span>No active jobs</span>
                </div>
              ) : (
                <>
                  <div style={{ height: 190 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={opTypePieData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                          paddingAngle={2}
                        >
                          {opTypePieData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.length
                              ? <div className="erp-tooltip"><strong>{payload[0].name}</strong><div>{fmtNum(payload[0].value)} jobs</div></div>
                              : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="dash-legend">
                    {opTypePieData.map((d) => (
                      <div key={d.name} className="dash-legend-row">
                        <span className="dash-legend-dot" style={{ background: d.color }}></span>
                        <span className="dash-legend-name">{d.name}</span>
                        <strong className="dash-legend-val">{fmtNum(d.value)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </Col>

        {/* AR Aging Bar */}
        <Col lg={4}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <h6 className="erp-card-title">
                <i className="bi bi-clock-history me-2 opacity-50"></i>
                AR Aging Analysis
              </h6>
              <Link to="/ar-portal" className="erp-card-link">Details</Link>
            </div>
            <div className="erp-card-body">
              {arAging.length === 0 ? (
                <div className="dash-empty-state">
                  <i className="bi bi-check-circle-fill text-success"></i>
                  <span>No outstanding AR</span>
                </div>
              ) : (
                <>
                  <div style={{ height: 160 }}>
                    <ResponsiveContainer>
                      <BarChart data={arAging} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="bucket" tick={{ fill: chartTick, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chartTick, fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} width={52} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip isDark={isDark} />} />
                        <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={32}>
                          {arAging.map((_, i) => (
                            <Cell key={i} fill={['#16a34a','#3b82f6','#FF7A45','#dc2626','#7c3aed'][i] || '#6c757d'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="dash-legend mt-1">
                    {arAging.map((b, i) => (
                      <div key={b.bucket} className="dash-legend-row">
                        <span className="dash-legend-dot" style={{ background: ['#16a34a','#3b82f6','#FF7A45','#dc2626','#7c3aed'][i] || '#6c757d' }}></span>
                        <span className="dash-legend-name">{b.bucket} <span style={{ opacity: 0.5 }}>({b.count})</span></span>
                        <strong className="dash-legend-val text-money">{fmtMoney(b.total, false)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </Col>

        {/* Live Activity Feed */}
        <Col lg={4}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <h6 className="erp-card-title">
                <i className="bi bi-activity me-2 opacity-50"></i>
                Live Activity
              </h6>
              <span className="dash-live-badge">
                <span className="dash-live-dot"></span>LIVE
              </span>
            </div>
            <div className="erp-card-body p-0">
              <div className="dash-activity-feed">
                {ACTIVITY_FEED.map((a) => (
                  <div key={a.id} className="dash-activity-item">
                    <div className="dash-activity-icon" style={{ background: `${a.color}15`, color: a.color }}>
                      <i className={`bi ${a.icon}`}></i>
                    </div>
                    <div className="dash-activity-body">
                      <div className="dash-activity-title">{a.title}</div>
                      <div className="dash-activity-sub">{a.sub}</div>
                    </div>
                    <div className="dash-activity-time">{a.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── PHASE 5: Top Customers horizontal bar ────────────────── */}
      {topCustomers.length > 0 && (
        <div className="erp-card mb-4">
          <div className="erp-card-header">
            <h6 className="erp-card-title">
              <i className="bi bi-trophy me-2 opacity-50"></i>
              Top Customers by Revenue
            </h6>
            <Link to="/clients" className="erp-card-link">View all clients</Link>
          </div>
          <div className="erp-card-body" style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={topCustomers} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
                <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: chartTick, fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="companyName" tick={{ fill: chartTick, fontSize: 11 }} width={140} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="revenue" fill="#FF7A45" radius={[0, 4, 4, 0]} name="revenue" maxBarSize={14} />
                <Bar dataKey="profit"  fill="#16a34a" radius={[0, 4, 4, 0]} name="profit"  maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── PHASE 6: Quick Links ────────────────────────────────── */}
      <div className="dash-quick-links">
        {[
          { to: '/shipments/new', icon: 'bi-plus-circle-fill', label: 'New Job',        color: '#FF7A45', sub: 'Create shipment' },
          { to: '/sales-summary', icon: 'bi-bar-chart-line',   label: 'Sales Summary',  color: '#7c3aed', sub: 'Management view' },
          { to: '/ar-portal',     icon: 'bi-wallet2',           label: 'AR Portal',      color: '#16a34a', sub: 'Receivables' },
          { to: '/collections',   icon: 'bi-alarm',             label: 'Collections',    color: '#ef4444', sub: 'AR escalation' },
          { to: '/rates',         icon: 'bi-tags',              label: 'Rate Search',    color: '#3b82f6', sub: 'Find best lanes' },
          { to: '/gl',            icon: 'bi-journal-text',      label: 'General Ledger', color: '#6c757d', sub: 'Accounting' },
        ].map(({ to, icon, label, color, sub }) => (
          <Link key={to} to={to} className="dash-quick-card text-decoration-none">
            <div className="dash-quick-icon" style={{ background: `${color}15`, color }}>
              <i className={`bi ${icon}`}></i>
            </div>
            <div>
              <div className="dash-quick-label">{label}</div>
              <div className="dash-quick-sub">{sub}</div>
            </div>
            <i className="bi bi-arrow-right-short dash-quick-arrow ms-auto"></i>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
