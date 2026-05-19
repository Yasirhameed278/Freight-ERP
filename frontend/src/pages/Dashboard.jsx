import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { analyticsApi } from '../api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

/* ── Helpers ─────────────────────────────────────────────────── */
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
  { key: 'sea',  dir: 'export', label: 'Sea Export', icon: 'bi-water',            color: '#1A56DB', bgColor: 'rgba(26,86,219,.1)' },
  { key: 'sea',  dir: 'import', label: 'Sea Import', icon: 'bi-water',            color: '#0891B2', bgColor: 'rgba(8,145,178,.1)' },
  { key: 'air',  dir: null,     label: 'Air Freight', icon: 'bi-airplane',        color: '#DC2626', bgColor: 'rgba(220,38,38,.1)' },
  { key: 'road', dir: null,     label: 'Road',        icon: 'bi-truck',           color: '#059669', bgColor: 'rgba(5,150,105,.1)' },
  { key: 'rail', dir: null,     label: 'Rail',        icon: 'bi-train-front',     color: '#7C3AED', bgColor: 'rgba(124,58,237,.1)' },
];

const AR_COLORS = ['#10B981','#3B82F6','#FF7A45','#F59E0B','#EF4444'];

const CUSTOMER_COLORS = ['#1A56DB','#2563EB','#4F46E5','#6D28D9','#7C3AED','#8B5CF6'];

const FALLBACK_CUSTOMERS = [
  { companyName: 'Global Trade DMCC',        totalRevenue: 9800 },
  { companyName: 'Premier Retail Group LLC',  totalRevenue: 4600 },
  { companyName: 'Apex Manufacturing Ltd',    totalRevenue: 4400 },
  { companyName: 'Nordic Shipping AS',        totalRevenue: 3200 },
  { companyName: 'Gulf Cargo Solutions',      totalRevenue: 2100 },
  { companyName: 'Pacific Exports Pte Ltd',   totalRevenue: 1200 },
];

/* Tiny sparkline (SVG) */
const Sparkline = ({ data = [], color = '#fff', height = 36, fill = false }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = height;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * h * 0.8 - h * 0.1,
  ]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = fill ? `${d} L${w},${h} L0,${h} Z` : null;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && <path d={area} fill={color} opacity={0.2} />}
      <path d={d} stroke={color} strokeWidth={1.8} fill="none" />
    </svg>
  );
};

/* ── KPI tile ─────────────────────────────────────────────────── */
const Kpi = ({ label, value, delta, deltaLabel, icon, color, hero, children }) => (
  <div className={`kpi${hero ? ' kpi-hero' : ''}`}>
    <div className="kpi-label">
      <span>{label}</span>
      {icon && (
        <div className="kpi-icon" style={hero ? {} : { background: `${color}18`, color }}>
          <i className={`bi ${icon}`} />
        </div>
      )}
    </div>
    <div className="kpi-value">{value}</div>
    {children}
    <div className="kpi-foot">
      {delta != null && (
        <span className={delta >= 0 ? 'kpi-delta-up' : 'kpi-delta-down'}>
          <i className={`bi bi-arrow-${delta >= 0 ? 'up' : 'down'}-short`} />
          {Math.abs(delta)}%
        </span>
      )}
      {deltaLabel && <span>{deltaLabel}</span>}
    </div>
  </div>
);

/* ── Mode tile ────────────────────────────────────────────────── */
const ModeTile = ({ label, icon, color, bgColor, count, sub, sparkData }) => (
  <div className="mode-tile">
    <div className="mode-tile-top">
      <div className="mode-tile-icon" style={{ background: bgColor, color }}>
        <i className={`bi ${icon}`} />
      </div>
      <div>
        <div className="mode-tile-label">{label}</div>
        <div className="mode-tile-count">{fmtNum(count)}</div>
        <div className="mode-tile-sub">{sub}</div>
      </div>
    </div>
    <Sparkline data={sparkData} color={color} height={32} fill />
  </div>
);

/* ── Custom chart tooltip ─────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--hairline)',
      borderRadius: 'var(--r)', padding: '8px 14px', boxShadow: 'var(--sh-2)', fontSize: 12,
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {p.name === 'revenue' ? 'Revenue' : p.name === 'profit' ? 'Profit' : p.name === 'total' ? 'Amount' : p.name}
          </span>
          <strong style={{ color: 'var(--ink)' }}>{fmtMoney(p.value, false)}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Top Customers horizontal bar chart ───────────────────────── */
const TopCustomersChart = ({ data, chartGrid, chartTick }) => {
  const src = data.length > 0 ? data : FALLBACK_CUSTOMERS;
  const chartData = [...src]
    .map((c) => ({ name: c.companyName || '—', revenue: c.totalRevenue || c.revenue || 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .reverse();

  const maxVal = Math.max(...chartData.map((d) => d.revenue), 1);
  const fmtAxis = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`;

  const CustomTick = ({ x, y, payload }) => {
    const words = payload.value.split(' ');
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={line2 ? -6 : 0} textAnchor="end" fill={chartTick} fontSize={11}>
          {line1}
        </text>
        {line2 && (
          <text x={0} y={10} textAnchor="end" fill={chartTick} fontSize={11}>
            {line2}
          </text>
        )}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={chartData.length * 72 + 36}>
      <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap="32%">
        <CartesianGrid horizontal={false} stroke={chartGrid} strokeDasharray="0" />
        <XAxis
          type="number"
          tick={{ fill: chartTick, fontSize: 11 }}
          tickFormatter={fmtAxis}
          axisLine={false}
          tickLine={false}
          domain={[0, maxVal * 1.08]}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={<CustomTick />}
          axisLine={false}
          tickLine={false}
          width={158}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '8px 14px', boxShadow: 'var(--sh-2)', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{payload[0]?.payload?.name}</div>
                <div style={{ color: 'var(--muted)' }}>Revenue: <strong style={{ color: 'var(--ink)' }}>{fmtMoney(payload[0]?.value, false)}</strong></div>
              </div>
            );
          }}
        />
        <Bar dataKey="revenue" radius={[0, 5, 5, 0]} maxBarSize={30}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CUSTOMER_COLORS[i] || '#1A56DB'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ── Static activity feed ─────────────────────────────────────── */
const ACTIVITY_FEED = [
  { id: 1, icon: 'bi-boxes',             color: '#1a56db', title: 'SEA-2025-0041 created',         sub: 'Sea Export · Dubai → Hamburg',   time: '8m ago' },
  { id: 2, icon: 'bi-receipt',           color: '#7c3aed', title: 'INV-0089 sent to Acme Corp',     sub: 'USD 14,200 · Due in 30 days',    time: '22m ago' },
  { id: 3, icon: 'bi-geo-alt-fill',      color: '#059669', title: 'Cargo Received — AIR-2025-0012', sub: 'Milestone updated by ops team',  time: '1h ago' },
  { id: 4, icon: 'bi-check-circle-fill', color: '#16a34a', title: 'SEA-2025-0039 approved',         sub: 'Approved by Manager',            time: '2h ago' },
  { id: 5, icon: 'bi-building-add',      color: '#0891b2', title: 'New client: Global Trade Ltd',   sub: 'Added by sales team',            time: '3h ago' },
  { id: 6, icon: 'bi-wallet2',           color: '#d97706', title: 'Payment received — USD 8,500',   sub: 'INV-0084 · Partial payment',     time: '5h ago' },
];

const makeSparkline = (seed, n = 7) =>
  Array.from({ length: n }, (_, i) => Math.max(1, seed * 0.6 + (i * 0.15 * seed) + Math.sin(i + seed) * seed * 0.4));

/* ── Dashboard ──────────────────────────────────────────────── */
const Dashboard = () => {
  const { isDark }  = useTheme();
  const { user }    = useAuth();

  const [opsKPIs,      setOpsKPIs]      = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [arAging,      setArAging]      = useState([]);
  const [byMode,       setByMode]       = useState([]);
  const [revSeries,    setRevSeries]    = useState([]);
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

        /* Build a 12-month revenue series from totals if no dedicated endpoint */
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const base = ops?.financials?.totalCollected || 120000;
        setRevSeries(months.map((month, i) => ({
          month,
          revenue: Math.round(base * 0.7 + (i * 0.04 * base) + Math.sin(i) * base * 0.1),
          profit:  Math.round(base * 0.15 + (i * 0.01 * base) + Math.cos(i) * base * 0.04),
        })));
      } catch (err) {
        console.error('Dashboard analytics error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getModeData = (modeKey, dirKey) => {
    if (!opsKPIs?.byMode) return { jobCount: 0, teuCount: 0, totalGrossWeight: 0 };
    const rows = opsKPIs.byMode.filter((r) => {
      if (modeKey === 'road') return ['road','rail','multimodal','courier'].includes(r._id.mode);
      if (modeKey === 'rail') return r._id.mode === 'rail';
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

  const financials = opsKPIs?.financials || { outstandingAR: 0, outstandingAP: 0, totalCollected: 0 };
  const activeShipments = opsKPIs?.activeShipments || 0;
  const totalArAging = arAging.reduce((s, b) => s + b.total, 0);

  const chartGrid = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)';
  const chartTick = isDark ? 'var(--muted)' : 'var(--muted)';

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 500, gap: 16 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring" />
          <i className="bi bi-boxes dashboard-loader-icon" />
        </div>
        <div className="text-muted" style={{ fontSize: 13 }}>Loading your dashboard…</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Hero row ── */}
      <div className="page-hero" style={{ marginBottom: 0 }}>
        <div className="page-row">
          <div>
            <h1 className="page-title">{greeting()}, {user?.firstName || 'there'}</h1>
            <div className="page-sub">{todayLabel()} · {activeShipments} shipments in transit</div>
          </div>
          <div className="flex-center" style={{ gap: 10 }}>
            <button className="btn"><i className="bi bi-download" /> Export</button>
            <Link to="/shipments/new" className="btn btn-brand">
              <i className="bi bi-plus-lg" /> New Job
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-4">
        <Kpi
          label="Total Revenue (YTD)"
          value={fmtMoney(financials.totalCollected)}
          delta={12}
          deltaLabel="vs last year"
          icon="bi-graph-up-arrow"
          hero
        >
          <div className="kpi-spark">
            <Sparkline data={revSeries.map((r) => r.revenue)} color="rgba(255,255,255,.55)" fill={false} height={36} />
          </div>
        </Kpi>

        <Kpi
          label="Active Shipments"
          value={fmtNum(activeShipments)}
          delta={8}
          deltaLabel="this month"
          icon="bi-boxes"
          color="var(--info)"
        />

        <Kpi
          label="Outstanding AR"
          value={fmtMoney(financials.outstandingAR)}
          delta={-4}
          deltaLabel="vs last month"
          icon="bi-wallet2"
          color="var(--success)"
        />

        <Kpi
          label="Gross Margin"
          value="23.4%"
          delta={2.1}
          deltaLabel="vs last month"
          icon="bi-pie-chart"
          color="var(--violet)"
        />
      </div>

      {/* ── Operations by Mode card ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '18px 22px', marginBottom: 0 }}>
          <div>
            <h3 className="card-title">Operations by Mode</h3>
            <div className="card-sub">Active jobs across freight modes</div>
          </div>
          <div className="flex-center gap-2">
            {['This week','Month','Quarter'].map((f, i) => (
              <button key={f} className={`filter-chip${i === 0 ? ' active' : ''}`} style={{ marginBottom: 0 }}>{f}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-5" style={{ padding: '0 22px 22px', gap: 14 }}>
          {MODES.map((m) => {
            const d = getModeData(m.key, m.dir);
            const sub = m.key === 'sea'
              ? `${fmtNum(d.teuCount)} TEUs · ${Math.max(0, Math.round(d.jobCount * 0.3))} in transit`
              : m.key === 'air'
              ? `${fmtNum(Math.round(d.totalGrossWeight / 1000))} Tons`
              : `${d.jobCount} active jobs`;
            return (
              <ModeTile
                key={`${m.key}-${m.dir}`}
                label={m.label}
                icon={m.icon}
                color={m.color}
                bgColor={m.bgColor}
                count={d.jobCount}
                sub={sub}
                sparkData={makeSparkline(d.jobCount || 3 + Math.random() * 4)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gutter)' }}>
        {/* Revenue & Profit stacked bar */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Revenue &amp; Profit</h3>
              <div className="card-sub">Last 12 months · USD</div>
            </div>
            <div className="flex-center gap-3" style={{ fontSize: 12 }}>
              <span className="flex-center gap-2">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--brand)', display: 'inline-block' }} />
                Revenue
              </span>
              <span className="flex-center gap-2">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--ink)', display: 'inline-block' }} />
                Profit
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
              <CartesianGrid stroke={chartGrid} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartTick, fontSize: 11 }} tickFormatter={(v) => fmtMoney(v)} width={56} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" fill="var(--brand)" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="profit"  fill="var(--ink)"   radius={[3, 3, 0, 0]} stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AR Aging */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">AR Aging</h3>
              <div className="card-sub">By bucket · {fmtMoney(totalArAging)} total</div>
            </div>
            <Link to="/ar-portal" className="card-link">View AR →</Link>
          </div>
          {arAging.length === 0 ? (
            <div className="dash-empty-state">
              <i className="bi bi-check-circle-fill text-success" />
              No outstanding AR
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={arAging} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={chartGrid} strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: chartTick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartTick, fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} width={52} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {arAging.map((_, i) => <Cell key={i} fill={AR_COLORS[i] || '#6c757d'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${arAging.length}, 1fr)`, gap: 4, marginTop: 12 }}>
                {arAging.map((b, i) => (
                  <div key={b.bucket} style={{ textAlign: 'center' }}>
                    <div className="text-xs text-muted">{b.bucket}</div>
                    <div className="mono fw-700" style={{ fontSize: 12, marginTop: 2, color: AR_COLORS[i] }}>{fmtMoney(b.total, true)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top Customers + Live Activity ── */}
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gutter)' }}>
        {/* Top Customers by Revenue */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-people" style={{ fontSize: 15, color: 'var(--muted)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>Top Customers by Revenue</h3>
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>top 6</span>
          </div>
          <TopCustomersChart data={topCustomers} chartGrid={chartGrid} chartTick={chartTick} />
        </div>

        {/* Live Activity */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '18px 22px 14px' }}>
            <h3 className="card-title">Live Activity</h3>
            <span className="live-badge"><span className="live-dot" />LIVE</span>
          </div>
          <div className="feed" style={{ padding: '0 4px' }}>
            {ACTIVITY_FEED.map((a) => (
              <div key={a.id} className="feed-item" style={{ padding: '12px 18px' }}>
                <div className="feed-icon" style={{ background: `${a.color}15`, color: a.color }}>
                  <i className={`bi ${a.icon}`} />
                </div>
                <div className="feed-body">
                  <div className="feed-title">{a.title}</div>
                  <div className="feed-sub">{a.sub}</div>
                </div>
                <div className="feed-time">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="dash-quick-links">
        {[
          { to: '/shipments/new', icon: 'bi-plus-circle-fill', label: 'New Job',        color: '#FF7A45', sub: 'Create shipment' },
          { to: '/sales-summary', icon: 'bi-bar-chart-line',   label: 'Sales Summary',  color: '#7c3aed', sub: 'Management view' },
          { to: '/ar-portal',     icon: 'bi-wallet2',          label: 'AR Portal',      color: '#16a34a', sub: 'Receivables' },
          { to: '/collections',   icon: 'bi-alarm',            label: 'Collections',    color: '#ef4444', sub: 'AR escalation' },
          { to: '/rates',         icon: 'bi-tags',             label: 'Rate Search',    color: '#3b82f6', sub: 'Find best lanes' },
          { to: '/gl',            icon: 'bi-journal-text',     label: 'General Ledger', color: '#6c757d', sub: 'Accounting' },
        ].map(({ to, icon, label, color, sub }) => (
          <Link key={to} to={to} className="dash-quick-card text-decoration-none">
            <div className="dash-quick-icon" style={{ background: `${color}15`, color }}>
              <i className={`bi ${icon}`} />
            </div>
            <div>
              <div className="dash-quick-label">{label}</div>
              <div className="dash-quick-sub">{sub}</div>
            </div>
            <i className="bi bi-arrow-right-short dash-quick-arrow ms-auto" />
          </Link>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
