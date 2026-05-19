/* Reliq — shared components */

const { useState, useEffect, useMemo, useRef } = React;
const D = window.ReliqData;

/* ============================================================
   Tiny SVG charts (no external chart lib)
   ============================================================ */

const Sparkline = ({ data, color = 'var(--brand)', height = 36, fill = true, strokeWidth = 1.6 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100; const h = 36;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return [x, y];
  });
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const id = useRef('sg' + Math.random().toString(36).slice(2, 8)).current;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={path} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const BarChart = ({ data, height = 200, colorFn = () => 'var(--brand)', showAxis = true, formatY = (v) => v, gap = 6 }) => {
  const max = Math.max(...data.map(d => d.value)) * 1.15 || 1;
  const w = 100; const h = 100;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap, alignItems: 'flex-end', height, padding: '4px 0' }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div style={{
                  width: '100%',
                  height: pct + '%',
                  background: colorFn(d, i),
                  borderRadius: '6px 6px 0 0',
                  minHeight: 2,
                  transition: 'height .4s ease',
                }} />
              </div>
              {showAxis && (
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{d.label}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StackedBarChart = ({ data, series, height = 220, formatY = (v) => v }) => {
  const max = Math.max(...data.map(d => series.reduce((s, k) => s + (d[k.key] || 0), 0))) * 1.15 || 1;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height, padding: '4px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', width: '100%' }}>
            {series.map((s, si) => {
              const v = d[s.key] || 0;
              const pct = (v / max) * 100;
              return (
                <div key={s.key} style={{
                  width: '100%',
                  height: pct + '%',
                  background: s.color,
                  borderRadius: si === series.length - 1 ? '6px 6px 0 0' : '0',
                  minHeight: 1,
                }} />
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
};

const LineChart = ({ series, height = 220, showGrid = true, showDots = true, formatY = (v) => v }) => {
  const allValues = series.flatMap(s => s.data);
  const max = Math.max(...allValues) * 1.1 || 1;
  const min = Math.min(0, ...allValues);
  const range = max - min;
  const n = series[0].data.length;
  const w = 100; const h = 100;

  const pathFor = (data) =>
    data.map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      return (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');

  return (
    <div style={{ position: 'relative', height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {showGrid && [0, 25, 50, 75, 100].map((p) => (
          <line key={p} x1="0" x2={w} y1={p} y2={p} stroke="var(--hairline)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s, si) => {
          const gradId = `lg-${si}-${Math.random().toString(36).slice(2, 6)}`;
          return (
            <g key={si}>
              {s.fill && (
                <>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={pathFor(s.data) + ` L${w},${h} L0,${h} Z`} fill={`url(#${gradId})`} />
                </>
              )}
              <path d={pathFor(s.data)} stroke={s.color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
      {showDots && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {series.map((s, si) =>
            s.data.map((v, i) => {
              const x = (i / (n - 1)) * 100;
              const y = 100 - ((v - min) / range) * 92 - 4;
              return (
                <div key={`${si}-${i}`} style={{
                  position: 'absolute',
                  left: `calc(${x}% - 3px)`,
                  top: `calc(${y}% - 3px)`,
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: `2px solid ${s.color}`,
                }} />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const Donut = ({ data, size = 180, thickness = 22, center }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const dash = (d.value / total) * c;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      {center && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          {center}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   KPI Tiles
   ============================================================ */

const Kpi = ({ label, value, delta, deltaLabel = 'vs last month', icon, color = 'var(--brand)', children, hero = false }) => {
  const Up = delta > 0;
  return (
    <div className={'kpi' + (hero ? ' kpi-hero' : '')}>
      <div className="kpi-label">
        <span>{label}</span>
        {icon && (
          <div className="kpi-icon" style={hero ? null : { background: `color-mix(in oklch, ${color} 12%, var(--surface))`, color }}>
            <i className={`bi ${icon}`}></i>
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {delta !== undefined && delta !== null && (
          <span className={Up ? 'kpi-delta-up' : 'kpi-delta-down'}>
            <i className={`bi bi-arrow-${Up ? 'up' : 'down'}`}></i> {Math.abs(delta)}%
          </span>
        )}
        <span>{deltaLabel}</span>
      </div>
      {children}
    </div>
  );
};

const ModeTile = ({ mode, label, count, sub, sparkData }) => {
  const m = D.MODES[mode] || D.MODES.sea;
  return (
    <div className="kpi" style={{ gap: 12 }}>
      <div className="kpi-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={'ship-mode-chip ' + m.klass} style={{ padding: '4px 8px' }}>
            <i className={`bi ${m.icon}`}></i>
            {label}
          </span>
        </span>
        <span className="text-xs text-muted">Active</span>
      </div>
      <div>
        <div className="kpi-value" style={{ fontSize: 26 }}>{D.fmtNum(count)}</div>
        <div className="kpi-foot" style={{ marginTop: 2 }}>{sub}</div>
      </div>
      <div className="kpi-spark">
        <Sparkline data={sparkData} color={`var(--m-${mode})`} />
      </div>
    </div>
  );
};

/* ============================================================
   Chips, badges, etc
   ============================================================ */

const ModeChip = ({ mode, direction, size = 'md' }) => {
  const m = D.MODES[mode] || D.MODES.sea;
  return (
    <span className={'ship-mode-chip ' + m.klass} style={size === 'sm' ? { padding: '2px 7px', fontSize: 10 } : null}>
      <i className={`bi ${m.icon}`}></i>
      <span>{m.label.toUpperCase()}</span>
      {direction && <span style={{ opacity: 0.65 }}>{direction[0].toUpperCase()}</span>}
    </span>
  );
};

const StatusChip = ({ status }) => {
  const s = D.STATUS[status] || { label: status, color: 'var(--muted)' };
  let klass = 'chip';
  if (status === 'delivered' || status === 'cleared' || status === 'arrived' || status === 'paid') klass += ' chip-success';
  else if (status === 'in_transit' || status === 'booked' || status === 'sent') klass += ' chip-info';
  else if (status === 'customs_export' || status === 'customs_import' || status === 'on_hold' || status === 'partial') klass += ' chip-warning';
  else if (status === 'cancelled' || status === 'overdue') klass += ' chip-danger';
  else if (status === 'cargo_received') klass += ' chip-info';
  return <span className={klass}><span className="chip-dot" />{s.label}</span>;
};

const PaymentStatusChip = ({ status }) => {
  const map = {
    sent:    { label: 'Sent',    klass: 'chip-info' },
    paid:    { label: 'Paid',    klass: 'chip-success' },
    partial: { label: 'Partial', klass: 'chip-warning' },
    overdue: { label: 'Overdue', klass: 'chip-danger' },
    open:    { label: 'Open',    klass: 'chip-info' },
    draft:   { label: 'Draft',   klass: '' },
  };
  const cfg = map[status] || { label: status, klass: '' };
  return <span className={'chip ' + cfg.klass}><span className="chip-dot" />{cfg.label}</span>;
};

const ProgressBar = ({ pct, color = 'brand' }) => (
  <div className="bar">
    <div className={`bar-fill ${color}`} style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} />
  </div>
);

/* Page header used on every list page */
const PageHero = ({ title, sub, actions, breadcrumb }) => (
  <div className="page-hero">
    {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
    <div className="page-row">
      <div>
        <h1 className="page-title">{title}</h1>
        <div className="page-sub">{sub}</div>
      </div>
      {actions && <div className="flex-center" style={{ gap: 8 }}>{actions}</div>}
    </div>
  </div>
);

/* Generate sparkline data deterministically per seed */
const sparkFor = (seed, n = 12, base = 30) => {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    const s = Math.sin((seed + i) * 0.8) * 0.4 + Math.cos((seed + i) * 1.3) * 0.3;
    v = Math.max(2, base + s * base * 0.5 + (i / n) * base * 0.15);
    out.push(Math.round(v));
  }
  return out;
};

Object.assign(window, {
  Sparkline, BarChart, StackedBarChart, LineChart, Donut,
  Kpi, ModeTile, ModeChip, StatusChip, PaymentStatusChip,
  ProgressBar, PageHero, sparkFor,
});
