import { useEffect, useState, useRef } from 'react';
import { usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Constants ────────────────────────────────────────────────── */
const ROLES = ['admin','manager','operations','sales','finance','customer_service','agent'];
const DEPTS = ['operations','sales','finance','customs','documentation','management','it','hr'];

const ROLE_COLOR = {
  admin:            { bg: '#fee2e2', fg: '#dc2626' },
  manager:          { bg: '#fef9c3', fg: '#ca8a04' },
  operations:       { bg: '#ede9fe', fg: '#7c3aed' },
  sales:            { bg: '#dbeafe', fg: '#1d4ed8' },
  finance:          { bg: '#dcfce7', fg: '#16a34a' },
  customer_service: { bg: '#e0f2fe', fg: '#0891b2' },
  agent:            { bg: '#f3f4f6', fg: '#6b7280' },
};

const STATUS_CFG = {
  active:    { label: 'Active',    color: '#16a34a', bg: '#dcfce7' },
  inactive:  { label: 'Inactive',  color: '#6b7280', bg: '#f3f4f6' },
  suspended: { label: 'Suspended', color: '#dc2626', bg: '#fee2e2' },
  pending:   { label: 'Pending',   color: '#ca8a04', bg: '#fef9c3' },
};

const AVATAR_PAL = [
  { bg: '#FFEFE8', fg: '#FF7A45' }, { bg: '#EDE9FE', fg: '#7C3AED' },
  { bg: '#DBEAFE', fg: '#1D4ED8' }, { bg: '#DCFCE7', fg: '#16A34A' },
  { bg: '#FEF9C3', fg: '#CA8A04' }, { bg: '#FEE2E2', fg: '#DC2626' },
  { bg: '#E0F2FE', fg: '#0891B2' },
];
const avatarPal = (name = '') => AVATAR_PAL[(name.charCodeAt(0) || 0) % AVATAR_PAL.length];

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

const roleFmt = (r) => r?.replace(/_/g, ' ') ?? '—';
const capFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

/* ── Inline modal shell ───────────────────────────────────────── */
const ModalShell = ({ children, onClose, width = 620 }) => (
  <>
    <div className="um-backdrop" onClick={onClose} />
    <div className="um-modal-center">
      <div className="um-modal" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  </>
);

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

  const iconBg = isEdit ? '#1a56db' : '#059669';

  return (
    <ModalShell onClose={onClose}>
      <div className="um-modal-header">
        <div className="um-modal-title-row">
          <div className="um-modal-icon" style={{ background: `${iconBg}18`, color: iconBg }}>
            <i className={`bi ${isEdit ? 'bi-person-gear' : 'bi-person-plus'}`}></i>
          </div>
          <div>
            <div className="um-modal-title">{isEdit ? 'Edit Staff User' : 'Create Staff User'}</div>
            <div className="um-modal-sub">
              {isEdit ? `Editing ${existing.firstName} ${existing.lastName}` : 'Add a new team member'}
            </div>
          </div>
        </div>
        <button className="um-modal-close" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>

      <form onSubmit={save}>
        <div className="um-modal-body">
          {err && <div className="um-error">{err}</div>}

          <div className="um-section-label">Identity</div>
          <div className="um-form-grid">
            <div>
              <div className="um-field-label">First Name *</div>
              <input className="um-input" required value={form.firstName} onChange={set('firstName')} />
            </div>
            <div>
              <div className="um-field-label">Last Name *</div>
              <input className="um-input" required value={form.lastName} onChange={set('lastName')} />
            </div>
            <div>
              <div className="um-field-label">Email *</div>
              <input className="um-input" type="email" required value={form.email} onChange={set('email')} disabled={isEdit} />
            </div>
            <div>
              <div className="um-field-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</div>
              <input
                className="um-input"
                type="password"
                required={!isEdit}
                placeholder={isEdit ? 'Leave blank to keep current' : ''}
                value={form.password}
                onChange={set('password')}
              />
            </div>
            <div>
              <div className="um-field-label">Phone</div>
              <input className="um-input" value={form.phone} onChange={set('phone')} placeholder="+971 4 000 0000" />
            </div>
            <div>
              <div className="um-field-label">Branch / Office</div>
              <input className="um-input" value={form.branch} onChange={set('branch')} placeholder="e.g. Dubai HQ" />
            </div>
          </div>

          <div className="um-section-label" style={{ marginTop: 20 }}>Access & Role</div>
          <div className="um-form-grid">
            <div>
              <div className="um-field-label">Role *</div>
              <select className="um-select" required value={form.role} onChange={set('role')}>
                {ROLES
                  .filter((r) => currentRole === 'admin' || r !== 'admin')
                  .map((r) => (
                    <option key={r} value={r}>{capFirst(roleFmt(r))}</option>
                  ))}
              </select>
            </div>
            <div>
              <div className="um-field-label">Department</div>
              <select className="um-select" value={form.department} onChange={set('department')}>
                <option value="">— Select —</option>
                {DEPTS.map((d) => (
                  <option key={d} value={d}>{capFirst(d)}</option>
                ))}
              </select>
            </div>
            {isEdit && (
              <div>
                <div className="um-field-label">Status</div>
                <select className="um-select" value={form.status} onChange={set('status')}>
                  {['active','inactive','suspended','pending'].map((s) => (
                    <option key={s} value={s}>{capFirst(s)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="um-modal-footer">
          <button type="button" className="um-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="um-btn um-btn-primary" disabled={saving}>
            {saving
              ? <><span className="um-spinner"></span>Saving…</>
              : <><i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-person-plus'} me-1`}></i>{isEdit ? 'Save Changes' : 'Create User'}</>
            }
          </button>
        </div>
      </form>
    </ModalShell>
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
    <ModalShell onClose={onClose} width={420}>
      <div className="um-modal-header">
        <div className="um-modal-title-row">
          <div className="um-modal-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <i className="bi bi-person-x"></i>
          </div>
          <div>
            <div className="um-modal-title">Deactivate User</div>
            <div className="um-modal-sub">This action can be reversed later</div>
          </div>
        </div>
        <button className="um-modal-close" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <div className="um-modal-body">
        {err && <div className="um-error">{err}</div>}
        <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
          Deactivate <strong>{target.firstName} {target.lastName}</strong>? They will no longer be able to sign in.
        </p>
      </div>
      <div className="um-modal-footer">
        <button className="um-btn" onClick={onClose} disabled={confirming}>Cancel</button>
        <button
          className="um-btn"
          style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
          onClick={confirm}
          disabled={confirming}
        >
          {confirming
            ? <><span className="um-spinner" style={{ borderTopColor: '#fff' }}></span>Deactivating…</>
            : <><i className="bi bi-person-x me-1"></i>Deactivate</>
          }
        </button>
      </div>
    </ModalShell>
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
              onClick={() => onRole(roleFilter === r ? '' : r)}
            >
              {roleFmt(r)}
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

  const sc   = STATUS_CFG[u.status] || { label: u.status, color: '#6b7280', bg: '#f3f4f6' };
  const rc   = ROLE_COLOR[u.role]   || { bg: '#f3f4f6', fg: '#6b7280' };
  const pal  = avatarPal(u.firstName);
  const initials = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="um-user-row">
      {/* Name + avatar */}
      <div className="um-cell-name">
        <div className="um-avatar" style={{ background: pal.bg, color: pal.fg }}>{initials}</div>
        <div>
          <div className="um-user-name">{u.firstName} {u.lastName}</div>
          {u.department && <div className="um-user-dept">{capFirst(u.department)}</div>}
        </div>
      </div>

      {/* Email */}
      <div className="um-cell um-cell-email">{u.email}</div>

      {/* Role */}
      <div className="um-cell">
        <span className="um-role-chip" style={{ background: rc.bg, color: rc.fg }}>
          {roleFmt(u.role)}
        </span>
      </div>

      {/* Last login */}
      <div className="um-cell um-cell-login">
        <i className="bi bi-clock me-1" style={{ opacity: .4, fontSize: 11 }}></i>
        {fmtDate(u.lastLogin)}
      </div>

      {/* Status */}
      <div className="um-cell">
        <span className="um-status-badge" style={{ background: sc.bg, color: sc.color }}>
          <span className="um-status-dot" style={{ background: sc.color }}></span>
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
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [roleFilter, setRole]       = useState('');
  const [statusFilter, setStatus]   = useState('active');
  const [showFilter, setShowFilter] = useState(false);
  const [editTarget, setEdit]       = useState(null);
  const [deactivateTarget, setDeactivate] = useState(null);
  const [showCreate, setCreate]     = useState(false);

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

  if (loading) {
    return (
      <div className="um-shell">
        <div className="um-loading">
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring"></div>
            <i className="bi bi-people dashboard-loader-icon"></i>
          </div>
          <span>Loading users…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="um-shell">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="um-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <i className="bi bi-people" style={{ fontSize: 18, color: 'var(--muted)' }}></i>
          </div>
          <h1 className="um-title">User Management</h1>
          <div className="um-subtitle">{users.length} team member{users.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="um-btn um-btn-primary" onClick={() => setCreate(true)}>
          <i className="bi bi-person-plus me-1"></i>New User
        </button>
      </div>

      {error && <div className="um-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="um-toolbar">
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

        {roleFilter && (
          <span className="um-active-chip">
            {roleFmt(roleFilter)}
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

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="um-table-wrap">
        <div className="um-table-header">
          <div className="um-th um-th-name">Name</div>
          <div className="um-th um-th-email">Email</div>
          <div className="um-th um-th-role">Role</div>
          <div className="um-th um-th-login">Last Login</div>
          <div className="um-th um-th-status">Status</div>
          <div className="um-th um-th-actions"></div>
        </div>

        {users.length === 0 ? (
          <div className="um-empty">
            <i className="bi bi-people" style={{ fontSize: 40, opacity: .18 }}></i>
            <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>No users found</div>
            <button className="um-btn um-btn-primary" onClick={() => setCreate(true)}>
              <i className="bi bi-person-plus me-1"></i>Create First User
            </button>
          </div>
        ) : (
          users.map((u) => (
            <UserRow
              key={u._id}
              u={u}
              currentUserId={currentUser?._id}
              onEdit={setEdit}
              onDeactivate={setDeactivate}
            />
          ))
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
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
