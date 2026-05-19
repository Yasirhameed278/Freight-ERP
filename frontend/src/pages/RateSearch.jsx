import { useState, useEffect, useMemo } from 'react';
import { ratesApi, quotesApi, clientsApi } from '../api';

/* ── Static data ─────────────────────────────────────────────────── */
const PORTS = [
  { code: 'USNYC', name: 'New York' },    { code: 'USLAX', name: 'Los Angeles' },
  { code: 'DEHAM', name: 'Hamburg' },     { code: 'NLRTM', name: 'Rotterdam' },
  { code: 'SGSIN', name: 'Singapore' },   { code: 'CNSHA', name: 'Shanghai' },
  { code: 'AEDXB', name: 'Dubai' },       { code: 'JPYOK', name: 'Yokohama' },
  { code: 'INMUN', name: 'Mundra' },      { code: 'GBFXT', name: 'Felixstowe' },
  { code: 'HKHKG', name: 'Hong Kong' },   { code: 'KRPUS', name: 'Busan' },
];

const MODE_CFG = {
  sea:  { icon: 'bi-water',        color: '#1A56DB', label: 'Sea'  },
  air:  { icon: 'bi-airplane',     color: '#DC2626', label: 'Air'  },
  road: { icon: 'bi-truck',        color: '#059669', label: 'Road' },
  rail: { icon: 'bi-train-front',  color: '#7C3AED', label: 'Rail' },
};

const SORT_CHIPS = ['Best Match', 'Cheapest', 'Fastest', 'Most Reliable'];

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmtMoney = (v, cur = 'USD') =>
  `${cur} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtValidDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const vDaysLeft = (d) =>
  d ? Math.ceil((new Date(d) - Date.now()) / 86_400_000) : null;

const marginVariant = (pct) => {
  if (pct >= 20) return { bg: '#dcfce7', color: '#16a34a' };
  if (pct >= 10) return { bg: '#fef9c3', color: '#ca8a04' };
  return { bg: '#fee2e2', color: '#dc2626' };
};

/* ── Save Quote Modal ────────────────────────────────────────────── */
const SaveQuoteModal = ({ rate, sellPrice, marginPct, onClose }) => {
  const [clients,  setClients]  = useState([]);
  const [clientId, setClientId] = useState('');
  const [subject,  setSubject]  = useState(
    `Freight Quote — ${rate.origin?.code || ''} → ${rate.destination?.code || ''}`
  );
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [saved,   setSaved]   = useState(false);

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
        carrier: rate.carrier, transitTimeDays: rate.transitTimeDays, validTo: rate.validTo,
        lineItems: [{
          description: `Freight — ${rate.origin?.code} → ${rate.destination?.code} (${rate.carrier})`,
          quantity: 1, unitPrice: sellPrice, currency: rate.baseCurrency || 'USD',
        }],
        rateReference: rate._id, marginPct, buyRate: rate.totalBuy, sellRate: sellPrice, status: 'draft',
      });
      setSaved(true);
    } catch (ex) { setErr(ex.response?.data?.message || 'Failed to save quote'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Save as Quote</span>
          <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, borderRadius: 6, padding: 4, display: 'flex' }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {saved ? (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <i className="bi bi-check-circle-fill" style={{ fontSize: 48, color: '#16a34a', display: 'block', marginBottom: 12 }}></i>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Quote saved as draft</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Find it in the Invoices section</div>
            </div>
          ) : (
            <>
              {err && (
                <div style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                  <i className="bi bi-exclamation-circle me-2"></i>{err}
                </div>
              )}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {rate.origin?.code} <i className="bi bi-arrow-right" style={{ fontSize: 11, color: 'var(--muted)' }}></i> {rate.destination?.code}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{rate.carrier} · {rate.transitTimeDays}d transit</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Buy: {fmtMoney(rate.totalBuy, rate.baseCurrency)}</div>
                    <div style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 14 }}>Sell: {fmtMoney(sellPrice, rate.baseCurrency)}</div>
                    <span style={{ ...marginVariant(marginPct), fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 700, display: 'inline-block', marginTop: 4 }}>
                      {marginPct.toFixed(1)}% margin
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 5 }}>Customer *</div>
                {loading ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading clients…</div>
                ) : (
                  <select required value={clientId} onChange={(e) => setClientId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 13, color: 'var(--ink)', outline: 'none' }}>
                    <option value="">— Select Customer —</option>
                    {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName} ({c.clientCode})</option>)}
                  </select>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 5 }}>Quote Subject</div>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 13, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          {saved ? (
            <button className="ss-action-btn ss-action-btn-primary" onClick={() => onClose(true)}>Close</button>
          ) : (
            <>
              <button className="ss-action-btn" onClick={() => onClose(false)} disabled={saving}>Cancel</button>
              <button className="ss-action-btn ss-action-btn-primary" onClick={save} disabled={saving || loading}>
                {saving ? 'Saving…' : <><i className="bi bi-file-earmark-plus me-1"></i>Save Quote</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Rate Card ───────────────────────────────────────────────────── */
const RateCard = ({ rate, index, onBook }) => {
  const [showDetails, setShowDetails]   = useState(false);
  const [marginInput, setMarginInput]   = useState(rate.marginPct != null ? String(rate.marginPct) : '15');
  const [overrideSell, setOverrideSell] = useState(null);

  const buyPrice   = rate.totalBuy || 0;
  const marginPct  = parseFloat(marginInput) || 0;
  const sellPrice  = overrideSell != null
    ? overrideSell
    : buyPrice > 0 ? buyPrice / (1 - marginPct / 100) : 0;
  const calcMargin = sellPrice > 0 ? ((sellPrice - buyPrice) / sellPrice) * 100 : 0;
  const profit     = sellPrice - buyPrice;
  const mv         = marginVariant(calcMargin);

  const handleMarginChange = (v) => { setMarginInput(v); setOverrideSell(null); };
  const handleSellChange   = (v) => {
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) {
      setOverrideSell(n);
      setMarginInput((buyPrice > 0 ? ((n - buyPrice) / n) * 100 : 0).toFixed(1));
    }
  };

  const cfg    = MODE_CFG[rate.mode] || MODE_CFG.sea;
  const vDays  = vDaysLeft(rate.validTo);
  const expiring = vDays != null && vDays >= 0 && vDays <= 7;
  const isBest = (rate.status === 'best') || index === 0;

  return (
    <div className="rs-rate-card">
      {isBest && (
        <span className="rs-rate-best">
          <i className="bi bi-star-fill"></i> Best Value
        </span>
      )}
      <div className="rs-rate-grid">
        {/* Mode icon */}
        <div className="rs-rate-icon" style={{ background: `${cfg.color}18`, color: cfg.color }}>
          <i className={`bi ${cfg.icon}`}></i>
        </div>

        {/* Carrier + lane */}
        <div>
          <div className="rs-rate-carrier">{rate.carrier || '—'}</div>
          <div className="rs-rate-meta">
            {rate.type || rate.serviceLevel || cfg.label} · {rate.origin?.code || '—'} → {rate.destination?.code || '—'}
          </div>
        </div>

        {/* Transit */}
        <div>
          <div className="rs-rate-stat-label">Transit</div>
          <div className="rs-rate-stat-value">{rate.transitTimeDays ? `${rate.transitTimeDays}d` : '—'}</div>
        </div>

        {/* Validity */}
        <div>
          <div className="rs-rate-stat-label">Valid until</div>
          <div className="rs-rate-stat-value" style={{ color: expiring ? '#dc2626' : undefined }}>
            {vDays != null && vDays <= 0 ? 'Expired' : fmtValidDate(rate.validTo)}
          </div>
        </div>

        {/* Rate */}
        <div>
          <div className="rs-rate-stat-label">Rate</div>
          <div className="rs-rate-value-row">
            <span className="rs-rate-value">
              ${buyPrice > 0 ? buyPrice.toLocaleString() : '—'}
            </span>
            <span className="rs-rate-unit">{rate.unit || '/container'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="rs-rate-actions">
          <button className="rs-btn-details" onClick={() => setShowDetails((v) => !v)}>
            {showDetails ? 'Hide' : 'Details'}
          </button>
          <button className="rs-btn-book" onClick={() => onBook({ rate, sellPrice, marginPct: calcMargin })}>
            Book
          </button>
        </div>
      </div>

      {/* Expanded margin calculator */}
      {showDetails && (
        <div className="rs-rate-detail-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div>
              <div className="rs-detail-label">Buy Rate</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: 'var(--muted)', paddingTop: 8 }}>
                {fmtMoney(buyPrice, rate.baseCurrency)}
              </div>
            </div>
            <div>
              <div className="rs-detail-label">Margin %</div>
              <div className="rs-detail-input">
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={marginInput}
                  onChange={(e) => handleMarginChange(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, padding: '8px 10px', border: 'none', background: 'none', outline: 'none', flex: 1, textAlign: 'right', color: 'var(--ink)' }}
                />
                <div className="rs-detail-input-prefix">%</div>
              </div>
            </div>
            <div>
              <div className="rs-detail-label">Sell Price</div>
              <div className="rs-detail-input">
                <div className="rs-detail-input-prefix">{rate.baseCurrency || 'USD'}</div>
                <input
                  type="number" step="0.01"
                  value={sellPrice.toFixed(2)}
                  onChange={(e) => handleSellChange(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, padding: '8px 10px', border: 'none', background: 'none', outline: 'none', flex: 1, textAlign: 'right', color: 'var(--ink)' }}
                />
              </div>
            </div>
            <div>
              <div className="rs-detail-label">Profit</div>
              <div style={{ paddingTop: 4 }}>
                <span style={{ ...mv, display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {calcMargin.toFixed(1)}%
                </span>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: profit >= 0 ? '#16a34a' : '#dc2626' }}>
                  {profit >= 0 ? '+' : ''}{fmtMoney(profit, rate.baseCurrency)}
                </div>
              </div>
            </div>
          </div>
          {rate.rateCode && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
              Rate code: <code style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{rate.rateCode}</code>
              {rate.isContractRate && <span style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', background: '#e0f2fe', color: '#0891b2', borderRadius: 4, fontWeight: 700 }}>Contract</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main RateSearch ─────────────────────────────────────────────── */
const RateSearch = () => {
  const [origin,  setOrigin]  = useState('USNYC');
  const [dest,    setDest]    = useState('DEHAM');
  const [mode,    setMode]    = useState('sea');
  const [equip,   setEquip]   = useState('');
  const [date,    setDate]    = useState('');
  const [sort,    setSort]    = useState('Best Match');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [quoteTarget, setQuoteTarget] = useState(null);

  const sorted = useMemo(() => {
    if (!results) return null;
    if (sort === 'Cheapest') return [...results].sort((a, b) => (a.totalBuy || 0) - (b.totalBuy || 0));
    if (sort === 'Fastest')  return [...results].sort((a, b) => (a.transitTimeDays || 999) - (b.transitTimeDays || 999));
    return results;
  }, [results, sort]);

  const search = async (e) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      const params = { mode };
      if (origin) params.originCode      = origin;
      if (dest)   params.destinationCode = dest;
      const { rates } = await ratesApi.search(params);
      setResults(rates);
    } catch (ex) {
      setError(ex.response?.data?.message || 'Search failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="rs-shell">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="rs-header">
        <div>
          <h1 className="rs-title">Rate Search</h1>
          <div className="rs-subtitle">Find the best lane across carriers and modes</div>
        </div>
        <div className="rs-header-actions">
          <button className="ss-action-btn">
            <i className="bi bi-bookmark me-1"></i>Saved searches
          </button>
          <button className="ss-action-btn ss-action-btn-primary">
            <i className="bi bi-plus-lg me-1"></i>New Quote
          </button>
        </div>
      </div>

      {/* ── Search card ────────────────────────────────────────── */}
      <form className="rs-search-card" onSubmit={search}>
        <div className="rs-search-grid">
          {/* Origin */}
          <div>
            <div className="rs-field-label">Origin</div>
            <div className="rs-field">
              <i className="bi bi-geo-alt"></i>
              <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {PORTS.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Destination */}
          <div>
            <div className="rs-field-label">Destination</div>
            <div className="rs-field">
              <i className="bi bi-geo-alt-fill"></i>
              <select value={dest} onChange={(e) => setDest(e.target.value)}>
                {PORTS.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Mode */}
          <div>
            <div className="rs-field-label">Mode</div>
            <div className="rs-field">
              <i className={`bi ${MODE_CFG[mode]?.icon || 'bi-water'}`}></i>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="sea">Sea</option>
                <option value="air">Air</option>
                <option value="road">Road</option>
                <option value="rail">Rail</option>
              </select>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <div className="rs-field-label">Equipment</div>
            <div className="rs-field">
              <i className="bi bi-grid-3x3-gap"></i>
              <select value={equip} onChange={(e) => setEquip(e.target.value)}>
                <option value="">Any</option>
                <option value="20gp">20' GP</option>
                <option value="40hc">40' HC</option>
                <option value="reefer">Reefer</option>
              </select>
            </div>
          </div>

          {/* Ready Date */}
          <div>
            <div className="rs-field-label">Ready Date</div>
            <div className="rs-field">
              <i className="bi bi-calendar"></i>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="Select date"
              />
            </div>
          </div>

          {/* Search button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="rs-search-btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading
                ? <><span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }}></span>&nbsp;Searching…</>
                : <><i className="bi bi-search"></i>&nbsp;Search</>}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '10px 16px', fontSize: 13, marginBottom: 16 }}>
          <i className="bi bi-exclamation-circle me-2"></i>{error}
        </div>
      )}

      {/* ── Filter chips + results count ───────────────────────── */}
      {results && (
        <div className="rs-filter-row">
          {SORT_CHIPS.map((s) => (
            <button key={s} className={`rs-filter-chip${sort === s ? ' active' : ''}`} onClick={() => setSort(s)}>
              {s}
            </button>
          ))}
          <div className="rs-showing">
            Showing {results.length} rate{results.length !== 1 ? 's' : ''} for{' '}
            <strong>{origin} → {dest}</strong>
          </div>
        </div>
      )}

      {/* ── Rate cards ─────────────────────────────────────────── */}
      {sorted && sorted.length > 0 && (
        <div className="rs-results">
          {sorted.map((r, i) => (
            <RateCard key={r._id || i} rate={r} index={i} onBook={setQuoteTarget} />
          ))}
        </div>
      )}

      {/* ── No results ─────────────────────────────────────────── */}
      {results && results.length === 0 && (
        <div className="rs-empty">
          <i className="bi bi-inbox" style={{ fontSize: 40, opacity: 0.2 }}></i>
          <span style={{ fontWeight: 600 }}>No rates match these filters</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Try a different origin, destination, or mode.</span>
        </div>
      )}

      {/* ── Landing empty state ─────────────────────────────────── */}
      {!results && !loading && (
        <div className="rs-empty">
          <i className="bi bi-tags" style={{ fontSize: 48, color: 'var(--brand)', opacity: 0.3 }}></i>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Search Contracted Rates</span>
          <span style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 380, textAlign: 'center' }}>
            Select origin and destination, choose transport mode, then hit Search.
            Set <strong>margin %</strong> or enter a <strong>sell price</strong> in the Details panel and save as a quote.
          </span>
        </div>
      )}

      {quoteTarget && (
        <SaveQuoteModal
          rate={quoteTarget.rate}
          sellPrice={quoteTarget.sellPrice}
          marginPct={quoteTarget.marginPct}
          onClose={() => setQuoteTarget(null)}
        />
      )}
    </div>
  );
};

export default RateSearch;
