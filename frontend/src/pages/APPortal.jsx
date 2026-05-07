import { useEffect, useState, useMemo } from 'react';
import {
  Row, Col, Badge, Alert,
  Form, InputGroup, Button, ProgressBar,
  Table,
} from 'react-bootstrap';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { analyticsApi, invoicesApi } from '../api';

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const daysPast = (dueDate) => {
  if (!dueDate) return 0;
  const diff = Math.floor((Date.now() - new Date(dueDate)) / 86400000);
  return Math.max(0, diff);
};

const ageBucket = (days) => {
  if (days === 0) return { label: 'Current', variant: 'success' };
  if (days <= 30)  return { label: '1-30d',  variant: 'info' };
  if (days <= 60)  return { label: '31-60d', variant: 'warning' };
  if (days <= 90)  return { label: '61-90d', variant: 'danger' };
  return { label: '90d+', variant: 'dark' };
};

const VENDOR_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe'];

const AGING_CONFIG = [
  { key: '0',    label: 'Current', color: '#10b981' },
  { key: '1-30', label: '1-30d',   color: '#3b82f6' },
  { key: '31-60',label: '31-60d',  color: '#f59e0b' },
  { key: '61-90',label: '61-90d',  color: '#f97316' },
  { key: '90+',  label: '90d+',    color: '#ef4444' },
];

const STATUS_VARIANT = {
  draft: 'secondary', sent: 'info', partially_paid: 'warning',
  paid: 'success', overdue: 'danger', cancelled: 'secondary',
};

/* ── Custom tooltip ───────────────────────────────────────── */
const MoneyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="erp-tooltip">
      <strong>{payload[0].name}</strong>
      <div>USD {fmtMoney(payload[0].value)}</div>
    </div>
  );
};

/* ── Main component ───────────────────────────────────────── */
const APPortal = () => {
  const [byVendor, setByVendor]   = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [paying, setPaying]       = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [vendorRes, invRes] = await Promise.all([
          analyticsApi.apByVendor({ limit: 20 }),
          invoicesApi.list({ type: 'ap', limit: 100, status: 'sent,partially_paid,overdue' }),
        ]);
        setByVendor(vendorRes.data || []);
        setInvoices(invRes.items || invRes.data || []);
      } catch (ex) {
        setError(ex.response?.data?.message || 'Failed to load AP data');
      } finally { setLoading(false); }
    })();
  }, []);

  /* KPI totals */
  const totalOutstanding = byVendor.reduce((s, v) => s + v.outstanding, 0);
  const overdueInvoices  = invoices.filter((inv) => inv.status === 'overdue');
  const totalOverdue     = overdueInvoices.reduce((s, inv) => s + (inv.amountDue || 0), 0);

  /* Vendor donut data */
  const donutData = byVendor.slice(0, 6).map((v) => ({
    name: v.companyName, value: v.outstanding,
  }));

  /* Aging buckets from invoices */
  const agingBuckets = useMemo(() => {
    const buckets = { '0': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const inv of invoices) {
      const d = daysPast(inv.dueDate);
      if (d === 0)       buckets['0']    += inv.amountDue || 0;
      else if (d <= 30)  buckets['1-30'] += inv.amountDue || 0;
      else if (d <= 60)  buckets['31-60']+= inv.amountDue || 0;
      else if (d <= 90)  buckets['61-90']+= inv.amountDue || 0;
      else               buckets['90+']  += inv.amountDue || 0;
    }
    return AGING_CONFIG.map((c) => ({ ...c, total: buckets[c.key] }));
  }, [invoices]);

  const agingMax = Math.max(...agingBuckets.map((b) => b.total), 1);

  /* Filtered invoices */
  const filtered = useMemo(() => {
    let list = [...invoices];
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        (i.invoiceNumber || '').toLowerCase().includes(q) ||
        (i.client?.companyName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, statusFilter, search]);

  if (loading) {
    return (
      <div className="ss-loading" style={{ minHeight: 400 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-credit-card dashboard-loader-icon"></i>
        </div>
        <span>Loading AP data…</span>
      </div>
    );
  }
  if (error) return <div className="py-4"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-credit-card"></i></div>
          <div>
            <h4 className="ss-page-title">Accounts Payable</h4>
            <div className="ss-page-sub">Vendor payables, aging analysis, and payment management</div>
          </div>
        </div>
        <div className="ss-header-actions">
          <button className="ss-action-btn">
            <i className="bi bi-download me-2"></i>Export
          </button>
        </div>
      </div>

      {/* Overdue banner */}
      {totalOverdue > 0 && (
        <div className="ar-overdue-banner mb-4">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>
            <strong>USD {fmtMoney(totalOverdue)} overdue</strong>
            <span className="ms-2 opacity-75">{overdueInvoices.length} overdue payable{overdueInvoices.length !== 1 ? 's' : ''} — schedule payments to avoid late fees</span>
          </div>
        </div>
      )}

      {/* ── KPI strip ─────────────────────────────────────── */}
      <div className="inv-summary-strip mb-4">
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Total Payables</div>
          <div className="inv-summary-value" style={{ color: '#1a56db' }}>USD {fmtMoney(totalOutstanding)}</div>
          <div className="inv-summary-sub">all outstanding</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Overdue</div>
          <div className="inv-summary-value" style={{ color: totalOverdue > 0 ? '#dc2626' : 'var(--bs-body-color)' }}>
            USD {fmtMoney(totalOverdue)}
          </div>
          <div className="inv-summary-sub">{overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Total Vendors</div>
          <div className="inv-summary-value">{byVendor.length}</div>
          <div className="inv-summary-sub">with open payables</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Open Invoices</div>
          <div className="inv-summary-value">{invoices.length}</div>
          <div className="inv-summary-sub">pending payment</div>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {/* Vendor Donut */}
        <Col lg={4}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <span className="erp-card-title">Payables by Vendor</span>
            </div>
            <div className="erp-card-body p-3">
              {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={donutData} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={VENDOR_COLORS[i % VENDOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`USD ${fmtMoney(v)}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-4 text-muted">No vendor data</div>
              )}
              <div className="mt-2" style={{ maxHeight: 160, overflowY: 'auto' }}>
                {byVendor.slice(0, 6).map((v, i) => (
                  <div key={v.vendorId || i} className="d-flex align-items-center gap-2 py-1">
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: VENDOR_COLORS[i % VENDOR_COLORS.length], flexShrink: 0 }}></div>
                    <span className="flex-grow-1 text-truncate small">{v.companyName}</span>
                    <span className="small fw-semibold">USD {fmtMoney(v.outstanding)}</span>
                    <Badge bg="light" text="dark" style={{ fontSize: '0.65rem' }}>{v.invoiceCount}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Col>

        {/* AP Aging Bar */}
        <Col lg={4}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <span className="erp-card-title">AP Aging Analysis</span>
            </div>
            <div className="erp-card-body p-3">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={agingBuckets} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<MoneyTooltip />} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {agingBuckets.map((b) => <Cell key={b.key} fill={b.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        {/* Aging progress bars */}
        <Col lg={4}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <span className="erp-card-title">Aging Breakdown</span>
            </div>
            <div className="erp-card-body p-3">
              {agingBuckets.map((b) => {
                const pct = totalOutstanding > 0 ? Math.round((b.total / totalOutstanding) * 100) : 0;
                return (
                  <div key={b.key} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="fw-semibold" style={{ color: b.color }}>{b.label}</small>
                      <div className="d-flex gap-2">
                        <small className="text-muted">{pct}%</small>
                        <small className="fw-semibold">USD {fmtMoney(b.total)}</small>
                      </div>
                    </div>
                    <ProgressBar now={pct} style={{ height: 6, backgroundColor: 'var(--border-color)' }}>
                      <div style={{ width: `${pct}%`, background: b.color, borderRadius: 3, height: '100%' }}></div>
                    </ProgressBar>
                  </div>
                );
              })}
            </div>
          </div>
        </Col>
      </Row>

      {/* Invoice Table */}
      <div className="erp-card">
        <div className="erp-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span className="erp-card-title">Payable Invoices</span>
          <div className="d-flex gap-2 flex-wrap">
            <InputGroup size="sm" style={{ width: 200 }}>
              <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
              <Form.Control placeholder="Search invoices…" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
            <Form.Select size="sm" style={{ width: 150 }} value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </Form.Select>
          </div>
        </div>
        <div className="erp-card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-receipt fs-1 d-block mb-2 opacity-25"></i>
              No payable invoices match your filter.
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="erp-table mb-0">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Vendor</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Days Past Due</th>
                    <th>Status</th>
                    <th className="text-end">Payable</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Balance</th>
                    <th>Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const dpd  = daysPast(inv.dueDate);
                    const buck = ageBucket(dpd);
                    return (
                      <tr key={inv._id}>
                        <td><span className="font-monospace fw-semibold">{inv.invoiceNumber}</span></td>
                        <td>{inv.client?.companyName || '—'}</td>
                        <td className="text-muted small">{fmt(inv.issueDate)}</td>
                        <td className="text-muted small">{fmt(inv.dueDate)}</td>
                        <td>
                          {dpd > 0
                            ? <span className="text-danger fw-semibold">{dpd}d</span>
                            : <span className="text-success">Current</span>}
                        </td>
                        <td>
                          <Badge bg={STATUS_VARIANT[inv.status] || 'secondary'} style={{ fontSize: '0.7rem' }}>
                            {inv.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="text-end font-monospace">{fmtMoney(inv.total)}</td>
                        <td className="text-end font-monospace text-success">{fmtMoney(inv.amountPaid)}</td>
                        <td className="text-end font-monospace fw-semibold">{fmtMoney(inv.amountDue)}</td>
                        <td>
                          <Badge bg={buck.variant} style={{ fontSize: '0.65rem' }}>{buck.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="fw-bold" style={{ background: 'var(--sidebar-bg)', color: '#fff' }}>
                    <td colSpan={6}>Total Outstanding</td>
                    <td className="text-end font-monospace">
                      {fmtMoney(filtered.reduce((s, i) => s + (i.total || 0), 0))}
                    </td>
                    <td className="text-end font-monospace text-success">
                      {fmtMoney(filtered.reduce((s, i) => s + (i.amountPaid || 0), 0))}
                    </td>
                    <td className="text-end font-monospace text-warning">
                      {fmtMoney(filtered.reduce((s, i) => s + (i.amountDue || 0), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APPortal;
