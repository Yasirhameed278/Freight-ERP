/* Reliq — app shell (sidebar + topbar + router) */

const Shell = ({ page, params, setPage, currentTopNav, theme, density, dashVariant }) => {
  const D = window.ReliqData;

  return (
    <div className="app" data-theme={theme} data-density={density}>
      <Rail page={page} setPage={setPage} />
      <div>
        <Topbar page={page} setPage={setPage} currentTopNav={currentTopNav} />
        <PageRouter page={page} params={params} setPage={setPage} dashVariant={dashVariant} />
      </div>
    </div>
  );
};

const Rail = ({ page, setPage }) => {
  const D = window.ReliqData;
  const groups = [
    { label: '', items: D.NAV.filter(n => n.group === 'main') },
    { label: '', items: D.NAV.filter(n => n.group === 'ops') },
    { label: '', items: D.NAV.filter(n => n.group === 'fin') },
    { label: '', items: D.NAV.filter(n => n.group === 'crm') },
    { label: '', items: D.NAV.filter(n => n.group === 'tools') },
  ];

  // expand short forms — match nested pages
  const activeMatch = (key) => {
    if (page === key) return true;
    if (key === 'shipments' && page === 'shipment') return true;
    if (key === 'clients' && page === 'client') return true;
    return false;
  };

  return (
    <aside className="rail">
      <div className="rail-brand" title="Reliq">R</div>
      {groups.map((g, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="rail-section"></div>}
          {g.items.map(item => (
            <button
              key={item.key}
              className={'rail-item' + (activeMatch(item.key) ? ' active' : '')}
              title={item.label}
              onClick={() => setPage(item.key)}
            >
              <i className={`bi ${item.icon}`}></i>
            </button>
          ))}
        </React.Fragment>
      ))}
      <div className="rail-spacer"></div>
      <button className="rail-item" title="Settings"><i className="bi bi-gear"></i></button>
      <button className="rail-item" title="Help"><i className="bi bi-question-circle"></i></button>
    </aside>
  );
};

const Topbar = ({ page, setPage, currentTopNav }) => {
  const D = window.ReliqData;

  const handleTopNav = (key) => {
    const target = D.TOP_NAV.find(t => t.key === key);
    if (target) setPage(target.pages[0]);
  };

  return (
    <div className="topbar">
      <div className="seg-nav">
        {D.TOP_NAV.map(t => (
          <button
            key={t.key}
            className={currentTopNav === t.key ? 'active' : ''}
            onClick={() => handleTopNav(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }}></div>

      <div className="topbar-search">
        <i className="bi bi-search" style={{ fontSize: 13 }}></i>
        <input placeholder="Search shipments, clients, invoices…" />
        <kbd>⌘K</kbd>
      </div>

      <button className="icon-btn" title="Notifications">
        <i className="bi bi-bell"></i>
        <span className="dot"></span>
      </button>
      <button className="icon-btn" title="Messages">
        <i className="bi bi-chat-dots"></i>
      </button>

      <div className="user-pill">
        <div className="avatar">SR</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="user-name">Sajibur R.</div>
          <div className="user-role">Operations Lead</div>
        </div>
      </div>
    </div>
  );
};

/* Router — declarative page dispatch */
const PageRouter = ({ page, params, setPage, dashVariant }) => {
  if (page === 'dashboard') return <Dashboard variant={dashVariant} setPage={setPage} />;
  if (page === 'shipments') return <Shipments setPage={setPage} />;
  if (page === 'shipment')  return <ShipmentDetail id={params?.id} setPage={setPage} />;
  if (page === 'pipeline')  return <Pipeline setPage={setPage} />;
  if (page === 'tasks')     return <Tasks setPage={setPage} />;
  if (page === 'invoices')  return <Invoices setPage={setPage} />;
  if (page === 'ar')        return <ARPortal setPage={setPage} />;
  if (page === 'ap')        return <APPortal setPage={setPage} />;
  if (page === 'collections') return <Collections setPage={setPage} />;
  if (page === 'gl')        return <GL setPage={setPage} />;
  if (page === 'clients')   return <Clients setPage={setPage} />;
  if (page === 'client')    return <Client360 id={params?.id} setPage={setPage} />;
  if (page === 'rates')     return <RateSearch setPage={setPage} />;
  if (page === 'analytics') return <Analytics setPage={setPage} />;
  return <div className="page">Not found</div>;
};

Object.assign(window, { Shell, Rail, Topbar, PageRouter });
