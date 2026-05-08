import { useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2', roles: ['admin', 'manager', 'sales', 'operations', 'finance', 'customer_service'] },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { to: '/analytics',      label: 'Analytics',      icon: 'bi-graph-up-arrow', roles: ['admin', 'manager', 'finance', 'operations'] },
      { to: '/sales-summary',  label: 'Sales Summary',  icon: 'bi-bar-chart-line',  roles: ['admin', 'manager', 'finance'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/shipments', label: 'Shipments', icon: 'bi-boxes', roles: ['admin', 'manager', 'operations', 'sales', 'customer_service', 'customer'] },
      { to: '/pipeline',  label: 'Pipeline',  icon: 'bi-kanban', roles: ['admin', 'manager', 'sales', 'operations', 'customer_service'] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/invoices',    label: 'Invoices',       icon: 'bi-receipt',      roles: ['admin', 'manager', 'finance', 'operations', 'customer'] },
      { to: '/ar-portal',  label: 'AR Portal',       icon: 'bi-wallet2',      roles: ['admin', 'manager', 'finance'] },
      { to: '/ap-portal',  label: 'AP Portal',       icon: 'bi-credit-card',  roles: ['admin', 'manager', 'finance'] },
      { to: '/collections',label: 'Collections',     icon: 'bi-alarm',        roles: ['admin', 'manager', 'finance'] },
      { to: '/gl',         label: 'General Ledger',  icon: 'bi-journal-text', roles: ['admin', 'manager', 'finance'] },
    ],
  },
  {
    section: 'CRM',
    items: [
      { to: '/clients', label: 'Clients', icon: 'bi-building', roles: ['admin', 'manager', 'sales', 'operations', 'customer_service', 'finance'] },
    ],
  },
  {
    section: 'Rates',
    items: [
      { to: '/rates', label: 'Rate Search', icon: 'bi-tags', roles: ['admin', 'manager', 'sales', 'operations'] },
    ],
  },
  {
    section: 'Admin',
    items: [
      { to: '/users', label: 'Users', icon: 'bi-people', roles: ['admin', 'manager'] },
    ],
  },
];

const CUSTOMER_NAV = [
  { to: '/shipments', label: 'My Shipments', icon: 'bi-boxes' },
  { to: '/invoices',  label: 'My Invoices',  icon: 'bi-receipt' },
];

const ROLE_COLOR = {
  admin: '#ef4444', manager: '#f59e0b', sales: '#3b82f6',
  operations: '#8b5cf6', finance: '#10b981', customer_service: '#06b6d4',
  customer: '#6b7280', agent: '#6b7280',
};

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState({});

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  const navItems = user?.role === 'customer'
    ? [{ section: 'Menu', items: CUSTOMER_NAV }]
    : NAV.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.roles || item.roles.includes(user?.role)),
      })).filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={onMobileClose}
      />

      <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <a className="sidebar-brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <div className="sidebar-brand-icon" style={{ background: 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)', boxShadow: '0 4px 14px rgba(124,58,237,0.45)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="14" height="3.5" rx="1.5" fill="white"/>
              <rect x="3" y="8.25" width="10" height="3.5" rx="1.5" fill="white" fillOpacity="0.75"/>
              <rect x="3" y="13.5" width="7" height="3.5" rx="1.5" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">
              Freight<span style={{ color: '#7c9ef8', fontWeight: 500 }}>ERP</span>
            </span>
            <span className="sidebar-brand-tagline">Operations Suite</span>
          </div>
        </a>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ section, items }) => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar-item${isActive ? ' active' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                >
                  <i className={`bi ${item.icon} sidebar-item-icon`}></i>
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.badge && <span className="sidebar-item-badge">{item.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer / User */}
        <div className="sidebar-footer">
          <div
            className="sidebar-user-avatar"
            style={{ background: ROLE_COLOR[user?.role] || '#1a56db' }}
          >
            {initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            className="topbar-icon-btn ms-auto"
            style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'transparent' }}
            onClick={handleLogout}
            title="Sign out"
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
