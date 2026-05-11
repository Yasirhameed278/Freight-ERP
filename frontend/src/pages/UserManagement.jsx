import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Alert, Form, Modal, Row, Col } from 'react-bootstrap';
import { usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Constants ────────────────────────────────────────────────── */
const ROLES = ['admin','manager','operations','sales','finance','customer_service','agent'];
const DEPTS = ['operations','sales','finance','customs','documentation','management','it','hr'];

const ROLE_COLOR = {
  admin: '#ef4444', manager: '#f59e0b', operations: '#8b5cf6',
  sales: '#3b82f6', finance: '#10b981', customer_service: '#06b6d4',
  agent: '#6b7280', customer: '#6b7280',
};

const STATUS_CFG = {
  active:    { label: 'Active',    color: '#16a34a', bg: '#dcfce7', dot: true },
  inactive:  { label: 'Inactive',  color: '#6b7280', bg: '#f3f4f6', dot: false },
  suspended: { label: 'Suspended', color: '#dc2626', bg: '#fee2e2', dot: false },
  pending:   { label: 'Pending',   color: '#d97706', bg: '#fef9c3', dot: false },
};

const fmtDate = (d) => {
  if (!d) return 'Never';
  const date = new Date(d);
  const diff = Date.now() - date;
  if (diff < 60_000)    return 'Just now';
  if (diff < 3600_000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/* ── User Modal (create / edit) ───────────────────────────────── */
const UserModal = ({ user: existing, currentRole, onClose, onSaved }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    firstName:  existing?.firstName  || '',
    lastName:   existing?.lastName   || '',
    email:      existing?.email      || '',
    password:   '',
    phone:      existing?.phone      || '',
    role:       existing?.role       || 'operations',
    department: existing?.department || '',
    branch:     existing?.branch     || '',
    status:     existing?.status     || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const payload = { ...form };
      if (isEdit) {
        delete payload.email;
        if (!payload.password) delete payload.password;
        await usersApi.update(existing._id, payload);
      } else {
        await usersApi.create(payload);
      }
      onSaved();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const Label = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--bs-secondary-color)', marginBottom: 5 }}>
      {children}
    </div>
  );

  const fieldStyle = { fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 8 };

  return (
    <Modal show onHide={onClose} size="lg" centered>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${isEdit ? '#1a56db' : '#059669'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isEdit ? '#1a56db' : '#059669', fontSize: 17 }}>
            <i className={`bi ${isEdit ? 'bi-person-gear' : 'bi-person-plus'}`}></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{isEdit ? 'Edit Staff User' : 'Create Staff User'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--bs-secondary-color)' }}>
              {isEdit ? `Editing ${existing.firstName} ${existing.lastName}` : 'Add a new team member'}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--bs-secondary-color)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <Form onSubmit={save}>
        <Modal.Body style={{ padding: '18px 22px 22px' }}>
          {err && <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: 13 }}>{err}</Alert>}

          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--bs-secondary-color)', marginBottom: 10, borderBottom: '1px solid var(--border-soft)', paddingBottom: 6 }}>
            Identity
          </div>
          <Row className="g-3 mb-3">
            <Col sm={6}>
              <Label>First Name *</Label>
              <Form.Control required value={form.firstName} onChange={set('firstName')} style={fieldStyle} />
            </Col>
            <Col sm={6}>
              <Label>Last Name *</Label>
              <Form.Control required value={form.lastName} onChange={set('lastName')} style={fieldStyle} />
            </Col>
            <Col sm={6}>
              <Label>Email *</Label>
              <Form.Control type="email" required value={form.email} onChange={set('email')} disabled={isEdit} style={fieldStyle} />
            </Col>
            <Col sm={6}>
              <Label>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
              <Form.Control
                type="password"
                required={!isEdit}
                placeholder={isEdit ? 'Leave blank to keep current' : ''}
                value={form.password}
                onChange={set('password')}
                style={fieldStyle}
              />
            </Col>
            <Col sm={6}>
              <Label>Phone</Label>
              <Form.Control value={form.phone} onChange={set('phone')} style={fieldStyle} placeholder="+971 4 000 0000" />
            </Col>
            <Col sm={6}>
              <Label>Branch / Office</Label>
              <Form.Control value={form.branch} onChange={set('branch')} placeholder="e.g. Dubai HQ" style={fieldStyle} />
            </Col>
          </Row>

          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--bs-secondary-color)', marginBottom: 10, borderBottom: '1px solid var(--border-soft)', paddingBottom: 6 }}>
            Access & Role
          </div>
          <Row className="g-3">
            <Col sm={isEdit ? 4 : 6}>
              <Label>Role *</Label>
              <Form.Select required value={form.role} onChange={set('role')} style={fieldStyle}>
                {ROLES
                  .filter((r) => currentRole === 'admin' || r !== 'admin')
                  .map((r) => (
                    <option key={r} value={r}>
                      {r.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                    </option>
                  ))}
              </Form.Select>
            </Col>
            <Col sm={isEdit ? 4 : 6}>
              <Label>Department</Label>
              <Form.Select value={form.department} onChange={set('department')} style={fieldStyle}>
                <option value="">— Select —</option>
                {DEPTS.map((d) => (
                  <option key={d} value={d}>{d.replace(/^\w/, c => c.toUpperCase())}</option>
                ))}
              </Form.Select>
            </Col>
            {isEdit && (
              <Col sm={4}>
                <Label>Status</Label>
                <Form.Select value={form.status} onChange={set('status')} style={fieldStyle}>
                  {['active','inactive','suspended','pending'].map((s) => (
                    <option key={s} value={s}>{s.replace(/^\w/, c => c.toUpperCase())}</option>
                  ))}
                </Form.Select>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid var(--border-soft)', padding: '12px 22px', gap: 8 }}>
          <button type="button" className="ss-action-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="ss-action-btn ss-action-btn-primary" disabled={saving}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Saving…</>
              : <><i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-person-plus'} me-2`}></i>{isEdit ? 'Save Changes' : 'Create User'}</>
            }
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

/* ── Deactivate Confirm Modal ─────────────────────────────────── */
const DeactivateModal = ({ user: target, onClose, onSaved }) => {
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState('');

  const confirm = async () => {
    setConfirming(true); setErr('');
    try {
      await usersApi.deactivate(target._id);
      onSaved();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to deactivate');
    } finally { setConfirming(false); }
  };

  return (
    <Modal show onHide={onClose} centered size="sm">
      <div style={{ padding: '20px 22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 17 }}>
            <i className="bi bi-person-x"></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Deactivate User</div>
            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>This action can be reversed later</div>
          </div>
        </div>
        {err && <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: 13 }}>{err}</Alert>}
        <p style={{ fontSize: 13, color: 'var(--bs-body-color)', margin: 0 }}>
          Deactivate <strong>{target.firstName} {target.lastName}</strong>? They will no longer be able to sign in.
        </p>
      </div>
      <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="ss-action-btn" onClick={onClose} disabled={confirming}>Cancel</button>
        <button
          className="ss-action-btn"
          style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
          onClick={confirm}
          disabled={confirming}
        >
          {confirming
            ? <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Deactivating…</>
            : <><i className="bi bi-person-x me-2"></i>Deactivate</>
          }
        </button>
      </div>
    </Modal>
  );
};

/* ── Filter Dropdown ──────────────────────────────────────────── */
const FilterDropdown = ({ roleFilter, statusFilter, onRole, onStatus, onClear, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="um-filter-dropdown">
      <div className="um-filter-section">
        <div className="um-filter-label">Role</div>
        <div className="um-filter-chips">
          {ROLES.map((r) => (
            <button
              key={r}
              className={`um-filter-chip${roleFilter === r ? ' active' : ''}`}
              style={roleFilter === r
                ? { background: ROLE_COLOR[r], color: '#fff', borderColor: ROLE_COLOR[r] }
                : { borderColor: `${ROLE_COLOR[r]}50`, color: ROLE_COLOR[r] }
              }
              onClick={() => onRole(roleFilter === r ? '' : r)}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="um-filter-divider" />
      <div className="um-filter-section">
        <div className="um-filter-label">Status</div>
        <div className="um-filter-chips">
          {['active','inactive','suspended','pending'].map((s) => (
            <button
              key={s}
              className={`um-filter-chip${statusFilter === s ? ' active' : ''}`}
              onClick={() => onStatus(statusFilter === s ? '' : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {(roleFilter || statusFilter) && (
        <>
          <div className="um-filter-divider" />
          <button className="um-filter-clear" onClick={onClear}>
            <i className="bi bi-x-circle me-1"></i>Clear all filters
          </button>
        </>
      )}
    </div>
  );
};

/* ── UserRow ──────────────────────────────────────────────────── */
const UserRow = ({ u, currentUserId, onEdit, onDeactivate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const roleColor = ROLE_COLOR[u.role] || '#1a56db';
  const sc = STATUS_CFG[u.status] || { label: u.status, color: '#6b7280', bg: '#f3f4f6', dot: false };

  return (
    <div className="um-user-row">
      {/* Avatar */}
      <div className="um-avatar" style={{ background: roleColor }}>
        {u.firstName?.[0]}{u.lastName?.[0]}
      </div>

      {/* Name / email */}
      <div className="um-user-info">
        <div className="um-user-name">{u.firstName} {u.lastName}</div>
        <div className="um-user-email">{u.email}</div>
      </div>

      {/* Role badge */}
      <div className="um-cell um-cell-role">
        <span className="um-role-badge" style={{ background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, display: 'inline-block', marginRight: 5, flexShrink: 0 }}></span>
          {u.role?.replace('_', ' ')}
        </span>
      </div>

      {/* Department */}
      <div className="um-cell um-cell-dept">
        {u.department
          ? <span className="um-tag">{u.department}</span>
          : <span className="text-muted" style={{ fontSize: 12 }}>—</span>
        }
      </div>

      {/* Last login */}
      <div className="um-cell um-cell-login">
        <span style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>
          <i className="bi bi-clock me-1 opacity-40"></i>{fmtDate(u.lastLogin)}
        </span>
      </div>

      {/* Status */}
      <div className="um-cell um-cell-status">
        <span className="um-status-badge" style={{ background: sc.bg, color: sc.color }}>
          {sc.dot && <span className="um-status-dot" style={{ background: sc.color }}></span>}
          {sc.label}
        </span>
      </div>

      {/* Overflow menu */}
      <div className="um-cell um-cell-actions" ref={menuRef}>
        <button className="um-more-btn" onClick={() => setMenuOpen((x) => !x)} title="Actions">
          <i className="bi bi-three-dots"></i>
        </button>
        {menuOpen && (
          <div className="um-row-menu">
            <button className="um-row-menu-item" onClick={() => { onEdit(u); setMenuOpen(false); }}>
              <i className="bi bi-pencil"></i>Edit user
            </button>
            {u.status === 'active' && u._id !== currentUserId && (
              <button className="um-row-menu-item um-row-menu-item-danger" onClick={() => { onDeactivate(u); setMenuOpen(false); }}>
                <i className="bi bi-person-x"></i>Deactivate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────────── */
const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [roleFilter, setRole]     = useState('');
  const [statusFilter, setStatus] = useState('active');
  const [showFilter, setShowFilter] = useState(false);
  const [editTarget, setEdit]     = useState(null);
  const [deactivateTarget, setDeactivate] = useState(null);
  const [showCreate, setCreate]   = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await usersApi.list({ limit: 100, search, role: roleFilter, status: statusFilter || undefined });
      setUsers(res.items || []);
    } catch (ex) {
      setError(ex.response?.data?.message || 'Failed to load users');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, roleFilter, statusFilter]);

  const activeFilterCount = (roleFilter ? 1 : 0) + (statusFilter ? 1 : 0);
  const totalActive = users.filter((u) => u.status === 'active').length;

  if (loading) {
    return (
      <div className="ss-loading" style={{ minHeight: 400 }}>
        <div className="dashboard-loader">
          <div className="dashboard-loader-ring"></div>
          <i className="bi bi-people dashboard-loader-icon"></i>
        </div>
        <span>Loading users…</span>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <div className="ss-page-header-icon"><i className="bi bi-people"></i></div>
          <div>
            <h4 className="ss-page-title">User Management</h4>
            <div className="ss-page-sub">
              <span style={{ fontWeight: 700, color: 'var(--bs-body-color)' }}>{totalActive}</span> active ·{' '}
              <span style={{ fontWeight: 700, color: 'var(--bs-body-color)' }}>{users.length}</span> total staff accounts
            </div>
          </div>
        </div>
        <button className="ss-action-btn ss-action-btn-primary" onClick={() => setCreate(true)}>
          <i className="bi bi-person-plus me-2"></i>New User
        </button>
      </div>

      {error && <div className="alert alert-danger mb-4" style={{ fontSize: 13 }}>{error}</div>}

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="um-toolbar">
        {/* Search */}
        <div className="um-search-box">
          <i className="bi bi-search um-search-icon"></i>
          <input
            className="um-search-input"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="um-search-clear" onClick={() => setSearch('')}>
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

        {/* Filter button + dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className={`um-filter-btn${activeFilterCount > 0 ? ' has-filters' : ''}`}
            onClick={() => setShowFilter((x) => !x)}
          >
            <i className="bi bi-sliders2"></i>
            Filters
            {activeFilterCount > 0 && (
              <span className="um-filter-count">{activeFilterCount}</span>
            )}
          </button>
          {showFilter && (
            <FilterDropdown
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              onRole={setRole}
              onStatus={setStatus}
              onClear={() => { setRole(''); setStatus(''); }}
              onClose={() => setShowFilter(false)}
            />
          )}
        </div>

        {/* Active filter chips */}
        {roleFilter && (
          <span
            className="um-active-chip"
            style={{ background: `${ROLE_COLOR[roleFilter]}15`, color: ROLE_COLOR[roleFilter], borderColor: `${ROLE_COLOR[roleFilter]}35` }}
          >
            {roleFilter.replace('_', ' ')}
            <button onClick={() => setRole('')}><i className="bi bi-x"></i></button>
          </span>
        )}
        {statusFilter && (
          <span className="um-active-chip">
            {statusFilter}
            <button onClick={() => setStatus('')}><i className="bi bi-x"></i></button>
          </span>
        )}

        <span className="um-toolbar-count">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── User Table ──────────────────────────────────────────── */}
      <div className="erp-card">
        <div className="um-table-header">
          <div style={{ width: 44 }}></div>
          <div className="um-th um-th-name">Name / Email</div>
          <div className="um-th um-th-role">Role</div>
          <div className="um-th um-th-dept">Department</div>
          <div className="um-th um-th-login">Last Login</div>
          <div className="um-th um-th-status">Status</div>
          <div className="um-th um-th-actions"></div>
        </div>

        {users.length === 0 ? (
          <div className="dash-empty-state" style={{ padding: '56px 20px' }}>
            <i className="bi bi-people" style={{ fontSize: 40, opacity: 0.2 }}></i>
            <span>No users found</span>
            <button className="ss-action-btn ss-action-btn-primary mt-2" onClick={() => setCreate(true)}>
              <i className="bi bi-person-plus me-2"></i>Create First User
            </button>
          </div>
        ) : (
          <div>
            {users.map((u) => (
              <UserRow
                key={u._id}
                u={u}
                currentUserId={currentUser?._id}
                onEdit={setEdit}
                onDeactivate={setDeactivate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editTarget) && (
        <UserModal
          user={editTarget || null}
          currentRole={currentUser?.role}
          onClose={() => { setCreate(false); setEdit(null); }}
          onSaved={() => { setCreate(false); setEdit(null); load(); }}
        />
      )}
      {deactivateTarget && (
        <DeactivateModal
          user={deactivateTarget}
          onClose={() => setDeactivate(null)}
          onSaved={() => { setDeactivate(null); load(); }}
        />
      )}
    </div>
  );
};

export default UserManagement;
