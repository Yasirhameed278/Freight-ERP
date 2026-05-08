import { useState } from 'react';
import { Row, Col, Badge, Form, Button, Modal, Alert } from 'react-bootstrap';

/* ── Default chart of accounts (freight industry standard) ── */
const DEFAULT_COA = [
  {
    group: 'Assets',
    code: '1000',
    color: '#1a56db',
    accounts: [
      { code: '1010', name: 'Cash in Hand',          type: 'asset', balance: 0 },
      { code: '1020', name: 'Bank Account – Main',   type: 'asset', balance: 0 },
      { code: '1030', name: 'Bank Account – FX',     type: 'asset', balance: 0 },
      { code: '1100', name: 'Accounts Receivable',   type: 'asset', balance: 0 },
      { code: '1110', name: 'PDC Receivable',        type: 'asset', balance: 0 },
      { code: '1200', name: 'Advances to Staff',     type: 'asset', balance: 0 },
      { code: '1300', name: 'Security Deposits',     type: 'asset', balance: 0 },
      { code: '1400', name: 'Prepaid Expenses',      type: 'asset', balance: 0 },
      { code: '1900', name: 'Fixed Assets',          type: 'asset', balance: 0 },
    ],
  },
  {
    group: 'Liabilities',
    code: '2000',
    color: '#dc2626',
    accounts: [
      { code: '2010', name: 'Accounts Payable',      type: 'liability', balance: 0 },
      { code: '2020', name: 'PDC Payable',           type: 'liability', balance: 0 },
      { code: '2100', name: 'Accrued Expenses',      type: 'liability', balance: 0 },
      { code: '2200', name: 'VAT Payable',           type: 'liability', balance: 0 },
      { code: '2300', name: 'Employee Benefits',     type: 'liability', balance: 0 },
      { code: '2400', name: 'Provisions',            type: 'liability', balance: 0 },
    ],
  },
  {
    group: 'Capital',
    code: '3000',
    color: '#7c3aed',
    accounts: [
      { code: '3010', name: 'Share Capital',         type: 'equity', balance: 0 },
      { code: '3020', name: 'Partner Investment',    type: 'equity', balance: 0 },
      { code: '3100', name: 'Retained Earnings',     type: 'equity', balance: 0 },
      { code: '3200', name: 'Drawings',              type: 'equity', balance: 0 },
    ],
  },
  {
    group: 'Revenue',
    code: '4000',
    color: '#16a34a',
    accounts: [
      { code: '4010', name: 'Sea Freight Revenue',   type: 'revenue', balance: 0 },
      { code: '4020', name: 'Air Freight Revenue',   type: 'revenue', balance: 0 },
      { code: '4030', name: 'Road Freight Revenue',  type: 'revenue', balance: 0 },
      { code: '4040', name: 'Handling Revenue',      type: 'revenue', balance: 0 },
      { code: '4050', name: 'Customs Revenue',       type: 'revenue', balance: 0 },
      { code: '4060', name: 'Documentation Fees',    type: 'revenue', balance: 0 },
      { code: '4070', name: 'Storage / Demurrage',   type: 'revenue', balance: 0 },
      { code: '4900', name: 'Other Income',          type: 'revenue', balance: 0 },
    ],
  },
  {
    group: 'Cost of Sales',
    code: '5000',
    color: '#d97706',
    accounts: [
      { code: '5010', name: 'Ocean Freight Cost',    type: 'expense', balance: 0 },
      { code: '5020', name: 'Air Freight Cost',      type: 'expense', balance: 0 },
      { code: '5030', name: 'Trucking Cost',         type: 'expense', balance: 0 },
      { code: '5040', name: 'Port Handling Cost',    type: 'expense', balance: 0 },
      { code: '5050', name: 'Customs Duty',          type: 'expense', balance: 0 },
      { code: '5060', name: 'Agency Fees',           type: 'expense', balance: 0 },
    ],
  },
  {
    group: 'Operating Expenses',
    code: '6000',
    color: '#6b7280',
    accounts: [
      { code: '6010', name: 'Salaries & Wages',      type: 'expense', balance: 0 },
      { code: '6020', name: 'Rent & Utilities',      type: 'expense', balance: 0 },
      { code: '6030', name: 'Communication',         type: 'expense', balance: 0 },
      { code: '6040', name: 'Office Supplies',       type: 'expense', balance: 0 },
      { code: '6050', name: 'Travel & Entertainment',type: 'expense', balance: 0 },
      { code: '6060', name: 'Bank Charges',          type: 'expense', balance: 0 },
      { code: '6070', name: 'Depreciation',          type: 'expense', balance: 0 },
      { code: '6900', name: 'Miscellaneous',         type: 'expense', balance: 0 },
    ],
  },
];

const TYPE_BADGE = {
  asset: { bg: '#dbeafe', color: '#1e40af', label: 'Asset' },
  liability: { bg: '#fee2e2', color: '#991b1b', label: 'Liability' },
  equity: { bg: '#ede9fe', color: '#5b21b6', label: 'Equity' },
  revenue: { bg: '#dcfce7', color: '#166534', label: 'Revenue' },
  expense: { bg: '#fef9c3', color: '#854d0e', label: 'Expense' },
};

const emptyVoucher = () => ({
  date: new Date().toISOString().slice(0, 10),
  voucherType: 'journal',
  narration: '',
  reference: '',
  lines: [
    { account: '', debit: '', credit: '', description: '' },
    { account: '', debit: '', credit: '', description: '' },
  ],
});

/* ── Voucher Modal ───────────────────────────────────────────── */
const VoucherModal = ({ onClose, allAccounts }) => {
  const [form, setForm] = useState(emptyVoucher());

  const allAcc = allAccounts || [];

  const addLine = () =>
    setForm((f) => ({ ...f, lines: [...f.lines, { account: '', debit: '', credit: '', description: '' }] }));

  const removeLine = (i) =>
    setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const setLine = (i, updates) =>
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, idx) => (idx === i ? { ...l, ...updates } : l)),
    }));

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.001;

  const fmtAmt = (v) => (v ? parseFloat(v).toFixed(2) : '');

  return (
    <Modal show onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16 }}>New Voucher Entry</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3 mb-3">
          <Col md={4}>
            <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Voucher Type</Form.Label>
            <Form.Select size="sm" value={form.voucherType} onChange={(e) => setForm({ ...form, voucherType: e.target.value })}>
              <option value="journal">Journal Voucher</option>
              <option value="receipt">Receipt Voucher</option>
              <option value="payment">Payment Voucher</option>
              <option value="contra">Contra Voucher</option>
            </Form.Select>
          </Col>
          <Col md={4}>
            <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Date</Form.Label>
            <Form.Control size="sm" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Col>
          <Col md={4}>
            <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Reference</Form.Label>
            <Form.Control size="sm" placeholder="e.g. INV-2025-001" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </Col>
          <Col md={12}>
            <Form.Label style={{ fontSize: 12, fontWeight: 600 }}>Narration</Form.Label>
            <Form.Control size="sm" placeholder="Description of this entry" value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} />
          </Col>
        </Row>

        {/* Lines */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bs-secondary-color)', marginBottom: 6 }}>
          Journal Lines
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-soft)' }}>Account</th>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-soft)' }}>Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-soft)', width: 100 }}>Debit</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-soft)', width: 100 }}>Credit</th>
                <th style={{ width: 32, borderBottom: '1px solid var(--border-soft)' }}></th>
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '6px 6px' }}>
                    <Form.Select size="sm" value={line.account} onChange={(e) => setLine(i, { account: e.target.value })}>
                      <option value="">— Account —</option>
                      {allAcc.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
                    </Form.Select>
                  </td>
                  <td style={{ padding: '6px 6px' }}>
                    <Form.Control size="sm" placeholder="Memo" value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                  </td>
                  <td style={{ padding: '6px 6px' }}>
                    <Form.Control
                      size="sm" type="number" step="0.01" min="0"
                      style={{ textAlign: 'right' }}
                      value={line.debit}
                      onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : line.credit })}
                    />
                  </td>
                  <td style={{ padding: '6px 6px' }}>
                    <Form.Control
                      size="sm" type="number" step="0.01" min="0"
                      style={{ textAlign: 'right' }}
                      value={line.credit}
                      onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : line.debit })}
                    />
                  </td>
                  <td style={{ padding: '6px 4px' }}>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, padding: 2 }} onClick={() => removeLine(i)}>
                      <i className="bi bi-trash3"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '8px 10px', fontSize: 12 }}>
                  <button type="button" onClick={addLine} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    <i className="bi bi-plus me-1"></i>Add Line
                  </button>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13 }}>{fmtAmt(totalDebit)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13 }}>{fmtAmt(totalCredit)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {!balanced && totalDebit > 0 && (
          <Alert variant="warning" className="mt-3 py-2" style={{ fontSize: 12 }}>
            <i className="bi bi-exclamation-triangle me-1"></i>
            Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)} — Debit and Credit must balance.
          </Alert>
        )}
        {balanced && totalDebit > 0 && (
          <Alert variant="success" className="mt-3 py-2" style={{ fontSize: 12 }}>
            <i className="bi bi-check-circle me-1"></i>Entry is balanced.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!balanced || totalDebit === 0} onClick={onClose}>
          <i className="bi bi-check-lg me-1"></i>Post Voucher
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/* ── Add Account Modal ───────────────────────────────────────── */
const AddAccountModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', group: 'Assets' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const GROUPS = ['Assets', 'Liabilities', 'Capital', 'Revenue', 'Cost of Sales', 'Operating Expenses'];
  const TYPES  = [
    { value: 'asset',     label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity',    label: 'Equity' },
    { value: 'revenue',   label: 'Revenue' },
    { value: 'expense',   label: 'Expense' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    onAdd({ ...form, balance: 0 });
    onClose();
  };

  return (
    <Modal show onHide={onClose} centered size="sm">
      <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
          <i className="bi bi-plus-circle me-2" style={{ color: 'var(--brand)' }}></i>Add Account
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '16px 20px' }}>
          <div className="mb-3">
            <Form.Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)' }}>Account Code *</Form.Label>
            <Form.Control
              size="sm" placeholder="e.g. 1050" value={form.code}
              onChange={(e) => set('code', e.target.value)} required
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', fontFamily: 'monospace' }}
            />
          </div>
          <div className="mb-3">
            <Form.Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)' }}>Account Name *</Form.Label>
            <Form.Control
              size="sm" placeholder="e.g. Petty Cash" value={form.name}
              onChange={(e) => set('name', e.target.value)} required
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
            />
          </div>
          <Row className="g-2">
            <Col>
              <Form.Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)' }}>Type</Form.Label>
              <Form.Select size="sm" value={form.type} onChange={(e) => set('type', e.target.value)}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Form.Select>
            </Col>
            <Col>
              <Form.Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)' }}>Group</Form.Label>
              <Form.Select size="sm" value={form.group} onChange={(e) => set('group', e.target.value)}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                {GROUPS.map((g) => <option key={g}>{g}</option>)}
              </Form.Select>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid var(--border-soft)', gap: 8 }}>
          <button type="button" className="ss-action-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ss-action-btn ss-action-btn-primary">
            <i className="bi bi-plus-lg me-1"></i>Add Account
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Edit Account Modal ──────────────────────────────────────── */
const EditAccountModal = ({ account, onClose, onSave }) => {
  const [form, setForm] = useState({ name: account.name, type: account.type });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const TYPES = [
    { value: 'asset',     label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity',    label: 'Equity' },
    { value: 'revenue',   label: 'Revenue' },
    { value: 'expense',   label: 'Expense' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...account, ...form });
    onClose();
  };

  return (
    <Modal show onHide={onClose} centered size="sm">
      <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
          <i className="bi bi-pencil me-2" style={{ color: 'var(--brand)' }}></i>Edit Account
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '16px 20px' }}>
          <div className="mb-3">
            <Form.Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)' }}>Account Code</Form.Label>
            <Form.Control
              size="sm" value={account.code} disabled
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', fontFamily: 'monospace', opacity: 0.6 }}
            />
          </div>
          <div className="mb-3">
            <Form.Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)' }}>Account Name *</Form.Label>
            <Form.Control
              size="sm" value={form.name} onChange={(e) => set('name', e.target.value)} required
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
            />
          </div>
          <div>
            <Form.Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)' }}>Type</Form.Label>
            <Form.Select size="sm" value={form.type} onChange={(e) => set('type', e.target.value)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Form.Select>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid var(--border-soft)', gap: 8 }}>
          <button type="button" className="ss-action-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ss-action-btn ss-action-btn-primary">
            <i className="bi bi-check-lg me-1"></i>Save Changes
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Opening Balances Modal ──────────────────────────────────── */
const OpeningBalancesModal = ({ coa, onClose, onSave }) => {
  const [balances, setBalances] = useState(() => {
    const m = {};
    coa.forEach((g) => g.accounts.forEach((a) => { m[a.code] = a.balance; }));
    return m;
  });

  const setBalance = (code, val) =>
    setBalances((prev) => ({ ...prev, [code]: parseFloat(val) || 0 }));

  const handleSave = () => { onSave(balances); onClose(); };

  return (
    <Modal show onHide={onClose} size="lg" centered>
      <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
          <i className="bi bi-building me-2" style={{ color: 'var(--brand)' }}></i>Opening Balances
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 12 }}>
          Set the opening balance for each account at the start of the fiscal year. Enter positive values for debit balances, negative for credit.
        </div>
        {coa.map((group) => (
          <div key={group.code} className="mb-3">
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: group.color, marginBottom: 6, paddingBottom: 4, borderBottom: `2px solid ${group.color}30` }}>
              {group.code} — {group.group}
            </div>
            {group.accounts.map((acc) => (
              <div key={acc.code} className="d-flex align-items-center gap-3 mb-2">
                <span style={{ fontFamily: 'monospace', fontSize: 12, width: 50, color: 'var(--bs-secondary-color)', flexShrink: 0 }}>{acc.code}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{acc.name}</span>
                <Form.Control
                  size="sm" type="number" step="0.01"
                  value={balances[acc.code] || ''}
                  placeholder="0.00"
                  onChange={(e) => setBalance(acc.code, e.target.value)}
                  style={{ width: 120, textAlign: 'right', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', fontFamily: 'monospace', flexShrink: 0 }}
                />
              </div>
            ))}
          </div>
        ))}
      </Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid var(--border-soft)', gap: 8 }}>
        <button className="ss-action-btn" onClick={onClose}>Cancel</button>
        <button className="ss-action-btn ss-action-btn-primary" onClick={handleSave}>
          <i className="bi bi-check-lg me-1"></i>Save Opening Balances
        </button>
      </Modal.Footer>
    </Modal>
  );
};

/* ── Account Integration Modal ───────────────────────────────── */
const AccountIntegrationModal = ({ allAccounts, onClose }) => {
  const [mapping, setMapping] = useState({
    ar:       '1100',
    ap:       '2010',
    seaRev:   '4010',
    airRev:   '4020',
    roadRev:  '4030',
    seaCost:  '5010',
    airCost:  '5020',
    roadCost: '5030',
    vat:      '2200',
  });

  const setMap = (k, v) => setMapping((m) => ({ ...m, [k]: v }));

  const ROWS = [
    { key: 'ar',      label: 'Accounts Receivable',  icon: 'bi-wallet2',    color: '#1a56db' },
    { key: 'ap',      label: 'Accounts Payable',     icon: 'bi-credit-card',color: '#dc2626' },
    { key: 'vat',     label: 'VAT / Tax Payable',    icon: 'bi-percent',    color: '#7c3aed' },
    { key: 'seaRev',  label: 'Sea Freight Revenue',  icon: 'bi-water',      color: '#0891b2' },
    { key: 'airRev',  label: 'Air Freight Revenue',  icon: 'bi-airplane',   color: '#dc2626' },
    { key: 'roadRev', label: 'Road Freight Revenue', icon: 'bi-truck',      color: '#059669' },
    { key: 'seaCost', label: 'Ocean Freight Cost',   icon: 'bi-water',      color: '#6b7280' },
    { key: 'airCost', label: 'Air Freight Cost',     icon: 'bi-airplane',   color: '#6b7280' },
    { key: 'roadCost',label: 'Trucking Cost',        icon: 'bi-truck',      color: '#6b7280' },
  ];

  return (
    <Modal show onHide={onClose} size="md" centered>
      <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
          <i className="bi bi-link-45deg me-2" style={{ color: 'var(--brand)' }}></i>Account Integration
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 14 }}>
          Map system modules to GL accounts for automatic journal posting.
        </div>
        {ROWS.map(({ key, label, icon, color }) => (
          <div key={key} className="d-flex align-items-center gap-3 mb-2">
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
              <i className={`bi ${icon}`}></i>
            </div>
            <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
            <Form.Select
              size="sm" value={mapping[key]} onChange={(e) => setMap(key, e.target.value)}
              style={{ width: 200, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}
            >
              {allAccounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
            </Form.Select>
          </div>
        ))}
      </Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid var(--border-soft)', gap: 8 }}>
        <button className="ss-action-btn" onClick={onClose}>Cancel</button>
        <button className="ss-action-btn ss-action-btn-primary" onClick={onClose}>
          <i className="bi bi-check-lg me-1"></i>Save Mapping
        </button>
      </Modal.Footer>
    </Modal>
  );
};

/* ── Narration Templates Modal ───────────────────────────────── */
const NarrationTemplatesModal = ({ onClose }) => {
  const [templates, setTemplates] = useState([
    { id: 1, name: 'Sales Invoice',    text: 'Being sales invoice raised for {client} — {reference}' },
    { id: 2, name: 'Payment Received', text: 'Being payment received from {client} via {method} — {reference}' },
    { id: 3, name: 'Vendor Payment',   text: 'Being payment made to {vendor} against {reference}' },
    { id: 4, name: 'Bank Transfer',    text: 'Being bank transfer from {from_account} to {to_account}' },
    { id: 5, name: 'Salary Expense',   text: 'Being salary expense for the month of {month}' },
  ]);
  const [newName, setNewName] = useState('');
  const [newText, setNewText] = useState('');

  const addTemplate = () => {
    if (!newName.trim() || !newText.trim()) return;
    setTemplates((prev) => [...prev, { id: Date.now(), name: newName, text: newText }]);
    setNewName(''); setNewText('');
  };

  const removeTemplate = (id) => setTemplates((prev) => prev.filter((t) => t.id !== id));

  return (
    <Modal show onHide={onClose} size="lg" centered>
      <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
          <i className="bi bi-chat-text me-2" style={{ color: 'var(--brand)' }}></i>Narration Templates
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 14 }}>
          Use <code>{'{placeholder}'}</code> syntax. Available: client, vendor, reference, method, month, from_account, to_account.
        </div>
        <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: 16 }}>
          {templates.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border-soft)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', fontStyle: 'italic' }}>{t.text}</div>
              </div>
              <button onClick={() => removeTemplate(t.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, padding: 2, flexShrink: 0 }}>
                <i className="bi bi-trash3"></i>
              </button>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--bs-secondary-color)', marginBottom: 8 }}>Add Template</div>
          <div className="d-flex gap-2 mb-2">
            <Form.Control size="sm" placeholder="Template name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
          </div>
          <div className="d-flex gap-2">
            <Form.Control size="sm" placeholder="Narration text with {placeholders}" value={newText} onChange={(e) => setNewText(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
            <button className="ss-action-btn ss-action-btn-primary" style={{ flexShrink: 0 }} onClick={addTemplate}>
              <i className="bi bi-plus-lg"></i>
            </button>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid var(--border-soft)', gap: 8 }}>
        <button className="ss-action-btn ss-action-btn-primary" onClick={onClose}>
          <i className="bi bi-check-lg me-1"></i>Done
        </button>
      </Modal.Footer>
    </Modal>
  );
};

/* ── Fiscal Year Modal ───────────────────────────────────────── */
const FiscalYearModal = ({ onClose }) => {
  const curYear = new Date().getFullYear();
  const [fy, setFy] = useState({
    startDate: `${curYear}-01-01`,
    endDate:   `${curYear}-12-31`,
    locked:    false,
    lockDate:  '',
  });

  return (
    <Modal show onHide={onClose} centered size="sm">
      <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Modal.Title style={{ fontSize: 15, fontWeight: 700 }}>
          <i className="bi bi-calendar-range me-2" style={{ color: 'var(--brand)' }}></i>Fiscal Year
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '16px 20px' }}>
        <div className="mb-3">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)', marginBottom: 5 }}>Fiscal Year Start</div>
          <Form.Control size="sm" type="date" value={fy.startDate} onChange={(e) => setFy({ ...fy, startDate: e.target.value })} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
        </div>
        <div className="mb-3">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)', marginBottom: 5 }}>Fiscal Year End</div>
          <Form.Control size="sm" type="date" value={fy.endDate} onChange={(e) => setFy({ ...fy, endDate: e.target.value })} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
        </div>
        <div className="mb-3">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)', marginBottom: 5 }}>Lock Periods Before</div>
          <Form.Control size="sm" type="date" value={fy.lockDate} onChange={(e) => setFy({ ...fy, lockDate: e.target.value })} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }} />
          <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginTop: 4 }}>Vouchers before this date cannot be edited or deleted.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: fy.locked ? '#fee2e225' : 'var(--surface-2)', borderRadius: 8, border: `1px solid ${fy.locked ? '#dc262640' : 'var(--border-soft)'}` }}>
          <Form.Check type="switch" id="fy-lock" checked={fy.locked} onChange={(e) => setFy({ ...fy, locked: e.target.checked })} label="" style={{ margin: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Lock Fiscal Year</div>
            <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>Prevent all posting to this period</div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid var(--border-soft)', gap: 8 }}>
        <button className="ss-action-btn" onClick={onClose}>Cancel</button>
        <button className="ss-action-btn ss-action-btn-primary" onClick={onClose}>
          <i className="bi bi-check-lg me-1"></i>Save Configuration
        </button>
      </Modal.Footer>
    </Modal>
  );
};

/* ── GL Page ─────────────────────────────────────────────────── */
const GL = () => {
  const [activeTab,      setActiveTab]      = useState('coa');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showVoucher,    setShowVoucher]    = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editAcc,        setEditAcc]        = useState(null);
  const [coa,            setCoa]            = useState(DEFAULT_COA);
  const [search,         setSearch]         = useState('');
  const [setupPanel,     setSetupPanel]     = useState(null);

  const allAccounts = coa.flatMap((g) => g.accounts);

  const kpis = (() => {
    const sum = (type) => allAccounts.filter((a) => a.type === type).reduce((s, a) => s + (a.balance || 0), 0);
    const assets      = sum('asset');
    const liabilities = sum('liability');
    const equity      = sum('equity');
    const revenue     = sum('revenue');
    const expenses    = sum('expense');
    return { totalAccounts: allAccounts.length, assets, liabilities, equity, revenue, net: assets - liabilities - equity };
  })();

  const fmtMoney = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

  const toggleGroup = (code) =>
    setExpandedGroups((prev) => ({ ...prev, [code]: !prev[code] }));

  const handleAddAccount = ({ code, name, type, group, balance }) => {
    setCoa((prev) => prev.map((g) =>
      g.group === group
        ? { ...g, accounts: [...g.accounts, { code, name, type, balance }].sort((a, b) => a.code.localeCompare(b.code)) }
        : g
    ));
  };

  const handleEditAccount = (updated) => {
    setCoa((prev) => prev.map((g) => ({
      ...g,
      accounts: g.accounts.map((a) => a.code === updated.code ? { ...a, name: updated.name, type: updated.type } : a),
    })));
  };

  const handleSaveOpeningBalances = (balances) => {
    setCoa((prev) => prev.map((g) => ({
      ...g,
      accounts: g.accounts.map((a) => ({ ...a, balance: balances[a.code] ?? a.balance })),
    })));
  };

  const filteredCOA = search.trim()
    ? coa.map((g) => ({
        ...g,
        accounts: g.accounts.filter(
          (a) =>
            a.code.includes(search) ||
            a.name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.accounts.length > 0)
    : coa;

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-journal-text"></i></div>
          <div>
            <h4 className="ss-page-title">General Ledger</h4>
            <div className="ss-page-sub">Chart of accounts, journal vouchers, and GL configuration</div>
          </div>
        </div>
        {activeTab === 'vouchers' && (
          <button className="ss-action-btn ss-action-btn-primary" onClick={() => setShowVoucher(true)}>
            <i className="bi bi-plus-lg me-2"></i>New Voucher
          </button>
        )}
        {activeTab === 'coa' && (
          <button className="ss-action-btn" onClick={() => {
            const rows = [['Code', 'Account Name', 'Type', 'Group', 'Balance']];
            coa.forEach((g) => g.accounts.forEach((a) => rows.push([a.code, a.name, a.type, g.group, a.balance])));
            const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            const a = document.createElement('a'); a.href = url; a.download = 'chart-of-accounts.csv';
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          }}>
            <i className="bi bi-download me-2"></i>Export
          </button>
        )}
      </div>

      {/* ── KPI Strip ────────────────────────────────────────── */}
      <div className="gl-kpi-strip">
        {[
          { label: 'Total Accounts', value: kpis.totalAccounts, icon: 'bi-list-ul',      color: '#1a56db', isCount: true },
          { label: 'Total Assets',   value: kpis.assets,        icon: 'bi-wallet2',       color: '#16a34a' },
          { label: 'Liabilities',    value: kpis.liabilities,   icon: 'bi-credit-card',   color: '#dc2626' },
          { label: 'Net Position',   value: kpis.net,           icon: 'bi-graph-up-arrow',color: kpis.net >= 0 ? '#16a34a' : '#dc2626' },
          { label: 'Revenue',        value: kpis.revenue,       icon: 'bi-cash-stack',    color: '#7c3aed' },
        ].map(({ label, value, icon, color, isCount }) => (
          <div key={label} className="gl-kpi-tile">
            <div className="gl-kpi-icon" style={{ background: `${color}15`, color }}><i className={`bi ${icon}`}></i></div>
            <div>
              <div className="gl-kpi-value" style={{ color }}>{isCount ? value : fmtMoney(value)}</div>
              <div className="gl-kpi-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <div className="gl-tab-bar">
        {[
          { key: 'coa',      label: 'Chart of Accounts', icon: 'bi-list-ul' },
          { key: 'vouchers', label: 'Voucher Entry',      icon: 'bi-pencil-square' },
          { key: 'setup',    label: 'GL Setup',           icon: 'bi-gear' },
        ].map((t) => (
          <button
            key={t.key}
            className={`gl-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <i className={`bi ${t.icon}`}></i>{t.label}
          </button>
        ))}
      </div>

      {/* ── Chart of Accounts ───────────────────────────────── */}
      {activeTab === 'coa' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
            <Form.Control
              size="sm" placeholder="Search accounts by code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 280, background: 'var(--surface)' }}
            />
            <button className="ss-action-btn ss-action-btn-primary" onClick={() => setShowAddAccount(true)}>
              <i className="bi bi-plus me-2"></i>Add Account
            </button>
          </div>

          <div className="erp-card">
            {/* Table header */}
            <div
              className="d-flex align-items-center px-3 py-2"
              style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border-soft)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bs-secondary-color)' }}
            >
              <div style={{ width: 80 }}>Code</div>
              <div style={{ flex: 1 }}>Account Name</div>
              <div style={{ width: 90 }}>Type</div>
              <div style={{ width: 100, textAlign: 'right' }}>Balance</div>
              <div style={{ width: 60 }}></div>
            </div>

            {filteredCOA.map((group) => {
              const isOpen = expandedGroups[group.code] !== false;
              return (
                <div key={group.code}>
                  {/* Group header */}
                  <div
                    className="d-flex align-items-center px-3 py-2"
                    style={{
                      background: `${group.color}0f`,
                      borderBottom: '1px solid var(--border-soft)',
                      borderLeft: `3px solid ${group.color}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleGroup(group.code)}
                  >
                    <i
                      className={`bi bi-chevron-${isOpen ? 'down' : 'right'} me-2`}
                      style={{ fontSize: 11, color: group.color }}
                    ></i>
                    <span style={{ width: 60, fontFamily: 'monospace', fontSize: 12, color: group.color, fontWeight: 700 }}>{group.code}</span>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: group.color }}>{group.group}</span>
                    <span style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginRight: 12 }}>
                      {group.accounts.length} accounts
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: group.color, width: 100, textAlign: 'right' }}>
                      {fmtMoney(group.accounts.reduce((s, a) => s + (a.balance || 0), 0))}
                    </span>
                    <span style={{ width: 60 }}></span>
                  </div>

                  {/* Account rows */}
                  {isOpen && group.accounts.map((acc) => {
                    const typeCfg = TYPE_BADGE[acc.type] || {};
                    return (
                      <div
                        key={acc.code}
                        className="coa-account-row"
                        style={{ paddingLeft: 40 }}
                      >
                        <div className="coa-account-code">{acc.code}</div>
                        <div className="coa-account-name">{acc.name}</div>
                        <div style={{ width: 90 }}>
                          <span
                            style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 6px',
                              borderRadius: 4, background: typeCfg.bg, color: typeCfg.color,
                            }}
                          >
                            {typeCfg.label}
                          </span>
                        </div>
                        <div className="coa-account-balance text-money" style={{ width: 100 }}>
                          {acc.balance !== 0 ? acc.balance.toFixed(2) : <span className="text-muted">0.00</span>}
                        </div>
                        <div style={{ width: 60, textAlign: 'right' }}>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--bs-secondary-color)', cursor: 'pointer', fontSize: 13, padding: 2 }}
                            title="Edit account"
                            onClick={() => setEditAcc(acc)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Voucher Entry ────────────────────────────────────── */}
      {activeTab === 'vouchers' && (
        <div>
          <div className="erp-card">
            <div className="dash-empty-state" style={{ padding: '64px 20px' }}>
              <i className="bi bi-journal-text" style={{ fontSize: 48, opacity: 0.2 }}></i>
              <span style={{ fontSize: 14 }}>No vouchers posted yet</span>
              <span className="text-muted" style={{ fontSize: 12 }}>Post journal entries, receipt, and payment vouchers here</span>
              <button className="ss-action-btn ss-action-btn-primary mt-2" onClick={() => setShowVoucher(true)}>
                <i className="bi bi-plus-lg me-2"></i>Post First Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Setup ────────────────────────────────────────────── */}
      {activeTab === 'setup' && (
        <Row className="g-3">
          {[
            { key: 'opening',     title: 'Opening Balances',    icon: 'bi-building',      desc: 'Set starting balances for each account at the beginning of the fiscal year.',   color: '#1a56db' },
            { key: 'integration', title: 'Account Integration', icon: 'bi-link-45deg',    desc: 'Map system accounts (AR, AP, Revenue) to GL accounts for automatic posting.',   color: '#7c3aed' },
            { key: 'narration',   title: 'Narration Templates', icon: 'bi-chat-text',     desc: 'Pre-defined narration templates for common voucher types.',                     color: '#059669' },
            { key: 'fiscal',      title: 'Fiscal Year',         icon: 'bi-calendar-range',desc: 'Configure fiscal year start/end dates and lock closed periods.',                color: '#d97706' },
          ].map(({ key, title, icon, desc, color }) => (
            <Col md={6} key={key}>
              <div
                className="erp-card h-100 gl-setup-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setSetupPanel(key)}
              >
                <div className="erp-card-body d-flex gap-3 align-items-start">
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <i className={`bi ${icon}`} style={{ fontSize: 22, color }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                    <div className="text-muted mt-1" style={{ fontSize: 13 }}>{desc}</div>
                  </div>
                  <i className="bi bi-chevron-right" style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 4 }}></i>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {showVoucher && (
        <VoucherModal onClose={() => setShowVoucher(false)} allAccounts={allAccounts} />
      )}
      {showAddAccount && (
        <AddAccountModal onClose={() => setShowAddAccount(false)} onAdd={handleAddAccount} />
      )}
      {editAcc && (
        <EditAccountModal account={editAcc} onClose={() => setEditAcc(null)} onSave={handleEditAccount} />
      )}
      {setupPanel === 'opening' && (
        <OpeningBalancesModal coa={coa} onClose={() => setSetupPanel(null)} onSave={handleSaveOpeningBalances} />
      )}
      {setupPanel === 'integration' && (
        <AccountIntegrationModal allAccounts={allAccounts} onClose={() => setSetupPanel(null)} />
      )}
      {setupPanel === 'narration' && (
        <NarrationTemplatesModal onClose={() => setSetupPanel(null)} />
      )}
      {setupPanel === 'fiscal' && (
        <FiscalYearModal onClose={() => setSetupPanel(null)} />
      )}
    </div>
  );
};

export default GL;
