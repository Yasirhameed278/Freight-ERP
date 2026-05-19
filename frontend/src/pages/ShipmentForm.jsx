import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  { key: 'basic',     label: 'Basic Info',    icon: 'bi-info-circle' },
  { key: 'routing',   label: 'Origin / Dest', icon: 'bi-geo-alt' },
  { key: 'cargo',     label: 'Cargo',         icon: 'bi-boxes' },
  { key: 'transport', label: 'Transport',     icon: 'bi-truck' },
  { key: 'deadlines', label: 'Deadlines',     icon: 'bi-calendar3' },
  { key: 'parties',   label: 'Parties',       icon: 'bi-people' },
  { key: 'equipment', label: 'Equipment',     icon: 'bi-grid-3x3-gap' },
  { key: 'charges',   label: 'Charges',       icon: 'bi-receipt' },
];

const MODES = [
  { value: 'sea',        label: 'Sea',     icon: 'bi-water' },
  { value: 'air',        label: 'Air',     icon: 'bi-airplane' },
  { value: 'road',       label: 'Road',    icon: 'bi-truck' },
  { value: 'rail',       label: 'Rail',    icon: 'bi-train-front' },
  { value: 'multimodal', label: 'Multi',   icon: 'bi-diagram-3' },
  { value: 'courier',    label: 'Courier', icon: 'bi-envelope' },
];

const DIRECTIONS = [
  { value: 'export',      label: 'Export',   icon: 'bi-box-arrow-up' },
  { value: 'import',      label: 'Import',   icon: 'bi-box-arrow-in-down' },
  { value: 'cross_trade', label: 'X-Trade',  icon: 'bi-arrow-left-right' },
  { value: 'domestic',    label: 'Domestic', icon: 'bi-house' },
];

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

/* ── Sub-components ─────────────────────────────────────────── */
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

const PortFields = ({ label, value, onChange, required }) => (
  <div className="jf-field" style={{ marginBottom: 16 }}>
    <label className="jf-label">
      {label} {required && <span className="req">*</span>}
    </label>
    <div className="jf-port-grid">
      <input
        className="jf-input"
        style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
        placeholder="UNLOCODE"
        value={value.code}
        onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })}
      />
      <input
        className="jf-input"
        placeholder="Port / Place name"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <input
        className="jf-input"
        placeholder="City"
        value={value.city}
        onChange={(e) => onChange({ ...value, city: e.target.value })}
      />
      <input
        className="jf-input"
        placeholder="Country"
        value={value.country}
        onChange={(e) => onChange({ ...value, country: e.target.value })}
      />
    </div>
  </div>
);

const ChargeRow = ({ charge, onChange, onRemove, vendors }) => (
  <div className="jf-charge-row">
    <div className="jf-charge-type-badge" style={{ color: charge.type === 'revenue' ? '#16a34a' : '#dc2626' }}>
      {charge.type === 'revenue' ? 'AR' : 'AP'}
    </div>
    <div style={{ flex: 2, minWidth: 0 }}>
      <input
        className="jf-input"
        placeholder="Description (e.g. Ocean Freight)"
        value={charge.description}
        onChange={(e) => onChange({ ...charge, description: e.target.value })}
      />
    </div>
    <div style={{ width: 140, flexShrink: 0 }}>
      <select className="jf-select" value={charge.category} onChange={(e) => onChange({ ...charge, category: e.target.value })}>
        {CHARGE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>
    <div style={{ width: 90, flexShrink: 0 }}>
      <input
        className="jf-input"
        type="number" step="0.01" placeholder="Amount"
        value={charge.amount}
        onChange={(e) => onChange({ ...charge, amount: e.target.value })}
      />
    </div>
    <div style={{ width: 65, flexShrink: 0 }}>
      <select className="jf-select" value={charge.currency} onChange={(e) => onChange({ ...charge, currency: e.target.value })}>
        {['USD', 'AED', 'EUR', 'GBP', 'CNY', 'PKR', 'INR'].map((c) => <option key={c}>{c}</option>)}
      </select>
    </div>
    <div style={{ width: 60, flexShrink: 0 }}>
      <input
        className="jf-input"
        type="number" step="0.0001" placeholder="FX"
        value={charge.exchangeRate}
        onChange={(e) => onChange({ ...charge, exchangeRate: e.target.value })}
        title="Exchange rate to base currency"
      />
    </div>
    {charge.type === 'cost' && (
      <div style={{ flex: 1.5, minWidth: 120 }}>
        <select className="jf-select" value={charge.vendor} onChange={(e) => onChange({ ...charge, vendor: e.target.value })}>
          <option value="">— Vendor —</option>
          {vendors.map((v) => <option key={v._id} value={v._id}>{v.companyName}</option>)}
        </select>
      </div>
    )}
    {charge.type === 'revenue' && <div style={{ flex: 1.5 }} />}
    <button type="button" className="jf-trash-btn" onClick={onRemove}>
      <i className="bi bi-trash3" style={{ fontSize: 13 }}></i>
    </button>
  </div>
);

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
    <div className="jf-pnl">
      <div>
        <div className="jf-pnl-label">Total Revenue</div>
        <div className="jf-pnl-value revenue">{fmtMoney(totalRevenue)}</div>
        <div className="jf-pnl-sub">Receivables</div>
      </div>
      <div>
        <div className="jf-pnl-label">Total Cost</div>
        <div className="jf-pnl-value cost">{fmtMoney(totalCost)}</div>
        <div className="jf-pnl-sub">Payables</div>
      </div>
      <div>
        <div className="jf-pnl-label">Gross Profit · {margin}%</div>
        <div className={`jf-pnl-value ${profit >= 0 ? 'profit' : 'loss'}`}>{fmtMoney(profit)}</div>
        <div className="jf-pnl-sub">{profit >= 0 ? 'Profitable' : 'Loss-making'}</div>
      </div>
    </div>
  );
};

/* ── Form state ─────────────────────────────────────────────── */
const initialForm = () => ({
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
  placeOfReceipt:   emptyPort(),
  portOfLoading:    emptyPort(),
  portOfDischarge:  emptyPort(),
  placeOfDelivery:  emptyPort(),
  transhipmentPort: emptyPort(),
  commodity: '',
  totalPackages: '',
  totalGrossWeight: '',
  totalNetWeight: '',
  totalVolume: '',
  chargeableWeight: '',
  invoiceValue: '',
  invoiceCurrency: 'USD',
  vesselName: '',
  voyageNumber: '',
  flightNumber: '',
  bookingDate: '',
  cargoReadyDate: '',
  cutoffDate: '',
  etd: '',
  eta: '',
  customer: '',
  shipper: '',
  consignee: '',
  notifyParty: '',
  agent: '',
  containers: [emptyContainer()],
  charges: [],
});

/* ── Main component ─────────────────────────────────────────── */
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

  useEffect(() => {
    clientsApi.list({ limit: 200 }).then((res) => {
      const all = res.items || [];
      setClients(all);
      setVendors(all.filter((c) => ['vendor', 'trucker', 'agent', 'broker'].includes(c.type)));
    }).catch(() => {});
  }, []);

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
        placeOfReceipt:   s.placeOfReceipt   || emptyPort(),
        portOfLoading:    s.portOfLoading    || emptyPort(),
        portOfDischarge:  s.portOfDischarge  || emptyPort(),
        placeOfDelivery:  s.placeOfDelivery  || emptyPort(),
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

  const setField = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), []);
  const setPort  = useCallback((key, value) => setField(key, value), [setField]);

  const addContainer    = () => setForm((f) => ({ ...f, containers: [...f.containers, emptyContainer()] }));
  const removeContainer = (lid) => setForm((f) => ({ ...f, containers: f.containers.filter((c) => c._localId !== lid) }));
  const updateContainer = (lid, updates) =>
    setForm((f) => ({ ...f, containers: f.containers.map((c) => c._localId === lid ? { ...c, ...updates } : c) }));

  const addCharge    = (type) => setForm((f) => ({ ...f, charges: [...f.charges, emptyCharge(type)] }));
  const removeCharge = (lid) => setForm((f) => ({ ...f, charges: f.charges.filter((c) => c._localId !== lid) }));
  const updateCharge = (lid, updates) =>
    setForm((f) => ({ ...f, charges: f.charges.map((c) => c._localId === lid ? { ...c, ...updates } : c) }));

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

  const goTab = (dir) => {
    const i = TABS.findIndex((t) => t.key === activeTab);
    const next = TABS[i + dir];
    if (next) setActiveTab(next.key);
  };
  const tabIndex = TABS.findIndex((t) => t.key === activeTab);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-box-seam dashboard-loader-icon"></i>
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading job…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="sd-page-header">
        <div className="sd-breadcrumb">
          <Link to="/shipments">All Shipments</Link>
          <i className="bi bi-chevron-right" style={{ fontSize: 10 }}></i>
          <span>{isEdit ? 'Edit Job' : 'New Job'}</span>
        </div>
        <div className="sd-header-row">
          <div>
            <h1 className="sd-title" style={{ fontSize: 24 }}>
              {isEdit ? 'Edit Job' : 'Create New Job'}
            </h1>
            <p className="sd-subline">
              {form.mode?.replace(/_/g, ' ')} · {form.direction?.replace(/_/g, ' ')} · {form.type}
            </p>
          </div>
          <div className="sd-actions">
            <button type="button" className="sd-btn" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}>
              {saving
                ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                : <i className="bi bi-check-lg"></i>}
              {saving ? 'Saving…' : isEdit ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────── */}
      {error && (
        <div className="jf-alert jf-alert-danger" style={{ margin: '12px 28px 0' }}>
          <i className="bi bi-exclamation-circle"></i>
          <span>{error}</span>
          <button type="button" className="jf-alert-close" onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="jf-alert jf-alert-success" style={{ margin: '12px 28px 0' }}>
          <i className="bi bi-check-circle"></i>
          <span>{success}</span>
          <button type="button" className="jf-alert-close" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* ── Mobile step chips ────────────────────────────────── */}
      <div className="jf-mobile-steps" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '16px 28px 0' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`jf-chip${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            style={{ whiteSpace: 'nowrap' }}
          >
            <i className={`bi ${tab.icon}`} style={{ fontSize: 11 }}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Shell: sidebar + form ────────────────────────────── */}
      <div className="jf-shell">

        {/* Sidebar nav */}
        <nav className="jf-nav">
          <div className="jf-nav-title">Sections</div>
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              className={`jf-nav-item${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <div className="jf-nav-icon"><i className={`bi ${tab.icon}`}></i></div>
              <span>{tab.label}</span>
              <span className="jf-nav-num">{i + 1}</span>
            </button>
          ))}
        </nav>

        {/* Form content */}
        <div className="jf-main">

          {/* ── BASIC INFO ─────────────────────────────────── */}
          {activeTab === 'basic' && (
            <div className="sd-card">
              <div className="sd-card-title">Basic Information</div>

              <div className="jf-grid-2" style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--hairline)' }}>
                <div className="jf-field">
                  <label className="jf-label">Transport Mode <span className="req">*</span></label>
                  <JFChips options={MODES} value={form.mode} onChange={(v) => setField('mode', v)} />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Direction <span className="req">*</span></label>
                  <JFChips options={DIRECTIONS} value={form.direction} onChange={(v) => setField('direction', v)} />
                </div>
              </div>

              <div className="jf-grid-3">
                <div className="jf-field">
                  <label className="jf-label">Job Class</label>
                  <select className="jf-select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                    <option value="FCL">FCL – Full Container</option>
                    <option value="LCL">LCL – Less than Container</option>
                    <option value="AIR">Air Freight</option>
                    <option value="COURIER">Courier</option>
                    <option value="BREAK_BULK">Break Bulk</option>
                    <option value="RORO">RoRo</option>
                    <option value="FTL">FTL – Full Truck</option>
                    <option value="LTL">LTL – Partial Truck</option>
                  </select>
                </div>
                <div className="jf-field">
                  <label className="jf-label">Status</label>
                  <select className="jf-select" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    {['quote','booked','pickup_scheduled','cargo_received','customs_export','loaded',
                      'in_transit','arrived','customs_import','cleared','out_for_delivery',
                      'delivered','completed','cancelled','on_hold'].map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="jf-field">
                  <label className="jf-label">Incoterm</label>
                  <select className="jf-select" value={form.incoterm} onChange={(e) => setField('incoterm', e.target.value)}>
                    <option value="">— Select —</option>
                    {['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="jf-field">
                  <label className="jf-label">Carrier Booking #</label>
                  <input className="jf-input" value={form.bookingNumber}
                    onChange={(e) => setField('bookingNumber', e.target.value)} placeholder="e.g. MAEU123456" />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Internal Ref #</label>
                  <input className="jf-input" value={form.referenceNumber}
                    onChange={(e) => setField('referenceNumber', e.target.value)} placeholder="Internal reference" />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Payment Terms</label>
                  <select className="jf-select" value={form.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)}>
                    {['Prepaid','Cash Collect','Collect','Third Party'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="jf-field">
                  <label className="jf-label">Carrier / Shipping Line</label>
                  <input className="jf-input" value={form.carrier}
                    onChange={(e) => setField('carrier', e.target.value)} placeholder="e.g. Maersk, MSC" />
                </div>
              </div>
            </div>
          )}

          {/* ── ROUTING ────────────────────────────────────── */}
          {activeTab === 'routing' && (
            <div className="sd-card">
              <div className="sd-card-title">Origin &amp; Destination</div>

              <div className="jf-section-divider">
                <div className="jf-section-divider-dot" style={{ background: '#16a34a' }}></div>
                <span className="jf-section-divider-label" style={{ color: '#16a34a' }}>Origin</span>
                <div className="jf-section-divider-line"></div>
              </div>
              <PortFields label="Place of Receipt" value={form.placeOfReceipt} onChange={(v) => setPort('placeOfReceipt', v)} />
              <PortFields label="Port of Loading"  value={form.portOfLoading}  onChange={(v) => setPort('portOfLoading', v)} required />

              <div className="jf-section-divider">
                <div className="jf-section-divider-dot" style={{ background: '#dc2626' }}></div>
                <span className="jf-section-divider-label" style={{ color: '#dc2626' }}>Destination</span>
                <div className="jf-section-divider-line"></div>
              </div>
              <PortFields label="Port of Discharge" value={form.portOfDischarge} onChange={(v) => setPort('portOfDischarge', v)} required />
              <PortFields label="Place of Delivery"  value={form.placeOfDelivery} onChange={(v) => setPort('placeOfDelivery', v)} />

              <div className="jf-section-divider">
                <div className="jf-section-divider-dot" style={{ background: '#d97706' }}></div>
                <span className="jf-section-divider-label" style={{ color: '#d97706' }}>Transhipment</span>
                <div className="jf-section-divider-line"></div>
              </div>
              <PortFields label="Transhipment Port" value={form.transhipmentPort} onChange={(v) => setPort('transhipmentPort', v)} />
            </div>
          )}

          {/* ── CARGO ──────────────────────────────────────── */}
          {activeTab === 'cargo' && (
            <div className="sd-card">
              <div className="sd-card-title">Cargo Details</div>
              <div className="jf-grid-3">
                <div className="jf-field" style={{ gridColumn: '1 / 3' }}>
                  <label className="jf-label">Commodity / Description <span className="req">*</span></label>
                  <input className="jf-input" value={form.commodity}
                    onChange={(e) => setField('commodity', e.target.value)} placeholder="e.g. Bakery Goods, Electronics" />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Packages</label>
                  <input className="jf-input" type="number" min="0" value={form.totalPackages}
                    onChange={(e) => setField('totalPackages', e.target.value)} />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Gross Weight (KG)</label>
                  <input className="jf-input" type="number" step="0.01" min="0" value={form.totalGrossWeight}
                    onChange={(e) => setField('totalGrossWeight', e.target.value)} />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Net Weight (KG)</label>
                  <input className="jf-input" type="number" step="0.01" min="0" value={form.totalNetWeight}
                    onChange={(e) => setField('totalNetWeight', e.target.value)} />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Volume (CBM)</label>
                  <input className="jf-input" type="number" step="0.001" min="0" value={form.totalVolume}
                    onChange={(e) => setField('totalVolume', e.target.value)} />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Chargeable Weight</label>
                  <input className="jf-input" type="number" step="0.01" min="0" value={form.chargeableWeight}
                    onChange={(e) => setField('chargeableWeight', e.target.value)} />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Invoice Value</label>
                  <input className="jf-input" type="number" step="0.01" min="0" value={form.invoiceValue}
                    onChange={(e) => setField('invoiceValue', e.target.value)} />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Invoice Currency</label>
                  <select className="jf-select" value={form.invoiceCurrency} onChange={(e) => setField('invoiceCurrency', e.target.value)}>
                    {['USD','AED','EUR','GBP','CNY','PKR','INR'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── TRANSPORT ──────────────────────────────────── */}
          {activeTab === 'transport' && (
            <div className="sd-card">
              <div className="sd-card-title">Transport / Conveyance</div>
              <div className="jf-grid-3">
                <div className="jf-field">
                  <label className="jf-label">Vessel Name</label>
                  <input className="jf-input" value={form.vesselName}
                    onChange={(e) => setField('vesselName', e.target.value)} placeholder="e.g. MSC GÜLSÜN" />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Voyage Number</label>
                  <input className="jf-input" value={form.voyageNumber}
                    onChange={(e) => setField('voyageNumber', e.target.value)} placeholder="e.g. 241W" />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Flight Number (Air)</label>
                  <input className="jf-input" value={form.flightNumber}
                    onChange={(e) => setField('flightNumber', e.target.value)} placeholder="e.g. EK201" />
                </div>
                <div className="jf-field">
                  <label className="jf-label">Carrier / Line</label>
                  <input className="jf-input" value={form.carrier}
                    onChange={(e) => setField('carrier', e.target.value)} placeholder="e.g. Maersk" />
                </div>
                <div className="jf-field">
                  <label className="jf-label">SCAC / Carrier Code</label>
                  <input className="jf-input" value={form.carrierCode}
                    onChange={(e) => setField('carrierCode', e.target.value)} placeholder="e.g. MAEU" />
                </div>
              </div>
            </div>
          )}

          {/* ── DEADLINES ──────────────────────────────────── */}
          {activeTab === 'deadlines' && (
            <div className="sd-card">
              <div className="sd-card-title">Key Dates &amp; Deadlines</div>
              <div className="jf-grid-3">
                {[
                  { key: 'bookingDate',    label: 'Booking Date' },
                  { key: 'cargoReadyDate', label: 'Cargo Ready Date' },
                  { key: 'cutoffDate',     label: 'Cut-off Date' },
                  { key: 'etd',            label: 'ETD (Est. Departure)' },
                  { key: 'eta',            label: 'ETA (Est. Arrival)' },
                ].map(({ key, label }) => (
                  <div key={key} className="jf-field">
                    <label className="jf-label">{label}</label>
                    <input className="jf-input" type="date" value={form[key]}
                      onChange={(e) => setField(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PARTIES ────────────────────────────────────── */}
          {activeTab === 'parties' && (
            <div className="sd-card">
              <div className="sd-card-title">Parties</div>
              {clients.length === 0 && (
                <div className="jf-alert jf-alert-info" style={{ marginBottom: 16 }}>
                  <i className="bi bi-info-circle"></i>
                  <span>No clients loaded. <Link to="/clients">Add clients first</Link>.</span>
                </div>
              )}
              <div className="jf-grid-2">
                {[
                  { key: 'customer',    label: 'Customer (Billing Party)', required: true },
                  { key: 'shipper',     label: 'Shipper',                  required: true },
                  { key: 'consignee',   label: 'Consignee',                required: true },
                  { key: 'notifyParty', label: 'Notify Party' },
                  { key: 'agent',       label: 'Overseas Agent' },
                ].map(({ key, label, required }) => (
                  <div key={key} className="jf-field">
                    <label className="jf-label">
                      {label} {required && <span className="req">*</span>}
                    </label>
                    <select className="jf-select" value={form[key]} onChange={(e) => setField(key, e.target.value)} required={required}>
                      <option value="">— Select Client —</option>
                      {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── EQUIPMENT ──────────────────────────────────── */}
          {activeTab === 'equipment' && (
            <div className="sd-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="sd-card-title" style={{ marginBottom: 0 }}>Containers / Equipment</div>
                <button className="sd-btn" type="button" onClick={addContainer}>
                  <i className="bi bi-plus"></i> Add Container
                </button>
              </div>

              {form.containers.map((con) => (
                <div key={con._localId} className="jf-container-card">
                  <div className="jf-container-grid">
                    <div className="jf-field">
                      <label className="jf-label" style={{ fontSize: 10 }}>Type</label>
                      <select className="jf-select" value={con.containerType}
                        onChange={(e) => updateContainer(con._localId, { containerType: e.target.value })}>
                        {['20GP','40GP','40HC','45HC','20RF','40RF','20OT','40OT','20FR','40FR','LCL'].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="jf-field">
                      <label className="jf-label" style={{ fontSize: 10 }}>Container #</label>
                      <input
                        className="jf-input" style={{ fontFamily: 'monospace' }}
                        placeholder="MSCU1234567" value={con.containerNumber}
                        onChange={(e) => updateContainer(con._localId, { containerNumber: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="jf-field">
                      <label className="jf-label" style={{ fontSize: 10 }}>Seal #</label>
                      <input className="jf-input" value={con.sealNumber}
                        onChange={(e) => updateContainer(con._localId, { sealNumber: e.target.value })} />
                    </div>
                    <div className="jf-field">
                      <label className="jf-label" style={{ fontSize: 10 }}>Gross Wt (KG)</label>
                      <input className="jf-input" type="number" value={con.grossWeight}
                        onChange={(e) => updateContainer(con._localId, { grossWeight: e.target.value })} />
                    </div>
                    <div className="jf-field">
                      <label className="jf-label" style={{ fontSize: 10 }}>CBM</label>
                      <input className="jf-input" type="number" step="0.001" value={con.cbm}
                        onChange={(e) => updateContainer(con._localId, { cbm: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        className="jf-trash-btn"
                        onClick={() => removeContainer(con._localId)}
                        disabled={form.containers.length === 1}
                        style={{ opacity: form.containers.length === 1 ? 0.4 : 1 }}
                      >
                        <i className="bi bi-trash3" style={{ fontSize: 13 }}></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                <i className="bi bi-info-circle me-1"></i>
                {form.containers.length} container{form.containers.length !== 1 ? 's' : ''} ·{' '}
                {form.containers.filter((c) => ['20GP','20OT','20FR','20RF'].includes(c.containerType)).length +
                 form.containers.filter((c) => !['20GP','20OT','20FR','20RF','LCL'].includes(c.containerType)).length * 2} TEUs
              </div>
            </div>
          )}

          {/* ── CHARGES ────────────────────────────────────── */}
          {activeTab === 'charges' && (
            <div>
              {/* Revenue (AR) */}
              <div className="sd-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
                  <div>
                    <div className="sd-card-title" style={{ marginBottom: 2 }}>Receivables (AR)</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>What you charge the customer</div>
                  </div>
                  <button className="sd-btn" type="button" onClick={() => addCharge('revenue')}
                    style={{ borderColor: '#16a34a', color: '#16a34a', flexShrink: 0 }}>
                    <i className="bi bi-plus"></i> Add Revenue Line
                  </button>
                </div>
                {form.charges.filter((c) => c.type === 'revenue').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                    No revenue charges yet
                  </div>
                ) : (
                  <>
                    <div className="jf-charge-header">
                      <div style={{ width: 28 }}></div>
                      <div style={{ flex: 2 }}>Description</div>
                      <div style={{ width: 140 }}>Category</div>
                      <div style={{ width: 90 }}>Amount</div>
                      <div style={{ width: 65 }}>Curr.</div>
                      <div style={{ width: 60 }}>FX Rate</div>
                      <div style={{ flex: 1.5 }}></div>
                      <div style={{ width: 32 }}></div>
                    </div>
                    {form.charges.filter((c) => c.type === 'revenue').map((ch) => (
                      <ChargeRow key={ch._localId} charge={ch}
                        onChange={(updated) => updateCharge(ch._localId, updated)}
                        onRemove={() => removeCharge(ch._localId)}
                        vendors={vendors} />
                    ))}
                  </>
                )}
              </div>

              {/* Cost (AP) */}
              <div className="sd-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
                  <div>
                    <div className="sd-card-title" style={{ marginBottom: 2 }}>Payables (AP)</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>What you owe vendors — assign per line</div>
                  </div>
                  <button className="sd-btn" type="button" onClick={() => addCharge('cost')}
                    style={{ borderColor: '#dc2626', color: '#dc2626', flexShrink: 0 }}>
                    <i className="bi bi-plus"></i> Add Cost Line
                  </button>
                </div>
                {form.charges.filter((c) => c.type === 'cost').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                    No cost charges yet
                  </div>
                ) : (
                  <>
                    <div className="jf-charge-header">
                      <div style={{ width: 28 }}></div>
                      <div style={{ flex: 2 }}>Description</div>
                      <div style={{ width: 140 }}>Category</div>
                      <div style={{ width: 90 }}>Amount</div>
                      <div style={{ width: 65 }}>Curr.</div>
                      <div style={{ width: 60 }}>FX Rate</div>
                      <div style={{ flex: 1.5 }}>Vendor</div>
                      <div style={{ width: 32 }}></div>
                    </div>
                    {form.charges.filter((c) => c.type === 'cost').map((ch) => (
                      <ChargeRow key={ch._localId} charge={ch}
                        onChange={(updated) => updateCharge(ch._localId, updated)}
                        onRemove={() => removeCharge(ch._localId)}
                        vendors={vendors} />
                    ))}
                  </>
                )}
              </div>

              <PnLFooter charges={form.charges} />
            </div>
          )}

          {/* ── Bottom navigation ───────────────────────────── */}
          <div className="jf-bottom-nav">
            <button
              type="button"
              className="sd-btn"
              disabled={tabIndex === 0}
              onClick={() => goTab(-1)}
            >
              <i className="bi bi-arrow-left"></i> Previous
            </button>
            {tabIndex < TABS.length - 1 ? (
              <button type="button" className="sd-btn sd-btn-primary" onClick={() => goTab(1)}>
                Next <i className="bi bi-arrow-right"></i>
              </button>
            ) : (
              <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}>
                {saving
                  ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                  : <i className="bi bi-check-circle"></i>}
                {isEdit ? 'Save Changes' : 'Create Job'}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default ShipmentForm;
