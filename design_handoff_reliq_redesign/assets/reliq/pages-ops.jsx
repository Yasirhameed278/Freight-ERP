/* Reliq — operations pages: Shipments list, Shipment detail, Pipeline, Tasks */

/* ============================================================
   Shipments list
   ============================================================ */
const Shipments = ({ setPage }) => {
  const D = window.ReliqData;
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [view, setView] = useState('card');
  const [search, setSearch] = useState('');

  const filtered = D.SHIPMENTS.filter(s => {
    if (statusFilter === 'active'    && D.STATUS[s.status]?.step < 1) return false;
    if (statusFilter === 'active'    && (s.status === 'delivered' || s.status === 'cancelled' || s.status === 'on_hold')) return false;
    if (statusFilter === 'delivered' && s.status !== 'delivered') return false;
    if (statusFilter === 'on_hold'   && s.status !== 'on_hold') return false;
    if (modeFilter !== 'all' && s.mode !== modeFilter) return false;
    if (search && !(`${s.id} ${s.client} ${s.vessel}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const counts = {
    all: D.SHIPMENTS.length,
    active: D.SHIPMENTS.filter(s => !['delivered','cancelled','on_hold'].includes(s.status)).length,
    delivered: D.SHIPMENTS.filter(s => s.status === 'delivered').length,
    on_hold: D.SHIPMENTS.filter(s => s.status === 'on_hold').length,
  };

  return (
    <div className="page">
      <PageHero
        title="Shipments"
        sub={`${filtered.length} shipment${filtered.length === 1 ? '' : 's'} · ${D.SHIPMENTS.filter(s => s.status === 'in_transit').length} in transit`}
        actions={
          <>
            <div className="seg-nav" style={{ padding: 3 }}>
              <button className={view === 'card' ? 'active' : ''} onClick={() => setView('card')} style={{ padding: '5px 10px' }}><i className="bi bi-grid-3x3-gap"></i></button>
              <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} style={{ padding: '5px 10px' }}><i className="bi bi-list-ul"></i></button>
            </div>
            <button className="btn"><i className="bi bi-download"></i> Export</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Job</button>
          </>
        }
      />

      {/* Filters */}
      <div className="filter-row">
        {[
          { k: 'active',    label: 'Active' },
          { k: 'all',       label: 'All' },
          { k: 'delivered', label: 'Delivered' },
          { k: 'on_hold',   label: 'On Hold' },
        ].map(f => (
          <button
            key={f.k}
            className={'filter-chip' + (statusFilter === f.k ? ' active' : '')}
            onClick={() => setStatusFilter(f.k)}
          >
            {f.label}
            <span className="count">{counts[f.k]}</span>
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: 'var(--hairline)', margin: '0 6px' }}></div>
        {[
          { k: 'all',  label: 'All Modes' },
          { k: 'sea',  label: 'Sea' },
          { k: 'air',  label: 'Air' },
          { k: 'road', label: 'Road' },
          { k: 'rail', label: 'Rail' },
        ].map(f => (
          <button
            key={f.k}
            className={'filter-chip' + (modeFilter === f.k ? ' active' : '')}
            onClick={() => setModeFilter(f.k)}
          >
            {f.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <div className="input" style={{ width: 240 }}>
            <i className="bi bi-search"></i>
            <input placeholder="Job #, client, vessel…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="card mb-5">
        <div className="pipeline">
          {D.PIPELINE_STEPS.map((step, i) => {
            const stepCount = D.SHIPMENTS.filter(s => s.status === step.key).length;
            const isDone = i < 4;
            const isActive = i === 4;
            return (
              <div key={step.key} className={'pipe-step' + (isDone ? ' done' : '') + (isActive ? ' active' : '')}>
                <div className="pipe-dot">
                  {isDone ? <i className="bi bi-check"></i> : <i className={`bi ${step.icon}`}></i>}
                </div>
                <div className="pipe-label">{step.label}</div>
                {stepCount > 0 && (
                  <div className="text-xs mono fw-700" style={{ color: isActive || isDone ? 'var(--brand)' : 'var(--muted)' }}>{stepCount}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {view === 'card' ? (
        <div className="grid grid-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="ship-card" onClick={() => setPage('shipment', { id: s.id })}>
              <div className="flex-between">
                <div>
                  <div className="ship-num text-brand">{s.id}</div>
                  <div className="text-xs text-muted mt-1">{s.client}</div>
                </div>
                <ModeChip mode={s.mode} direction={s.direction} />
              </div>
              <div className="ship-route">
                <div className="ship-port">
                  <div className="ship-port-code">{D.PORTS[s.pol]?.code || s.pol}</div>
                  <div className="ship-port-name">{D.PORTS[s.pol]?.name || s.pol}</div>
                </div>
                <div className="ship-route-arrow">
                  <div className="ship-route-line"></div>
                  <span className="ship-route-days">{Math.abs(D.daysFromNow(s.eta) - D.daysFromNow(s.etd))}d</span>
                </div>
                <div className="ship-port" style={{ textAlign: 'right' }}>
                  <div className="ship-port-code">{D.PORTS[s.pod]?.code || s.pod}</div>
                  <div className="ship-port-name">{D.PORTS[s.pod]?.name || s.pod}</div>
                </div>
              </div>
              <div className="flex-between" style={{ paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
                <div className="flex-col" style={{ gap: 2 }}>
                  <div className="text-xs text-muted">ETD</div>
                  <div className="text-sm fw-600">{D.fmtDate(s.etd)}</div>
                </div>
                <div className="flex-col" style={{ gap: 2, textAlign: 'center', flex: 1 }}>
                  <div className="text-xs text-muted">{s.mode === 'air' ? 'Flight' : s.mode === 'sea' ? 'Vessel' : 'Carrier'}</div>
                  <div className="text-sm fw-600 mono" style={{ fontSize: 11 }}>{s.vessel}</div>
                </div>
                <div className="flex-col" style={{ gap: 2, textAlign: 'right' }}>
                  <div className="text-xs text-muted">ETA</div>
                  <div className={'text-sm fw-600 ' + (s.late ? 'text-danger' : '')}>
                    {D.fmtDate(s.eta)}
                    {s.late && <i className="bi bi-exclamation-circle ms-1"></i>}
                  </div>
                </div>
              </div>
              <div className="flex-between">
                <StatusChip status={s.status} />
                {s.containers > 0 && <span className="text-xs text-muted"><i className="bi bi-grid-3x3-gap"></i> {s.containers} ctr</span>}
                {s.mode === 'air' && <span className="text-xs text-muted mono">{Math.round(s.weight).toLocaleString()} kg</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card card-flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>Job #</th><th>Mode</th><th>Route</th><th>Client</th><th>ETD</th><th>ETA</th><th>Carrier</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} onClick={() => setPage('shipment', { id: s.id })} style={{ cursor: 'pointer' }}>
                  <td><span className="mono fw-700 text-brand text-sm">{s.id}</span></td>
                  <td><ModeChip mode={s.mode} direction={s.direction} size="sm" /></td>
                  <td><span className="mono fw-600">{D.PORTS[s.pol]?.code}</span> <i className="bi bi-arrow-right text-muted text-xs"></i> <span className="mono fw-600">{D.PORTS[s.pod]?.code}</span></td>
                  <td className="text-sm">{s.client}</td>
                  <td className="text-sm text-muted">{D.fmtDate(s.etd)}</td>
                  <td className={'text-sm ' + (s.late ? 'text-danger fw-600' : 'text-muted')}>{D.fmtDate(s.eta)}</td>
                  <td className="text-sm mono">{s.vessel}</td>
                  <td><StatusChip status={s.status} /></td>
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
   Shipment Detail
   ============================================================ */
const ShipmentDetail = ({ id, setPage }) => {
  const D = window.ReliqData;
  const s = D.SHIPMENTS.find(x => x.id === id) || D.SHIPMENTS[0];
  const pol = D.PORTS[s.pol] || { name: s.pol, code: s.pol };
  const pod = D.PORTS[s.pod] || { name: s.pod, code: s.pod };
  const [tab, setTab] = useState('overview');

  const events = [
    { ts: D.fmtDate(s.etd, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }), title: 'Booking confirmed', sub: 'Booking number assigned · ' + s.vessel, icon: 'bi-bookmark-check', color: 'var(--info)', done: true },
    { ts: D.fmtDate(D.today, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }), title: 'Cargo received at origin', sub: `${pol.name} CFS · ${s.containers > 0 ? s.containers + ' container(s) stuffed' : 'palletized'}`, icon: 'bi-box-seam', color: 'var(--info)', done: D.STATUS[s.status]?.step >= 2 },
    { ts: '—', title: 'Customs export filed', sub: 'EEI · ITN pending', icon: 'bi-shield-check', color: 'var(--warning)', done: D.STATUS[s.status]?.step >= 3 },
    { ts: '—', title: 'On board / departed', sub: 'Vessel departed ' + pol.name, icon: 'bi-truck', color: 'var(--m-sea)', done: D.STATUS[s.status]?.step >= 4 },
    { ts: '—', title: 'Arrived at destination', sub: pod.name, icon: 'bi-geo-alt', color: 'var(--success)', done: D.STATUS[s.status]?.step >= 5 },
    { ts: '—', title: 'Customs import & cleared', sub: 'Pending', icon: 'bi-shield-check', color: 'var(--warning)', done: D.STATUS[s.status]?.step >= 7 },
    { ts: '—', title: 'Delivered to consignee', sub: 'Final mile', icon: 'bi-patch-check', color: 'var(--success)', done: D.STATUS[s.status]?.step >= 8 },
  ];

  return (
    <div className="page">
      <div className="breadcrumb">
        <a onClick={() => setPage('shipments')}>Shipments</a>
        <i className="bi bi-chevron-right text-xs"></i>
        <span>{s.id}</span>
      </div>

      <div className="detail-head">
        <div>
          <div className="flex-center gap-3 mb-2">
            <h1 className="page-title mono" style={{ fontSize: 26 }}>{s.id}</h1>
            <StatusChip status={s.status} />
            <ModeChip mode={s.mode} direction={s.direction} />
            {s.late && <span className="chip chip-danger"><i className="bi bi-exclamation-circle"></i> Late ETA</span>}
          </div>
          <div className="page-sub">
            {s.client} · {s.mode === 'air' ? `AWB ${s.awb}` : `Vessel ${s.vessel}`}
          </div>
        </div>
        <div className="flex-center" style={{ gap: 8 }}>
          <button className="btn"><i className="bi bi-pencil"></i> Edit</button>
          <button className="btn"><i className="bi bi-printer"></i> Print BOL</button>
          <button className="btn"><i className="bi bi-envelope"></i> Send docs</button>
          <button className="btn btn-brand"><i className="bi bi-arrow-up-circle"></i> Update Status</button>
        </div>
      </div>

      {/* Route visualization */}
      <div className="card mb-5">
        <div className="grid grid-3 mb-4">
          <div>
            <div className="text-muted text-xs">Origin</div>
            <div className="mono fw-700" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>{pol.code}</div>
            <div className="text-sm">{pol.name}, {pol.country}</div>
            <div className="text-xs text-muted mt-2">ETD <span className="fw-600">{D.fmtDateLong(s.etd)}</span></div>
          </div>
          <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className={`bi ${D.MODES[s.mode].icon}`} style={{ fontSize: 28, color: D.MODES[s.mode].color }}></i>
            <div className="text-xs text-muted">{Math.abs(D.daysFromNow(s.eta) - D.daysFromNow(s.etd))}d transit</div>
            <div className="bar" style={{ width: 200 }}>
              <div className="bar-fill" style={{ width: `${(D.STATUS[s.status]?.step / 8) * 100}%` }}></div>
            </div>
            <div className="text-xs mono text-muted">{D.STATUS[s.status]?.label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="text-muted text-xs">Destination</div>
            <div className="mono fw-700" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>{pod.code}</div>
            <div className="text-sm">{pod.name}, {pod.country}</div>
            <div className="text-xs text-muted mt-2">ETA <span className={'fw-600 ' + (s.late ? 'text-danger' : '')}>{D.fmtDateLong(s.eta)}</span></div>
          </div>
        </div>

        {/* Mini map */}
        <div className="world-map" style={{ height: 200, aspectRatio: 'unset' }}>
          <WorldMapPlaceholder />
          <div className="world-dot" style={{ left: `${((pol.lng + 180) / 360) * 100}%`, top: `${((90 - pol.lat) / 180) * 100}%`, background: 'var(--ink)' }}></div>
          <div className="world-dot" style={{ left: `${((pod.lng + 180) / 360) * 100}%`, top: `${((90 - pod.lat) / 180) * 100}%` }}></div>
          {/* Route line */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <line
              x1={`${((pol.lng + 180) / 360) * 100}%`}
              y1={`${((90 - pol.lat) / 180) * 100}%`}
              x2={`${((pod.lng + 180) / 360) * 100}%`}
              y2={`${((90 - pod.lat) / 180) * 100}%`}
              stroke="var(--brand)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview','milestones','containers','documents','financials','messages'].map(t => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid mb-5" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 'var(--gutter)' }}>
          {/* Milestone timeline */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Milestones</h3>
              <span className="text-muted text-xs">{events.filter(e => e.done).length} of {events.length} complete</span>
            </div>
            <div className="flex-col" style={{ position: 'relative' }}>
              {events.map((e, i) => (
                <div key={i} className="flex" style={{ gap: 16, padding: '14px 0', borderBottom: i < events.length - 1 ? '1px solid var(--hairline)' : 'none', position: 'relative' }}>
                  <div className="kpi-icon" style={{
                    width: 36, height: 36,
                    background: e.done ? `color-mix(in oklch, ${e.color} 14%, var(--surface))` : 'var(--surface-2)',
                    color: e.done ? e.color : 'var(--muted)',
                    border: e.done ? 'none' : '1px dashed var(--border-2)',
                    flexShrink: 0,
                  }}>
                    <i className={`bi ${e.icon}`}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex-between">
                      <div className={'fw-600 text-sm ' + (e.done ? '' : 'text-muted')}>{e.title}</div>
                      <div className="text-xs text-muted mono">{e.ts}</div>
                    </div>
                    <div className="text-xs text-muted mt-1">{e.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side panel */}
          <div className="flex-col gap-4">
            <div className="card">
              <h3 className="card-title text-sm mb-3">Shipment Details</h3>
              <div className="flex-col gap-3 text-sm">
                <DetailRow label="Mode" value={D.MODES[s.mode].label + (s.direction ? ' · ' + s.direction : '')} />
                <DetailRow label={s.mode === 'air' ? 'Flight' : 'Vessel'} value={<span className="mono fw-600">{s.vessel}</span>} />
                {s.awb && <DetailRow label="AWB" value={<span className="mono">{s.awb}</span>} />}
                <DetailRow label="Containers" value={s.containers > 0 ? s.containers : '—'} />
                <DetailRow label="Weight" value={<span className="mono">{s.weight.toLocaleString()} kg</span>} />
                <DetailRow label="Commodity" value="Mixed General Cargo" />
                <DetailRow label="Incoterms" value="CIF" />
                <DetailRow label="Insurance" value={<span className="text-success fw-600"><i className="bi bi-shield-check"></i> Covered</span>} />
              </div>
            </div>

            <div className="card">
              <h3 className="card-title text-sm mb-3">Cost Summary</h3>
              <div className="flex-col gap-2 text-sm">
                <div className="flex-between"><span className="text-muted">Ocean freight</span><span className="mono fw-600">{D.fmtMoney(s.value * 0.45)}</span></div>
                <div className="flex-between"><span className="text-muted">Origin charges</span><span className="mono fw-600">{D.fmtMoney(s.value * 0.12)}</span></div>
                <div className="flex-between"><span className="text-muted">Destination charges</span><span className="mono fw-600">{D.fmtMoney(s.value * 0.18)}</span></div>
                <div className="flex-between"><span className="text-muted">Customs</span><span className="mono fw-600">{D.fmtMoney(s.value * 0.08)}</span></div>
                <div className="divider" style={{ margin: '8px 0' }}></div>
                <div className="flex-between fw-700"><span>Total billed</span><span className="mono text-brand">{D.fmtMoney(s.value)}</span></div>
                <div className="flex-between text-success"><span className="text-sm">Margin</span><span className="mono fw-600">{D.fmtMoney(s.value * 0.23)} (23%)</span></div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title text-sm mb-3">Documents</h3>
              <div className="flex-col gap-2 text-sm">
                {[
                  { name: 'Bill of Lading', icon: 'bi-file-earmark-text', status: 'signed' },
                  { name: 'Commercial Invoice', icon: 'bi-receipt', status: 'sent' },
                  { name: 'Packing List', icon: 'bi-list-check', status: 'signed' },
                  { name: 'Certificate of Origin', icon: 'bi-patch-check', status: 'pending' },
                ].map(doc => (
                  <div key={doc.name} className="flex-between" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
                    <span className="flex-center gap-2">
                      <i className={`bi ${doc.icon} text-muted`}></i>
                      <span className="text-sm">{doc.name}</span>
                    </span>
                    <span className={'chip text-xs ' + (doc.status === 'signed' ? 'chip-success' : doc.status === 'pending' ? 'chip-warning' : 'chip-info')}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab !== 'overview' && (
        <div className="card mb-5" style={{ padding: 48, textAlign: 'center' }}>
          <i className="bi bi-layers-half" style={{ fontSize: 36, color: 'var(--muted-2)' }}></i>
          <div className="fw-600 mt-3">{tab[0].toUpperCase() + tab.slice(1)} tab</div>
          <div className="text-sm text-muted mt-1">Detail view goes here — switch to Overview to see milestones, cost & docs.</div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex-between">
    <span className="text-muted text-xs">{label}</span>
    <span>{value}</span>
  </div>
);

/* ============================================================
   Pipeline (Kanban)
   ============================================================ */
const Pipeline = ({ setPage }) => {
  const D = window.ReliqData;
  const cols = [
    { key: 'quote',           label: 'Quote',          tint: 'var(--muted)' },
    { key: 'booked',          label: 'Booked',         tint: 'var(--info)' },
    { key: 'cargo_received',  label: 'Cargo Received', tint: 'var(--info)' },
    { key: 'customs_export',  label: 'Customs Export', tint: 'var(--warning)' },
    { key: 'in_transit',      label: 'In Transit',     tint: 'var(--m-sea)' },
    { key: 'cleared',         label: 'Cleared',        tint: 'var(--success)' },
  ];

  return (
    <div className="page">
      <PageHero
        title="Pipeline"
        sub="Drag shipments through your operations workflow"
        actions={
          <>
            <button className="btn"><i className="bi bi-funnel"></i> Filter</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Job</button>
          </>
        }
      />

      <div className="filter-row">
        <button className="filter-chip active">All teams</button>
        <button className="filter-chip">Sea Export</button>
        <button className="filter-chip">Sea Import</button>
        <button className="filter-chip">Air</button>
        <button className="filter-chip">Road & Rail</button>
        <div style={{ marginLeft: 'auto' }} className="flex-center gap-3 text-xs text-muted">
          <span>Showing {D.SHIPMENTS.length} jobs</span>
          <span>·</span>
          <span>Total value <span className="mono fw-700 text-brand">{D.fmtMoney(D.SHIPMENTS.reduce((s, x) => s + x.value, 0), true)}</span></span>
        </div>
      </div>

      <div className="kanban">
        {cols.map(c => {
          const items = D.SHIPMENTS.filter(s => s.status === c.key);
          return (
            <div key={c.key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="flex-center gap-2">
                  <span className="chip-dot" style={{ background: c.tint }}></span>
                  {c.label}
                  <span className="text-xs text-muted mono">{items.length}</span>
                </span>
                <button className="btn-ghost btn btn-sm" style={{ padding: 2, fontSize: 14 }}><i className="bi bi-plus"></i></button>
              </div>
              {items.map(s => (
                <div key={s.id} className="kanban-card" onClick={() => setPage('shipment', { id: s.id })}>
                  <div className="flex-between">
                    <span className="mono fw-700 text-brand text-sm">{s.id}</span>
                    <ModeChip mode={s.mode} direction={s.direction} size="sm" />
                  </div>
                  <div className="flex-center gap-2 text-sm">
                    <span className="mono fw-600">{D.PORTS[s.pol]?.code}</span>
                    <i className="bi bi-arrow-right text-muted text-xs"></i>
                    <span className="mono fw-600">{D.PORTS[s.pod]?.code}</span>
                  </div>
                  <div className="text-xs text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.client}</div>
                  <div className="flex-between" style={{ paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
                    <div className="text-xs">
                      <span className="text-muted">ETA </span>
                      <span className={'fw-600 ' + (s.late ? 'text-danger' : '')}>{D.fmtDate(s.eta)}</span>
                    </div>
                    <span className="mono text-xs fw-700">{D.fmtMoney(s.value, true)}</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-xs text-muted ta-center" style={{ padding: 24, border: '1px dashed var(--border)', borderRadius: 8 }}>
                  Drop jobs here
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================
   Tasks
   ============================================================ */
const Tasks = ({ setPage }) => {
  const D = window.ReliqData;
  const groups = [
    { key: 'todo',     label: 'To do',     tint: 'var(--muted)' },
    { key: 'progress', label: 'In Progress', tint: 'var(--info)' },
    { key: 'review',   label: 'Review',    tint: 'var(--warning)' },
    { key: 'done',     label: 'Done',      tint: 'var(--success)' },
  ];

  return (
    <div className="page">
      <PageHero
        title="Tasks"
        sub={`${D.TASKS.length} tasks · ${D.TASKS.filter(t => D.daysFromNow(t.due) <= 1).length} due today/tomorrow`}
        actions={
          <>
            <button className="btn"><i className="bi bi-funnel"></i> Filter</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Task</button>
          </>
        }
      />

      <div className="filter-row">
        <button className="filter-chip active">Mine</button>
        <button className="filter-chip">Team</button>
        <button className="filter-chip">High priority</button>
        <button className="filter-chip">Due this week</button>
        <button className="filter-chip">By shipment</button>
      </div>

      <div className="grid grid-4 gap-4">
        {groups.map(g => {
          const items = D.TASKS.filter(t => t.status === g.key);
          if (g.key === 'done' && items.length === 0) items.push({ id: 99, title: 'Confirm INV-2026-0418 paid', priority: 'low', assignee: 'D. Chen', due: D.today, status: 'done', tag: 'finance' });
          return (
            <div key={g.key} className="card" style={{ padding: 12, background: 'var(--surface-2)', boxShadow: 'none' }}>
              <div className="kanban-col-header" style={{ padding: '4px 6px 8px' }}>
                <span className="flex-center gap-2">
                  <span className="chip-dot" style={{ background: g.tint }}></span>
                  {g.label}
                  <span className="text-xs text-muted mono">{items.length}</span>
                </span>
                <button className="btn-ghost btn btn-sm" style={{ padding: 2, fontSize: 14 }}><i className="bi bi-plus"></i></button>
              </div>
              <div className="flex-col gap-2">
                {items.map(t => (
                  <div key={t.id} className="kanban-card">
                    <div className="flex" style={{ gap: 8, alignItems: 'flex-start' }}>
                      <input type="checkbox" defaultChecked={g.key === 'done'} style={{ marginTop: 2 }} />
                      <div className="text-sm fw-600" style={{ flex: 1 }}>{t.title}</div>
                    </div>
                    {t.shipment && (
                      <div className="text-xs text-muted mono" style={{ marginLeft: 24 }} onClick={() => setPage('shipment', { id: t.shipment })}>
                        <i className="bi bi-link-45deg"></i> {t.shipment}
                      </div>
                    )}
                    <div className="flex-between" style={{ marginLeft: 24 }}>
                      <span className="flex-center gap-2 text-xs">
                        <span className={'chip ' + (t.priority === 'high' ? 'chip-danger' : t.priority === 'med' ? 'chip-warning' : '')} style={{ fontSize: 10, padding: '2px 7px' }}>
                          {t.priority}
                        </span>
                        <span className="chip text-xs" style={{ fontSize: 10, padding: '2px 7px' }}>{t.tag}</span>
                      </span>
                      <span className="flex-center gap-2 text-xs">
                        <div className="avatar" style={{ width: 18, height: 18, fontSize: 9, background: 'var(--brand)', color: '#fff', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                          {t.assignee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className={'text-xs ' + (D.daysFromNow(t.due) < 0 ? 'text-danger fw-700' : D.daysFromNow(t.due) === 0 ? 'text-brand fw-700' : 'text-muted')}>
                          {D.daysFromNow(t.due) === 0 ? 'Today' : D.daysFromNow(t.due) === 1 ? 'Tomorrow' : D.daysFromNow(t.due) < 0 ? `${Math.abs(D.daysFromNow(t.due))}d late` : `${D.daysFromNow(t.due)}d`}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-muted ta-center" style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8 }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { Shipments, ShipmentDetail, Pipeline, Tasks, DetailRow });
