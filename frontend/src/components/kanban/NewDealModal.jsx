import { useState } from 'react';
import { Modal, Form, Row, Col, Alert } from 'react-bootstrap';
import { dealsApi } from '../../api';

const MODES = [
  { value: 'sea',        label: 'Sea',        icon: 'bi-water' },
  { value: 'air',        label: 'Air',        icon: 'bi-airplane' },
  { value: 'road',       label: 'Road',       icon: 'bi-truck' },
  { value: 'rail',       label: 'Rail',       icon: 'bi-train-front' },
  { value: 'multimodal', label: 'Multi',      icon: 'bi-diagram-3' },
];

const DIRECTIONS = [
  { value: 'import',     label: 'Import',     icon: 'bi-box-arrow-in-down' },
  { value: 'export',     label: 'Export',     icon: 'bi-box-arrow-up' },
  { value: 'cross_trade',label: 'X-Trade',    icon: 'bi-arrow-left-right' },
  { value: 'domestic',   label: 'Domestic',   icon: 'bi-house' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#6b7280' },
  { value: 'normal', label: 'Normal', color: '#2563eb' },
  { value: 'high',   label: 'High',   color: '#d97706' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'CNY', 'INR'];

const ChipRow = ({ options, value, onChange, colorKey }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {options.map((opt) => {
      const active = value === opt.value;
      const bg = active ? (colorKey ? opt.color : 'var(--brand)') : 'var(--surface-2)';
      const color = active ? '#fff' : 'var(--bs-secondary-color)';
      const border = active
        ? `1.5px solid ${colorKey ? opt.color : 'var(--brand)'}`
        : '1.5px solid var(--border-soft)';
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(active ? '' : opt.value)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: bg, color, border, cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          {opt.icon && <i className={`bi ${opt.icon}`} style={{ fontSize: 11 }}></i>}
          {opt.label}
        </button>
      );
    })}
  </div>
);

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bs-secondary-color)', marginBottom: 7 }}>
    {children}
  </div>
);

const SectionDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-secondary-color)', whiteSpace: 'nowrap' }}>{label}</div>
    <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }}></div>
  </div>
);

const EMPTY = {
  title: '', estimatedValue: '', currency: 'USD', expectedCloseDate: '',
  priority: 'normal', shipmentMode: '', direction: '',
  origin: '', destination: '', cargoDescription: '',
};

const NewDealModal = ({ show, onHide, onCreated }) => {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleChange = (e) => set(e.target.name, e.target.value);

  const reset = () => { setForm(EMPTY); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0 };
      Object.keys(payload).forEach((k) => payload[k] === '' && delete payload[k]);
      const { deal } = await dealsApi.create(payload);
      onCreated(deal);
      reset();
      onHide();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create deal');
    } finally {
      setSubmitting(false);
    }
  };

  const priority = PRIORITIES.find((p) => p.value === form.priority);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      {/* Custom header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0', borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, var(--brand) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', fontSize: 16 }}>
            <i className="bi bi-briefcase-fill"></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>New Deal</div>
            <div style={{ fontSize: 11.5, color: 'var(--bs-secondary-color)' }}>Add a new opportunity to the pipeline</div>
          </div>
        </div>
        <button type="button" onClick={onHide} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--bs-secondary-color)', cursor: 'pointer', lineHeight: 1, padding: 4 }}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '16px 20px 20px' }}>
          {error && <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: 13 }}>{error}</Alert>}

          {/* Deal title */}
          <div className="mb-3">
            <FieldLabel>Deal Title *</FieldLabel>
            <Form.Control
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="e.g. ACME Corp — 10×40HC monthly to Hamburg"
              style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
            />
          </div>

          {/* Value strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 10, marginBottom: 4 }}>
            <div>
              <FieldLabel>Estimated Value</FieldLabel>
              <Form.Control
                type="number" name="estimatedValue" value={form.estimatedValue}
                onChange={handleChange} min="0" step="100"
                placeholder="0"
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
              />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <Form.Select
                name="currency" value={form.currency} onChange={handleChange}
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </Form.Select>
            </div>
            <div>
              <FieldLabel>Expected Close</FieldLabel>
              <Form.Control
                type="date" name="expectedCloseDate" value={form.expectedCloseDate}
                onChange={handleChange}
                style={{ fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
              />
            </div>
          </div>

          <SectionDivider label="Shipment Details" />

          {/* Mode chips */}
          <div className="mb-3">
            <FieldLabel>Transport Mode</FieldLabel>
            <ChipRow options={MODES} value={form.shipmentMode} onChange={(v) => set('shipmentMode', v)} />
          </div>

          {/* Direction chips */}
          <div className="mb-3">
            <FieldLabel>Direction</FieldLabel>
            <ChipRow options={DIRECTIONS} value={form.direction} onChange={(v) => set('direction', v)} />
          </div>

          {/* Route */}
          <Row className="g-2 mb-2">
            <Col>
              <FieldLabel>Origin</FieldLabel>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-geo-alt" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', fontSize: 13, pointerEvents: 'none' }}></i>
                <Form.Control
                  name="origin" value={form.origin} onChange={handleChange}
                  placeholder="Port / city"
                  style={{ fontSize: 13, paddingLeft: 28, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
                />
              </div>
            </Col>
            <Col xs="auto" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
              <i className="bi bi-arrow-right" style={{ color: 'var(--bs-secondary-color)' }}></i>
            </Col>
            <Col>
              <FieldLabel>Destination</FieldLabel>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-geo-alt-fill" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--brand)', fontSize: 13, pointerEvents: 'none' }}></i>
                <Form.Control
                  name="destination" value={form.destination} onChange={handleChange}
                  placeholder="Port / city"
                  style={{ fontSize: 13, paddingLeft: 28, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
                />
              </div>
            </Col>
          </Row>

          <SectionDivider label="Priority & Notes" />

          {/* Priority chips */}
          <div className="mb-3">
            <FieldLabel>Priority</FieldLabel>
            <ChipRow options={PRIORITIES} value={form.priority} onChange={(v) => set('priority', v || 'normal')} colorKey="color" />
          </div>

          {/* Cargo description */}
          <div>
            <FieldLabel>Cargo Description</FieldLabel>
            <Form.Control
              as="textarea" rows={2} name="cargoDescription" value={form.cargoDescription}
              onChange={handleChange} placeholder="Type, volume, special requirements…"
              style={{ fontSize: 13, resize: 'none', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 }}
            />
          </div>
        </Modal.Body>

        <Modal.Footer style={{ padding: '12px 20px', borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Priority preview badge */}
          {priority && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: priority.color, background: priority.color + '18', padding: '3px 10px', borderRadius: 20, border: `1px solid ${priority.color}40` }}>
              {priority.label} Priority
            </span>
          )}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button type="button" className="ss-action-btn" onClick={onHide} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="ss-action-btn ss-action-btn-primary" disabled={submitting}>
              {submitting
                ? <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Creating…</>
                : <><i className="bi bi-plus-lg me-2"></i>Create Deal</>
              }
            </button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewDealModal;
