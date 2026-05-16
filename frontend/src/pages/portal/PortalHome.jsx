import { useState } from 'react';
import { portalApi } from '../../api';

const MODES = [
  { value: 'sea',        label: 'Sea Freight',   icon: 'bi-ship' },
  { value: 'air',        label: 'Air Freight',   icon: 'bi-airplane' },
  { value: 'road',       label: 'Road',          icon: 'bi-truck' },
  { value: 'courier',    label: 'Courier',       icon: 'bi-box-seam' },
  { value: 'multimodal', label: 'Multimodal',    icon: 'bi-diagram-3' },
];

const STEPS = ['Search', 'Select Rate', 'Your Details', 'Confirmed'];

function StepBar({ step }) {
  return (
    <div className="portal-steps d-flex justify-content-center gap-0 mb-5">
      {STEPS.map((s, i) => (
        <div key={s} className={`portal-step-item ${i < step ? 'done' : i === step ? 'active' : ''}`}>
          <div className="portal-step-circle">
            {i < step ? <i className="bi bi-check-lg" /> : i + 1}
          </div>
          <div className="portal-step-label">{s}</div>
          {i < STEPS.length - 1 && <div className="portal-step-line" />}
        </div>
      ))}
    </div>
  );
}

function SearchForm({ onResults }) {
  const [form, setForm] = useState({
    mode: 'sea',
    originCode: '',
    destinationCode: '',
    weight: '',
    volume: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await portalApi.searchRates({
        mode: form.mode,
        originCode: form.originCode.toUpperCase(),
        destinationCode: form.destinationCode.toUpperCase(),
        weight:   form.weight   ? parseFloat(form.weight)  : undefined,
        volume:   form.volume   ? parseFloat(form.volume)  : undefined,
      });
      onResults(data, form);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="form-label fw-semibold mb-2">Shipping Mode</label>
        <div className="d-flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-2 ${form.mode === m.value ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => set('mode', m.value)}
            >
              <i className={`bi ${m.icon}`} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Origin Port / Airport Code</label>
          <input
            className="form-control"
            placeholder="e.g. CNSHA, JFK"
            value={form.originCode}
            onChange={(e) => set('originCode', e.target.value)}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Destination Port / Airport Code</label>
          <input
            className="form-control"
            placeholder="e.g. USLAX, LHR"
            value={form.destinationCode}
            onChange={(e) => set('destinationCode', e.target.value)}
            required
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Weight (KG)</label>
          <input
            type="number"
            className="form-control"
            placeholder="Optional"
            min="0"
            value={form.weight}
            onChange={(e) => set('weight', e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Volume (CBM)</label>
          <input
            type="number"
            className="form-control"
            placeholder="Optional"
            min="0"
            value={form.volume}
            onChange={(e) => set('volume', e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      <button type="submit" className="btn btn-primary px-5" disabled={loading}>
        {loading ? <><span className="spinner-border spinner-border-sm me-2" />Searching…</> : 'Search Rates'}
      </button>
    </form>
  );
}

function RateCards({ rates, markup, onSelect }) {
  return (
    <div>
      <p className="text-muted mb-3">
        {rates.length} rate{rates.length !== 1 ? 's' : ''} found &mdash; select one to proceed
        <span className="badge bg-primary ms-2">All-in price</span>
      </p>
      <div className="row g-3">
        {rates.map((r, i) => (
          <div key={r.rateId || i} className="col-md-6 col-lg-4">
            <div className="card h-100 portal-rate-card">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="fw-bold">{r.carrier || 'General Carrier'}</div>
                    {r.service && <div className="text-muted small">{r.service}</div>}
                  </div>
                  {r.type && <span className="badge bg-light text-secondary border">{r.type}</span>}
                </div>
                <div className="mt-auto">
                  <div className="portal-rate-price">
                    {r.currency} {(r.portalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  {r.transitDays && (
                    <div className="text-muted small mb-3">
                      <i className="bi bi-clock me-1" />{r.transitDays} days transit
                    </div>
                  )}
                  <button
                    className="btn btn-primary w-100"
                    onClick={() => onSelect(r)}
                  >
                    Select &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted small mt-3">
        <i className="bi bi-info-circle me-1" />
        Prices include our service fee. All rates subject to availability at booking.
      </p>
    </div>
  );
}

function ContactForm({ searchParams, selectedRate, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    cargoType: '', packages: '', dangerousGoods: false, notes: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3 mb-4">
        <div className="col-12">
          <h6 className="text-muted fw-semibold mb-3 text-uppercase" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            Your Information
          </h6>
        </div>
        <div className="col-md-6">
          <label className="form-label">Full Name <span className="text-danger">*</span></label>
          <input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div className="col-md-6">
          <label className="form-label">Email Address <span className="text-danger">*</span></label>
          <input type="email" className="form-control" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div className="col-md-6">
          <label className="form-label">Phone</label>
          <input className="form-control" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Company</label>
          <input className="form-control" value={form.company} onChange={(e) => set('company', e.target.value)} />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <h6 className="text-muted fw-semibold mb-3 text-uppercase" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            Cargo Details
          </h6>
        </div>
        <div className="col-md-6">
          <label className="form-label">Cargo Type</label>
          <input className="form-control" placeholder="e.g. Electronics, Textiles" value={form.cargoType} onChange={(e) => set('cargoType', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Packages</label>
          <input type="number" min="1" className="form-control" value={form.packages} onChange={(e) => set('packages', e.target.value)} />
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="dg"
              checked={form.dangerousGoods}
              onChange={(e) => set('dangerousGoods', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="dg">Dangerous Goods</label>
          </div>
        </div>
        <div className="col-12">
          <label className="form-label">Notes / Special Requirements</label>
          <textarea className="form-control" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>

      <div className="card border-0 bg-light rounded-3 p-3 mb-4">
        <div className="small text-muted fw-semibold mb-1">Selected Rate</div>
        <div className="fw-bold">{selectedRate?.carrier}</div>
        <div className="text-primary fw-bold fs-5">
          {selectedRate?.currency} {(selectedRate?.portalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        {selectedRate?.transitDays && <div className="text-muted small">{selectedRate.transitDays} days transit</div>}
      </div>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      <button type="submit" className="btn btn-primary px-5" disabled={loading}>
        {loading ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</> : 'Request Quote'}
      </button>
    </form>
  );
}

function Confirmation({ quoteRef, email }) {
  return (
    <div className="text-center py-4">
      <div className="portal-confirm-icon mb-4">
        <i className="bi bi-envelope-check-fill" style={{ fontSize: 48, color: '#4f46e5' }} />
      </div>
      <h4 className="fw-bold mb-2">Quote request received!</h4>
      <p className="text-muted mb-1">Reference: <strong>{quoteRef}</strong></p>
      <p className="text-muted mb-4">
        We've sent your personalized quote to <strong>{email}</strong>. Click the link in the email to view full details and confirm your booking.
      </p>
      <div className="card border-0 bg-light rounded-3 p-3 d-inline-block text-start" style={{ maxWidth: 360 }}>
        <div className="d-flex align-items-start gap-2 mb-2">
          <i className="bi bi-1-circle-fill text-primary mt-1" />
          <span className="small">Check your inbox for the quote email from Reliq</span>
        </div>
        <div className="d-flex align-items-start gap-2 mb-2">
          <i className="bi bi-2-circle-fill text-primary mt-1" />
          <span className="small">Review rates and select your preferred option</span>
        </div>
        <div className="d-flex align-items-start gap-2">
          <i className="bi bi-3-circle-fill text-primary mt-1" />
          <span className="small">Our team will confirm your booking within 24 hours</span>
        </div>
      </div>
    </div>
  );
}

export default function PortalHome() {
  const [step, setStep]             = useState(0);
  const [searchParams, setSearchParams] = useState(null);
  const [rates, setRates]           = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleResults = (data, params) => {
    setRates(data.rates || []);
    setSearchParams(params);
    setStep(1);
  };

  const handleSelectRate = (rate) => {
    setSelectedRate(rate);
    setStep(2);
  };

  const handleContact = async (contactForm) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload = {
        contact: {
          name:    contactForm.name,
          email:   contactForm.email,
          phone:   contactForm.phone,
          company: contactForm.company,
        },
        mode:          searchParams.mode,
        origin:        { code: searchParams.originCode },
        destination:   { code: searchParams.destinationCode },
        weight:        searchParams.weight ? parseFloat(searchParams.weight) : undefined,
        volume:        searchParams.volume ? parseFloat(searchParams.volume) : undefined,
        cargoType:     contactForm.cargoType,
        packages:      contactForm.packages ? parseInt(contactForm.packages) : undefined,
        dangerousGoods: contactForm.dangerousGoods,
        notes:         contactForm.notes,
        rates,
        selectedRate,
      };
      const data = await portalApi.submitQuote(payload);
      setContactEmail(contactForm.email);
      setConfirmation(data);
      setStep(3);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-page min-vh-100" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4fd 100%)' }}>
      {/* Header */}
      <div className="portal-header py-3 px-4 mb-0" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)' }}>
        <div className="container-lg d-flex align-items-center justify-content-between">
          <div className="text-white">
            <span className="fw-bold fs-5">Reliq</span>
            <span className="ms-2 opacity-75 small">Logistics Platform</span>
          </div>
          <a href="/login" className="btn btn-sm btn-light btn-outline-light text-white border-white opacity-75" style={{ fontSize: 13 }}>
            Staff Login
          </a>
        </div>
      </div>

      <div className="container-lg py-5">
        {/* Hero */}
        {step === 0 && (
          <div className="text-center mb-5">
            <h1 className="fw-bold mb-2" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', color: '#0f172a' }}>
              Instant Freight Quotes
            </h1>
            <p className="text-muted" style={{ fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
              Search live rates, select your carrier, and get a confirmed quote delivered to your inbox — in minutes.
            </p>
          </div>
        )}

        <StepBar step={step} />

        <div className="card border-0 shadow-sm" style={{ borderRadius: 16, maxWidth: 860, margin: '0 auto' }}>
          <div className="card-body p-4 p-lg-5">
            {step === 0 && <SearchForm onResults={handleResults} />}

            {step === 1 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <button className="btn btn-link p-0 text-muted" onClick={() => setStep(0)}>
                    <i className="bi bi-arrow-left me-1" />Back
                  </button>
                  <h5 className="mb-0 fw-bold">Available Rates</h5>
                </div>
                {rates.length === 0
                  ? <div className="text-center text-muted py-5">
                      <i className="bi bi-search fs-1 d-block mb-3 opacity-25" />
                      <p>No rates found for this route. <a href="#" onClick={(e) => { e.preventDefault(); setStep(0); }}>Try different parameters</a>.</p>
                    </div>
                  : <RateCards rates={rates} onSelect={handleSelectRate} />
                }
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <button className="btn btn-link p-0 text-muted" onClick={() => setStep(1)}>
                    <i className="bi bi-arrow-left me-1" />Back
                  </button>
                  <h5 className="mb-0 fw-bold">Complete Your Request</h5>
                </div>
                <ContactForm
                  searchParams={searchParams}
                  selectedRate={selectedRate}
                  onSubmit={handleContact}
                  loading={submitting}
                  error={submitError}
                />
              </div>
            )}

            {step === 3 && <Confirmation quoteRef={confirmation?.quoteRef} email={contactEmail} />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-muted small">
        &copy; {new Date().getFullYear()} Reliq Logistics &nbsp;&middot;&nbsp; Powered by Reliq ERP
      </div>
    </div>
  );
}
