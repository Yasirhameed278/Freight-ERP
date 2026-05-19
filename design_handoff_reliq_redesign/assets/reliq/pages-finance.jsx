/* Reliq — finance pages: Invoices, AR, AP, Collections, General Ledger */

/* ============================================================
   Invoices
   ============================================================ */
const Invoices = ({ setPage }) => {
  const D = window.ReliqData;
  const [filter, setFilter] = useState('all');

  const filtered = D.INVOICES.filter(i => filter === 'all' || i.status === filter);
  const totalDue = D.INVOICES.reduce((s, i) => s + i.balance, 0);
  const totalCollected = D.INVOICES.reduce((s, i) => s + (i.amount - i.balance), 0);

  const counts = {
    all: D.INVOICES.length,
    sent: D.INVOICES.filter(i => i.status === 'sent').length,
    partial: D.INVOICES.filter(i => i.status === 'partial').length,
    paid: D.INVOICES.filter(i => i.status === 'paid').length,
    overdue: D.INVOICES.filter(i => i.status === 'overdue').length,
  };

  return (
    <div className="page">
      <PageHero
        title="Invoices"
        sub={`${D.INVOICES.length} invoices · ${D.fmtMoney(totalDue, true)} outstanding`}
        actions={
          <>
            <button className="btn"><i className="bi bi-upload"></i> Import</button>
            <button className="btn"><i className="bi bi-download"></i> Export</button>
            <button className="btn btn-brand"><i className="bi bi-plus-lg"></i> New Invoice</button>
          </>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-4 mb-5">
        <Kpi label="Total Invoiced" value={D.fmtMoney(D.INVOICES.reduce((s, i) => s + i.amount, 0), true)} delta={9} icon="bi-receipt" color="var(--brand)" />
        <Kpi label="Collected" value={D.fmtMoney(totalCollected, true)} delta={14} icon="bi-check-circle" color="var(--success)" />
        <Kpi label="Outstanding" value={D.fmtMoney(totalDue, true)} delta={-3} icon="bi-clock-history" color="var(--warning)" />
        <Kpi label="Overdue" value={D.fmtMoney(D.INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.balance, 0), true)} delta={-12} deltaLabel="vs last week" icon="bi-exclamation-triangle" color="var(--danger)" />
      </div>

      <div className="filter-row">
        {[
          { k: 'all', label: 'All' }, { k: 'sent', label: 'Sent' }, { k: 'partial', label: 'Partial' }, { k: 'paid', label: 'Paid' }, { k: 'overdue', label: 'Overdue' },
        ].map(f => (
          <button key={f.k} className={'filter-chip' + (filter === f.k ? ' active' : '')} onClick={() => setFilter(f.k)}>
            {f.label}<span className="count">{counts[f.k]}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }} className="flex-center gap-2">
          <div className="input" style={{ width: 240 }}>
            <i className="bi bi-search"></i>
            <input placeholder="Invoice #, client…" />
          </div>
          <button className="btn"><i className="bi bi-funnel"></i></button>
        </div>
      </div>

      <div className="card card-flush">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" /></th>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Shipment</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const overdueDays = D.daysFromNow(inv.due);
              return (
                <tr key={inv.num}>
                  <td><input type="checkbox" /></td>
                  <td><span className="mono fw-700 text-brand text-sm">{inv.num}</span></td>
                  <td className="text-sm fw-600">{inv.client}</td>
                  <td className="mono text-xs text-muted" onClick={() => setPage('shipment', { id: inv.shipment })} style={{ cursor: 'pointer' }}>{inv.shipment}</td>
                  <td className="text-sm text-muted">{D.fmtDate(inv.issued)}</td>
                  <td>
                    <div className={'text-sm ' + (inv.status === 'overdue' ? 'text-danger fw-600' : '')}>{D.fmtDate(inv.due)}</div>
                    {overdueDays < 0 && inv.status !== 'paid' && <div className="text-xs text-danger">{Math.abs(overdueDays)}d late</div>}
                  </td>
                  <td><span className="mono fw-600">{D.fmtMoney(inv.amount)}</span></td>
                  <td><span className={'mono fw-600 ' + (inv.balance > 0 ? '' : 'text-success')}>{D.fmtMoney(inv.balance)}</span></td>
                  <td><PaymentStatusChip status={inv.status} /></td>
                  <td>
                    <span className="flex-center gap-2">
                      <button className="btn-ghost btn btn-sm"><i className="bi bi-eye"></i></button>
                      <button className="btn-ghost btn btn-sm"><i className="bi bi-three-dots"></i></button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   AR Portal
   ============================================================ */
const ARPortal = ({ setPage }) => {
  const D = window.ReliqData;
  const totalAR = D.AR_AGING.reduce((s, b) => s + b.total, 0);
  const top = [...D.CLIENTS].sort((a, b) => b.used - a.used).slice(0, 6);

  return (
    <div className="page">
      <PageHero
        title="Accounts Receivable"
        sub={`${D.fmtMoney(totalAR, true)} outstanding across ${D.AR_AGING.reduce((s, b) => s + b.count, 0)} invoices`}
        actions={
          <>
            <button className="btn"><i className="bi bi-envelope"></i> Send reminders</button>
            <button className="btn btn-brand"><i className="bi bi-cash-coin"></i> Record Payment</button>
          </>
        }
      />

      {/* Aging strip with progress bars */}
      <div className="card mb-5">
        <div className="card-header">
          <h3 className="card-title">AR Aging Distribution</h3>
          <div className="card-sub">As of {D.fmtDateLong(D.today)}</div>
        </div>
        <div className="grid grid-5 gap-4 mb-4">
          {D.AR_AGING.map((b, i) => {
            const color = ['var(--success)','var(--info)','var(--brand)','var(--warning)','var(--danger)'][i];
            const pct = (b.total / totalAR) * 100;
            return (
              <div key={b.bucket} className="kpi" style={{ borderTop: `3px solid ${color}`, padding: 16 }}>
                <div className="text-xs text-muted">{b.bucket}</div>
                <div className="mono fw-700" style={{ fontSize: 22 }}>{D.fmtMoney(b.total, true)}</div>
                <div className="text-xs text-muted">{b.count} invoice{b.count === 1 ? '' : 's'} · {pct.toFixed(0)}%</div>
                <div className="bar" style={{ height: 4 }}><div className="bar-fill" style={{ width: pct + '%', background: color }}></div></div>
              </div>
            );
          })}
        </div>
        <BarChart
          data={D.AR_AGING.map(b => ({ label: b.bucket, value: b.total }))}
          colorFn={(_, i) => ['var(--success)','var(--info)','var(--brand)','var(--warning)','var(--danger)'][i]}
          height={140}
        />
      </div>

      {/* Two-up */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--gutter)' }}>
        {/* Customer balances */}
        <div className="card card-flush">
          <div className="card-header" style={{ padding: '18px 22px 8px' }}>
            <h3 className="card-title">Top Receivables by Customer</h3>
            <span className="card-link" onClick={() => setPage('clients')}>All →</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Open</th><th>Credit Used</th><th></th></tr></thead>
            <tbody>
              {top.map(c => (
                <tr key={c.id} onClick={() => setPage('client', { id: c.id })} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="text-sm fw-600">{c.name}</div>
                    <div className="text-xs text-muted mono">{c.code} · {c.industry}</div>
                  </td>
                  <td><span className="mono fw-700">{D.fmtMoney(c.used, true)}</span></td>
                  <td style={{ width: 200 }}>
                    <ProgressBar pct={(c.used / c.credit) * 100} color={c.used > c.credit ? 'danger' : c.used > c.credit * 0.8 ? 'warning' : 'success'} />
                    <div className="text-xs text-muted mt-1 mono">{D.fmtMoney(c.used, true)} / {D.fmtMoney(c.credit, true)}</div>
                  </td>
                  <td><i className="bi bi-arrow-right-short text-muted"></i></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cash forecast */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cash Inflow Forecast</h3>
            <span className="text-muted text-xs">Next 4 weeks</span>
          </div>
          <LineChart
            series={[
              { data: [22, 42, 28, 56, 41], color: 'var(--brand)', fill: true },
              { data: [18, 32, 26, 38, 36], color: 'var(--ink)', fill: false },
            ]}
            height={180}
          />
          <div className="flex-between text-xs text-muted mt-2">
            {['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5'].map(w => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-3 mt-4 gap-3">
            <div>
              <div className="text-xs text-muted">Expected (4wk)</div>
              <div className="mono fw-700 text-lg">$189k</div>
            </div>
            <div>
              <div className="text-xs text-muted">Confirmed</div>
              <div className="mono fw-700 text-lg text-success">$112k</div>
            </div>
            <div>
              <div className="text-xs text-muted">At risk</div>
              <div className="mono fw-700 text-lg text-danger">$24k</div>
            </div>
          </div>
        </div>
      </div>

      {/* Open invoices */}
      <div className="card card-flush">
        <div className="card-header" style={{ padding: '18px 22px 8px' }}>
          <h3 className="card-title">Open Invoices</h3>
          <span className="card-link" onClick={() => setPage('invoices')}>All invoices →</span>
        </div>
        <table className="tbl">
          <thead><tr><th>Invoice #</th><th>Client</th><th>Issued</th><th>Due</th><th>Amount</th><th>Balance</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {D.INVOICES.filter(i => i.balance > 0).map(inv => (
              <tr key={inv.num}>
                <td><span className="mono fw-700 text-brand text-sm">{inv.num}</span></td>
                <td className="text-sm fw-600">{inv.client}</td>
                <td className="text-sm text-muted">{D.fmtDate(inv.issued)}</td>
                <td className={'text-sm ' + (inv.status === 'overdue' ? 'text-danger fw-600' : '')}>{D.fmtDate(inv.due)}</td>
                <td><span className="mono fw-600">{D.fmtMoney(inv.amount)}</span></td>
                <td><span className="mono fw-600">{D.fmtMoney(inv.balance)}</span></td>
                <td><PaymentStatusChip status={inv.status} /></td>
                <td><button className="btn btn-sm">Remind</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   AP Portal
   ============================================================ */
const APPortal = ({ setPage }) => {
  const D = window.ReliqData;
  const totalAP = D.AP_AGING.reduce((s, b) => s + b.total, 0);

  return (
    <div className="page">
      <PageHero
        title="Accounts Payable"
        sub={`${D.fmtMoney(totalAP, true)} owed across ${D.BILLS.length} bills`}
        actions={
          <>
            <button className="btn"><i className="bi bi-file-earmark-arrow-up"></i> Upload Bill</button>
            <button className="btn btn-brand"><i className="bi bi-bank"></i> Pay Bills</button>
          </>
        }
      />

      <div className="grid grid-4 mb-5">
        <Kpi label="Total Payables" value={D.fmtMoney(totalAP, true)} delta={4} icon="bi-credit-card" color="var(--brand)" />
        <Kpi label="Due This Week" value={D.fmtMoney(D.BILLS.filter(b => D.daysFromNow(b.due) <= 7 && b.balance > 0).reduce((s, b) => s + b.balance, 0), true)} delta={-8} deltaLabel="vs last week" icon="bi-calendar-week" color="var(--warning)" />
        <Kpi label="Overdue" value={D.fmtMoney(D.BILLS.filter(b => b.status === 'overdue').reduce((s, b) => s + b.balance, 0), true)} delta={-15} deltaLabel="vs last week" icon="bi-exclamation-triangle" color="var(--danger)" />
        <Kpi label="Paid This Month" value={D.fmtMoney(D.BILLS.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0), true)} delta={22} icon="bi-check-circle" color="var(--success)" />
      </div>

      {/* Vendor split + aging */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 'var(--gutter)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">By Category</h3>
            <span className="text-xs text-muted">Last 90 days</span>
          </div>
          <div className="flex-center" style={{ justifyContent: 'center' }}>
            <Donut
              data={[
                { mode: 'Ocean Freight', value: 42, color: 'var(--m-sea)' },
                { mode: 'Air Freight',   value: 26, color: 'var(--m-air)' },
                { mode: 'Port Charges',  value: 16, color: 'var(--brand)' },
                { mode: 'Drayage',       value: 10, color: 'var(--m-road)' },
                { mode: 'Customs',       value: 6,  color: 'var(--warning)' },
              ]}
              size={160}
              thickness={20}
              center={<div><div className="mono fw-700 text-xl">{D.fmtMoney(totalAP, true)}</div><div className="text-xs text-muted">Open</div></div>}
            />
          </div>
          <div className="mt-3 flex-col gap-2">
            {[
              { label: 'Ocean Freight', val: 42, color: 'var(--m-sea)' },
              { label: 'Air Freight',   val: 26, color: 'var(--m-air)' },
              { label: 'Port Charges',  val: 16, color: 'var(--brand)' },
              { label: 'Drayage',       val: 10, color: 'var(--m-road)' },
              { label: 'Customs',       val: 6,  color: 'var(--warning)' },
            ].map(c => (
              <div key={c.label} className="flex-between text-xs">
                <span className="flex-center gap-2"><span className="chip-dot" style={{ background: c.color }} />{c.label}</span>
                <span className="mono fw-600">{c.val}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">AP Aging</h3>
            <div className="card-sub">{D.fmtMoney(totalAP, true)} total</div>
          </div>
          <div className="grid grid-5 gap-3 mb-4">
            {D.AP_AGING.map((b, i) => {
              const color = ['var(--success)','var(--info)','var(--brand)','var(--warning)','var(--danger)'][i];
              return (
                <div key={b.bucket} style={{ textAlign: 'center', padding: 10, background: 'var(--surface-2)', borderRadius: 10 }}>
                  <div className="text-xs text-muted">{b.bucket}</div>
                  <div className="mono fw-700 mt-1" style={{ color }}>{D.fmtMoney(b.total, true)}</div>
                  <div className="text-xs text-muted">{b.count}</div>
                </div>
              );
            })}
          </div>
          <BarChart
            data={D.AP_AGING.map(b => ({ label: b.bucket, value: b.total }))}
            colorFn={(_, i) => ['var(--success)','var(--info)','var(--brand)','var(--warning)','var(--danger)'][i]}
            height={120}
          />
        </div>
      </div>

      {/* Bills table */}
      <div className="card card-flush">
        <div className="card-header" style={{ padding: '18px 22px 8px' }}>
          <h3 className="card-title">Open Bills</h3>
          <div className="flex-center gap-2">
            <button className="btn btn-sm"><i className="bi bi-funnel"></i> Filter</button>
            <button className="btn btn-sm"><i className="bi bi-sort-down"></i> Sort: Due date</button>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" /></th>
              <th>Bill #</th><th>Vendor</th><th>Category</th><th>Due</th><th>Amount</th><th>Balance</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {D.BILLS.map(b => (
              <tr key={b.num}>
                <td><input type="checkbox" /></td>
                <td><span className="mono fw-700 text-brand text-sm">{b.num}</span></td>
                <td className="text-sm fw-600">{b.vendor}</td>
                <td><span className="chip">{b.category}</span></td>
                <td className={'text-sm ' + (b.status === 'overdue' ? 'text-danger fw-600' : 'text-muted')}>{D.fmtDate(b.due)}</td>
                <td><span className="mono fw-600">{D.fmtMoney(b.amount)}</span></td>
                <td><span className="mono fw-600">{D.fmtMoney(b.balance)}</span></td>
                <td><PaymentStatusChip status={b.status} /></td>
                <td><button className="btn btn-sm">Pay</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   Collections
   ============================================================ */
const Collections = ({ setPage }) => {
  const D = window.ReliqData;
  const overdueInvoices = D.INVOICES.filter(i => i.status === 'overdue' || (i.balance > 0 && D.daysFromNow(i.due) < 0));
  // also add a few aging ones to populate
  const allOpen = D.INVOICES.filter(i => i.balance > 0).map(inv => {
    const overdueDays = -D.daysFromNow(inv.due);
    let escalation = 'none';
    if (overdueDays >= 30) escalation = 'legal';
    else if (overdueDays >= 14) escalation = 'final';
    else if (overdueDays >= 7) escalation = '2nd';
    else if (overdueDays >= 0) escalation = '1st';
    return { ...inv, overdueDays, escalation };
  });

  return (
    <div className="page">
      <PageHero
        title="Collections"
        sub={`${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? '' : 's'} · ${D.fmtMoney(overdueInvoices.reduce((s, i) => s + i.balance, 0), true)} at risk`}
        actions={
          <>
            <button className="btn"><i className="bi bi-envelope-paper"></i> Bulk reminders</button>
            <button className="btn btn-brand"><i className="bi bi-megaphone"></i> Escalate Selected</button>
          </>
        }
      />

      {/* Funnel / status */}
      <div className="grid grid-4 mb-5">
        {[
          { label: '1st Reminder',   count: 4, value: 18400, color: 'var(--info)' },
          { label: '2nd Reminder',   count: 3, value: 12200, color: 'var(--warning)' },
          { label: 'Final Notice',   count: 2, value:  9800, color: 'var(--danger)' },
          { label: 'Legal Referred', count: 1, value:  5540, color: 'var(--ink)' },
        ].map(s => (
          <div key={s.label} className="kpi" style={{ borderLeft: `3px solid ${s.color}` }}>
            <div className="kpi-label"><span>{s.label}</span></div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{s.count}</div>
            <div className="kpi-foot"><span className="mono fw-700">{D.fmtMoney(s.value, true)}</span> · at risk</div>
          </div>
        ))}
      </div>

      <div className="card mb-5">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <span className="card-link">View all →</span>
        </div>
        <div className="flex-col" style={{ gap: 0 }}>
          {[
            { date: 'Today 09:42', who: 'You', action: 'Sent 2nd reminder', sub: 'INV-2026-0412 · Kestrel Automotive', icon: 'bi-envelope', color: 'var(--info)' },
            { date: 'Today 09:15', who: 'System', action: 'Aging snapshot taken', sub: '11 invoices updated · 3 newly overdue', icon: 'bi-clock', color: 'var(--muted)' },
            { date: 'Yesterday', who: 'D. Chen', action: 'Phone call logged', sub: 'Driftwood Furniture · Promise to pay May 25', icon: 'bi-telephone', color: 'var(--success)' },
            { date: 'May 16',    who: 'You', action: 'Final notice sent', sub: 'INV-2026-0412 · 42 days past due', icon: 'bi-exclamation-octagon', color: 'var(--danger)' },
          ].map((a, i) => (
            <div key={i} className="feed-item">
              <div className="feed-icon" style={{ background: `color-mix(in oklch, ${a.color} 14%, var(--surface))`, color: a.color }}>
                <i className={`bi ${a.icon}`}></i>
              </div>
              <div className="feed-body">
                <div className="feed-title"><span className="fw-600">{a.who}</span> · {a.action}</div>
                <div className="feed-sub">{a.sub}</div>
              </div>
              <div className="feed-time">{a.date}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header" style={{ padding: '18px 22px 8px' }}>
          <h3 className="card-title">Collection Queue</h3>
          <div className="flex-center gap-2">
            <div className="filter-row" style={{ margin: 0 }}>
              <button className="filter-chip active">All</button>
              <button className="filter-chip">1-30d</button>
              <button className="filter-chip">30-60d</button>
              <button className="filter-chip">60-90d</button>
              <button className="filter-chip">90d+</button>
            </div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" /></th>
              <th>Invoice</th><th>Client</th><th>Days Late</th><th>Balance</th><th>Last Contact</th><th>Stage</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allOpen.map(inv => (
              <tr key={inv.num}>
                <td><input type="checkbox" /></td>
                <td><span className="mono fw-700 text-brand text-sm">{inv.num}</span></td>
                <td className="text-sm fw-600">{inv.client}</td>
                <td>
                  {inv.overdueDays > 0 ? (
                    <span className={'mono fw-700 ' + (inv.overdueDays >= 30 ? 'text-danger' : inv.overdueDays >= 14 ? 'text-warning' : '')} style={{ color: inv.overdueDays >= 14 ? 'var(--warning)' : undefined }}>
                      {inv.overdueDays}d
                    </span>
                  ) : <span className="text-muted text-xs">Not yet due</span>}
                </td>
                <td><span className="mono fw-700">{D.fmtMoney(inv.balance)}</span></td>
                <td className="text-sm text-muted">{inv.overdueDays > 0 ? '3 days ago' : '—'}</td>
                <td>
                  <span className={'chip ' + (inv.escalation === 'legal' ? 'chip-danger' : inv.escalation === 'final' ? 'chip-warning' : inv.escalation === '2nd' ? 'chip-warning' : inv.escalation === '1st' ? 'chip-info' : '')}>
                    {inv.escalation === 'none' ? 'New' : inv.escalation === '1st' ? '1st reminder' : inv.escalation === '2nd' ? '2nd reminder' : inv.escalation === 'final' ? 'Final notice' : 'Legal'}
                  </span>
                </td>
                <td>
                  <div className="flex-center gap-2">
                    <button className="btn btn-sm"><i className="bi bi-envelope"></i></button>
                    <button className="btn btn-sm"><i className="bi bi-telephone"></i></button>
                    <button className="btn btn-sm"><i className="bi bi-three-dots"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   General Ledger
   ============================================================ */
const GL = ({ setPage }) => {
  const D = window.ReliqData;
  const [period, setPeriod] = useState('May 2026');
  const totalAssets = D.GL_ACCOUNTS.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiab   = D.GL_ACCOUNTS.filter(a => a.type === 'liability').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalRev    = D.GL_ACCOUNTS.filter(a => a.type === 'revenue').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalExp    = D.GL_ACCOUNTS.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0);
  const netIncome   = totalRev - totalExp;

  return (
    <div className="page">
      <PageHero
        title="General Ledger"
        sub="Trial balance · period to date"
        actions={
          <>
            <div className="seg-nav">
              <button className="active">May 2026</button>
              <button>YTD</button>
              <button>FY2026</button>
            </div>
            <button className="btn"><i className="bi bi-download"></i> Export</button>
            <button className="btn btn-brand"><i className="bi bi-journal-plus"></i> Journal Entry</button>
          </>
        }
      />

      <div className="grid grid-4 mb-5">
        <Kpi label="Total Assets"      value={D.fmtMoney(totalAssets, true)}  delta={6}   icon="bi-bank" color="var(--success)" />
        <Kpi label="Total Liabilities" value={D.fmtMoney(totalLiab, true)}    delta={-2}  icon="bi-cash-stack" color="var(--warning)" />
        <Kpi label="Revenue MTD"       value={D.fmtMoney(totalRev, true)}     delta={12}  icon="bi-graph-up" color="var(--brand)" />
        <Kpi label="Net Income"        value={D.fmtMoney(netIncome, true)}    delta={14}  icon="bi-coin" color="var(--info)" />
      </div>

      <div className="grid mb-5" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--gutter)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Income Statement</h3>
            <span className="text-xs text-muted">May 2026 · MTD</span>
          </div>
          <div className="flex-col">
            {[
              { label: 'Freight Revenue', val:  412800 },
              { label: 'Handling Revenue', val: 48200 },
              { label: 'Total Revenue', val: 461000, bold: true, border: true },
              { label: 'Carrier Cost', val: -218400 },
              { label: 'Port & Customs', val: -42800 },
              { label: 'Operations Salaries', val: -64800 },
              { label: 'Total Cost', val: -326000, bold: true, border: true },
              { label: 'Gross Profit', val: 135000, bold: true, color: 'var(--success)' },
            ].map((r, i) => (
              <div key={i} className="flex-between" style={{ padding: '10px 0', borderTop: r.border ? '1px solid var(--hairline)' : 'none' }}>
                <span className={r.bold ? 'fw-700' : 'text-muted text-sm'}>{r.label}</span>
                <span className={'mono ' + (r.bold ? 'fw-700' : 'text-sm') } style={{ color: r.color || (r.val < 0 ? 'var(--ink-2)' : 'var(--ink)') }}>
                  {r.val < 0 ? '(' : ''}{D.fmtMoney(Math.abs(r.val))}{r.val < 0 ? ')' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Revenue vs Expense Trend</h3>
            <span className="text-xs text-muted">12 months</span>
          </div>
          <LineChart
            series={[
              { data: D.REV_SERIES.map(r => r.revenue), color: 'var(--brand)', fill: true },
              { data: D.REV_SERIES.map(r => r.revenue - r.profit), color: 'var(--ink)', fill: false },
            ]}
            height={220}
          />
          <div className="flex-between text-xs text-muted mt-2">
            {D.REV_SERIES.filter((_, i) => i % 2 === 0).map(r => <span key={r.month}>{r.month}</span>)}
          </div>
          <div className="grid grid-3 mt-4">
            <div><div className="text-xs text-muted">YTD Revenue</div><div className="mono fw-700 text-lg">$1.24M</div></div>
            <div><div className="text-xs text-muted">YTD Expense</div><div className="mono fw-700 text-lg">$948k</div></div>
            <div><div className="text-xs text-muted">YTD Profit</div><div className="mono fw-700 text-lg text-success">$293k</div></div>
          </div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header" style={{ padding: '18px 22px 8px' }}>
          <h3 className="card-title">Trial Balance</h3>
          <div className="flex-center gap-2">
            <div className="input" style={{ width: 200, padding: '5px 10px' }}>
              <i className="bi bi-search text-xs"></i>
              <input placeholder="Account…" style={{ fontSize: 12 }} />
            </div>
            <button className="btn btn-sm"><i className="bi bi-funnel"></i></button>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th className="ta-right">Debit</th><th className="ta-right">Credit</th><th className="ta-right">Balance</th></tr></thead>
          <tbody>
            {D.GL_ACCOUNTS.map(a => (
              <tr key={a.code}>
                <td><span className="mono fw-700 text-sm">{a.code}</span></td>
                <td className="fw-600 text-sm">{a.name}</td>
                <td><span className="chip text-xs" style={{ fontSize: 10 }}>{a.type}</span></td>
                <td className="ta-right mono">{a.debit  > 0 ? D.fmtMoney(a.debit)  : '—'}</td>
                <td className="ta-right mono">{a.credit > 0 ? D.fmtMoney(a.credit) : '—'}</td>
                <td className="ta-right">
                  <span className={'mono fw-700 ' + (a.balance < 0 ? 'text-success' : '')}>
                    {a.balance < 0 ? '(' : ''}{D.fmtMoney(Math.abs(a.balance))}{a.balance < 0 ? ')' : ''}
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface-2)' }}>
              <td></td>
              <td className="fw-700">Totals</td>
              <td></td>
              <td className="ta-right mono fw-700">{D.fmtMoney(D.GL_ACCOUNTS.reduce((s, a) => s + a.debit, 0))}</td>
              <td className="ta-right mono fw-700">{D.fmtMoney(D.GL_ACCOUNTS.reduce((s, a) => s + a.credit, 0))}</td>
              <td className="ta-right mono fw-700 text-success">In balance</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

Object.assign(window, { Invoices, ARPortal, APPortal, Collections, GL });
