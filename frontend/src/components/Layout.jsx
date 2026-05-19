import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

/* ── Segmented top-nav mapping ───────────────────────────────── */
const TOP_NAV = [
  { label: 'Overview',   key: 'overview',   route: '/dashboard' },
  { label: 'Operations', key: 'ops',        route: '/shipments' },
  { label: 'Finance',    key: 'finance',    route: '/invoices' },
  { label: 'Clients',    key: 'clients',    route: '/clients' },
];

const resolveTopNav = (pathname) => {
  if (pathname === '/dashboard')                    return 'overview';
  if (pathname.startsWith('/shipments') || pathname === '/pipeline' || pathname === '/tasks' || pathname === '/workflows') return 'ops';
  if (['/invoices','/ar-portal','/ap-portal','/collections','/gl'].includes(pathname)) return 'finance';
  if (pathname.startsWith('/clients'))              return 'clients';
  return null;
};

const ROLE_COLOR = {
  admin: '#ef4444', manager: '#f59e0b', sales: '#3b82f6',
  operations: '#8b5cf6', finance: '#10b981', customer_service: '#06b6d4',
  customer: '#6b7280', agent: '#6b7280',
};

const QUICK_ACTIONS = [
  { to: '/shipments/new', icon: 'bi-plus-circle',  label: 'New Shipment', color: '#1a56db' },
  { to: '/clients?new=1', icon: 'bi-building-add', label: 'Add Client',   color: '#059669' },
  { to: '/invoices',      icon: 'bi-receipt',      label: 'New Invoice',  color: '#7c3aed' },
  { to: '/rates',         icon: 'bi-tags',         label: 'Search Rates', color: '#0891b2' },
];

/* ── Notification helpers ──────────────────────────────────── */
const TYPE_META = {
  shipment_milestone: { icon: 'bi-truck',                     color: '#8b5cf6' },
  invoice_overdue:    { icon: 'bi-exclamation-circle-fill',   color: '#d97706' },
  invoice_sent:       { icon: 'bi-envelope-check-fill',       color: '#2563eb' },
  payment_received:   { icon: 'bi-wallet2',                   color: '#0891b2' },
  deal_stage:         { icon: 'bi-kanban-fill',               color: '#1a56db' },
  demurrage_warning:  { icon: 'bi-exclamation-triangle-fill', color: '#dc2626' },
  ar_alert:           { icon: 'bi-clock-history',             color: '#d97706' },
  portal_quote:       { icon: 'bi-person-lines-fill',         color: '#0891b2' },
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'Yesterday';
  return new Date(date).toLocaleDateString();
};

/* ── User Menu ─────────────────────────────────────────────── */
const UserMenu = ({ user, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const roleColor = ROLE_COLOR[user?.role] || '#1a56db';

  return (
    <div ref={ref} className="user-menu-panel">
      <div className="user-menu-identity">
        <div className="user-menu-avatar-wrap">
          <div className="user-menu-avatar" style={{ background: roleColor }}>{initials}</div>
          <span className="user-menu-online-dot" />
        </div>
        <div className="user-menu-info">
          <div className="user-menu-name">{user?.firstName} {user?.lastName}</div>
          <div className="user-menu-email">{user?.email}</div>
          <span className="user-menu-role-badge" style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="user-menu-divider" />

      <div className="user-menu-items">
        {[
          { icon: 'bi-person-circle', label: 'My Profile',    sub: 'View and edit your details' },
          { icon: 'bi-gear',          label: 'Settings',      sub: 'Preferences & notifications' },
          { icon: 'bi-shield-lock',   label: 'Security',      sub: 'Password & two-factor auth' },
          { icon: 'bi-question-circle',label:'Help & Support', sub: 'Documentation & tickets' },
        ].map(({ icon, label, sub }) => (
          <button key={label} className="user-menu-item" onClick={onClose}>
            <i className={`bi ${icon} user-menu-item-icon`} />
            <div>
              <div className="user-menu-item-label">{label}</div>
              <div className="user-menu-item-sub">{sub}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="user-menu-divider" />

      <div className="user-menu-footer">
        <div className="user-menu-session">
          <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: 7 }} />
          Active session · {user?.branch || 'Head Office'}
        </div>
        <button className="user-menu-logout" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

/* ── Notification Panel ────────────────────────────────────── */
const NotifPanel = ({ onClose }) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="notif-panel">
      <div className="notif-panel-header">
        <div>
          <span className="notif-panel-title">Notifications</span>
          {unreadCount > 0 && <span className="notif-panel-badge">{unreadCount} new</span>}
        </div>
        {unreadCount > 0 && (
          <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">
            <i className="bi bi-bell-slash" style={{ fontSize: 22, marginBottom: 8, display: 'block', opacity: 0.4 }} />
            No notifications yet
          </div>
        ) : notifications.map((n) => {
          const meta = TYPE_META[n.type] || { icon: 'bi-bell', color: '#6b7280' };
          return (
            <div
              key={n._id}
              className={`notif-item${!n.read ? ' unread' : ''}`}
              onClick={() => { if (!n.read) markRead(n._id); }}
            >
              <div className="notif-icon-wrap" style={{ background: `${meta.color}15` }}>
                <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: 16 }} />
              </div>
              <div className="notif-body">
                <div className="notif-text">{n.title}</div>
                {n.body && <div className="notif-sub">{n.body}</div>}
                <div className="notif-time">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <span className="notif-dot" />}
            </div>
          );
        })}
      </div>

      <div className="notif-panel-footer">
        <button className="notif-view-all" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

/* ── Quick Create Panel ────────────────────────────────────── */
const QuickCreatePanel = ({ onClose }) => {
  const navigate = useNavigate();
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="quick-create-panel">
      <div className="quick-create-header">Quick Actions</div>
      <div className="quick-create-grid">
        {QUICK_ACTIONS.map(({ to, icon, label, color }) => (
          <button key={to} className="quick-create-item" onClick={() => { navigate(to); onClose(); }}>
            <div className="quick-create-icon" style={{ background: `${color}15`, color }}>
              <i className={`bi ${icon}`} />
            </div>
            <span className="quick-create-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Layout ────────────────────────────────────────────────── */
const Layout = () => {
  const [showUser,  setShowUser]  = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  const { user }       = useAuth();
  const { unreadCount } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const { pathname }   = useLocation();
  const navigate       = useNavigate();

  const activeTopNav = resolveTopNav(pathname);

  const toggle = (panel) => {
    setShowUser(panel === 'user'  ? (x) => !x : false);
    setShowNotif(panel === 'notif' ? (x) => !x : false);
    setShowQuick(panel === 'quick' ? (x) => !x : false);
  };
  const closeAll = useCallback(() => { setShowUser(false); setShowNotif(false); setShowQuick(false); }, []);

  const anyPanelOpen = showUser || showNotif || showQuick;

  const initials  = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const roleColor = ROLE_COLOR[user?.role] || '#1a56db';

  return (
    <div className="app-shell">
      <Sidebar />

      {anyPanelOpen && <div className="panel-backdrop" onClick={closeAll} />}

      <div className="app-content">
        {/* ── Topbar ── */}
        <header className="app-topbar">
          {/* Segmented nav */}
          <div className="seg-nav">
            {TOP_NAV.map(({ label, key, route }) => (
              <button
                key={key}
                className={activeTopNav === key ? 'active' : ''}
                onClick={() => navigate(route)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Right actions */}
          <div className="topbar-actions">
            {/* Search */}
            <div className="topbar-search d-none d-lg-flex">
              <i className="bi bi-search" style={{ fontSize: 13 }} />
              <input placeholder="Search shipments, clients, invoices…" readOnly />
              <kbd>⌘K</kbd>
            </div>

            {/* Theme toggle */}
            <button className="topbar-icon-btn d-none d-lg-flex" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
              <i className={`bi ${isDark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
            </button>

            {/* Quick create */}
            <div className="topbar-btn-wrap">
              <button
                className={`topbar-action-btn${showQuick ? ' active' : ''}`}
                onClick={() => toggle('quick')}
                title="Quick actions"
              >
                <i className="bi bi-plus-lg" />
              </button>
              {showQuick && <QuickCreatePanel onClose={() => setShowQuick(false)} />}
            </div>

            {/* Notifications */}
            <div className="topbar-btn-wrap">
              <button
                className="topbar-icon-btn"
                onClick={() => toggle('notif')}
                title="Notifications"
                style={{ position: 'relative' }}
              >
                <i className="bi bi-bell" />
                {unreadCount > 0 && (
                  <span className="notif-badge-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>
              {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
            </div>

            {/* Chat */}
            <button className="topbar-icon-btn d-none d-lg-flex" title="Messages">
              <i className="bi bi-chat-dots" />
            </button>

            {/* User pill */}
            <div className="topbar-btn-wrap">
              <button
                className={`user-pill${showUser ? ' active' : ''}`}
                onClick={() => toggle('user')}
                style={{ border: `1px solid ${showUser ? 'var(--border-2)' : 'var(--border)'}` }}
              >
                <div className="avatar" style={{ background: roleColor }}>{initials}</div>
                <div className="d-none d-lg-flex flex-col" style={{ gap: 0 }}>
                  <div className="user-name">{user?.firstName} {user?.lastName?.charAt(0)}.</div>
                  <div className="user-role">{user?.role?.replace('_', ' ')}</div>
                </div>
              </button>
              {showUser && <UserMenu user={user} onClose={() => setShowUser(false)} />}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
