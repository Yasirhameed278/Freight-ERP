import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Row, Col, Form, Alert } from 'react-bootstrap';
import { shipmentsApi, clientsApi } from '../api';

/* ── Helpers ────────────────────────────────────────────────── */
const fmtMoney = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v || 0);

const emptyPort = () => ({ name: '', code: '', city: '', country: '' });

const emptyContainer = () => ({
  _localId: Math.random().toString(36).slice(2),
  containerNumber: '',
  containerType: '40HC',
  sealNumber: '',
  grossWeight: '',
  cbm: '',
});

const emptyCharge = (type) => ({
  _localId: Math.random().toString(36).slice(2),
  type,
  description: '',
  category: 'freight',
  amount: '',
  currency: 'USD',
  exchangeRate: 1,
  quantity: 1,
  unit: '',
  vendor: '',
  paid: false,
});

const TABS = [
  { key: 'basic',      label: 'Basic Info',    icon: 'bi-info-circle' },
  { key: 'routing',    label: 'Origin / Dest', icon: 'bi-geo-alt' },
  { key: 'cargo',      label: 'Cargo',         icon: 'bi-boxes' },
  { key: 'transport',  label: 'Transport',     icon: 'bi-truck' },
  { key: 'deadlines',  label: 'Deadlines',     icon: 'bi-calendar3' },
  { key: 'parties',    label: 'Parties',       icon: 'bi-people' },
  { key: 'equipment',  label: 'Equipment',     icon: 'bi-grid-3x3-gap' },
  { key: 'charges',    label: 'Charges',       icon: 'bi-receipt' },
];

const MODES = [
  { value: 'sea',        label: 'Sea',        icon: 'bi-water' },
  { value: 'air',        label: 'Air',        icon: 'bi-airplane' },
  { value: 'road',       label: 'Road',       icon: 'bi-truck' },
  { value: 'rail',       label: 'Rail',       icon: 'bi-train-front' },
  { value: 'multimodal', label: 'Multi',      icon: 'bi-diagram-3' },
  { value: 'courier',    label: 'Courier',    icon: 'bi-envelope' },
];

const DIRECTIONS = [
  { value: 'export',      label: 'Export',   icon: 'bi-box-arrow-up' },
  { value: 'import',      label: 'Import',   icon: 'bi-box-arrow-in-down' },
  { value: 'cross_trade', label: 'X-Trade',  icon: 'bi-arrow-left-right' },
  { value: 'domestic',    label: 'Domestic', icon: 'bi-house' },
];

const JFChips = ({ options, value, onChange }) => (
  <div className="jf-chip-row">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        className={`jf-chip${value === o.value ? ' active' : ''}`}
        onClick={() => onChange(o.value)}
      >
        <i className={`bi ${o.icon}`} style={{ fontSize: 11 }}></i>
        {o.label}
      </button>
    ))}
  </div>
);

const CHARGE_CATEGORIES = [
  { value: 'freight',       label: 'Ocean / Air Freight' },
  { value: 'origin',        label: 'Origin Charges' },
  { value: 'destination',   label: 'Destination Charges' },
  { value: 'customs',       label: 'Customs / Duties' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'insurance',     label: 'Insurance' },
  { value: 'handling',      label: 'Handling' },
  { value: 'other',         label: 'Other' },
];

/* ── Form state initialiser ─────────────────────────────────── */
const initialForm = () => ({
  // Basic
  mode: 'sea',
  direction: 'export',
  type: 'FCL',
  bookingNumber: '',
  referenceNumber: '',
  paymentTerms: 'Prepaid',
  incoterm: 'FOB',
  carrier: '',
  carrierCode: '',
  status: 'booked',
  // Routing
  placeOfReceipt:  emptyPort(),
  portOfLoading:   emptyPort(),
  portOfDischarge: emptyPort(),
  placeOfDelivery: emptyPort(),
  transhipmentPort: emptyPort(),
  // Cargo
  commodity: '',
  totalPackages: '',
  totalGrossWeight: '',
  totalNetWeight: '',
  totalVolume: '',
  chargeableWeight: '',
  incoterm2: 'FOB',
  invoiceValue: '',
  invoiceCurrency: 'USD',
  // Transport
  vesselName: '',
  voyageNumber: '',
  flightNumber: '',
  // Deadlines
  bookingDate: '',
  cargoReadyDate: '',
  cutoffDate: '',
  etd: '',
  eta: '',
  // Parties — stored as IDs
  customer: '',
  shipper: '',
  consignee: '',
  notifyParty: '',
  agent: '',
  // Equipment (containers)
  containers: [emptyContainer()],
  // Charges
  charges: [],
});

/* ── Port input group ───────────────────────────────────────── */
const PortFields = ({ label, value, onChange, required }) => (
  <div className="mb-3">
    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>{label} {required && <span className="text-danger">*</span>}</Form.Label>
    <Row className="g-2">
      <Col md={3}>
        <Form.Control
          size="sm" placeholder="UNLOCODE (e.g. AEJEA)"
          value={value.code}
          onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })}
          style={{ fontFamily: 'monospace' }}
        />
      </Col>
      <Col md={5}>
        <Form.Control size="sm" placeholder="Port / Place name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </Col>
      <Col md={2}>
        <Form.Control size="sm" placeholder="City" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
      </Col>
      <Col md={2}>
        <Form.Control size="sm" placeholder="Country" value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value })} />
      </Col>
    </Row>
  </div>
);

/* ── Charge row ─────────────────────────────────────────────── */
const ChargeRow = ({ charge, onChange, onRemove, vendors }) => (
  <div className={`charge-row ${charge.type === 'cost' ? 'is-cost' : 'is-revenue'}`}>
    <div style={{ width: 28, flexShrink: 0, color: charge.type === 'revenue' ? '#16a34a' : '#dc2626', fontSize: 13, fontWeight: 700 }}>
      {charge.type === 'revenue' ? 'AR' : 'AP'}
    </div>
    <div style={{ flex: 2, minWidth: 0 }}>
      <Form.Control
        size="sm" placeholder="Description (e.g. Ocean Freight)"
        value={charge.description}
        onChange={(e) => onChange({ ...charge, description: e.target.value })}
      />
    </div>
    <div style={{ width: 130, flexShrink: 0 }}>
      <Form.Select size="sm" value={charge.category} onChange={(e) => onChange({ ...charge, category: e.target.value })}>
        {CHARGE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </Form.Select>
    </div>
    <div style={{ width: 90, flexShrink: 0 }}>
      <Form.Control
        size="sm" type="number" step="0.01" placeholder="Amount"
        value={charge.amount}
        onChange={(e) => onChange({ ...charge, amount: e.target.value })}
      />
    </div>
    <div style={{ width: 60, flexShrink: 0 }}>
      <Form.Select size="sm" value={charge.currency} onChange={(e) => onChange({ ...charge, currency: e.target.value })}>
        {['USD','AED','EUR','GBP','CNY','PKR','INR'].map((c) => <option key={c}>{c}</option>)}
      </Form.Select>
    </div>
    <div style={{ width: 55, flexShrink: 0 }}>
      <Form.Control
        size="sm" type="number" step="0.0001" placeholder="Rate"
        value={charge.exchangeRate}
        onChange={(e) => onChange({ ...charge, exchangeRate: e.target.value })}
        title="Exchange rate to base currency"
      />
    </div>
    {charge.type === 'cost' && (
      <div style={{ flex: 1.5, minWidth: 110 }}>
        <Form.Select size="sm" value={charge.vendor} onChange={(e) => onChange({ ...charge, vendor: e.target.value })}>
          <option value="">— Vendor —</option>
          {vendors.map((v) => <option key={v._id} value={v._id}>{v.companyName}</option>)}
        </Form.Select>
      </div>
    )}
    {charge.type === 'revenue' && <div style={{ flex: 1.5 }} />}
    <button
      type="button"
      className="topbar-icon-btn"
      onClick={onRemove}
      style={{ width: 28, height: 28, color: '#dc2626', flexShrink: 0 }}
    >
      <i className="bi bi-trash3" style={{ fontSize: 13 }}></i>
    </button>
  </div>
);

/* ── P&L footer ─────────────────────────────────────────────── */
const PnLFooter = ({ charges }) => {
  const totalRevenue = charges
    .filter((c) => c.type === 'revenue' && c.amount)
    .reduce((s, c) => s + (parseFloat(c.amount) || 0) * (parseFloat(c.exchangeRate) || 1) * (parseFloat(c.quantity) || 1), 0);

  const totalCost = charges
    .filter((c) => c.type === 'cost' && c.amount)
    .reduce((s, c) => s + (parseFloat(c.amount) || 0) * (parseFloat(c.exchangeRate) || 1) * (parseFloat(c.quantity) || 1), 0);

  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="charges-pnl-footer mt-3">
      <div>
        <div className="pnl-item-label">Total Revenue</div>
        <div className="pnl-item-value revenue">{fmtMoney(totalRevenue)}</div>
        <small className="text-muted">Receivables</small>
      </div>
      <div>
        <div className="pnl-item-label">Total Cost</div>
        <div className="pnl-item-value cost">{fmtMoney(totalCost)}</div>
        <small className="text-muted">Payables</small>
      </div>
      <div>
        <div className="pnl-item-label">Gross Profit · {margin}%</div>
        <div className={`pnl-item-value ${profit >= 0 ? 'profit' : 'cost'}`}>{fmtMoney(profit)}</div>
        <small className="text-muted">{profit >= 0 ? 'Profitable' : 'Loss'}</small>
      </div>
    </div>
  );
};

/* ── Main form ──────────────────────────────────────────────── */
const ShipmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState(initialForm());
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* Load clients for dropdowns */
  useEffect(() => {
    clientsApi.list({ limit: 200 }).then((res) => {
      const all = res.items || [];
      setClients(all);
      setVendors(all.filter((c) => ['vendor', 'trucker', 'agent', 'broker'].includes(c.type)));
    }).catch(() => {});
  }, []);

  /* Load existing shipment for edit mode */
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    shipmentsApi.get(id).then(({ shipment: s }) => {
      setForm({
        mode: s.mode || 'sea',
        direction: s.direction || 'export',
        type: s.type || 'FCL',
        bookingNumber: s.bookingNumber || '',
        referenceNumber: s.referenceNumber || '',
        paymentTerms: s.paymentTerms || 'Prepaid',
        incoterm: s.incoterm || '',
        carrier: s.carrier || '',
        carrierCode: s.carrierCode || '',
        status: s.status || 'booked',
        placeOfReceipt:  s.placeOfReceipt  || emptyPort(),
        portOfLoading:   s.portOfLoading   || emptyPort(),
        portOfDischarge: s.portOfDischarge || emptyPort(),
        placeOfDelivery: s.placeOfDelivery || emptyPort(),
        transhipmentPort: s.transhipmentPort || emptyPort(),
        commodity: s.cargo?.[0]?.description || '',
        totalPackages: s.totalPackages ?? '',
        totalGrossWeight: s.totalGrossWeight ?? '',
        totalNetWeight: s.totalNetWeight ?? '',
        totalVolume: s.totalVolume ?? '',
        chargeableWeight: s.chargeableWeight ?? '',
        invoiceValue: s.invoiceValue ?? '',
        invoiceCurrency: s.invoiceCurrency || 'USD',
        vesselName: s.vesselName || '',
        voyageNumber: s.voyageNumber || '',
        flightNumber: s.flightNumber || '',
        bookingDate: s.bookingDate?.slice(0, 10) || '',
        cargoReadyDate: s.cargoReadyDate?.slice(0, 10) || '',
        cutoffDate: s.cutoffDate?.slice(0, 10) || '',
        etd: s.etd?.slice(0, 10) || '',
        eta: s.eta?.slice(0, 10) || '',
        customer: s.customer?._id || s.customer || '',
        shipper: s.shipper?._id || s.shipper || '',
        consignee: s.consignee?._id || s.consignee || '',
        notifyParty: s.notifyParty?._id || s.notifyParty || '',
        agent: s.agent?._id || s.agent || '',
        containers: s.containers?.length
          ? s.containers.map((c) => ({ ...c, _localId: c._id || Math.random().toString(36).slice(2) }))
          : [emptyContainer()],
        charges: s.charges?.length
          ? s.charges.map((c) => ({ ...c, _localId: c._id || Math.random().toString(36).slice(2), vendor: c.vendor?._id || c.vendor || '' }))
          : [],
      });
    }).catch(() => setError('Failed to load shipment')).finally(() => setLoading(false));
  }, [id, isEdit]);

  /* Field helpers */
  const setField = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), []);
  const setPort = useCallback((key, value) => setField(key, value), [setField]);

  /* Container helpers */
  const addContainer = () => setForm((f) => ({ ...f, containers: [...f.containers, emptyContainer()] }));
  const removeContainer = (lid) => setForm((f) => ({ ...f, containers: f.containers.filter((c) => c._localId !== lid) }));
  const updateContainer = (lid, updates) =>
    setForm((f) => ({ ...f, containers: f.containers.map((c) => c._localId === lid ? { ...c, ...updates } : c) }));

  /* Charge helpers */
  const addCharge = (type) => setForm((f) => ({ ...f, charges: [...f.charges, emptyCharge(type)] }));
  const removeCharge = (lid) => setForm((f) => ({ ...f, charges: f.charges.filter((c) => c._localId !== lid) }));
  const updateCharge = (lid, updates) =>
    setForm((f) => ({ ...f, charges: f.charges.map((c) => c._localId === lid ? { ...c, ...updates } : c) }));

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        containers: form.containers.filter((c) => c.containerType),
        charges: form.charges
          .filter((c) => c.description && c.amount)
          .map(({ _localId, ...rest }) => ({
            ...rest,
            amount: parseFloat(rest.amount) || 0,
            exchangeRate: parseFloat(rest.exchangeRate) || 1,
            quantity: parseFloat(rest.quantity) || 1,
            vendor: rest.vendor || undefined,
          })),
        // Build cargo from commodity if set
        cargo: form.commodity
          ? [{ description: form.commodity, grossWeight: parseFloat(form.totalGrossWeight) || 0 }]
          : undefined,
      };

      if (isEdit) {
        await shipmentsApi.update(id, payload);
        setSuccess('Job updated successfully.');
      } else {
        const res = await shipmentsApi.create(payload);
        const newId = res.shipment?._id;
        setSuccess('Job created successfully.');
        if (newId) navigate(`/shipments/${newId}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed. Check required fields.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ss-loading" style={{ minHeight: 300 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-box-seam dashboard-loader-icon"></i>
        </div>
        <span>Loading job…</span>
      </div>
    );
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="ss-page-header mb-4">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className={`bi ${isEdit ? 'bi-pencil-square' : 'bi-plus-circle'}`}></i></div>
          <div>
            <Link to="/shipments" className="text-decoration-none" style={{ fontSize: 11.5, color: 'var(--bs-secondary-color)' }}>
              <i className="bi bi-arrow-left me-1"></i>All Shipments
            </Link>
            <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
              <h4 className="ss-page-title mb-0">{isEdit ? 'Edit Job' : 'Create New Job'}</h4>
              <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, background: 'var(--surface-2)', fontWeight: 700, color: 'var(--bs-secondary-color)' }}>
                {form.mode?.toUpperCase()} {form.direction?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="ss-header-actions">
          <button type="button" className="ss-action-btn" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="ss-action-btn ss-action-btn-primary" disabled={saving}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
              : <><i className="bi bi-check-lg me-2"></i>{isEdit ? 'Update Job' : 'Create Job'}</>}
          </button>
        </div>
      </div>

      {error   && <Alert variant="danger"  dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── Step bar (mobile hidden via overflow scroll) ─────────── */}
      <div className="job-step-bar mb-4 d-none d-xl-flex">
        {TABS.map((tab, i) => (
          <div
            key={tab.key}
            className={`job-step-pill${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="job-step-num">{i + 1}</span>
            {tab.label}
          </div>
        ))}
      </div>

      {/* ── Form shell: tabs + index ─────────────────────────── */}
      <div className="job-form-shell">
        {/* Index sidebar */}
        <div className="job-form-index d-none d-xl-block">
          <div className="erp-card" style={{ padding: '8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--bs-secondary-color)', padding: '4px 8px 8px', borderBottom: '1px solid var(--border-soft)', marginBottom: 6 }}>
              Sections
            </div>
            {TABS.map((tab, i) => (
              <div
                key={tab.key}
                className={`job-index-item${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <div className="job-index-dot">
                  <i className={`bi ${tab.icon}`}></i>
                </div>
                <span style={{ flex: 1 }}>{tab.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, opacity: .45 }}>{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main form area */}
        <div className="job-form-main">
          {/* Mobile tab bar */}
          <div className="d-xl-none mb-3" style={{ overflowX: 'auto' }}>
            <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`jf-chip${activeTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <i className={`bi ${tab.icon}`} style={{ fontSize: 11 }}></i>{tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── BASIC INFO ──────────────────────────────────── */}
          {activeTab === 'basic' && (
            <div className="erp-card">
              <div className="erp-card-header"><h6 className="erp-card-title">Basic Info</h6></div>
              <div className="erp-card-body">

                {/* Mode + Direction visual chips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                  <div>
                    <label className="jf-label">Transport Mode <span style={{ color: '#dc2626' }}>*</span></label>
                    <JFChips options={MODES} value={form.mode} onChange={(v) => setField('mode', v)} />
                  </div>
                  <div>
                    <label className="jf-label">Direction <span style={{ color: '#dc2626' }}>*</span></label>
                    <JFChips options={DIRECTIONS} value={form.direction} onChange={(v) => setField('direction', v)} />
                  </div>
                </div>

                <Row className="g-3">
                  <Col md={4}>
                    <label className="jf-label">Job Class</label>
                    <Form.Select size="sm" value={form.type} onChange={(e) => setField('type', e.target.value)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                      <option value="FCL">FCL – Full Container</option>
                      <option value="LCL">LCL – Less than Container</option>
                      <option value="AIR">Air Freight</option>
                      <option value="COURIER">Courier</option>
                      <option value="BREAK_BULK">Break Bulk</option>
                      <option value="RORO">RoRo</option>
                      <option value="FTL">FTL – Full Truck</option>
                      <option value="LTL">LTL – Partial Truck</option>
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <label className="jf-label">Status</label>
                    <Form.Select size="sm" value={form.status} onChange={(e) => setField('status', e.target.value)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                      {['quote','booked','pickup_scheduled','cargo_received','customs_export','loaded','in_transit','arrived','customs_import','cleared','out_for_delivery','delivered','completed','cancelled','on_hold']
                        .map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <label className="jf-label">Incoterm</label>
                    <Form.Select size="sm" value={form.incoterm} onChange={(e) => setField('incoterm', e.target.value)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                      <option value="">— Select —</option>
                      {['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].map((t) => <option key={t}>{t}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <label className="jf-label">Carrier Booking #</label>
                    <Form.Control size="sm" value={form.bookingNumber} onChange={(e) => setField('bookingNumber', e.target.value)} placeholder="e.g. MAEU123456"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
                  </Col>
                  <Col md={4}>
                    <label className="jf-label">Internal Ref #</label>
                    <Form.Control size="sm" value={form.referenceNumber} onChange={(e) => setField('referenceNumber', e.target.value)} placeholder="Internal reference"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
                  </Col>
                  <Col md={4}>
                    <label className="jf-label">Payment Terms</label>
                    <Form.Select size="sm" value={form.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                      {['Prepaid','Cash Collect','Collect','Third Party'].map((t) => <option key={t}>{t}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <label className="jf-label">Carrier / Shipping Line</label>
                    <Form.Control size="sm" value={form.carrier} onChange={(e) => setField('carrier', e.target.value)} placeholder="e.g. Maersk, MSC"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
                  </Col>
                </Row>
              </div>
            </div>
          )}

          {/* ── ROUTING ─────────────────────────────────────── */}
          {activeTab === 'routing' && (
            <div className="erp-card">
              <div className="erp-card-header"><h6 className="erp-card-title">Origin &amp; Destination</h6></div>
              <div className="erp-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }}></div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#16a34a' }}>Origin</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }}></div>
                </div>
                <PortFields label="Place of Receipt" value={form.placeOfReceipt} onChange={(v) => setPort('placeOfReceipt', v)} />
                <PortFields label="Port of Loading" value={form.portOfLoading} onChange={(v) => setPort('portOfLoading', v)} required />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 12px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }}></div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#dc2626' }}>Destination</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }}></div>
                </div>
                <PortFields label="Port of Discharge" value={form.portOfDischarge} onChange={(v) => setPort('portOfDischarge', v)} required />
                <PortFields label="Place of Delivery" value={form.placeOfDelivery} onChange={(v) => setPort('placeOfDelivery', v)} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 12px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', flexShrink: 0 }}></div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#d97706' }}>Transhipment</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }}></div>
                </div>
                <PortFields label="Transhipment Port" value={form.transhipmentPort} onChange={(v) => setPort('transhipmentPort', v)} />
              </div>
            </div>
          )}

          {/* ── CARGO ───────────────────────────────────────── */}
          {activeTab === 'cargo' && (
            <div className="erp-card">
              <div className="erp-card-header"><h6 className="erp-card-title">Cargo Details</h6></div>
              <div className="erp-card-body">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Commodity / Description <span className="text-danger">*</span></Form.Label>
                    <Form.Control size="sm" value={form.commodity} onChange={(e) => setField('commodity', e.target.value)} placeholder="e.g. Bakery Goods, Electronics" />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Packages</Form.Label>
                    <Form.Control size="sm" type="number" min="0" value={form.totalPackages} onChange={(e) => setField('totalPackages', e.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Packing Unit</Form.Label>
                    <Form.Select size="sm">
                      {['PALLET','CARTON','BOX','BAG','DRUM','CRATE','BUNDLE','ROLL','PIECE'].map((u) => <option key={u}>{u}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Gross Weight (KG)</Form.Label>
                    <Form.Control size="sm" type="number" step="0.01" min="0" value={form.totalGrossWeight} onChange={(e) => setField('totalGrossWeight', e.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Net Weight (KG)</Form.Label>
                    <Form.Control size="sm" type="number" step="0.01" min="0" value={form.totalNetWeight} onChange={(e) => setField('totalNetWeight', e.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Volume (CBM)</Form.Label>
                    <Form.Control size="sm" type="number" step="0.001" min="0" value={form.totalVolume} onChange={(e) => setField('totalVolume', e.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Chargeable Weight</Form.Label>
                    <Form.Control size="sm" type="number" step="0.01" min="0" value={form.chargeableWeight} onChange={(e) => setField('chargeableWeight', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Invoice Value</Form.Label>
                    <Form.Control size="sm" type="number" step="0.01" min="0" value={form.invoiceValue} onChange={(e) => setField('invoiceValue', e.target.value)} />
                  </Col>
                  <Col md={2}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Currency</Form.Label>
                    <Form.Select size="sm" value={form.invoiceCurrency} onChange={(e) => setField('invoiceCurrency', e.target.value)}>
                      {['USD','AED','EUR','GBP','CNY','PKR','INR'].map((c) => <option key={c}>{c}</option>)}
                    </Form.Select>
                  </Col>
                </Row>
              </div>
            </div>
          )}

          {/* ── TRANSPORT ───────────────────────────────────── */}
          {activeTab === 'transport' && (
            <div className="erp-card">
              <div className="erp-card-header"><h6 className="erp-card-title">Transport / Conveyance</h6></div>
              <div className="erp-card-body">
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Vessel Name</Form.Label>
                    <Form.Control size="sm" value={form.vesselName} onChange={(e) => setField('vesselName', e.target.value)} placeholder="e.g. MSC GÜLSÜN" />
                  </Col>
                  <Col md={4}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Voyage Number</Form.Label>
                    <Form.Control size="sm" value={form.voyageNumber} onChange={(e) => setField('voyageNumber', e.target.value)} placeholder="e.g. 241W" />
                  </Col>
                  <Col md={4}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Flight Number (Air)</Form.Label>
                    <Form.Control size="sm" value={form.flightNumber} onChange={(e) => setField('flightNumber', e.target.value)} placeholder="e.g. EK201" />
                  </Col>
                  <Col md={4}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>Carrier / Line</Form.Label>
                    <Form.Control size="sm" value={form.carrier} onChange={(e) => setField('carrier', e.target.value)} placeholder="e.g. Maersk" />
                  </Col>
                  <Col md={4}>
                    <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>SCAC / Carrier Code</Form.Label>
                    <Form.Control size="sm" value={form.carrierCode} onChange={(e) => setField('carrierCode', e.target.value)} placeholder="e.g. MAEU" />
                  </Col>
                </Row>
              </div>
            </div>
          )}

          {/* ── DEADLINES ───────────────────────────────────── */}
          {activeTab === 'deadlines' && (
            <div className="erp-card">
              <div className="erp-card-header"><h6 className="erp-card-title">Key Dates &amp; Deadlines</h6></div>
              <div className="erp-card-body">
                <Row className="g-3">
                  {[
                    { key: 'bookingDate',    label: 'Booking Date' },
                    { key: 'cargoReadyDate', label: 'Cargo Ready Date' },
                    { key: 'cutoffDate',     label: 'Cut-off Date' },
                    { key: 'etd',            label: 'ETD (Est. Departure)' },
                    { key: 'eta',            label: 'ETA (Est. Arrival)' },
                  ].map(({ key, label }) => (
                    <Col md={4} key={key}>
                      <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>{label}</Form.Label>
                      <Form.Control
                        size="sm" type="date"
                        value={form[key]}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            </div>
          )}

          {/* ── PARTIES ─────────────────────────────────────── */}
          {activeTab === 'parties' && (
            <div className="erp-card">
              <div className="erp-card-header"><h6 className="erp-card-title">Parties</h6></div>
              <div className="erp-card-body">
                <Row className="g-3">
                  {[
                    { key: 'customer',    label: 'Customer (Billing Party)', required: true },
                    { key: 'shipper',     label: 'Shipper',                  required: true },
                    { key: 'consignee',   label: 'Consignee',                required: true },
                    { key: 'notifyParty', label: 'Notify Party' },
                    { key: 'agent',       label: 'Overseas Agent' },
                  ].map(({ key, label, required }) => (
                    <Col md={6} key={key}>
                      <Form.Label className="fw-semibold" style={{ fontSize: 13 }}>{label} {required && <span className="text-danger">*</span>}</Form.Label>
                      <Form.Select size="sm" value={form[key]} onChange={(e) => setField(key, e.target.value)} required={required}>
                        <option value="">— Select Client —</option>
                        {clients.map((c) => (
                          <option key={c._id} value={c._id}>{c.companyName}</option>
                        ))}
                      </Form.Select>
                    </Col>
                  ))}
                </Row>
                {clients.length === 0 && (
                  <Alert variant="info" className="mt-3" style={{ fontSize: 12 }}>
                    <i className="bi bi-info-circle me-1"></i>
                    No clients loaded. <Link to="/clients">Add clients first</Link>.
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* ── EQUIPMENT ───────────────────────────────────── */}
          {activeTab === 'equipment' && (
            <div className="erp-card">
              <div className="erp-card-header d-flex align-items-center justify-content-between">
                <h6 className="erp-card-title">Containers / Equipment</h6>
                <button className="ss-action-btn" type="button" onClick={addContainer}>
                  <i className="bi bi-plus me-1"></i>Add Container
                </button>
              </div>
              <div className="erp-card-body">
                {form.containers.map((con) => (
                  <div key={con._localId} className="erp-card mb-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="erp-card-body">
                      <Row className="g-2 align-items-end">
                        <Col md={2}>
                          <Form.Label style={{ fontSize: 12 }}>Type</Form.Label>
                          <Form.Select size="sm" value={con.containerType} onChange={(e) => updateContainer(con._localId, { containerType: e.target.value })}>
                            {['20GP','40GP','40HC','45HC','20RF','40RF','20OT','40OT','20FR','40FR','LCL'].map((t) => <option key={t}>{t}</option>)}
                          </Form.Select>
                        </Col>
                        <Col md={3}>
                          <Form.Label style={{ fontSize: 12 }}>Container #</Form.Label>
                          <Form.Control
                            size="sm"
                            placeholder="MSCU1234567"
                            value={con.containerNumber}
                            onChange={(e) => updateContainer(con._localId, { containerNumber: e.target.value.toUpperCase() })}
                            style={{ fontFamily: 'monospace' }}
                          />
                        </Col>
                        <Col md={2}>
                          <Form.Label style={{ fontSize: 12 }}>Seal #</Form.Label>
                          <Form.Control size="sm" value={con.sealNumber} onChange={(e) => updateContainer(con._localId, { sealNumber: e.target.value })} />
                        </Col>
                        <Col md={2}>
                          <Form.Label style={{ fontSize: 12 }}>Gross Wt (KG)</Form.Label>
                          <Form.Control size="sm" type="number" value={con.grossWeight} onChange={(e) => updateContainer(con._localId, { grossWeight: e.target.value })} />
                        </Col>
                        <Col md={2}>
                          <Form.Label style={{ fontSize: 12 }}>CBM</Form.Label>
                          <Form.Control size="sm" type="number" step="0.001" value={con.cbm} onChange={(e) => updateContainer(con._localId, { cbm: e.target.value })} />
                        </Col>
                        <Col md={1} className="d-flex align-items-end">
                          <button
                            type="button"
                            onClick={() => removeContainer(con._localId)}
                            disabled={form.containers.length === 1}
                            style={{ background: 'none', border: '1px solid var(--border-soft)', borderRadius: 6, color: '#dc2626', cursor: 'pointer', padding: '4px 8px', fontSize: 13, opacity: form.containers.length === 1 ? .4 : 1 }}
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </Col>
                      </Row>
                    </div>
                  </div>
                ))}
                <div className="text-muted" style={{ fontSize: 12 }}>
                  <i className="bi bi-info-circle me-1"></i>
                  {form.containers.length} container{form.containers.length !== 1 ? 's' : ''} ·{' '}
                  {form.containers.filter((c) => ['20GP','20OT','20FR','20RF'].includes(c.containerType)).length * 1 +
                   form.containers.filter((c) => !['20GP','20OT','20FR','20RF','LCL'].includes(c.containerType)).length * 2} TEUs
                </div>
              </div>
            </div>
          )}

          {/* ── CHARGES ─────────────────────────────────────── */}
          {activeTab === 'charges' && (
            <div>
              {/* Revenue (AR) charges */}
              <div className="erp-card mb-3">
                <div className="erp-card-header">
                  <div>
                    <h6 className="erp-card-title">Receivables (AR)</h6>
                    <small className="text-muted">What you charge the customer</small>
                  </div>
                  <button className="ss-action-btn" type="button" onClick={() => addCharge('revenue')} style={{ borderColor: '#16a34a', color: '#16a34a' }}>
                    <i className="bi bi-plus me-1"></i>Add Revenue Line
                  </button>
                </div>
                <div className="erp-card-body">
                  {form.charges.filter((c) => c.type === 'revenue').length === 0 ? (
                    <div className="text-muted text-center py-3" style={{ fontSize: 13 }}>No revenue charges yet</div>
                  ) : (
                    <>
                      <div className="d-flex gap-2 mb-2" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bs-secondary-color)', paddingLeft: 36 }}>
                        <div style={{ flex: 2 }}>Description</div>
                        <div style={{ width: 130 }}>Category</div>
                        <div style={{ width: 90 }}>Amount</div>
                        <div style={{ width: 60 }}>Currency</div>
                        <div style={{ width: 55 }}>FX Rate</div>
                        <div style={{ flex: 1.5 }}></div>
                        <div style={{ width: 28 }}></div>
                      </div>
                      {form.charges.filter((c) => c.type === 'revenue').map((ch) => (
                        <ChargeRow
                          key={ch._localId}
                          charge={ch}
                          onChange={(updated) => updateCharge(ch._localId, updated)}
                          onRemove={() => removeCharge(ch._localId)}
                          vendors={vendors}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Cost (AP) charges */}
              <div className="erp-card mb-3">
                <div className="erp-card-header">
                  <div>
                    <h6 className="erp-card-title">Payables (AP)</h6>
                    <small className="text-muted">What you owe vendors — assign per line</small>
                  </div>
                  <button className="ss-action-btn" type="button" onClick={() => addCharge('cost')} style={{ borderColor: '#dc2626', color: '#dc2626' }}>
                    <i className="bi bi-plus me-1"></i>Add Cost Line
                  </button>
                </div>
                <div className="erp-card-body">
                  {form.charges.filter((c) => c.type === 'cost').length === 0 ? (
                    <div className="text-muted text-center py-3" style={{ fontSize: 13 }}>No cost charges yet</div>
                  ) : (
                    <>
                      <div className="d-flex gap-2 mb-2" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bs-secondary-color)', paddingLeft: 36 }}>
                        <div style={{ flex: 2 }}>Description</div>
                        <div style={{ width: 130 }}>Category</div>
                        <div style={{ width: 90 }}>Amount</div>
                        <div style={{ width: 60 }}>Currency</div>
                        <div style={{ width: 55 }}>FX Rate</div>
                        <div style={{ flex: 1.5 }}>Vendor</div>
                        <div style={{ width: 28 }}></div>
                      </div>
                      {form.charges.filter((c) => c.type === 'cost').map((ch) => (
                        <ChargeRow
                          key={ch._localId}
                          charge={ch}
                          onChange={(updated) => updateCharge(ch._localId, updated)}
                          onRemove={() => removeCharge(ch._localId)}
                          vendors={vendors}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* P&L Footer */}
              <PnLFooter charges={form.charges} />
            </div>
          )}

          {/* ── Navigation buttons ───────────────────────────── */}
          <div className="d-flex justify-content-between mt-4">
            <button
              type="button"
              className="ss-action-btn"
              disabled={TABS.findIndex((t) => t.key === activeTab) === 0}
              onClick={() => {
                const i = TABS.findIndex((t) => t.key === activeTab);
                if (i > 0) setActiveTab(TABS[i - 1].key);
              }}
            >
              <i className="bi bi-arrow-left me-1"></i>Previous
            </button>
            {TABS.findIndex((t) => t.key === activeTab) < TABS.length - 1 ? (
              <button
                type="button"
                className="ss-action-btn ss-action-btn-primary"
                onClick={() => {
                  const i = TABS.findIndex((t) => t.key === activeTab);
                  setActiveTab(TABS[i + 1].key);
                }}
              >
                Next<i className="bi bi-arrow-right ms-1"></i>
              </button>
            ) : (
              <button type="submit" className="ss-action-btn ss-action-btn-primary" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span> : <i className="bi bi-check-circle me-2"></i>}
                {isEdit ? 'Save Changes' : 'Create Job'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Form>
  );
};

export default ShipmentForm;
