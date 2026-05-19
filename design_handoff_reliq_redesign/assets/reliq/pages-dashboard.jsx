/* Reliq — Dashboard with 3 variations */

const Dashboard = ({ variant = 'v1', setPage }) => {
  if (variant === 'v2') return <DashboardV2 setPage={setPage} />;
  if (variant === 'v3') return <DashboardV3 setPage={setPage} />;
  return <DashboardV1 setPage={setPage} />;
};

/* ============================================================
   V1 — "Operations First"
   ============================================================ */
const DashboardV1 = ({ setPage }) => {
  const D = window.ReliqData;
  const inTransit = D.SHIPMENTS.filter(s => ['in_transit', 'cargo_received', 'customs_export', 'customs_import', 'arrived'].includes(s.status));

  const modeCounts = {
    sea_export: D.SHIPMENTS.filter(s => s.mode === 'sea' && s.direction === 'export').length,
    sea_import: D.SHIPMENTS.filter(s => s.mode === 'sea' && s.direction === 'import').length,
    air:        D.SHIPMENTS.filter(s => s.mode === 'air').length,
    road:       D.SHIPMENTS.filter(s => s.mode === 'road').length,
    rail:       D.SHIPMENTS.filter(s => s.mode === 'rail').length,
  };

  return (
    <div className="page">
      {/* Hero greeting */}
      <div className="page-hero">
        <div className="page-row">
          <div>
            <h1 className="page-title">Good morning, Sajibur</h1>
            <div className="page-sub">Monday, May 18 · {D.SHIPMENTS.filter(s => s.status === 'in_transit').length} shipments in transit, {D.TASKS.filter(t => t.status !== 'done').length} tasks due this week</div>
          </div>
          <div className="flex-center" style={{ gap: 8 }}>
            <button className="btn"><i className="bi bi-download"></i> Export</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Job</button>
          </div>
        </div>
      </div>

      {/* Top KPI strip — 1 orange hero + 3 neutral */}
      <div className="grid grid-4 mb-5">
        <Kpi
          label="Total Revenue (YTD)"
          value="$1.24M"
          delta={12}
          deltaLabel="vs last year"
          icon="bi-graph-up-arrow"
          hero
        >
          <div className="kpi-spark"><Sparkline data={D.REV_SERIES.map(r => r.revenue)} color="rgba(255,255,255,.55)" fill={false} strokeWidth={2} /></div>
        </Kpi>
        <Kpi label="Active Shipments" value={D.SHIPMENTS.filter(s => D.STATUS[s.status]?.step > 0 && D.STATUS[s.status]?.step < 8).length} delta={8} icon="bi-boxes" color="var(--info)" />
        <Kpi label="Outstanding AR" value={D.fmtMoney(D.AR_AGING.reduce((s, b) => s + b.total, 0), true)} delta={-4} deltaLabel="vs last month" icon="bi-wallet2" color="var(--success)" />
        <Kpi label="Gross Margin" value="23.4%" delta={2.1} icon="bi-pie-chart" color="var(--violet)" />
      </div>

      {/* Mode strip */}
      <div className="card mb-5" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '18px 22px 0' }}>
          <div>
            <h3 className="card-title">Operations by Mode</h3>
            <div className="card-sub">Active jobs across freight modes</div>
          </div>
          <div className="filter-row" style={{ margin: 0 }}>
            <button className="filter-chip active">This week</button>
            <button className="filter-chip">Month</button>
            <button className="filter-chip">Quarter</button>
          </div>
        </div>
        <div className="grid grid-5" style={{ padding: 22, gap: 16 }}>
          <ModeTile mode="sea"  label="Sea Export"  count={modeCounts.sea_export} sub="42 TEUs · 4 in transit" sparkData={sparkFor(1, 12, 6)} />
          <ModeTile mode="sea"  label="Sea Import"  count={modeCounts.sea_import} sub="34 TEUs · 2 in customs" sparkData={sparkFor(2, 12, 5)} />
          <ModeTile mode="air"  label="Air Freight" count={modeCounts.air}        sub="5,760 kg · 1 priority" sparkData={sparkFor(3, 12, 4)} />
          <ModeTile mode="road" label="Road"        count={modeCounts.road}       sub="2 active deliveries"   sparkData={sparkFor(4, 12, 3)} />
          <ModeTile mode="rail" label="Rail"        count={modeCounts.rail}       sub="12 containers CN→DE"   sparkData={sparkFor(5, 12, 2)} />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gutter)' }}>
        {/* Revenue vs profit */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Revenue & Profit</h3>
              <div className="card-sub">Last 12 months · USD</div>
            </div>
            <div className="flex-center gap-3" style={{ fontSize: 12 }}>
              <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--brand)' }} />Revenue</span>
              <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--ink-2)' }} />Profit</span>
            </div>
          </div>
          <StackedBarChart
            data={D.REV_SERIES.map(r => ({ label: r.month, profit: r.profit, rest: r.revenue - r.profit }))}
            series={[
              { key: 'profit', color: 'var(--ink)' },
              { key: 'rest',   color: 'var(--brand)' },
            ]}
            height={240}
          />
        </div>

        {/* AR Aging */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">AR Aging</h3>
              <div className="card-sub">By bucket · {D.fmtMoney(D.AR_AGING.reduce((s, b) => s + b.total, 0), true)} total</div>
            </div>
            <span className="card-link" onClick={() => setPage('ar')}>View AR →</span>
          </div>
          <BarChart
            data={D.AR_AGING.map(b => ({ label: b.bucket, value: b.total }))}
            colorFn={(_, i) => ['var(--success)','var(--info)','var(--brand)','var(--warning)','var(--danger)'][i]}
            height={180}
          />
          <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {D.AR_AGING.map((b, i) => (
              <div key={b.bucket} style={{ textAlign: 'center' }}>
                <div className="text-xs text-muted">{b.bucket}</div>
                <div className="mono fw-700" style={{ fontSize: 13, marginTop: 2 }}>{D.fmtMoney(b.total, true)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* In transit table + Activity */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gutter)' }}>
        <div className="card card-flush">
          <div className="card-header" style={{ padding: '18px 22px 12px' }}>
            <div>
              <h3 className="card-title">Shipments in Transit</h3>
              <div className="card-sub">{inTransit.length} active</div>
            </div>
            <span className="card-link" onClick={() => setPage('shipments')}>All shipments →</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Job #</th><th>Mode</th><th>Route</th><th>Client</th><th>ETA</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {inTransit.slice(0, 6).map(s => (
                <tr key={s.id} onClick={() => setPage('shipment', { id: s.id })} style={{ cursor: 'pointer' }}>
                  <td><span className="mono fw-700 text-sm" style={{ color: 'var(--brand)' }}>{s.id}</span></td>
                  <td><ModeChip mode={s.mode} direction={s.direction} size="sm" /></td>
                  <td><span className="mono fw-600">{D.PORTS[s.pol]?.code || s.pol}</span> <i className="bi bi-arrow-right text-muted text-xs"></i> <span className="mono fw-600">{D.PORTS[s.pod]?.code || s.pod}</span></td>
                  <td><span className="text-sm">{s.client}</span></td>
                  <td><span className={'text-sm ' + (s.late ? 'text-danger fw-600' : '')}>{D.fmtDate(s.eta)}</span></td>
                  <td><StatusChip status={s.status} /></td>
                  <td><i className="bi bi-arrow-right-short" style={{ color: 'var(--muted)' }}></i></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Live Activity</h3>
            <span className="live-badge"><span className="live-dot" />LIVE</span>
          </div>
          <div className="feed">
            {D.ACTIVITY.slice(0, 6).map((a, i) => (
              <div key={i} className="feed-item">
                <div className="feed-icon" style={{ background: `color-mix(in oklch, ${a.color} 14%, var(--surface))`, color: a.color }}>
                  <i className={`bi ${a.icon}`}></i>
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

      {/* Quick links */}
      <QuickLinks setPage={setPage} />
    </div>
  );
};

/* ============================================================
   V2 — "Finance First" (Finexy-style hero tile)
   ============================================================ */
const DashboardV2 = ({ setPage }) => {
  const D = window.ReliqData;
  const totalRev = D.REV_SERIES.reduce((s, r) => s + r.revenue, 0);
  const last = D.REV_SERIES[D.REV_SERIES.length - 1];

  return (
    <div className="page">
      <div className="page-hero">
        <div className="page-row">
          <div>
            <h1 className="page-title">Good morning, Sajibur</h1>
            <div className="page-sub">Stay on top of your bookings, monitor cash, and track operations</div>
          </div>
          <div className="flex-center" style={{ gap: 8 }}>
            <button className="btn"><i className="bi bi-calendar"></i> May 12-18</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Job</button>
          </div>
        </div>
      </div>

      {/* Finexy-style: large balance tile on left, small KPI grid right, chart far right */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1.05fr 1.4fr 1.4fr', gap: 'var(--gutter)' }}>
        {/* Hero balance */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="flex-between">
            <span className="text-muted text-sm">Total Revenue</span>
            <span className="chip" style={{ gap: 4 }}>
              <span style={{ width: 14, height: 10, borderRadius: 2, background: 'linear-gradient(180deg, #3C3B6E 0 35%, #B22234 35% 50%, white 50% 65%, #B22234 65%)' }}></span>
              USD
              <i className="bi bi-chevron-down text-xs"></i>
            </span>
          </div>
          <div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }}>${(totalRev / 1000).toFixed(0)}k</div>
            <div className="flex-center text-sm mt-1">
              <span className="text-success fw-600">↑ 12.4%</span>
              <span className="text-muted">than last year</span>
            </div>
          </div>
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }}><i className="bi bi-arrow-left-right"></i> Transfer</button>
            <button className="btn" style={{ flex: 1 }}><i className="bi bi-clock-history"></i> Request</button>
          </div>
          <div className="divider"></div>
          <div>
            <div className="flex-between mb-2">
              <span className="text-sm fw-600">Accounts <span className="text-muted">| 3 active</span></span>
            </div>
            <div className="flex-col gap-2">
              {[
                { flag: '🇺🇸', code: 'USD', val: 489372, label: 'Op. Account', active: true },
                { flag: '🇪🇺', code: 'EUR', val: 218345, label: 'EU Account',  active: true },
                { flag: '🇬🇧', code: 'GBP', val: 105000, label: 'UK Account',  active: false },
              ].map(a => (
                <div key={a.code} className="card" style={{ padding: '10px 12px', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 18 }}>{a.flag}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-xs text-muted">{a.code} · {a.label}</div>
                    <div className="mono fw-700 text-sm">${a.val.toLocaleString()}</div>
                  </div>
                  <span className={'chip ' + (a.active ? 'chip-success' : '')} style={{ fontSize: 10 }}>{a.active ? 'Active' : 'Idle'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4 KPI grid 2x2 */}
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="kpi kpi-hero" style={{ padding: 18 }}>
            <div className="kpi-label" style={{ color: 'rgba(255,255,255,.85)' }}>Total Earnings <div className="kpi-icon" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}><i className="bi bi-arrow-up-right"></i></div></div>
            <div className="kpi-value" style={{ fontSize: 28 }}>${(last.profit/1000).toFixed(0)}k</div>
            <div className="kpi-foot" style={{ color: 'rgba(255,255,255,.85)' }}><span className="fw-600">↑ 8%</span> This month</div>
          </div>
          <div className="kpi" style={{ padding: 18 }}>
            <div className="kpi-label">Total Spending <div className="kpi-icon" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}><i className="bi bi-arrow-down-right"></i></div></div>
            <div className="kpi-value" style={{ fontSize: 28 }}>$84k</div>
            <div className="kpi-foot"><span className="text-danger fw-600">↓ 5%</span> This month</div>
          </div>
          <div className="kpi" style={{ padding: 18 }}>
            <div className="kpi-label">Outstanding AR <div className="kpi-icon" style={{ background: 'var(--success-2)', color: 'var(--success)' }}><i className="bi bi-wallet2"></i></div></div>
            <div className="kpi-value" style={{ fontSize: 28 }}>$164k</div>
            <div className="kpi-foot"><span className="text-success fw-600">↑ 4%</span> 29 invoices open</div>
          </div>
          <div className="kpi" style={{ padding: 18 }}>
            <div className="kpi-label">Outstanding AP <div className="kpi-icon" style={{ background: 'var(--danger-2)', color: 'var(--danger)' }}><i className="bi bi-credit-card"></i></div></div>
            <div className="kpi-value" style={{ fontSize: 28 }}>$66k</div>
            <div className="kpi-foot"><span className="text-success fw-600">↑ 2%</span> 20 bills open</div>
          </div>
        </div>

        {/* Income chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Profit & Loss</h3>
              <div className="card-sub">View your earnings over time</div>
            </div>
            <div className="flex-center gap-3" style={{ fontSize: 11 }}>
              <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--brand)' }} />Profit</span>
              <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--ink)' }} />Cost</span>
            </div>
          </div>
          <StackedBarChart
            data={D.REV_SERIES.slice(-8).map(r => ({ label: r.month, profit: r.profit, cost: r.revenue - r.profit }))}
            series={[
              { key: 'profit', color: 'var(--brand)' },
              { key: 'cost',   color: 'var(--ink)' },
            ]}
            height={220}
          />
        </div>
      </div>

      {/* Monthly limit + cards + recent table */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1.05fr 2.8fr', gap: 'var(--gutter)' }}>
        <div className="flex-col gap-4">
          {/* Monthly spending limit */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <h3 className="card-title text-sm">Monthly Spending Limit</h3>
            </div>
            <div className="text-xs text-muted mb-2">$84,200 spent out of $120,000</div>
            <ProgressBar pct={70} color="brand" />
            <div className="flex-between mt-2 text-xs">
              <span className="mono fw-700">$84,200</span>
              <span className="mono text-muted">$120,000</span>
            </div>
          </div>

          {/* Mode share donut */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title text-sm">Mode Mix</h3>
              <span className="card-link" onClick={() => setPage('analytics')}>Details →</span>
            </div>
            <div className="flex-center" style={{ justifyContent: 'center' }}>
              <Donut
                data={D.MODE_SHARE}
                size={150}
                thickness={18}
                center={
                  <div>
                    <div className="mono fw-700" style={{ fontSize: 22 }}>{D.MODE_SHARE.reduce((s, m) => s + m.value, 0)}%</div>
                    <div className="text-xs text-muted">Active</div>
                  </div>
                }
              />
            </div>
            <div className="mt-3 flex-col" style={{ gap: 6 }}>
              {D.MODE_SHARE.slice(0, 4).map(m => (
                <div key={m.mode} className="flex-between text-xs">
                  <span className="flex-center gap-2"><span className="chip-dot" style={{ background: m.color }} />{m.mode}</span>
                  <span className="mono fw-600">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activities table */}
        <div className="card card-flush">
          <div className="card-header" style={{ padding: '18px 22px 8px' }}>
            <h3 className="card-title">Recent Activities</h3>
            <div className="flex-center" style={{ gap: 8 }}>
              <div className="input" style={{ padding: '5px 10px' }}>
                <i className="bi bi-search text-xs"></i>
                <input placeholder="Search…" style={{ width: 140, fontSize: 12 }} />
              </div>
              <button className="btn btn-sm"><i className="bi bi-funnel"></i> Filter</button>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" /></th>
                <th>Job ID</th><th>Activity</th><th>Amount</th><th>Status</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {D.SHIPMENTS.slice(0, 6).map((s, i) => (
                <tr key={s.id} className={i === 3 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 3} /></td>
                  <td><span className="mono text-sm fw-600">{s.id}</span></td>
                  <td>
                    <span className="flex-center gap-2">
                      <span className="kpi-icon" style={{ width: 26, height: 26, fontSize: 12, background: `color-mix(in oklch, var(--m-${s.mode}) 14%, var(--surface))`, color: `var(--m-${s.mode})` }}>
                        <i className={`bi ${D.MODES[s.mode].icon}`}></i>
                      </span>
                      <span className="text-sm">{D.MODES[s.mode].label} {s.direction || ''} · {s.client}</span>
                    </span>
                  </td>
                  <td><span className="mono fw-600">{D.fmtMoney(s.value)}</span></td>
                  <td><StatusChip status={s.status} /></td>
                  <td className="text-muted text-sm">{D.fmtDate(s.etd, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td><i className="bi bi-three-dots text-muted"></i></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QuickLinks setPage={setPage} />
    </div>
  );
};

/* ============================================================
   V3 — "Bento Dense"
   ============================================================ */
const DashboardV3 = ({ setPage }) => {
  const D = window.ReliqData;

  return (
    <div className="page">
      {/* Compact header — no big greeting */}
      <div className="page-hero">
        <div className="page-row">
          <div>
            <div className="text-muted text-sm mb-1">Operations Console · Monday, May 18</div>
            <h1 className="page-title" style={{ fontSize: 22 }}>Operations Console</h1>
          </div>
          <div className="flex-center" style={{ gap: 8 }}>
            <div className="filter-row" style={{ margin: 0 }}>
              <button className="filter-chip active">Live</button>
              <button className="filter-chip">7d</button>
              <button className="filter-chip">30d</button>
              <button className="filter-chip">YTD</button>
            </div>
            <button className="btn btn-brand btn-sm"><i className="bi bi-plus-lg"></i> New</button>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'minmax(140px, auto)', gap: 12 }}>
        {/* Big KPI - revenue */}
        <BentoKpi label="Revenue MTD" value="$142.8k" delta={12} icon="bi-graph-up-arrow" color="var(--brand)" spark={D.REV_SERIES.map(r => r.revenue)} />
        <BentoKpi label="Active Jobs" value="68" delta={8} icon="bi-boxes" color="var(--info)" spark={sparkFor(11, 12, 30)} />
        <BentoKpi label="On-Time %" value="94.2%" delta={-1.2} icon="bi-clock-history" color="var(--success)" spark={sparkFor(13, 12, 40)} />
        <BentoKpi label="Gross Margin" value="23.4%" delta={2.1} icon="bi-pie-chart" color="var(--violet)" spark={sparkFor(17, 12, 25)} />

        {/* World map — large */}
        <div className="card" style={{ gridColumn: 'span 2', gridRow: 'span 2', padding: 16 }}>
          <div className="flex-between mb-2">
            <h3 className="card-title text-sm">Live Vessel & Flight Tracking</h3>
            <span className="live-badge"><span className="live-dot" />LIVE</span>
          </div>
          <div className="world-map" style={{ aspectRatio: 'unset', height: 260, marginBottom: 12 }}>
            <WorldMapPlaceholder />
            {/* Plot port positions */}
            {Object.values(D.PORTS).map(p => (
              <div
                key={p.code}
                className={'world-dot ' + (Math.random() > 0.5 ? 'sea' : 'air')}
                style={{
                  left:  `${((p.lng + 180) / 360) * 100}%`,
                  top:   `${((90 - p.lat) / 180) * 100}%`,
                }}
                title={p.name}
              />
            ))}
          </div>
          <div className="grid grid-3 gap-3 text-xs">
            <div><div className="text-muted">Vessels at sea</div><div className="mono fw-700 text-lg">14</div></div>
            <div><div className="text-muted">In customs</div><div className="mono fw-700 text-lg">4</div></div>
            <div><div className="text-muted">Delayed</div><div className="mono fw-700 text-lg text-danger">2</div></div>
          </div>
        </div>

        {/* Mode share */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex-between mb-3">
            <h3 className="card-title text-sm">Mode Mix</h3>
            <span className="card-link text-xs" onClick={() => setPage('analytics')}>Analytics →</span>
          </div>
          <div className="flex-center gap-5">
            <Donut data={D.MODE_SHARE} size={120} thickness={14}
              center={<div className="mono fw-700">100%</div>} />
            <div className="flex-col gap-2" style={{ flex: 1 }}>
              {D.MODE_SHARE.map(m => (
                <div key={m.mode} className="flex-between text-xs">
                  <span className="flex-center gap-2"><span className="chip-dot" style={{ background: m.color }} />{m.mode}</span>
                  <span className="mono fw-600">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AR aging */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex-between mb-2">
            <h3 className="card-title text-sm">AR Aging</h3>
            <span className="card-link text-xs" onClick={() => setPage('ar')}>AR →</span>
          </div>
          <BarChart
            data={D.AR_AGING.map(b => ({ label: b.bucket, value: b.total }))}
            colorFn={(_, i) => ['var(--success)','var(--info)','var(--brand)','var(--warning)','var(--danger)'][i]}
            height={120}
          />
        </div>

        {/* Activity feed */}
        <div className="card" style={{ gridColumn: 'span 2', gridRow: 'span 2' }}>
          <div className="flex-between mb-2">
            <h3 className="card-title text-sm">Recent Activity</h3>
            <span className="live-badge"><span className="live-dot" />LIVE</span>
          </div>
          <div className="feed">
            {D.ACTIVITY.map((a, i) => (
              <div key={i} className="feed-item">
                <div className="feed-icon" style={{ background: `color-mix(in oklch, ${a.color} 14%, var(--surface))`, color: a.color, width: 28, height: 28, fontSize: 12 }}>
                  <i className={`bi ${a.icon}`}></i>
                </div>
                <div className="feed-body">
                  <div className="feed-title text-sm">{a.title}</div>
                  <div className="feed-sub">{a.sub}</div>
                </div>
                <div className="feed-time">{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue line */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex-between mb-2">
            <h3 className="card-title text-sm">Revenue Trend</h3>
            <span className="text-muted text-xs">12mo</span>
          </div>
          <LineChart
            series={[
              { data: D.REV_SERIES.map(r => r.revenue), color: 'var(--brand)', fill: true },
              { data: D.REV_SERIES.map(r => r.profit),  color: 'var(--ink)',   fill: false },
            ]}
            height={140}
            showDots={false}
          />
          <div className="flex-between text-xs text-muted mt-2">
            {['Jun','Sep','Dec','Mar','May'].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>

        {/* Top customers */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="flex-between mb-3">
            <h3 className="card-title text-sm">Top Customers</h3>
            <span className="card-link text-xs" onClick={() => setPage('clients')}>All clients →</span>
          </div>
          <div className="grid grid-3 gap-3">
            {D.TOP_CUSTOMERS.slice(0, 3).map((c) => (
              <div key={c.code} className="flex-between" style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12, gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="text-sm fw-600" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div className="text-xs text-muted mono">{c.code} · {c.shipments} jobs</div>
                </div>
                <div className="ta-right">
                  <div className="mono fw-700 text-brand">{D.fmtMoney(c.revenue, true)}</div>
                  <div className="text-xs text-success">+{Math.round((c.profit / c.revenue) * 100)}% margin</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <QuickLinks setPage={setPage} />
      </div>
    </div>
  );
};

/* Helper components */

const BentoKpi = ({ label, value, delta, icon, color, spark }) => (
  <div className="kpi" style={{ padding: 16, gap: 6 }}>
    <div className="kpi-label">
      <span>{label}</span>
      <div className="kpi-icon" style={{ width: 26, height: 26, fontSize: 12, background: `color-mix(in oklch, ${color} 14%, var(--surface))`, color }}>
        <i className={`bi ${icon}`}></i>
      </div>
    </div>
    <div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>
    <div className="kpi-foot text-xs">
      <span className={delta >= 0 ? 'kpi-delta-up' : 'kpi-delta-down'}>
        <i className={`bi bi-arrow-${delta >= 0 ? 'up' : 'down'}`}></i> {Math.abs(delta)}%
      </span>
      <span>vs prev</span>
    </div>
    <div style={{ height: 28, margin: '0 -8px -6px' }}>
      <Sparkline data={spark} color={color} />
    </div>
  </div>
);

const QuickLinks = ({ setPage }) => {
  const links = [
    { key: 'shipments',  label: 'Shipments',  icon: 'bi-boxes',         color: 'var(--m-sea)' },
    { key: 'pipeline',   label: 'Pipeline',   icon: 'bi-kanban',        color: 'var(--violet)' },
    { key: 'ar',         label: 'AR Portal',  icon: 'bi-wallet2',       color: 'var(--success)' },
    { key: 'collections',label: 'Collections',icon: 'bi-alarm',         color: 'var(--danger)' },
    { key: 'rates',      label: 'Rate Search',icon: 'bi-tags',          color: 'var(--info)' },
    { key: 'gl',         label: 'Ledger',     icon: 'bi-journal-text',  color: 'var(--muted)' },
  ];
  return (
    <div className="grid grid-6 gap-3">
      {links.map(l => (
        <div key={l.key} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => setPage(l.key)}>
          <div className="flex-center gap-3">
            <div className="kpi-icon" style={{ background: `color-mix(in oklch, ${l.color} 14%, var(--surface))`, color: l.color }}>
              <i className={`bi ${l.icon}`}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div className="text-sm fw-600">{l.label}</div>
            </div>
            <i className="bi bi-arrow-right-short text-muted"></i>
          </div>
        </div>
      ))}
    </div>
  );
};

/* Subtle SVG world outline (continents stylized as blobs) */
const WorldMapPlaceholder = () => (
  <svg viewBox="0 0 200 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 }}>
    {/* North America */}
    <path d="M10,22 Q14,16 26,15 Q42,12 50,20 Q58,28 56,38 Q52,48 42,52 Q30,55 22,48 Q14,42 12,32 Z" fill="var(--border)" />
    {/* South America */}
    <path d="M44,55 Q52,55 56,60 Q58,72 54,82 Q48,90 42,84 Q38,72 40,62 Z" fill="var(--border)" />
    {/* Europe */}
    <path d="M92,18 Q98,14 110,16 Q116,18 116,26 Q112,32 104,32 Q96,30 92,24 Z" fill="var(--border)" />
    {/* Africa */}
    <path d="M96,38 Q104,36 112,40 Q118,52 114,66 Q108,76 100,74 Q92,68 92,56 Z" fill="var(--border)" />
    {/* Asia */}
    <path d="M118,16 Q140,12 158,20 Q174,28 172,38 Q166,48 150,48 Q132,46 122,40 Q116,30 118,22 Z" fill="var(--border)" />
    {/* Australia */}
    <path d="M156,62 Q166,60 174,64 Q176,72 170,76 Q160,76 156,70 Z" fill="var(--border)" />
  </svg>
);

Object.assign(window, { Dashboard, DashboardV1, DashboardV2, DashboardV3, QuickLinks, BentoKpi, WorldMapPlaceholder });
