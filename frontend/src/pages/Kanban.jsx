import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Toast, ToastContainer } from 'react-bootstrap';

import KanbanColumn from '../components/kanban/KanbanColumn';
import { DealCardView } from '../components/kanban/DealCard';
import NewDealModal from '../components/kanban/NewDealModal';
import { dealsApi } from '../api';

const STAGES = [
  { id: 'inquiry',   label: 'Inquiry',   color: '#6b7280', icon: 'bi-funnel',       dotClass: 'dot-inquiry' },
  { id: 'quoted',    label: 'Quoted',    color: '#2563eb', icon: 'bi-file-text',    dotClass: 'dot-quoted' },
  { id: 'confirmed', label: 'Confirmed', color: '#16a34a', icon: 'bi-check-circle', dotClass: 'dot-confirmed' },
  { id: 'lost',      label: 'Lost',      color: '#dc2626', icon: 'bi-x-circle',     dotClass: 'dot-lost' },
];

const fmtCompact = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
  }).format(v || 0);

const Kanban = () => {
  const [columns, setColumns] = useState({
    inquiry: [], quoted: [], confirmed: [], lost: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [activeId, setActiveId]   = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [toast, setToast]     = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { columns: data } = await dealsApi.getKanban();
        if (cancelled) return;
        setColumns({
          inquiry:   data.inquiry?.deals   || [],
          quoted:    data.quoted?.deals    || [],
          confirmed: data.confirmed?.deals || [],
          lost:      data.lost?.deals      || [],
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load deals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const findContainer = (id) => {
    if (STAGES.some((s) => s.id === id)) return id;
    for (const stage of Object.keys(columns)) {
      if (columns[stage].some((d) => d._id === id)) return stage;
    }
    return null;
  };

  const findDeal = (id) => {
    for (const stage of Object.keys(columns)) {
      const d = columns[stage].find((deal) => deal._id === id);
      if (d) return d;
    }
    return null;
  };

  const totals = useMemo(() => {
    const out = {};
    for (const stage of Object.keys(columns)) {
      out[stage] = columns[stage].reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
    }
    return out;
  }, [columns]);

  const allDeals     = useMemo(() => Object.values(columns).flat(), [columns]);
  const totalValue   = useMemo(() => allDeals.reduce((s, d) => s + (d.estimatedValue || 0), 0), [allDeals]);
  const confirmedVal = useMemo(() => (columns.confirmed || []).reduce((s, d) => s + (d.estimatedValue || 0), 0), [columns]);
  const winRate      = useMemo(() => {
    const closed = (columns.confirmed?.length || 0) + (columns.lost?.length || 0);
    return closed > 0 ? Math.round((columns.confirmed?.length / closed) * 100) : 0;
  }, [columns]);

  const handleDragStart  = (e) => setActiveId(e.active.id);
  const handleDragCancel = () => setActiveId(null);

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const fromStage = findContainer(active.id);
    const toStage   = findContainer(over.id);
    if (!fromStage || !toStage || fromStage === toStage) return;
    setColumns((prev) => {
      const fromItems = prev[fromStage];
      const toItems   = prev[toStage];
      const moving    = fromItems.find((d) => d._id === active.id);
      if (!moving) return prev;
      const overIndex = over.id === toStage
        ? toItems.length
        : toItems.findIndex((d) => d._id === over.id);
      return {
        ...prev,
        [fromStage]: fromItems.filter((d) => d._id !== active.id),
        [toStage]: [
          ...toItems.slice(0, overIndex),
          { ...moving, stage: toStage },
          ...toItems.slice(overIndex),
        ],
      };
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const fromStage = findContainer(active.id);
    const toStage   = findContainer(over.id);
    if (!fromStage || !toStage) return;
    const snapshot = JSON.parse(JSON.stringify(columns));

    if (fromStage === toStage) {
      if (active.id === over.id) return;
      const items    = [...columns[fromStage]];
      const oldIndex = items.findIndex((d) => d._id === active.id);
      const newIndex = items.findIndex((d) => d._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const [moved] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, moved);
      setColumns({ ...columns, [fromStage]: items });
      try { await dealsApi.reorder(items.map((d, i) => ({ id: d._id, position: i }))); }
      catch { setColumns(snapshot); setToast({ variant: 'danger', message: 'Failed to reorder — changes reverted' }); }
    } else {
      const newPosition = columns[toStage].findIndex((d) => d._id === active.id);
      try {
        await dealsApi.move(active.id, { stage: toStage, position: newPosition });
        await dealsApi.reorder(columns[toStage].map((d, i) => ({ id: d._id, position: i })));
        setToast({ variant: 'success', message: `Moved to ${toStage}` });
      } catch (err) {
        setColumns(snapshot);
        setToast({ variant: 'danger', message: err.response?.data?.message || 'Failed to move — changes reverted' });
      }
    }
  };

  const handleDealCreated = (deal) => {
    setColumns((prev) => ({
      ...prev,
      [deal.stage]: [...(prev[deal.stage] || []), deal],
    }));
    setToast({ variant: 'success', message: `Created ${deal.dealCode}` });
  };

  const activeDeal = activeId ? findDeal(activeId) : null;

  return (
    <>
      <div className="kanban-shell">
        {/* ── Page header ───────────────────────────────────── */}
        <div className="ss-page-header">
          <div className="ss-page-header-left">
            <div className="ss-page-header-icon"><i className="bi bi-kanban"></i></div>
            <div>
              <h4 className="ss-page-title">Sales Pipeline</h4>
              <div className="ss-page-sub">Drag cards to advance deal stages · click to open deal details</div>
            </div>
          </div>
          <div className="ss-header-actions">
            <button className="ss-action-btn ss-action-btn-primary" onClick={() => setShowNewDeal(true)}>
              <i className="bi bi-plus-lg me-2"></i>New Deal
            </button>
          </div>
        </div>

        {/* ── Pipeline summary strip ────────────────────────── */}
        <div className="kanban-pipeline-strip">
          <div className="kanban-pipeline-tile" style={{ borderTopColor: '#2563eb' }}>
            <div className="kanban-pipeline-label">Total Pipeline</div>
            <div className="kanban-pipeline-count" style={{ color: '#2563eb' }}>{allDeals.length}</div>
            <div className="kanban-pipeline-value">{fmtCompact(totalValue)} total value</div>
          </div>
          {STAGES.map((s) => (
            <div key={s.id} className="kanban-pipeline-tile" style={{ borderTopColor: s.color }}>
              <div className="kanban-pipeline-label">{s.label}</div>
              <div className="kanban-pipeline-count" style={{ color: s.color }}>
                {columns[s.id]?.length || 0}
              </div>
              <div className="kanban-pipeline-value">{fmtCompact(totals[s.id])}</div>
            </div>
          ))}
          <div className="kanban-pipeline-tile" style={{ borderTopColor: '#16a34a' }}>
            <div className="kanban-pipeline-label">Win Rate</div>
            <div className="kanban-pipeline-count" style={{ color: winRate >= 50 ? '#16a34a' : '#d97706' }}>
              {winRate}%
            </div>
            <div className="kanban-pipeline-value">{fmtCompact(confirmedVal)} confirmed</div>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {loading ? (
          <div className="ss-loading" style={{ minHeight: 300 }}>
            <div className="dashboard-loader">
              <div className="dashboard-loader-ring"></div>
              <i className="bi bi-kanban dashboard-loader-icon"></i>
            </div>
            <span>Loading pipeline…</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="kanban-board">
              {STAGES.map((s) => (
                <KanbanColumn
                  key={s.id}
                  stage={s.id}
                  label={s.label}
                  color={s.color}
                  deals={columns[s.id] || []}
                  totalValue={totals[s.id]}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDeal ? <DealCardView deal={activeDeal} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <NewDealModal
        show={showNewDeal}
        onHide={() => setShowNewDeal(false)}
        onCreated={handleDealCreated}
      />

      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1080 }}>
        <Toast onClose={() => setToast(null)} show={!!toast} delay={3000} autohide bg={toast?.variant}>
          <Toast.Body className={toast?.variant === 'danger' ? 'text-white' : ''}>
            {toast?.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default Kanban;
