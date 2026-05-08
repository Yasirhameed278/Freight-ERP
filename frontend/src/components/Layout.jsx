import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

const PAGE_META = {
  '/dashboard':     { title: 'Operations Dashboard',    icon: 'bi-speedometer2',    crumbs: [] },
  '/analytics':     { title: 'Analytics',               icon: 'bi-graph-up-arrow',   crumbs: ['Analytics'] },
  '/sales-summary': { title: 'Sales Summary',            icon: 'bi-bar-chart-line',   crumbs: ['Analytics', 'Sales Summary'] },
  '/pipeline':      { title: 'Sales Pipeline',           icon: 'bi-kanban',           crumbs: ['Operations', 'Pipeline'] },
  '/shipments':     { title: 'Shipments',                icon: 'bi-boxes',            crumbs: ['Operations', 'Shipments'] },
  '/invoices':      { title: 'Invoices',                 icon: 'bi-receipt',          crumbs: ['Finance', 'Invoices'] },
  '/ar-portal':     { title: 'AR Portal',                icon: 'bi-wallet2',          crumbs: ['Finance', 'AR Portal'] },
  '/ap-portal':     { title: 'AP Portal',                icon: 'bi-credit-card',      crumbs: ['Finance', 'AP Portal'] },
  '/collections':   { title: 'Collections',              icon: 'bi-alarm',            crumbs: ['Finance', 'Collections'] },
  '/gl':            { title: 'General Ledger',           icon: 'bi-journal-text',     crumbs: ['Finance', 'Ledger'] },
  '/users':         { title: 'User Management',          icon: 'bi-people',           crumbs: ['Admin', 'Users'] },
  '/shipments/new': { title: 'New Shipment',             icon: 'bi-plus-circle',      crumbs: ['Operations', 'Shipments', 'New'] },
  '/clients':       { title: 'Clients',                  icon: 'bi-building',         crumbs: ['CRM', 'Clients'] },
  '/rates':         { title: 'Rate Search',              icon: 'bi-tags',             crumbs: ['Rates'] },
  '/users':         { title: 'User Management',          icon: 'bi-people',           crumbs: ['Admin', 'Users'] },
};

const ROLE_COLOR = {
  admin: '#ef4444', manager: '#f59e0b', sales: '#3b82f6',
  operations: '#8b5cf6', finance: '#10b981', customer_service: '#06b6d4',
  customer: '#6b7280', agent: '#6b7280',
};

/* Quick actions available from the (+) button */
const QUICK_ACTIONS = [
  { to: '/shipments/new', icon: 'bi-plus-circle',  label: 'New Shipment',  color: '#1a56db' },
  { to: '/clients?new=1', icon: 'bi-building-add', label: 'Add Client',    color: '#059669' },
  { to: '/invoices',      icon: 'bi-receipt',      label: 'New Invoice',   color: '#7c3aed' },
  { to: '/rates',         icon: 'bi-tags',         label: 'Search Rates',  color: '#0891b2' },
];

/* ── User Menu Dropdown ────────────────────────────────────── */
const UserMenu = ({ user, onClose }) => {
  const navigate  = useNavigate();
  const { logout } = useAuth();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
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
      {/* User identity block */}
      <div className="user-menu-identity">
        <div className="user-menu-avatar-wrap">
          <div className="user-menu-avatar" style={{ background: roleColor }}>
            {initials}
          </div>
          <span className="user-menu-online-dot"></span>
        </div>
        <div className="user-menu-info">
          <div className="user-menu-name">{user?.firstName} {user?.lastName}</div>
          <div className="user-menu-email">{user?.email}</div>
          <span className="user-menu-role-badge" style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="user-menu-divider"></div>

      {/* Menu items */}
      <div className="user-menu-items">
        <button className="user-menu-item" onClick={onClose}>
          <i className="bi bi-person-circle user-menu-item-icon"></i>
          <div>
            <div className="user-menu-item-label">My Profile</div>
            <div className="user-menu-item-sub">View and edit your details</div>
          </div>
        </button>
        <button className="user-menu-item" onClick={onClose}>
          <i className="bi bi-gear user-menu-item-icon"></i>
          <div>
            <div className="user-menu-item-label">Settings</div>
            <div className="user-menu-item-sub">Preferences & notifications</div>
          </div>
        </button>
        <button className="user-menu-item" onClick={onClose}>
          <i className="bi bi-shield-lock user-menu-item-icon"></i>
          <div>
            <div className="user-menu-item-label">Security</div>
            <div className="user-menu-item-sub">Password & two-factor auth</div>
          </div>
        </button>
        <button className="user-menu-item" onClick={onClose}>
          <i className="bi bi-question-circle user-menu-item-icon"></i>
          <div>
            <div className="user-menu-item-label">Help & Support</div>
            <div className="user-menu-item-sub">Documentation & tickets</div>
          </div>
        </button>
      </div>

      <div className="user-menu-divider"></div>

      {/* Session info + logout */}
      <div className="user-menu-footer">
        <div className="user-menu-session">
          <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: 7 }}></i>
          <span>Active session · {user?.branch || 'Head Office'}</span>
        </div>
        <button className="user-menu-logout" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>
          Sign Out
        </button>
      </div>
    </div>
  );
};

/* ── Notification Panel ────────────────────────────────────── */
const NotifPanel = ({ onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const notifs = [
    { id: 1, icon: 'bi-check-circle-fill',  color: '#16a34a', title: 'Shipment SEA-2024-001 approved',       time: '2m ago',  unread: true },
    { id: 2, icon: 'bi-exclamation-circle-fill', color: '#d97706', title: 'Invoice INV-0042 overdue by 5 days', time: '1h ago',  unread: true },
    { id: 3, icon: 'bi-person-plus-fill',   color: '#1a56db', title: 'New client Acme Corp registered',       time: '3h ago',  unread: true },
    { id: 4, icon: 'bi-truck',              color: '#8b5cf6', title: 'Milestone updated: Cargo Received',     time: '5h ago',  unread: false },
    { id: 5, icon: 'bi-wallet2',            color: '#0891b2', title: 'Payment of $12,400 recorded',          time: 'Yesterday', unread: false },
  ];

  return (
    <div ref={ref} className="notif-panel">
      <div className="notif-panel-header">
        <div>
          <span className="notif-panel-title">Notifications</span>
          <span className="notif-panel-badge">3 new</span>
        </div>
        <button className="notif-mark-all" onClick={onClose}>Mark all read</button>
      </div>
      <div className="notif-list">
        {notifs.map((n) => (
          <div key={n.id} className={`notif-item${n.unread ? ' unread' : ''}`} onClick={onClose}>
            <div className="notif-icon-wrap" style={{ background: `${n.color}15` }}>
              <i className={`bi ${n.icon}`} style={{ color: n.color, fontSize: 16 }}></i>
            </div>
            <div className="notif-body">
              <div className="notif-text">{n.title}</div>
              <div className="notif-time">{n.time}</div>
            </div>
            {n.unread && <span className="notif-dot"></span>}
          </div>
        ))}
      </div>
      <div className="notif-panel-footer">
        <button className="notif-view-all" onClick={onClose}>View all notifications</button>
      </div>
    </div>
  );
};

/* ── Quick Create Panel ────────────────────────────────────── */
const QuickCreatePanel = ({ onClose }) => {
  const navigate = useNavigate();
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="quick-create-panel">
      <div className="quick-create-header">Quick Actions</div>
      <div className="quick-create-grid">
        {QUICK_ACTIONS.map(({ to, icon, label, color }) => (
          <button
            key={to}
            className="quick-create-item"
            onClick={() => { navigate(to); onClose(); }}
          >
            <div className="quick-create-icon" style={{ background: `${color}15`, color }}>
              <i className={`bi ${icon}`}></i>
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
  const [collapsed, setCollapsed]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [showUser, setShowUser]         = useState(false);
  const [showNotif, setShowNotif]       = useState(false);
  const [showQuick, setShowQuick]       = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), []);
  const openMobile     = useCallback(() => setMobileOpen(true),  []);
  const closeMobile    = useCallback(() => setMobileOpen(false), []);

  const meta = PAGE_META[pathname]
    || (pathname.startsWith('/shipments/') ? { title: 'Shipment Detail', icon: 'bi-box', crumbs: ['Operations', 'Shipments', 'Detail'] } : null)
    || (pathname.startsWith('/clients/')   ? { title: 'Client 360',      icon: 'bi-building', crumbs: ['CRM', 'Clients', '360 View'] } : null)
    || { title: 'Freight ERP', icon: 'bi-truck', crumbs: [] };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const roleColor = ROLE_COLOR[user?.role] || '#1a56db';

  const anyPanelOpen = showUser || showNotif || showQuick;

  const toggle = (panel) => {
    setShowUser(panel === 'user' ? (x) => !x : false);
    setShowNotif(panel === 'notif' ? (x) => !x : false);
    setShowQuick(panel === 'quick' ? (x) => !x : false);
  };

  const closeAll = () => { setShowUser(false); setShowNotif(false); setShowQuick(false); };

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      {anyPanelOpen && <div className="panel-backdrop" onClick={closeAll} />}

      <div className={`app-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        {/* ── Topbar ── */}
        <header className="app-topbar">
          {/* Mobile hamburger */}
          <button className="topbar-icon-btn d-lg-none" onClick={openMobile}>
            <i className="bi bi-list"></i>
          </button>

          {/* Desktop sidebar toggle */}
          <button className="topbar-icon-btn d-none d-lg-flex" onClick={toggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <i className={`bi bi-layout-sidebar${collapsed ? '-reverse' : ''}`}></i>
          </button>

          <div className="topbar-page-info" />

          {/* Right actions */}
          <div className="topbar-actions">
            {/* Quick create */}
            <div className="topbar-btn-wrap">
              <button
                className={`topbar-action-btn topbar-quick-btn${showQuick ? ' active' : ''}`}
                onClick={() => toggle('quick')}
                title="Quick actions"
              >
                <i className="bi bi-plus-lg"></i>
              </button>
              {showQuick && <QuickCreatePanel onClose={() => setShowQuick(false)} />}
            </div>

            {/* Notifications */}
            <div className="topbar-btn-wrap">
              <button
                className={`topbar-icon-btn topbar-notif-btn${showNotif ? ' active' : ''}`}
                onClick={() => toggle('notif')}
                title="Notifications"
              >
                <i className="bi bi-bell"></i>
                <span className="notif-badge-dot">3</span>
              </button>
              {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* User avatar button */}
            <div className="topbar-btn-wrap">
              <button
                className={`topbar-avatar-btn${showUser ? ' active' : ''}`}
                onClick={() => toggle('user')}
                title={`${user?.firstName} ${user?.lastName}`}
              >
                <div className="topbar-avatar" style={{ background: roleColor }}>
                  {initials}
                </div>
                <div className="topbar-avatar-caret">
                  <i className={`bi bi-chevron-${showUser ? 'up' : 'down'}`}></i>
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
