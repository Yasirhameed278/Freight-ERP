import { useState, useEffect } from 'react';
import { Form, Row, Col, Modal, Button, Alert, InputGroup } from 'react-bootstrap';
import { ratesApi, quotesApi, clientsApi } from '../api';

/* ── helpers ──────────────────────────────────────────────── */
const fmtMoney = (v, cur = 'USD') =>
  `${cur} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const marginVariant = (pct) => {
  if (pct >= 20) return { bg: '#dcfce7', color: '#16a34a' };
  if (pct >= 10) return { bg: '#fffbeb', color: '#d97706' };
  return { bg: '#fef2f2', color: '#dc2626' };
};

const validityDays = (validTo) => {
  if (!validTo) return null;
  return Math.ceil((new Date(validTo) - Date.now()) / 86400000);
};

const MODES = [
  { value: 'sea',  label: 'Sea',  icon: 'bi-water' },
  { value: 'air',  label: 'Air',  icon: 'bi-airplane' },
  { value: 'road', label: 'Road', icon: 'bi-truck' },
  { value: 'rail', label: 'Rail', icon: 'bi-train-front' },
];

/* ── Save-to-Quote Modal ──────────────────────────────────── */
const SaveQuoteModal = ({ rate, sellPrice, marginPct, onClose }) => {
  const [clients, setClients] = useState([]);
  const [clientId, setClient] = useState('');
  const [subject, setSubject] = useState(
    `Freight Quote — ${rate.origin?.code || ''} → ${rate.destination?.code || ''}`
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    clientsApi.list({ limit: 100 })
      .then((res) => { if (active) setClients(res.items || res.data || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!clientId) { setErr('Please select a customer'); return; }
    setSaving(true); setErr('');
    try {
      await quotesApi.create({
        customer: clientId, subject, mode: rate.mode,
        origin: rate.origin, destination: rate.destination,
        carrier: rate.carrier, transitTimeDays: rate.transitTimeDays,
        validTo: rate.validTo,
        lineItems: [{
          description: `Freight — ${rate.origin?.code} → ${rate.destination?.code} (${rate.carrier})`,
          quantity: 1, unitPrice: sellPrice, currency: rate.baseCurrency || 'USD',
        }],
        rateReference: rate._id, marginPct, buyRate: rate.totalBuy,
        sellRate: sellPrice, status: 'draft',
      });
      setSaved(true);
    } catch (ex) { setErr(ex.response?.data?.message || 'Failed to save quote'); }
    finally { setSaving(false); }
  };

  return (
    <Modal show onHide={() => onClose(false)} centered>
      <Form onSubmit={save}>
        <Modal.Header closeButton><Modal.Title>Save as Quote</Modal.Title></Modal.Header>
        <Modal.Body>
          {saved ? (
            <div className="text-center py-4">
              <i className="bi bi-check-circle-fill text-success fs-1 d-block mb-2"></i>
              <strong>Quote saved as draft</strong>
              <div className="text-muted small mt-1">Find it in the Invoices section</div>
            </div>
          ) : (
            <>
              {err && <Alert variant="danger" className="py-2">{err}</Alert>}
              <div className="p-3 rounded mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{rate.origin?.code}</strong>
                    <i className="bi bi-arrow-right mx-2 text-muted"></i>
                    <strong>{rate.destination?.code}</strong>
                    <div className="text-muted small mt-1">{rate.carrier} · {rate.transitTimeDays}d transit</div>
                  </div>
                  <div className="text-end">
                    <div className="text-muted small">Buy: {fmtMoney(rate.totalBuy, rate.baseCurrency)}</div>
                    <div className="fw-bold" style={{ color: 'var(--brand)' }}>Sell: {fmtMoney(sellPrice, rate.baseCurrency)}</div>
                    <span style={{ ...marginVariant(marginPct), fontSize: 11, padding: '1px 7px', borderRadius: 99, fontWeight: 700 }}>
                      {marginPct.toFixed(1)}% margin
                    </span>
                  </div>
                </div>
              </div>
              <Row className="g-3">
                <Col xs={12}>
                  <Form.Label>Customer *</Form.Label>
                  {loading ? (
                    <div className="text-muted small">Loading clients…</div>
                  ) : (
                    <Form.Select required value={clientId} onChange={(e) => setClient(e.target.value)}>
                      <option value="">— Select Customer —</option>
                      {clients.map((c) => (
                        <option key={c._id} value={c._id}>{c.companyName} ({c.clientCode})</option>
                      ))}
                    </Form.Select>
                  )}
                </Col>
                <Col xs={12}>
                  <Form.Label>Quote Subject</Form.Label>
                  <Form.Control value={subject} onChange={(e) => setSubject(e.target.value)} />
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {saved ? (
            <Button variant="primary" onClick={() => onClose(true)}>Close</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving || loading}>
                {saving ? 'Saving…' : <><i className="bi bi-file-earmark-plus me-1"></i>Save Quote</>}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── RateRow component ────────────────────────────────────── */
const RateRow = ({ rate, onSaveQuote }) => {
  const [marginInput, setMarginInput] = useState(
    rate.marginPct != null ? String(rate.marginPct) : '15'
  );
  const [overrideSell, setOverrideSell] = useState(null);

  const buyPrice  = rate.totalBuy || 0;
  const marginPct = parseFloat(marginInput) || 0;
  const sellPrice = overrideSell != null
    ? overrideSell
    : buyPrice > 0 ? buyPrice / (1 - marginPct / 100) : 0;
  const calcMargin = sellPrice > 0 ? ((sellPrice - buyPrice) / sellPrice) * 100 : 0;
  const profit     = sellPrice - buyPrice;

  const vDays       = validityDays(rate.validTo);
  const expiringSoon = vDays != null && vDays >= 0 && vDays <= 7;
  const mv          = marginVariant(calcMargin);

  const handleMarginChange = (val) => { setMarginInput(val); setOverrideSell(null); };
  const handleSellChange   = (val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setOverrideSell(num);
      setMarginInput((buyPrice > 0 ? ((num - buyPrice) / num) * 100 : 0).toFixed(1));
    }
  };

  return (
    <tr>
      <td>
        <code style={{ fontSize: 11 }}>{rate.rateCode}</code>
        {rate.isContractRate && (
          <span style={{ fontSize: 10, padding: '1px 6px', background: '#ecfeff', color: '#0891b2', borderRadius: 4, fontWeight: 700, marginLeft: 4 }}>
            Contract
          </span>
        )}
      </td>
      <td>
        <div className="fw-semibold" style={{ fontSize: 13 }}>
          <strong>{rate.origin?.code || rate.origin?.name}</strong>
          <i className="bi bi-arrow-right mx-1 text-muted" style={{ fontSize: 10 }}></i>
          <strong>{rate.destination?.code || rate.destination?.name}</strong>
        </div>
        {(rate.serviceLevel || rate.type) && (
          <small className="text-muted">{rate.serviceLevel || rate.type}</small>
        )}
      </td>
      <td style={{ fontSize: 13 }}>{rate.carrier || '—'}</td>
      <td className="text-center" style={{ fontSize: 13 }}>
        {rate.transitTimeDays ? `${rate.transitTimeDays}d` : '—'}
      </td>
      <td>
        <span style={{ fontSize: 12, color: expiringSoon ? '#dc2626' : 'var(--bs-secondary-color)', fontWeight: expiringSoon ? 700 : 400 }}>
          {vDays == null ? '—' : vDays <= 0 ? 'Expired' : `${vDays}d left`}
        </span>
      </td>
      <td className="text-end">
        <span className="font-monospace text-muted" style={{ fontSize: 12 }}>
          {fmtMoney(buyPrice, rate.baseCurrency)}
        </span>
      </td>
      <td style={{ width: 120 }}>
        <InputGroup size="sm">
          <Form.Control
            type="number" min="0" max="100" step="0.1"
            value={marginInput}
            onChange={(e) => handleMarginChange(e.target.value)}
            style={{ textAlign: 'right', fontFamily: 'monospace' }}
          />
          <InputGroup.Text>%</InputGroup.Text>
        </InputGroup>
      </td>
      <td style={{ width: 160 }}>
        <InputGroup size="sm">
          <InputGroup.Text style={{ fontSize: '0.7rem' }}>{rate.baseCurrency || 'USD'}</InputGroup.Text>
          <Form.Control
            type="number" step="0.01"
            value={sellPrice.toFixed(2)}
            onChange={(e) => handleSellChange(e.target.value)}
            style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}
          />
        </InputGroup>
      </td>
      <td className="text-end">
        <span style={{ ...mv, fontSize: 11, padding: '1px 7px', borderRadius: 99, fontWeight: 700, display: 'inline-block', marginBottom: 3 }}>
          {calcMargin.toFixed(1)}%
        </span>
        <div className="font-monospace" style={{ fontSize: 12, color: profit >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
          {profit >= 0 ? '+' : ''}{fmtMoney(profit, rate.baseCurrency)}
        </div>
      </td>
      <td>
        <button
          className="ss-action-btn"
          style={{ fontSize: 11, padding: '3px 8px' }}
          title="Save as Quote"
          onClick={() => onSaveQuote({ rate, sellPrice, marginPct: calcMargin })}
        >
          <i className="bi bi-file-earmark-plus"></i>
        </button>
      </td>
    </tr>
  );
};

/* ── Main RateSearch ──────────────────────────────────────── */
const RateSearch = () => {
  const [mode, setMode]         = useState('sea');
  const [filters, setFilters]   = useState({ originCode: '', destinationCode: '', carrier: '' });
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [quoteTarget, setQuote] = useState(null);

  const onChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const search = async (e) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filters, mode }).filter(([, v]) => v)
      );
      const { rates } = await ratesApi.search(params);
      setResults(rates);
    } catch (ex) {
      setError(ex.response?.data?.message || 'Search failed');
    } finally { setLoading(false); }
  };

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-tags"></i></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <h4 className="ss-page-title" style={{ margin: 0 }}>Rate Search</h4>
            <span className="ss-info-tip" data-tip="Search contracted lanes · set margin · generate quotes instantly">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25"/>
                <circle cx="8" cy="5.2" r="0.85" fill="currentColor"/>
                <path d="M8 7.5v3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* ── Search form ───────────────────────────────────────── */}
      <div className="erp-card mb-4">
        <div className="erp-card-header">
          <span className="erp-card-title">
            <i className="bi bi-search me-2 opacity-50"></i>Search Filters
          </span>
        </div>
        <div className="erp-card-body">
          {/* Mode chips */}
          <div className="rate-mode-tabs">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`rate-mode-tab${mode === m.value ? ' active' : ''}`}
                onClick={() => setMode(m.value)}
              >
                <i className={`bi ${m.icon}`}></i>
                {m.label}
              </button>
            ))}
          </div>

          {/* Search fields */}
          <Form onSubmit={search}>
            <div className="rate-search-grid">
              <div>
                <Form.Label className="small mb-1 text-muted fw-semibold">Origin UNLOCODE</Form.Label>
                <Form.Control
                  name="originCode" value={filters.originCode} onChange={onChange}
                  placeholder="e.g. PKKHI" style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div>
                <Form.Label className="small mb-1 text-muted fw-semibold">Destination UNLOCODE</Form.Label>
                <Form.Control
                  name="destinationCode" value={filters.destinationCode} onChange={onChange}
                  placeholder="e.g. DEHAM" style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div>
                <Form.Label className="small mb-1 text-muted fw-semibold">Carrier (optional)</Form.Label>
                <Form.Control name="carrier" value={filters.carrier} onChange={onChange} placeholder="any" />
              </div>
              <div></div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="ss-action-btn ss-action-btn-primary w-100" disabled={loading}
                  style={{ justifyContent: 'center', padding: '9px 20px' }}>
                  {loading
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Searching…</>
                    : <><i className="bi bi-search me-2"></i>Search Rates</>}
                </button>
              </div>
            </div>
          </Form>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* ── Landing / empty state ─────────────────────────────── */}
      {!results && !loading && (
        <div className="dash-empty-state" style={{ minHeight: 280 }}>
          <i className="bi bi-tags" style={{ fontSize: 48, color: 'var(--brand)', opacity: 0.3 }}></i>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>Search Contracted Rates</div>
          <p className="text-muted small mb-0" style={{ maxWidth: 380 }}>
            Enter origin and destination UNLOCODE, select transport mode, then Search.
            Set <strong>margin %</strong> or type a <strong>sell price</strong> and save as a draft quote.
          </p>
        </div>
      )}

      {/* ── Results table ─────────────────────────────────────── */}
      {results && (
        <div className="erp-card">
          <div className="erp-card-header">
            <span className="erp-card-title">
              <i className="bi bi-list-ul me-2 opacity-50"></i>
              {results.length} rate{results.length !== 1 ? 's' : ''} found
            </span>
            <small className="text-muted">
              Edit margin % or sell price inline ·
              <i className="bi bi-file-earmark-plus ms-1 me-1"></i>save as quote
            </small>
          </div>
          <div className="erp-card-body p-0">
            {results.length === 0 ? (
              <div className="dash-empty-state" style={{ minHeight: 200 }}>
                <i className="bi bi-inbox" style={{ fontSize: 36, opacity: 0.3 }}></i>
                <div>No rates match these filters</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table mb-0">
                  <thead>
                    <tr>
                      <th>Rate Code</th>
                      <th>Lane</th>
                      <th>Carrier</th>
                      <th className="text-center">Transit</th>
                      <th>Validity</th>
                      <th className="text-end">Buy Rate</th>
                      <th>Margin %</th>
                      <th>Sell Price</th>
                      <th className="text-end">Profit</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <RateRow key={r._id} rate={r} onSaveQuote={setQuote} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {quoteTarget && (
        <SaveQuoteModal
          rate={quoteTarget.rate}
          sellPrice={quoteTarget.sellPrice}
          marginPct={quoteTarget.marginPct}
          onClose={() => setQuote(null)}
        />
      )}
    </div>
  );
};

export default RateSearch;
