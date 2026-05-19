import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import KanbanColumn from '../components/kanban/KanbanColumn';
import { ShipmentCardView, cardValue } from '../components/kanban/ShipmentCard';
import { shipmentsApi } from '../api';

const STAGES = [
  { id: 'quote',          label: 'Quote',          color: '#9ca3af' },
  { id: 'booked',         label: 'Booked',         color: '#3b82f6' },
  { id: 'cargo_received', label: 'Cargo Received', color: '#3b82f6' },
  { id: 'customs_export', label: 'Customs Export', color: '#f59e0b' },
  { id: 'in_transit',     label: 'In Transit',     color: '#10b981' },
  { id: 'cleared',        label: 'Cleared',        color: '#10b981' },
];

const STAGE_IDS = new Set(STAGES.map((s) => s.id));

const fmtCompact = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    notation: 'compact', maximumFractionDigits: 0,
  }).format(v || 0);

const FILTERS = [
  { key: 'all',       label: 'All teams',   fn: () => true },
  { key: 'sea_exp',   label: 'Sea Export',  fn: (s) => s.mode === 'sea' && s.direction === 'export' },
  { key: 'sea_imp',   label: 'Sea Import',  fn: (s) => s.mode === 'sea' && s.direction === 'import' },
  { key: 'air',       label: 'Air',         fn: (s) => s.mode === 'air' },
  { key: 'road_rail', label: 'Road & Rail', fn: (s) => ['road', 'rail'].includes(s.mode) },
];

const emptyColumns = () => {
  const c = {};
  STAGES.forEach((s) => { c[s.id] = []; });
  return c;
};

const Kanban = () => {
  const navigate = useNavigate();

  const [columns, setColumns]   = useState(emptyColumns);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter]     = useState('all');
  const [toast, setToast]       = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* Load shipments ────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await shipmentsApi.list({ limit: 300 });
        if (cancelled) return;
        const grouped = emptyColumns();
        for (const s of (data.items || [])) {
          if (STAGE_IDS.has(s.status)) grouped[s.status].push(s);
        }
        setColumns(grouped);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load pipeline');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Filtered view (for display only, DnD still uses raw `columns`) */
  const filterFn = FILTERS.find((f) => f.key === filter)?.fn || (() => true);
  const filteredColumns = useMemo(() => {
    const result = {};
    STAGES.forEach((s) => { result[s.id] = (columns[s.id] || []).filter(filterFn); });
    return result;
  }, [columns, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalJobs  = useMemo(() => Object.values(filteredColumns).flat().length, [filteredColumns]);
  const totalValue = useMemo(
    () => Object.values(filteredColumns).flat().reduce((s, sh) => s + cardValue(sh), 0),
    [filteredColumns]
  );

  /* DnD helpers ───────────────────────────────────────────────── */
  const findContainer = (id) => {
    if (STAGE_IDS.has(id)) return id;
    for (const stageId of Object.keys(columns)) {
      if ((columns[stageId] || []).some((s) => s._id === id)) return stageId;
    }
    return null;
  };

  const findShipment = (id) => {
    for (const stageId of Object.keys(columns)) {
      const found = (columns[stageId] || []).find((s) => s._id === id);
      if (found) return found;
    }
    return null;
  };

  const handleDragStart  = (e) => setActiveId(e.active.id);
  const handleDragCancel = () => setActiveId(null);

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const from = findContainer(active.id);
    const to   = findContainer(over.id);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const fromItems = prev[from] || [];
      const toItems   = prev[to]   || [];
      const moving = fromItems.find((s) => s._id === active.id);
      if (!moving) return prev;
      const overIdx = over.id === to ? toItems.length : toItems.findIndex((s) => s._id === over.id);
      return {
        ...prev,
        [from]: fromItems.filter((s) => s._id !== active.id),
        [to]: [
          ...toItems.slice(0, overIdx),
          { ...moving, status: to },
          ...toItems.slice(overIdx),
        ],
      };
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const from = findContainer(active.id);
    const to   = findContainer(over.id);
    if (!from || !to || from === to) return; // same column — no status change needed

    try {
      await shipmentsApi.update(active.id, { status: to });
      showToast(true, `Moved to ${to.replace(/_/g, ' ')}`);
    } catch {
      // Revert optimistic update
      setColumns((prev) => {
        const shipment = (prev[to] || []).find((s) => s._id === active.id);
        if (!shipment) return prev;
        return {
          ...prev,
          [to]:   prev[to].filter((s) => s._id !== active.id),
          [from]: [...(prev[from] || []), { ...shipment, status: from }],
        };
      });
      showToast(false, 'Failed to update status — reverted');
    }
  };

  /* Toast ─────────────────────────────────────────────────────── */
  const showToast = (ok, msg) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const activeShipment = activeId ? findShipment(activeId) : null;

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="pip-shell">

      {/* Header */}
      <div className="pip-header">
        <div className="pip-header-row">
          <div>
            <h1 className="pip-title">Pipeline</h1>
            <p className="pip-subtitle">Drag shipments through your operations workflow</p>
          </div>
          <div className="pip-header-actions">
            <button className="sd-btn" type="button">
              <i className="bi bi-funnel"></i> Filter
            </button>
            <button
              className="sd-btn sd-btn-primary"
              type="button"
              onClick={() => navigate('/shipments/new')}
            >
              <i className="bi bi-plus"></i> New Job
            </button>
          </div>
        </div>
      </div>

      {/* Filter chips + stats */}
      <div className="pip-filter-row">
        <div className="pip-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`pip-chip${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!loading && (
          <div className="pip-stats">
            Showing {totalJobs} jobs · Total value{' '}
            <strong style={{ color: 'var(--brand)' }}>{fmtCompact(totalValue)}</strong>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          margin: '0 28px 12px',
          padding: '10px 14px',
          background: '#fef2f2', color: '#991b1b',
          borderRadius: 8, fontSize: 13,
          border: '1px solid #fecaca',
        }}>
          {error}
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          flex: 1, gap: 16, minHeight: 320,
        }}>
          <div className="dashboard-loader">
            <div className="dashboard-loader-ring"></div>
            <i className="bi bi-kanban dashboard-loader-icon"></i>
          </div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading pipeline…</span>
        </div>
      ) : (
        <div className="pip-board-wrap">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="pip-board">
              {STAGES.map((s) => (
                <KanbanColumn
                  key={s.id}
                  stage={s.id}
                  label={s.label}
                  color={s.color}
                  shipments={filteredColumns[s.id] || []}
                  onAdd={() => navigate('/shipments/new')}
                />
              ))}
            </div>

            <DragOverlay>
              {activeShipment ? <ShipmentCardView shipment={activeShipment} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1100,
          padding: '10px 16px', borderRadius: 10,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          color: toast.ok ? '#166534' : '#991b1b',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className={`bi ${toast.ok ? 'bi-check-circle' : 'bi-exclamation-circle'}`}></i>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Kanban;
