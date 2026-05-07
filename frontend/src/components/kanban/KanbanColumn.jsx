import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableDealCard from './DealCard';

const fmtCompact = (value) => {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
  }).format(value);
};

const KanbanColumn = ({ stage, label, color = 'var(--brand)', deals, totalValue }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column${isOver ? ' is-over' : ''}`}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span className={`kanban-stage-dot dot-${stage}`}></span>
          <span style={{ fontWeight: 700, color }}>{label}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99,
            background: color + '20', color,
          }}>{deals.length}</span>
        </div>
        <div className="kanban-column-stat" style={{ fontWeight: 700, color }}>
          {fmtCompact(totalValue)}
        </div>
      </div>

      <div className="kanban-cards">
        <SortableContext items={deals.map((d) => d._id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDealCard key={deal._id} deal={deal} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <div className="kanban-empty">
            <i className="bi bi-inbox d-block mb-1" style={{ fontSize: 20, opacity: 0.3 }}></i>
            Drop deals here
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
