/* Reliq — CRM / Analytics / Tools pages */

/* ============================================================
   Clients list
   ============================================================ */
const Clients = ({ setPage }) => {
  const D = window.ReliqData;
  const [view, setView] = useState('card');
  const [filter, setFilter] = useState('all');

  return (
    <div className="page">
      <PageHero
        title="Clients"
        sub={`${D.CLIENTS.length} active clients · ${D.fmtMoney(D.CLIENTS.reduce((s, c) => s + c.revenue, 0), true)} YTD revenue`}
        actions={
          <>
            <div className="seg-nav" style={{ padding: 3 }}>
              <button className={view === 'card' ? 'active' : ''} onClick={() => setView('card')} style={{ padding: '5px 10px' }}><i className="bi bi-grid-3x3-gap"></i></button>
              <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} style={{ padding: '5px 10px' }}><i className="bi bi-list-ul"></i></button>
            </div>
            <button className="btn"><i className="bi bi-download"></i> Export</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Client</button>
          </>
        }
      />

      <div className="filter-row">
        {['all','active','priority','review'].map(f => (
          <button key={f} className={'filter-chip' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
            <span className="count">{f === 'all' ? D.CLIENTS.length : D.CLIENTS.filter(c => c.status === f).length}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <div className="input" style={{ width: 240 }}>
            <i className="bi bi-search"></i>
            <input placeholder="Client, code, industry…" />
          </div>
        </div>
      </div>

      {view === 'card' ? (
        <div className="grid grid-3 gap-4">
          {D.CLIENTS.filter(c => filter === 'all' || c.status === filter).map(c => {
            const margin = (c.profit / c.revenue) * 100;
            const creditPct = (c.used / c.credit) * 100;
            return (
              <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setPage('client', { id: c.id })}>
                <div className="flex-between mb-3">
                  <div className="flex-center gap-3">
                    <div className="kpi-icon" style={{ width: 42, height: 42, background: 'var(--brand-3)', color: 'var(--brand)', fontSize: 16, fontWeight: 700 }}>
                      {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="fw-700">{c.name}</div>
                      <div className="text-xs text-muted mono">{c.code} · {c.country} · {c.industry}</div>
                    </div>
                  </div>
                  <span className={'chip ' + (c.status === 'priority' ? 'chip-brand' : c.status === 'review' ? 'chip-warning' : 'chip-success')}>
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-muted">Revenue YTD</div>
                    <div className="mono fw-700 text-lg text-brand">{D.fmtMoney(c.revenue, true)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Margin</div>
                    <div className="mono fw-700 text-lg text-success">{margin.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="flex-between text-xs text-muted mb-1">
                  <span>Credit utilization</span>
                  <span className="mono">{D.fmtMoney(c.used, true)} / {D.fmtMoney(c.credit, true)}</span>
                </div>
                <ProgressBar pct={creditPct} color={creditPct > 100 ? 'danger' : creditPct > 80 ? 'warning' : 'success'} />
                <div className="flex-between mt-3 text-xs">
                  <span className="text-muted">{c.shipments} shipments YTD</span>
                  <i className="bi bi-arrow-right text-muted"></i>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card card-flush">
          <table className="tbl">
            <thead><tr><th>Client</th><th>Industry</th><th>Country</th><th>Revenue</th><th>Margin</th><th>Shipments</th><th>Credit</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {D.CLIENTS.map(c => (
                <tr key={c.id} onClick={() => setPage('client', { id: c.id })} style={{ cursor: 'pointer' }}>
                  <td><div className="fw-600 text-sm">{c.name}</div><div className="text-xs text-muted mono">{c.code}</div></td>
                  <td className="text-sm">{c.industry}</td>
                  <td className="text-sm mono">{c.country}</td>
                  <td><span className="mono fw-700 text-brand">{D.fmtMoney(c.revenue, true)}</span></td>
                  <td><span className="mono fw-600 text-success">{((c.profit / c.revenue) * 100).toFixed(1)}%</span></td>
                  <td className="mono">{c.shipments}</td>
                  <td style={{ width: 160 }}>
                    <ProgressBar pct={(c.used / c.credit) * 100} color={(c.used / c.credit) > 1 ? 'danger' : (c.used / c.credit) > 0.8 ? 'warning' : 'success'} />
                    <div className="text-xs text-muted mt-1 mono">{((c.used / c.credit) * 100).toFixed(0)}% used</div>
                  </td>
                  <td><span className={'chip ' + (c.status === 'priority' ? 'chip-brand' : c.status === 'review' ? 'chip-warning' : 'chip-success')}>{c.status}</span></td>
                  <td><i className="bi bi-arrow-right-short text-muted"></i></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   Client 360
   ============================================================ */
const Client360 = ({ id, setPage }) => {
  const D = window.ReliqData;
  const c = D.CLIENTS.find(x => x.id === id) || D.CLIENTS[0];
  const margin = (c.profit / c.revenue) * 100;
  const creditPct = (c.used / c.credit) * 100;
  const [tab, setTab] = useState('overview');
  const shipments = D.SHIPMENTS.filter(s => s.client === c.name);
  const invoices = D.INVOICES.filter(i => i.client === c.name);

  return (
    <div className="page">
      <div className="breadcrumb">
        <a onClick={() => setPage('clients')}>Clients</a>
        <i className="bi bi-chevron-right text-xs"></i>
        <span>{c.name}</span>
      </div>

      <div className="detail-head">
        <div className="flex-center gap-4">
          <div className="kpi-icon" style={{ width: 60, height: 60, background: 'var(--brand-3)', color: 'var(--brand)', fontSize: 22, fontWeight: 700 }}>
            {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="flex-center gap-3 mb-1">
              <h1 className="page-title" style={{ fontSize: 26 }}>{c.name}</h1>
              <span className={'chip ' + (c.status === 'priority' ? 'chip-brand' : c.status === 'review' ? 'chip-warning' : 'chip-success')}>{c.status}</span>
            </div>
            <div className="page-sub">{c.code} · {c.industry} · Based in {c.country} · Client since 2022</div>
          </div>
        </div>
        <div className="flex-center gap-2">
          <button className="btn"><i className="bi bi-envelope"></i> Email</button>
          <button className="btn"><i className="bi bi-telephone"></i> Call</button>
          <button className="btn"><i className="bi bi-tags"></i> Quote</button>
          <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Job</button>
        </div>
      </div>

      <div className="grid grid-4 mb-5">
        <Kpi label="Revenue (YTD)" value={D.fmtMoney(c.revenue, true)} delta={15} icon="bi-graph-up" color="var(--brand)" hero={c.status === 'priority'} />
        <Kpi label="Margin" value={margin.toFixed(1) + '%'} delta={3.2} icon="bi-percent" color="var(--success)" />
        <Kpi label="Shipments YTD" value={c.shipments} delta={22} icon="bi-boxes" color="var(--info)" />
        <Kpi label="Credit Utilization" value={creditPct.toFixed(0) + '%'} delta={-4} icon="bi-shield-check" color={creditPct > 80 ? 'var(--danger)' : 'var(--violet)'} />
      </div>

      <div className="tabs">
        {['overview','shipments','financials','contacts','documents','activity'].map(t => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid mb-5" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gutter)' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Revenue Trend (12 months)</h3>
                <span className="text-xs text-muted">{D.fmtMoney(c.revenue, true)} YTD</span>
              </div>
              <LineChart
                series={[
                  { data: sparkFor(parseInt(c.id.slice(2)), 12, c.revenue / 12000), color: 'var(--brand)', fill: true },
                ]}
                height={200}
              />
              <div className="flex-between text-xs text-muted mt-2">
                {D.REV_SERIES.filter((_, i) => i % 2 === 0).map(r => <span key={r.month}>{r.month}</span>)}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title text-sm mb-3">Account Details</h3>
              <div className="flex-col gap-3 text-sm">
                <DetailRow label="Industry" value={c.industry} />
                <DetailRow label="Country" value={c.country} />
                <DetailRow label="Account Manager" value="Sajibur R." />
                <DetailRow label="Payment Terms" value="Net 30" />
                <DetailRow label="Credit Limit" value={<span className="mono fw-600">{D.fmtMoney(c.credit, true)}</span>} />
                <DetailRow label="Used / Available" value={<span className="mono">{D.fmtMoney(c.used)} / {D.fmtMoney(c.credit - c.used)}</span>} />
                <div className="bar"><div className={'bar-fill ' + (creditPct > 80 ? 'danger' : creditPct > 60 ? 'warning' : 'success')} style={{ width: creditPct + '%' }}></div></div>
              </div>
            </div>
          </div>

          <div className="grid mb-5" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--gutter)' }}>
            <div className="card card-flush">
              <div className="card-header" style={{ padding: '18px 22px 8px' }}>
                <h3 className="card-title">Recent Shipments</h3>
                <span className="card-link" onClick={() => setTab('shipments')}>View all →</span>
              </div>
              <table className="tbl">
                <thead><tr><th>Job #</th><th>Route</th><th>Mode</th><th>ETA</th><th>Status</th></tr></thead>
                <tbody>
                  {shipments.slice(0, 4).map(s => (
                    <tr key={s.id} onClick={() => setPage('shipment', { id: s.id })} style={{ cursor: 'pointer' }}>
                      <td><span className="mono fw-700 text-brand text-sm">{s.id}</span></td>
                      <td className="text-sm"><span className="mono fw-600">{D.PORTS[s.pol]?.code}</span> <i className="bi bi-arrow-right text-xs text-muted"></i> <span className="mono fw-600">{D.PORTS[s.pod]?.code}</span></td>
                      <td><ModeChip mode={s.mode} direction={s.direction} size="sm" /></td>
                      <td className="text-sm text-muted">{D.fmtDate(s.eta)}</td>
                      <td><StatusChip status={s.status} /></td>
                    </tr>
                  ))}
                  {shipments.length === 0 && <tr><td colSpan="5" className="text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>No shipments yet</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="card card-flush">
              <div className="card-header" style={{ padding: '18px 22px 8px' }}>
                <h3 className="card-title">Open Invoices</h3>
                <span className="card-link" onClick={() => setPage('invoices')}>All →</span>
              </div>
              <table className="tbl">
                <thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.num}>
                      <td><span className="mono fw-700 text-brand text-sm">{inv.num}</span></td>
                      <td className="text-sm text-muted">{D.fmtDate(inv.issued)}</td>
                      <td className={'text-sm ' + (inv.status === 'overdue' ? 'text-danger fw-600' : '')}>{D.fmtDate(inv.due)}</td>
                      <td><span className="mono fw-600">{D.fmtMoney(inv.balance)}</span></td>
                      <td><PaymentStatusChip status={inv.status} /></td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan="5" className="text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>No invoices</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title text-sm mb-3">Mode Mix for {c.name}</h3>
            <div className="grid grid-5 gap-3">
              {[
                { mode: 'sea', label: 'Sea',  count: Math.round(c.shipments * 0.6), color: 'var(--m-sea)' },
                { mode: 'air', label: 'Air',  count: Math.round(c.shipments * 0.2), color: 'var(--m-air)' },
                { mode: 'road',label: 'Road', count: Math.round(c.shipments * 0.1), color: 'var(--m-road)' },
                { mode: 'rail',label: 'Rail', count: Math.round(c.shipments * 0.05), color: 'var(--m-rail)' },
                { mode: 'courier', label: 'Courier', count: Math.round(c.shipments * 0.05), color: 'var(--m-courier)' },
              ].map(m => (
                <div key={m.mode} style={{ textAlign: 'center', padding: 16, background: 'var(--surface-2)', borderRadius: 12 }}>
                  <i className={`bi ${D.MODES[m.mode]?.icon}`} style={{ fontSize: 20, color: m.color }}></i>
                  <div className="mono fw-700 text-lg mt-2">{m.count}</div>
                  <div className="text-xs text-muted">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab !== 'overview' && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <i className="bi bi-folder2-open" style={{ fontSize: 36, color: 'var(--muted-2)' }}></i>
          <div className="fw-600 mt-3">{tab[0].toUpperCase() + tab.slice(1)} tab</div>
          <div className="text-sm text-muted mt-1">Switch back to Overview for the full client snapshot.</div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   Rate Search
   ============================================================ */
const RateSearch = ({ setPage }) => {
  const D = window.ReliqData;
  const [origin, setOrigin] = useState('USNYC');
  const [destination, setDestination] = useState('DEHAM');
  const [mode, setMode] = useState('sea');

  return (
    <div className="page">
      <PageHero
        title="Rate Search"
        sub="Find the best lane across carriers and modes"
        actions={
          <>
            <button className="btn"><i className="bi bi-bookmark"></i> Saved searches</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Quote</button>
          </>
        }
      />

      {/* Search bar */}
      <div className="card mb-5">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div className="text-xs text-muted mb-1">Origin</div>
            <div className="input">
              <i className="bi bi-geo-alt"></i>
              <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {Object.values(D.PORTS).map(p => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Destination</div>
            <div className="input">
              <i className="bi bi-geo-alt-fill"></i>
              <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                {Object.values(D.PORTS).map(p => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Mode</div>
            <div className="input">
              <i className="bi bi-water"></i>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="sea">Sea</option>
                <option value="air">Air</option>
                <option value="road">Road</option>
                <option value="rail">Rail</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Equipment</div>
            <div className="input">
              <i className="bi bi-grid-3x3-gap"></i>
              <select>
                <option>Any</option>
                <option>20' GP</option>
                <option>40' HC</option>
                <option>Reefer</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Ready Date</div>
            <div className="input">
              <i className="bi bi-calendar"></i>
              <input defaultValue="May 25, 2026" />
            </div>
          </div>
          <button className="btn btn-brand btn-lg"><i className="bi bi-search"></i> Search</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <button className="filter-chip active">Best Match</button>
        <button className="filter-chip">Cheapest</button>
        <button className="filter-chip">Fastest</button>
        <button className="filter-chip">Most Reliable</button>
        <div style={{ marginLeft: 'auto' }} className="text-xs text-muted">
          Showing {D.RATES.filter(r => r.mode === mode).length} rates for <span className="mono fw-700 text-brand">{origin} → {destination}</span>
        </div>
      </div>

      {/* Rate cards */}
      <div className="flex-col gap-3 mb-5">
        {D.RATES.filter(r => r.mode === mode).map((r, i) => (
          <div key={i} className="card" style={{ position: 'relative' }}>
            {r.status === 'best' && (
              <span className="chip chip-brand" style={{ position: 'absolute', top: -10, left: 16, fontSize: 10 }}>
                <i className="bi bi-star-fill"></i> Best Value
              </span>
            )}
            <div className="grid" style={{ gridTemplateColumns: '50px 1.4fr 1fr 1fr 1fr auto', gap: 16, alignItems: 'center' }}>
              <div className="kpi-icon" style={{ width: 42, height: 42, background: `color-mix(in oklch, var(--m-${r.mode}) 14%, var(--surface))`, color: `var(--m-${r.mode})`, fontSize: 18 }}>
                <i className={`bi ${D.MODES[r.mode].icon}`}></i>
              </div>
              <div>
                <div className="fw-700">{r.carrier}</div>
                <div className="text-xs text-muted">{r.type} · {r.lane}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Transit</div>
                <div className="mono fw-700">{r.transit}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Valid until</div>
                <div className="mono fw-600 text-sm">{r.validity}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Rate</div>
                <div className="flex" style={{ alignItems: 'baseline', gap: 4 }}>
                  <span className="mono fw-700 text-xl text-brand">${r.rate}</span>
                  <span className="text-xs text-muted">{r.unit || '/container'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-sm">Details</button>
                <button className="btn btn-brand btn-sm">Book</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   Analytics
   ============================================================ */
const Analytics = ({ setPage }) => {
  const D = window.ReliqData;
  const [period, setPeriod] = useState('12mo');

  return (
    <div className="page">
      <PageHero
        title="Analytics"
        sub="Operational and financial performance across modes"
        actions={
          <>
            <div className="seg-nav">
              <button className={period === '7d' ? 'active' : ''} onClick={() => setPeriod('7d')}>7d</button>
              <button className={period === '30d' ? 'active' : ''} onClick={() => setPeriod('30d')}>30d</button>
              <button className={period === '90d' ? 'active' : ''} onClick={() => setPeriod('90d')}>90d</button>
              <button className={period === '12mo' ? 'active' : ''} onClick={() => setPeriod('12mo')}>12mo</button>
              <button className={period === 'ytd' ? 'active' : ''} onClick={() => setPeriod('ytd')}>YTD</button>
            </div>
            <button className="btn"><i className="bi bi-download"></i> Export PDF</button>
          </>
        }
      />

      <div className="grid grid-4 mb-5">
        <Kpi label="Revenue" value="$1.24M" delta={12} icon="bi-graph-up-arrow" color="var(--brand)" hero />
        <Kpi label="Gross Margin" value="23.4%" delta={2.1} icon="bi-pie-chart" color="var(--success)" />
        <Kpi label="Avg Job Value" value="$8,420" delta={4} icon="bi-receipt" color="var(--info)" />
        <Kpi label="On-Time %" value="94.2%" delta={-1.2} icon="bi-clock-history" color="var(--violet)" />
      </div>

      {/* Revenue + Mode mix */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gutter)' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Revenue & Profit (12mo)</h3>
              <div className="card-sub">Stacked by month, USD</div>
            </div>
            <div className="flex-center gap-3 text-xs">
              <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--brand)' }}></span>Revenue</span>
              <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--ink)' }}></span>Profit</span>
            </div>
          </div>
          <StackedBarChart
            data={D.REV_SERIES.map(r => ({ label: r.month, profit: r.profit, rest: r.revenue - r.profit }))}
            series={[
              { key: 'profit', color: 'var(--ink)' },
              { key: 'rest', color: 'var(--brand)' },
            ]}
            height={260}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Mode Mix</h3>
            <span className="text-xs text-muted">By job count</span>
          </div>
          <div className="flex-center" style={{ justifyContent: 'center', marginBottom: 16 }}>
            <Donut
              data={D.MODE_SHARE}
              size={180}
              thickness={22}
              center={
                <div>
                  <div className="mono fw-700 text-xl">{D.SHIPMENTS.length}</div>
                  <div className="text-xs text-muted">jobs</div>
                </div>
              }
            />
          </div>
          <div className="flex-col gap-2">
            {D.MODE_SHARE.map(m => (
              <div key={m.mode} className="flex-between text-xs">
                <span className="flex-center gap-2"><span className="chip-dot" style={{ background: m.color }}></span>{m.mode}</span>
                <span className="mono fw-600">{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top lanes + customers */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--gutter)' }}>
        <div className="card card-flush">
          <div className="card-header" style={{ padding: '18px 22px 8px' }}>
            <h3 className="card-title">Top Lanes by Revenue</h3>
            <span className="text-xs text-muted">YTD</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Lane</th><th>Jobs</th><th>Avg Transit</th><th>Revenue</th><th>Margin</th></tr></thead>
            <tbody>
              {[
                { lane: 'USNYC → DEHAM', jobs: 28, transit: '14d', rev: 268400, mar: 24.2 },
                { lane: 'CNSHA → NLRTM', jobs: 24, transit: '28d', rev: 218200, mar: 22.1 },
                { lane: 'HKHKG → USLAX', jobs: 18, transit: '16d', rev: 142800, mar: 19.8 },
                { lane: 'INMUN → AEDXB', jobs: 14, transit: ' 7d', rev:  98400, mar: 25.4 },
                { lane: 'JPYOK → USLAX', jobs: 11, transit: '12d', rev:  84200, mar: 21.3 },
              ].map((l, i) => (
                <tr key={i}>
                  <td className="mono fw-600">{l.lane}</td>
                  <td><span className="mono">{l.jobs}</span></td>
                  <td className="text-muted mono text-sm">{l.transit}</td>
                  <td><span className="mono fw-700 text-brand">{D.fmtMoney(l.rev, true)}</span></td>
                  <td><span className="mono fw-600 text-success">{l.mar}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Customers</h3>
            <span className="card-link" onClick={() => setPage('clients')}>All →</span>
          </div>
          <div className="flex-col gap-3">
            {D.TOP_CUSTOMERS.map(c => {
              const m = (c.profit / c.revenue) * 100;
              const pct = (c.revenue / D.TOP_CUSTOMERS[0].revenue) * 100;
              return (
                <div key={c.code}>
                  <div className="flex-between mb-1">
                    <span className="text-sm fw-600">{c.name}</span>
                    <span className="mono fw-700 text-brand">{D.fmtMoney(c.revenue, true)}</span>
                  </div>
                  <div className="flex" style={{ gap: 8, alignItems: 'center' }}>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="bar-fill" style={{ width: pct + '%' }}></div>
                    </div>
                    <span className="text-xs text-muted mono" style={{ width: 60, textAlign: 'right' }}>{m.toFixed(1)}% mar</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* On-time performance & utilization */}
      <div className="grid grid-2 mb-5" style={{ gap: 'var(--gutter)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">On-Time Performance by Mode</h3>
            <span className="text-xs text-muted">Last 90 days</span>
          </div>
          <div className="flex-col gap-3">
            {[
              { mode: 'Sea Export', ot: 92, color: 'var(--m-sea)' },
              { mode: 'Sea Import', ot: 88, color: 'oklch(60% 0.16 250)' },
              { mode: 'Air Freight', ot: 97, color: 'var(--m-air)' },
              { mode: 'Road', ot: 94, color: 'var(--m-road)' },
              { mode: 'Rail', ot: 91, color: 'var(--m-rail)' },
            ].map(m => (
              <div key={m.mode}>
                <div className="flex-between mb-1 text-sm">
                  <span>{m.mode}</span>
                  <span className="mono fw-700">{m.ot}%</span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: m.ot + '%', background: m.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Capacity Utilization</h3>
            <span className="text-xs text-muted">By week</span>
          </div>
          <StackedBarChart
            data={['W1','W2','W3','W4','W5','W6','W7','W8'].map((w, i) => ({
              label: w,
              sea: 30 + Math.sin(i * 0.6) * 10,
              air: 20 + Math.cos(i * 0.5) * 6,
              road: 15 + Math.sin(i) * 4,
            }))}
            series={[
              { key: 'sea',  color: 'var(--m-sea)' },
              { key: 'air',  color: 'var(--m-air)' },
              { key: 'road', color: 'var(--m-road)' },
            ]}
            height={200}
          />
          <div className="flex-center gap-4 text-xs mt-3" style={{ justifyContent: 'center' }}>
            <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--m-sea)' }}></span>Sea</span>
            <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--m-air)' }}></span>Air</span>
            <span className="flex-center gap-2"><span className="chip-dot" style={{ background: 'var(--m-road)' }}></span>Road</span>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Clients, Client360, RateSearch, Analytics });
