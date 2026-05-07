import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, Row, Col, Badge, Form, InputGroup, Button } from 'react-bootstrap';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import { analyticsApi, invoicesApi } from '../api';
import { useTheme } from '../context/ThemeContext';

/* ── Formatters ─────────────────────────────────────────────── */
const fmtMoney = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/* ── Status config ───────────────────────────────────────────── */
const STATUS_LABEL = {
  sent: 'Sent', partially_paid: 'Part. Paid', overdue: 'Overdue',
  paid: 'Paid', draft: 'Draft', cancelled: 'Cancelled',
};

const STATUS_COLOR = {
  sent: 'info', partially_paid: 'warning', overdue: 'danger',
  paid: 'success', draft: 'secondary', cancelled: 'dark',
};

const AGING_COLORS = ['#16a34a', '#ca8a04', '#d97706', '#dc2626', '#7c3aed'];
const PIE_COLORS   = ['#1a56db','#0891b2','#dc2626','#ea580c','#059669','#7c3aed','#d97706','#db2777','#6b7280','#14b8a6'];

/* ── Donut tooltip ───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div className="fw-semibold">{d.name}</div>
      <div className="text-muted">{fmtMoney(d.value)}</div>
    </div>
  );
};

/* ── AR Portal page ──────────────────────────────────────────── */
const ARPortal = () => {
  const { isDark } = useTheme();
  const [arCustomers, setArCustomers] = useState([]);
  const [arTotal,     setArTotal]     = useState(0);
  const [arAging,     setArAging]     = useState([]);
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [custRes, agingRes, invRes] = await Promise.all([
          analyticsApi.arByCustomer({ limit: 20 }),
          analyticsApi.arAging(),
          invoicesApi.list({ type: 'ar' }),
        ]);
        if (cancelled) return;
        setArCustomers(custRes.data || []);
        setArTotal(custRes.total || 0);
        setArAging(agingRes.data || []);
        setInvoices(invRes.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const overdueTotal = useMemo(
    () => arAging.filter((b) => b.bucket !== 'Current').reduce((s, b) => s + b.total, 0),
    [arAging]
  );

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) =>
        i.invoiceNumber?.toLowerCase().includes(q) ||
        i.client?.companyName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, statusFilter, search]);

  const pieData = arCustomers.slice(0, 10).map((c, i) => ({
    name: c.companyName,
    value: c.outstanding,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  if (loading) {
    return (
      <div className="ss-loading" style={{ minHeight: 400 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-wallet2 dashboard-loader-icon"></i>
        </div>
        <span>Loading AR data…</span>
      </div>
    );
  }

  const currentTotal = arAging.find((b) => b.bucket === 'Current')?.total || 0;
  const overdueCount = arAging.filter((b) => b.bucket !== 'Current').reduce((s, b) => s + b.count, 0);

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-wallet2"></i></div>
          <div>
            <h4 className="ss-page-title">Accounts Receivable</h4>
            <div className="ss-page-sub">Aging analysis, customer balances, and invoice drill-down</div>
          </div>
        </div>
        <div className="ss-header-actions">
          <button className="ss-action-btn">
            <i className="bi bi-download me-2"></i>Export
          </button>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <div className="inv-summary-strip mb-4">
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Total Outstanding</div>
          <div className="inv-summary-value" style={{ color: '#d97706' }}>{fmtMoney(arTotal)}</div>
          <div className="inv-summary-sub">across {arCustomers.length} customers</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Current (not due)</div>
          <div className="inv-summary-value" style={{ color: '#16a34a' }}>{fmtMoney(currentTotal)}</div>
          <div className="inv-summary-sub">within terms</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Overdue</div>
          <div className="inv-summary-value" style={{ color: overdueTotal > 0 ? '#dc2626' : 'var(--bs-body-color)' }}>
            {fmtMoney(overdueTotal)}
          </div>
          <div className="inv-summary-sub">{overdueCount} invoice{overdueCount !== 1 ? 's' : ''} past due</div>
        </div>
        <div className="inv-summary-tile">
          <div className="inv-summary-label">Customers</div>
          <div className="inv-summary-value">{arCustomers.length}</div>
          <div className="inv-summary-sub">with open AR</div>
        </div>
      </div>


      {/* ── Charts row ───────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Customer donut */}
        <Col lg={6}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <h6 className="erp-card-title">Outstanding by Customer</h6>
            </div>
            <div className="erp-card-body">
              {pieData.length === 0 ? (
                <div className="text-center text-muted py-4">No outstanding AR</div>
              ) : (
                <Row className="g-3 align-items-center">
                  <Col md={6}>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%" cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                          >
                            {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {arCustomers.map((c, i) => (
                        <div key={c.clientId} className="d-flex justify-content-between align-items-center py-1" style={{ fontSize: 12, gap: 8 }}>
                          <div className="d-flex align-items-center gap-2 text-truncate" style={{ minWidth: 0 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}></span>
                            <span className="text-truncate">{c.companyName}</span>
                          </div>
                          <strong className="text-nowrap text-money" style={{ color: c.outstanding > 0 ? '#d97706' : undefined }}>
                            {fmtMoney(c.outstanding)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}
            </div>
          </div>
        </Col>

        {/* Aging buckets */}
        <Col lg={6}>
          <div className="erp-card h-100">
            <div className="erp-card-header">
              <h6 className="erp-card-title">Aging Analysis</h6>
            </div>
            <div className="erp-card-body">
              {arAging.length === 0 ? (
                <div className="text-center text-muted py-4">No outstanding AR</div>
              ) : (
                <div>
                  {arAging.map((b, i) => {
                    const barPct = arTotal > 0 ? (b.total / arTotal) * 100 : 0;
                    return (
                      <div key={b.bucket} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                display: 'inline-block',
                                width: 10, height: 10,
                                borderRadius: '50%',
                                background: AGING_COLORS[i] || '#6c757d',
                              }}
                            ></span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{b.bucket}</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>({b.count} inv.)</span>
                          </div>
                          <strong className="text-money" style={{ fontSize: 13 }}>{fmtMoney(b.total)}</strong>
                        </div>
                        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${barPct}%`,
                              background: AGING_COLORS[i] || '#6c757d',
                              borderRadius: 4,
                              transition: 'width 0.6s ease',
                            }}
                          />
                        </div>
                        <div className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>{barPct.toFixed(1)}% of total</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Invoice drill-down table ──────────────────────────── */}
      <div className="erp-card">
        <div className="erp-card-header">
          <h6 className="erp-card-title">Job Invoices</h6>
          <div className="d-flex gap-2">
            <InputGroup size="sm" style={{ width: 200 }}>
              <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
              <Form.Control
                placeholder="Invoice # or client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <Form.Select size="sm" style={{ width: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </Form.Select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Due Days</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-end">Receivable</th>
                <th className="text-end">Received</th>
                <th className="text-end">Balance</th>
                <th className="text-end">Ageing</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center text-muted py-4">No invoices found</td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const ageing = inv.daysPastDue || 0;
                  const ageingColor = ageing === 0 ? '#16a34a' : ageing <= 30 ? '#ca8a04' : ageing <= 60 ? '#d97706' : '#dc2626';
                  return (
                    <tr key={inv._id} style={inv.isOverdue ? { background: '#fef2f280' } : undefined}>
                      <td><code style={{ fontSize: 12 }}>{inv.invoiceNumber}</code></td>
                      <td style={{ fontSize: 13 }}>{inv.client?.companyName || '—'}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>{fmtDate(inv.issueDate)}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>{inv.netDays || 0} days</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>{fmtDate(inv.dueDate)}</td>
                      <td>
                        <Badge bg={STATUS_COLOR[inv.status] || 'secondary'} style={{ fontSize: 10 }}>
                          {STATUS_LABEL[inv.status] || inv.status}
                        </Badge>
                      </td>
                      <td className="text-end text-money" style={{ fontSize: 13 }}>{fmtMoney(inv.total)}</td>
                      <td className="text-end text-money" style={{ fontSize: 13, color: '#16a34a' }}>{fmtMoney(inv.amountPaid)}</td>
                      <td className="text-end text-money fw-bold" style={{ fontSize: 13 }}>{fmtMoney(inv.amountDue)}</td>
                      <td className="text-end" style={{ fontSize: 12 }}>
                        {ageing > 0
                          ? <span style={{ color: ageingColor, fontWeight: 700 }}>{ageing}d</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <div className="d-flex gap-1 justify-content-end">
                          <Button
                            size="sm" variant="outline-secondary"
                            onClick={() => invoicesApi.previewPdf(inv._id)}
                            title="Preview PDF"
                            style={{ padding: '2px 7px' }}
                          >
                            <i className="bi bi-file-earmark-pdf"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="erp-card-body border-top d-flex justify-content-between align-items-center" style={{ fontSize: 13 }}>
          <span className="text-muted">{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}</span>
          <div className="d-flex gap-3">
            <span>Total: <strong className="text-money">{fmtMoney(filteredInvoices.reduce((s, i) => s + i.total, 0))}</strong></span>
            <span>Balance: <strong className="text-money" style={{ color: '#d97706' }}>{fmtMoney(filteredInvoices.reduce((s, i) => s + (i.amountDue || 0), 0))}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARPortal;
