import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* NAV groups — matches design spec section order */
const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2', roles: ['admin','manager','sales','operations','finance','customer_service'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/shipments', label: 'Shipments',  icon: 'bi-boxes',         roles: ['admin','manager','operations','sales','customer_service','customer'] },
      { to: '/pipeline',  label: 'Pipeline',   icon: 'bi-kanban',        roles: ['admin','manager','sales','operations','customer_service'] },
      { to: '/tasks',     label: 'Tasks',      icon: 'bi-check2-square', roles: ['admin','manager','sales','operations','finance','customer_service'] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/invoices',    label: 'Invoices',       icon: 'bi-receipt',      roles: ['admin','manager','finance','operations','customer'] },
      { to: '/ar-portal',  label: 'AR Portal',       icon: 'bi-wallet2',      roles: ['admin','manager','finance'] },
      { to: '/ap-portal',  label: 'AP Portal',       icon: 'bi-credit-card',  roles: ['admin','manager','finance'] },
      { to: '/collections',label: 'Collections',     icon: 'bi-alarm',        roles: ['admin','manager','finance'] },
      { to: '/gl',         label: 'General Ledger',  icon: 'bi-journal-text', roles: ['admin','manager','finance'] },
    ],
  },
  {
    section: 'CRM',
    items: [
      { to: '/clients', label: 'Clients', icon: 'bi-building', roles: ['admin','manager','sales','operations','customer_service','finance'] },
    ],
  },
  {
    section: 'Tools',
    items: [
      { to: '/rates',      label: 'Rate Search',    icon: 'bi-tags',           roles: ['admin','manager','sales','operations'] },
      { to: '/workflows',  label: 'Workflow Rules', icon: 'bi-diagram-3',      roles: ['admin','manager'] },
      { to: '/users',      label: 'Users',          icon: 'bi-people',         roles: ['admin','manager'] },
    ],
  },
];

const CUSTOMER_NAV = [
  { to: '/shipments', label: 'My Shipments', icon: 'bi-boxes' },
  { to: '/invoices',  label: 'My Invoices',  icon: 'bi-receipt' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navGroups = user?.role === 'customer'
    ? [{ section: 'Menu', items: CUSTOMER_NAV }]
    : NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.roles || item.roles.includes(user?.role)),
      })).filter((group) => group.items.length > 0);

  return (
    <aside className="app-sidebar">
      {/* Brand logo */}
      <a
        className="sidebar-brand"
        href="/dashboard"
        title="Reliq"
        onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
      >
        <div className="sidebar-brand-icon">
          <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0"  y="13" width="3" height="7"  rx="0.5" fill="rgba(255,255,255,0.30)"/>
            <rect x="4"  y="8"  width="3" height="12" rx="0.5" fill="rgba(255,255,255,0.55)"/>
            <rect x="8"  y="2"  width="3" height="18" rx="0.5" fill="rgba(255,255,255,0.85)"/>
            <rect x="12" y="0"  width="3" height="20" rx="0.5" fill="#F97316"/>
            <rect x="16" y="5"  width="3" height="15" rx="0.5" fill="rgba(255,255,255,0.50)"/>
            <rect x="20" y="11" width="3" height="9"  rx="0.5" fill="rgba(255,255,255,0.25)"/>
          </svg>
        </div>
      </a>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navGroups.map(({ section, items }, gi) => (
          <div key={section} style={{ display: 'contents' }}>
            {gi > 0 && <div className="sidebar-section-label" />}
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                title={item.label}
              >
                <i className={`bi ${item.icon}`} />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

    </aside>
  );
};

export default Sidebar;
