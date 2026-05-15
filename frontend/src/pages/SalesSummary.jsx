import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { analyticsApi } from '../api';
import { useTheme } from '../context/ThemeContext';

/* ── Formatters ──────────────────────────────────────────────── */
const fmt = (v) =>
  v === 0 ? '$0'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const fmtFull = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

const fmtPct = (v) => (v != null && v !== 0 ? `${Number(v).toFixed(1)}%` : '—');

const marginColor = (m) => {
  if (m >= 25) return { bg: '#dcfce7', text: '#16a34a', label: 'Excellent' };
  if (m >= 15) return { bg: '#d1fae5', text: '#059669', label: 'Good' };
  if (m >= 8)  return { bg: '#fef9c3', text: '#ca8a04', label: 'Fair' };
  if (m > 0)   return { bg: '#fee2e2', text: '#dc2626', label: 'Low' };
  return { bg: 'var(--surface-2)', text: 'var(--bs-secondary-color)', label: '—' };
};

/* ── Mode config ─────────────────────────────────────────────── */
const MODES = [
  { key: 'sea_export', label: 'Sea Export', icon: 'bi-water',            color: '#1a56db', gradient: 'linear-gradient(135deg,#1a56db,#3b82f6)' },
  { key: 'sea_import', label: 'Sea Import', icon: 'bi-water',            color: '#0891b2', gradient: 'linear-gradient(135deg,#0891b2,#22d3ee)' },
  { key: 'air_export', label: 'Air Export', icon: 'bi-airplane',         color: '#dc2626', gradient: 'linear-gradient(135deg,#dc2626,#f87171)' },
  { key: 'air_import', label: 'Air Import', icon: 'bi-airplane-engines', color: '#ea580c', gradient: 'linear-gradient(135deg,#ea580c,#fb923c)' },
  { key: 'logistics',  label: 'Logistics',  icon: 'bi-truck',            color: '#059669', gradient: 'linear-gradient(135deg,#059669,#34d399)' },
];

const PERIODS = [
  { key: 'today', label: 'Today',          short: 'TDY' },
  { key: 'mtd',   label: 'Month to Date',  short: 'MTD' },
  { key: 'qtd',   label: 'Quarter to Date',short: 'QTD' },
  { key: 'ytd',   label: 'Year to Date',   short: 'YTD' },
];

/* ── Top KPI card ────────────────────────────────────────────── */
const KPICard = ({ label, ytdValue, mtdValue, todayValue, accent, icon, suffix }) => (
  <div className="ss-kpi-card">
    <div className="ss-kpi-card-top">
      <div className="ss-kpi-card-icon" style={{ background: `${accent}18`, color: accent }}>
        <i className={`bi ${icon}`}></i>
      </div>
      <span className="ss-kpi-card-label" style={{ color: accent }}>{label}</span>
    </div>
    <div className="ss-kpi-card-ytd">{ytdValue}{suffix || ''}</div>
    <div className="ss-kpi-card-periods">
      <div className="ss-kpi-period-item">
        <span className="ss-kpi-period-tag">TODAY</span>
        <span className="ss-kpi-period-val">{todayValue}</span>
      </div>
      <div className="ss-kpi-period-divider"></div>
      <div className="ss-kpi-period-item">
        <span className="ss-kpi-period-tag">MTD</span>
        <span className="ss-kpi-period-val">{mtdValue}</span>
      </div>
    </div>
  </div>
);

/* ── Mode KPI card (top mode overview) ──────────────────────── */
const ModeSummaryCard = ({ mode, data, maxRevenue }) => {
  const ytd = data?.ytd || { count: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
  const mtd = data?.mtd || { count: 0, revenue: 0 };
  const mc  = marginColor(ytd.margin);
  const revPct = maxRevenue > 0 ? Math.round((ytd.revenue / maxRevenue) * 100) : 0;

  return (
    <div className="ss-mode-card">
      <div className="ss-mode-card-header" style={{ background: mode.gradient }}>
        <div className="ss-mode-card-header-left">
          <i className={`bi ${mode.icon} ss-mode-card-icon`}></i>
          <span className="ss-mode-card-name">{mode.label}</span>
        </div>
        <div className="ss-mode-card-jobs">
          <span className="ss-mode-jobs-num">{ytd.count}</span>
          <span className="ss-mode-jobs-lbl">jobs</span>
        </div>
      </div>
      <div className="ss-mode-card-body">
        <div className="ss-mode-row">
          <span className="ss-mode-row-lbl">Revenue YTD</span>
          <span className="ss-mode-row-val">{fmtFull(ytd.revenue)}</span>
        </div>
        <div className="ss-mode-rev-bar">
          <div className="ss-mode-rev-fill" style={{ width: `${revPct}%`, background: mode.color }}></div>
        </div>
        <div className="d-flex justify-content-between mt-2">
          <div className="ss-mode-row-sub">
            <span className="ss-mode-row-lbl">Profit</span>
            <span className="ss-mode-row-val" style={{ color: ytd.profit >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmtFull(ytd.profit)}
            </span>
          </div>
          <div>
            <span className="ss-margin-badge" style={{ background: mc.bg, color: mc.text }}>
              {fmtPct(ytd.margin)}
            </span>
          </div>
        </div>
        <div className="ss-mode-row mt-2" style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 8 }}>
          <span className="ss-mode-row-lbl">MTD Revenue</span>
          <span className="ss-mode-row-val text-muted">{mtd.revenue > 0 ? fmt(mtd.revenue) : '—'}</span>
        </div>
      </div>
    </div>
  );
};

/* ── Mode → shipment query params map ───────────────────────── */
const MODE_TO_FILTER = {
  sea_export: { mode: 'sea', direction: 'export' },
  sea_import: { mode: 'sea', direction: 'import' },
  air_export: { mode: 'air', direction: 'export' },
  air_import: { mode: 'air', direction: 'import' },
  logistics:  { mode: 'road' },
};

/* ── Period row in matrix ────────────────────────────────────── */
const PeriodRow = ({ period, d, isYTD, color, modeKey }) => {
  const mc = marginColor(d.margin);
  const navigate = useNavigate();

  const handleJobsClick = () => {
    const params = new URLSearchParams(MODE_TO_FILTER[modeKey] || {});
    navigate(`/shipments?${params.toString()}`);
  };

  return (
    <tr className={`ss-matrix-row${isYTD ? ' is-ytd' : ''}`}>
      <td className="ss-matrix-period">
        {isYTD
          ? <><span className="ss-ytd-dot" style={{ background: color }}></span><strong>Year to Date</strong></>
          : <span className="ss-period-label">{period.label}</span>}
      </td>
      <td className="ss-matrix-val text-end">
        {d.revenue > 0 ? <span className="text-primary fw-semibold">{fmtFull(d.revenue)}</span> : <span className="text-muted">—</span>}
      </td>
      <td className="ss-matrix-val text-end">
        {d.cost > 0 ? <span style={{ color: '#dc2626' }}>{fmtFull(d.cost)}</span> : <span className="text-muted">—</span>}
      </td>
      <td className="ss-matrix-val text-end">
        {d.profit !== 0
          ? <span style={{ color: d.profit > 0 ? '#16a34a' : '#dc2626', fontWeight: isYTD ? 700 : 500 }}>
              {d.profit > 0 ? '+' : ''}{fmtFull(d.profit)}
            </span>
          : <span className="text-muted">—</span>}
      </td>
      <td className="ss-matrix-val text-center">
        {d.margin > 0
          ? <span className="ss-margin-badge" style={{ background: mc.bg, color: mc.text }}>{fmtPct(d.margin)}</span>
          : <span className="text-muted">—</span>}
      </td>
      <td className="ss-matrix-val text-end">
        {d.count > 0
          ? (
            <span
              className="ss-jobs-badge"
              style={{ cursor: 'pointer' }}
              onClick={handleJobsClick}
              title={`View ${d.count} shipments`}
            >
              {d.count}
              <i className="bi bi-arrow-right-short" style={{ fontSize: 11, marginLeft: 2 }}></i>
            </span>
          )
          : <span className="text-muted">—</span>}
      </td>
    </tr>
  );
};

/* ── Revenue comparison chart ────────────────────────────────── */
const RevenueChart = ({ data, isDark }) => {
  const chartData = MODES.map((m) => ({
    name: m.label.replace(' ', '\n'),
    shortName: m.label.split(' ')[0],
    revenue: data?.[m.key]?.ytd?.revenue || 0,
    profit: data?.[m.key]?.ytd?.profit || 0,
    color: m.color,
  })).filter((d) => d.revenue > 0 || d.profit > 0);

  if (chartData.length === 0) return (
    <div className="ss-chart-empty">
      <i className="bi bi-bar-chart opacity-25" style={{ fontSize: 36 }}></i>
      <span>No revenue data yet</span>
    </div>
  );

  const grid = isDark ? '#30363d' : '#e9ecef';
  const tick = isDark ? '#8b949e' : '#6c757d';

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="shortName" tick={{ fill: tick, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: tick, fontSize: 10 }} tickFormatter={(v) => fmt(v)} width={56} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v, name) => [fmtFull(v), name === 'revenue' ? 'Revenue' : 'Profit']}
          contentStyle={{
            background: isDark ? '#161b22' : '#fff',
            border: `1px solid ${grid}`,
            borderRadius: 10,
            fontSize: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        />
        <Bar dataKey="revenue" name="revenue" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
        <Bar dataKey="profit" name="profit" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {chartData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.4} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ── Main Page ───────────────────────────────────────────────── */
const SalesSummary = () => {
  const { isDark } = useTheme();
  const [data,    setData]    = useState(null);
  const [totals,  setTotals]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await analyticsApi.salesSummary();
        if (cancelled) return;
        setData(res.summary || {});
        setTotals(res.ytdTotals || {});
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const T = totals || { count: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };

  const sum = (period, field) =>
    MODES.reduce((s, m) => s + (data?.[m.key]?.[period]?.[field] || 0), 0);

  const handleExport = () => {
    const header = ['Mode', 'Period', 'Revenue (USD)', 'Cost (USD)', 'Profit (USD)', 'Margin (%)', 'Jobs'];
    const rows = [header];
    for (const m of MODES) {
      for (const p of PERIODS) {
        const d = data?.[m.key]?.[p.key] || {};
        rows.push([m.label, p.label, d.revenue || 0, d.cost || 0, d.profit || 0, (d.margin || 0).toFixed(1), d.count || 0]);
      }
    }
    rows.push(['TOTAL YTD', '', T.revenue, T.cost, T.profit, T.margin.toFixed(1), T.count]);
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-summary-${new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  /* Max revenue across modes for progress bar scaling */
  const maxRevenue = Math.max(...MODES.map((m) => data?.[m.key]?.ytd?.revenue || 0), 1);

  /* Filter to displayed modes */
  const visibleModes = activeMode ? MODES.filter((m) => m.key === activeMode) : MODES;

  if (loading) {
    return (
      <div className="ss-loading">
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-bar-chart-line dashboard-loader-icon"></i>
        </div>
        <span>Building your sales report…</span>
      </div>
    );
  }

  return (
    <div className="ss-root">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-bar-chart-line"></i></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <h4 className="ss-page-title" style={{ margin: 0 }}>Sales Performance Summary</h4>
            <span className="ss-info-tip" data-tip={`Fiscal Year ${new Date().getFullYear()} · All values in USD · Cancelled shipments excluded`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25"/>
                <circle cx="8" cy="5.2" r="0.85" fill="currentColor"/>
                <path d="M8 7.5v3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>
        <div className="ss-header-actions">
          <button className="ss-action-btn" onClick={handleExport}>
            <i className="bi bi-download me-2"></i>Export
          </button>
          <button className="ss-action-btn ss-action-btn-primary" onClick={handlePrint}>
            <i className="bi bi-printer me-2"></i>Print Report
          </button>
        </div>
      </div>

      {/* ── Top KPI strip ────────────────────────────────────── */}
      <div className="ss-kpi-strip">
        <KPICard
          label="Total Shipments"
          ytdValue={T.count}
          mtdValue={sum('mtd', 'count')}
          todayValue={sum('today', 'count')}
          accent="#7c3aed"
          icon="bi-boxes"
        />
        <KPICard
          label="Revenue"
          ytdValue={T.revenue > 0 ? fmtFull(T.revenue) : '$0'}
          mtdValue={fmt(sum('mtd', 'revenue'))}
          todayValue={fmt(sum('today', 'revenue'))}
          accent="#1a56db"
          icon="bi-graph-up-arrow"
        />
        <KPICard
          label="Cost"
          ytdValue={T.cost > 0 ? fmtFull(T.cost) : '$0'}
          mtdValue={fmt(sum('mtd', 'cost'))}
          todayValue={fmt(sum('today', 'cost'))}
          accent="#dc2626"
          icon="bi-arrow-down-circle"
        />
        <KPICard
          label="Gross Profit"
          ytdValue={T.profit > 0 ? fmtFull(T.profit) : '$0'}
          mtdValue={fmt(sum('mtd', 'profit'))}
          todayValue={fmt(sum('today', 'profit'))}
          accent="#16a34a"
          icon="bi-currency-dollar"
        />
        <KPICard
          label="Margin"
          ytdValue={fmtPct(T.margin)}
          mtdValue={T.margin > 0 ? '—' : '—'}
          todayValue="—"
          accent="#059669"
          icon="bi-percent"
        />
      </div>

      {/* ── Revenue chart + mode cards ────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col lg={5}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <span className="erp-card-title">
                <i className="bi bi-bar-chart me-2 opacity-50"></i>
                Revenue vs Profit YTD
              </span>
              <div className="d-flex gap-2">
                <span style={{ fontSize: 11, color: '#1a56db', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#1a56db', borderRadius: 2, display: 'inline-block' }}></span>Revenue
                </span>
                <span style={{ fontSize: 11, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: 'rgba(91,141,239,0.4)', borderRadius: 2, display: 'inline-block' }}></span>Profit
                </span>
              </div>
            </div>
            <div className="erp-card-body">
              <RevenueChart data={data} isDark={isDark} />
            </div>
          </div>
        </Col>

        <Col lg={7}>
          <div className="ss-mode-cards-grid">
            {MODES.map((m) => (
              <ModeSummaryCard key={m.key} mode={m} data={data?.[m.key]} maxRevenue={maxRevenue} />
            ))}
          </div>
        </Col>
      </Row>

      {/* ── Mode filter tabs ──────────────────────────────────── */}
      <div className="ss-mode-tabs">
        <button
          className={`ss-mode-tab${!activeMode ? ' active' : ''}`}
          onClick={() => setActiveMode(null)}
        >
          <i className="bi bi-grid me-1"></i>All Modes
        </button>
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`ss-mode-tab${activeMode === m.key ? ' active' : ''}`}
            style={{ '--tab-color': m.color }}
            onClick={() => setActiveMode(activeMode === m.key ? null : m.key)}
          >
            <i className={`bi ${m.icon} me-1`}></i>{m.label}
          </button>
        ))}
      </div>

      {/* ── Matrix table ─────────────────────────────────────── */}
      <div className="ss-matrix-card">
        <div className="ss-matrix-scroll">
          <table className="ss-matrix-table">
            <thead>
              <tr>
                <th className="ss-matrix-th ss-matrix-period-col">Period</th>
                <th className="ss-matrix-th text-end">
                  <i className="bi bi-arrow-up-right-circle text-success me-1"></i>Revenue
                </th>
                <th className="ss-matrix-th text-end">
                  <i className="bi bi-arrow-down-left-circle text-danger me-1"></i>Cost
                </th>
                <th className="ss-matrix-th text-end">
                  <i className="bi bi-graph-up text-primary me-1"></i>Profit / Loss
                </th>
                <th className="ss-matrix-th text-center">
                  <i className="bi bi-percent text-purple me-1"></i>Margin
                </th>
                <th className="ss-matrix-th text-end">
                  <i className="bi bi-boxes text-secondary me-1"></i>Jobs
                </th>
              </tr>
            </thead>

            {visibleModes.map((m) => {
              const mdata = data?.[m.key] || {};
              const empty = { count: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
              return (
                <tbody key={m.key} className="ss-matrix-tbody">
                  <tr className="ss-mode-header-row">
                    <td colSpan={6} className="ss-mode-header-cell" style={{ borderLeft: `4px solid ${m.color}` }}>
                      <div className="ss-mode-header-inner">
                        <div className="ss-mode-header-dot" style={{ background: m.color }}></div>
                        <i className={`bi ${m.icon}`} style={{ color: m.color }}></i>
                        <span style={{ color: m.color }}>{m.label}</span>
                        <span className="ss-mode-header-ytd-rev">
                          YTD: {mdata.ytd?.revenue > 0 ? fmt(mdata.ytd.revenue) : 'No data'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {PERIODS.map((p) => (
                    <PeriodRow
                      key={p.key}
                      period={p}
                      d={mdata[p.key] || empty}
                      isYTD={p.key === 'ytd'}
                      color={m.color}
                      modeKey={m.key}
                    />
                  ))}
                </tbody>
              );
            })}

            {/* Grand Total */}
            {!activeMode && (
              <tbody>
                <tr className="ss-grand-total-row">
                  <td className="ss-grand-total-label">
                    <i className="bi bi-sigma me-2"></i>Grand Total YTD
                  </td>
                  <td className="text-end ss-grand-val">{fmtFull(T.revenue)}</td>
                  <td className="text-end ss-grand-val" style={{ color: '#dc2626' }}>{fmtFull(T.cost)}</td>
                  <td className="text-end ss-grand-val" style={{ color: T.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                    {T.profit >= 0 ? '+' : ''}{fmtFull(T.profit)}
                  </td>
                  <td className="text-center">
                    <span className="ss-margin-badge ss-margin-large" style={{ ...marginColor(T.margin), background: marginColor(T.margin).bg, color: marginColor(T.margin).text }}>
                      {fmtPct(T.margin)}
                    </span>
                  </td>
                  <td className="text-end ss-grand-val">{T.count}</td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesSummary;
