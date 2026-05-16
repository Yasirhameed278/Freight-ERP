import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { portalApi } from '../../api';

const STATUS_META = {
  sent:      { label: 'Awaiting Review', color: '#2563eb', bg: '#eff6ff', icon: 'bi-envelope' },
  viewed:    { label: 'Viewed',          color: '#7c3aed', bg: '#f5f3ff', icon: 'bi-eye' },
  accepted:  { label: 'Accepted',        color: '#059669', bg: '#ecfdf5', icon: 'bi-check-circle-fill' },
  declined:  { label: 'Declined',        color: '#dc2626', bg: '#fef2f2', icon: 'bi-x-circle-fill' },
  expired:   { label: 'Expired',         color: '#9ca3af', bg: '#f9fafb', icon: 'bi-clock-history' },
  converted: { label: 'Booking Created', color: '#059669', bg: '#ecfdf5', icon: 'bi-bag-check-fill' },
};

function BookingForm({ onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState({
    shipperName: '', shipperAddress: '', shipperContact: '',
    consigneeName: '', consigneeAddress: '', consigneeContact: '',
    commodity: '', hsCode: '', readyDate: '', specialInstructions: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div className="row g-3 mb-4">
        <div className="col-12">
          <h6 className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11, letterSpacing: '0.06em' }}>Shipper</h6>
        </div>
        <div className="col-md-6">
          <label className="form-label">Company / Name <span className="text-danger">*</span></label>
          <input className="form-control" value={form.shipperName} onChange={(e) => set('shipperName', e.target.value)} required />
        </div>
        <div className="col-md-6">
          <label className="form-label">Contact</label>
          <input className="form-control" value={form.shipperContact} onChange={(e) => set('shipperContact', e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label">Address</label>
          <textarea className="form-control" rows={2} value={form.shipperAddress} onChange={(e) => set('shipperAddress', e.target.value)} />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <h6 className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11, letterSpacing: '0.06em' }}>Consignee</h6>
        </div>
        <div className="col-md-6">
          <label className="form-label">Company / Name <span className="text-danger">*</span></label>
          <input className="form-control" value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)} required />
        </div>
        <div className="col-md-6">
          <label className="form-label">Contact</label>
          <input className="form-control" value={form.consigneeContact} onChange={(e) => set('consigneeContact', e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label">Address</label>
          <textarea className="form-control" rows={2} value={form.consigneeAddress} onChange={(e) => set('consigneeAddress', e.target.value)} />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <h6 className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11, letterSpacing: '0.06em' }}>Cargo</h6>
        </div>
        <div className="col-md-6">
          <label className="form-label">Commodity Description</label>
          <input className="form-control" value={form.commodity} onChange={(e) => set('commodity', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">HS Code</label>
          <input className="form-control" value={form.hsCode} onChange={(e) => set('hsCode', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Cargo Ready Date</label>
          <input type="date" className="form-control" value={form.readyDate} onChange={(e) => set('readyDate', e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label">Special Instructions</label>
          <textarea className="form-control" rows={2} value={form.specialInstructions} onChange={(e) => set('specialInstructions', e.target.value)} />
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-success px-4" disabled={loading}>
          {loading ? <><span className="spinner-border spinner-border-sm me-2" />Confirming…</> : <><i className="bi bi-check-lg me-2" />Confirm Booking</>}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function QuoteView() {
  const { token } = useParams();
  const [quote, setQuote]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [view, setView]             = useState('detail'); // 'detail' | 'book' | 'decline-confirm'
  const [selectedRate, setSelectedRate] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState('');
  const [done, setDone]             = useState(null); // { type: 'accepted'|'declined', message }

  useEffect(() => {
    portalApi.getQuote(token)
      .then((d) => {
        setQuote(d.quote);
        if (d.quote.selectedRate) setSelectedRate(d.quote.selectedRate);
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 410) setError('expired');
        else if (status === 404) setError('notfound');
        else setError(err.response?.data?.message || 'Failed to load quote');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (bookingForm) => {
    setActionError('');
    setActionLoading(true);
    try {
      const data = await portalApi.acceptQuote(token, { selectedRate, booking: bookingForm });
      setDone({ type: 'accepted', message: data.message, quoteRef: data.quoteRef });
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to accept quote. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      const data = await portalApi.declineQuote(token);
      setDone({ type: 'declined', message: data.message });
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to decline quote.');
    } finally {
      setActionLoading(false);
    }
  };

  const route = quote
    ? [quote.origin?.name || quote.origin?.code, quote.destination?.name || quote.destination?.code].filter(Boolean).join(' → ')
    : '';

  const expiry = quote?.tokenExpiry
    ? new Date(quote.tokenExpiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const statusMeta = STATUS_META[quote?.status] || STATUS_META.sent;

  return (
    <div className="portal-page min-vh-100" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4fd 100%)' }}>
      {/* Header */}
      <div className="py-3 px-4" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)' }}>
        <div className="container-lg d-flex align-items-center justify-content-between">
          <div className="text-white">
            <span className="fw-bold fs-5">Reliq</span>
            <span className="ms-2 opacity-75 small">Logistics Platform</span>
          </div>
          <a href="/portal" className="text-white opacity-75 small text-decoration-none">
            <i className="bi bi-arrow-left me-1" />Get New Quote
          </a>
        </div>
      </div>

      <div className="container-lg py-5" style={{ maxWidth: 760 }}>
        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
            <div className="text-muted mt-3">Loading your quote…</div>
          </div>
        )}

        {/* Error states */}
        {!loading && error === 'expired' && (
          <div className="card border-0 shadow-sm text-center p-5" style={{ borderRadius: 16 }}>
            <i className="bi bi-clock-history text-muted mb-3" style={{ fontSize: 48 }} />
            <h4 className="fw-bold mb-2">Quote Expired</h4>
            <p className="text-muted mb-4">This quote link has expired. Please request a new quote to get updated rates.</p>
            <a href="/portal" className="btn btn-primary">Get a New Quote</a>
          </div>
        )}
        {!loading && error === 'notfound' && (
          <div className="card border-0 shadow-sm text-center p-5" style={{ borderRadius: 16 }}>
            <i className="bi bi-question-circle text-muted mb-3" style={{ fontSize: 48 }} />
            <h4 className="fw-bold mb-2">Quote Not Found</h4>
            <p className="text-muted mb-4">This link is invalid or has already been used.</p>
            <a href="/portal" className="btn btn-primary">Request a New Quote</a>
          </div>
        )}
        {!loading && error && error !== 'expired' && error !== 'notfound' && (
          <div className="alert alert-danger">{error}</div>
        )}

        {/* Done state */}
        {done && (
          <div className="card border-0 shadow-sm text-center p-5" style={{ borderRadius: 16 }}>
            {done.type === 'accepted' ? (
              <>
                <i className="bi bi-check-circle-fill mb-3" style={{ fontSize: 56, color: '#059669' }} />
                <h4 className="fw-bold mb-2">Booking Confirmed!</h4>
                <p className="text-muted mb-1">Reference: <strong>{done.quoteRef}</strong></p>
                <p className="text-muted mb-4">{done.message}</p>
                <div className="card border-0 bg-light rounded-3 p-3 d-inline-block text-start mx-auto" style={{ maxWidth: 340 }}>
                  <div className="small text-muted">Our team will review your booking details and contact you within 24 hours to finalize the shipment.</div>
                </div>
              </>
            ) : (
              <>
                <i className="bi bi-x-circle-fill mb-3" style={{ fontSize: 56, color: '#9ca3af' }} />
                <h4 className="fw-bold mb-2">Quote Declined</h4>
                <p className="text-muted mb-4">{done.message}</p>
                <a href="/portal" className="btn btn-primary">Get a New Quote</a>
              </>
            )}
          </div>
        )}

        {/* Quote detail */}
        {!loading && !error && !done && quote && (
          <>
            {/* Status banner */}
            {['accepted', 'declined', 'converted', 'expired'].includes(quote.status) && (
              <div className="d-flex align-items-center gap-2 mb-4 p-3 rounded-3" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                <i className={`bi ${statusMeta.icon} fs-5`} />
                <span className="fw-semibold">This quote has been {quote.status}.</span>
              </div>
            )}

            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                {/* Header row */}
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div>
                    <h4 className="fw-bold mb-1">{route || 'Freight Quote'}</h4>
                    <div className="text-muted small">
                      Ref: <strong className="text-body">{quote.quoteRef}</strong>
                      {expiry && <> &nbsp;&middot;&nbsp; Valid until {expiry}</>}
                    </div>
                  </div>
                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{ background: statusMeta.bg, color: statusMeta.color, fontSize: 12 }}
                  >
                    <i className={`bi ${statusMeta.icon} me-1`} />{statusMeta.label}
                  </span>
                </div>

                {/* Shipment details */}
                <div className="row g-3 mb-4 p-3 rounded-3" style={{ background: '#f8fafc' }}>
                  <div className="col-6 col-md-3">
                    <div className="text-muted small">Mode</div>
                    <div className="fw-semibold text-uppercase">{quote.mode}</div>
                  </div>
                  {quote.weight && (
                    <div className="col-6 col-md-3">
                      <div className="text-muted small">Weight</div>
                      <div className="fw-semibold">{quote.weight} {quote.weightUnit}</div>
                    </div>
                  )}
                  {quote.volume && (
                    <div className="col-6 col-md-3">
                      <div className="text-muted small">Volume</div>
                      <div className="fw-semibold">{quote.volume} {quote.volumeUnit}</div>
                    </div>
                  )}
                  {quote.cargoType && (
                    <div className="col-6 col-md-3">
                      <div className="text-muted small">Cargo Type</div>
                      <div className="fw-semibold">{quote.cargoType}</div>
                    </div>
                  )}
                </div>

                {/* Rates */}
                {quote.rates?.length > 0 && view === 'detail' && (
                  <div className="mb-4">
                    <div className="text-muted small fw-semibold text-uppercase mb-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
                      Available Rates
                    </div>
                    <div className="row g-3">
                      {quote.rates.map((r, i) => {
                        const isSelected = selectedRate?.rateId === r.rateId || (!selectedRate && i === 0);
                        return (
                          <div key={r.rateId || i} className="col-md-6">
                            <div
                              className={`portal-rate-card card h-100 ${isSelected ? 'border-primary' : ''}`}
                              style={{ cursor: 'pointer', borderWidth: isSelected ? 2 : 1 }}
                              onClick={() => {
                                if (!['accepted', 'declined', 'converted', 'expired'].includes(quote.status)) {
                                  setSelectedRate(r);
                                }
                              }}
                            >
                              <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <div className="fw-bold">{r.carrier || 'General Carrier'}</div>
                                    {r.service && <div className="text-muted small">{r.service}</div>}
                                  </div>
                                  {isSelected && (
                                    <span className="badge bg-primary">Selected</span>
                                  )}
                                </div>
                                <div className="portal-rate-price">{r.currency} {(r.portalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                {r.transitDays && <div className="text-muted small"><i className="bi bi-clock me-1" />{r.transitDays} days transit</div>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {quote.notes && (
                  <div className="mb-4">
                    <div className="text-muted small fw-semibold text-uppercase mb-1" style={{ fontSize: 11, letterSpacing: '0.06em' }}>Notes</div>
                    <p className="mb-0 text-muted">{quote.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {!['accepted', 'declined', 'converted', 'expired'].includes(quote.status) && view === 'detail' && (
                  <div className="d-flex gap-2 pt-3 border-top">
                    <button
                      className="btn btn-success px-4"
                      onClick={() => setView('book')}
                    >
                      <i className="bi bi-check-lg me-2" />Accept &amp; Book
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => setView('decline-confirm')}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Booking form */}
            {view === 'book' && (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <button className="btn btn-link p-0 text-muted" onClick={() => { setView('detail'); setActionError(''); }}>
                      <i className="bi bi-arrow-left me-1" />Back
                    </button>
                    <h5 className="mb-0 fw-bold">Booking Details</h5>
                  </div>
                  <BookingForm
                    onSubmit={handleAccept}
                    onCancel={() => { setView('detail'); setActionError(''); }}
                    loading={actionLoading}
                    error={actionError}
                  />
                </div>
              </div>
            )}

            {/* Decline confirm */}
            {view === 'decline-confirm' && (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                <div className="card-body p-4 text-center">
                  <i className="bi bi-question-circle text-warning mb-3" style={{ fontSize: 48 }} />
                  <h5 className="fw-bold mb-2">Decline this quote?</h5>
                  <p className="text-muted mb-4">This action cannot be undone. You can always request a new quote.</p>
                  {actionError && <div className="alert alert-danger py-2 mb-3">{actionError}</div>}
                  <div className="d-flex gap-2 justify-content-center">
                    <button
                      className="btn btn-danger px-4"
                      onClick={handleDecline}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <><span className="spinner-border spinner-border-sm me-2" />Declining…</> : 'Yes, Decline'}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setView('detail')} disabled={actionLoading}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="text-center py-4 text-muted small">
        &copy; {new Date().getFullYear()} Reliq Logistics &nbsp;&middot;&nbsp; Powered by Reliq ERP
      </div>
    </div>
  );
}
