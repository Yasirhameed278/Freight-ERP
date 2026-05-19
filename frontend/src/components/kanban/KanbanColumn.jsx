import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableShipmentCard from './ShipmentCard';

const KanbanColumn = ({ stage, label, color, shipments, onAdd }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="pip-col">
      {/* Column header */}
      <div className="pip-col-header">
        <div className="pip-col-dot" style={{ background: color }}></div>
        <span className="pip-col-label">{label}</span>
        <span className="pip-col-count">{shipments.length}</span>
        <button
          className="pip-col-add"
          type="button"
          onClick={onAdd}
          title="New job"
        >
          <i className="bi bi-plus" style={{ fontSize: 14 }}></i>
        </button>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={`pip-col-body${isOver ? ' is-over' : ''}`}
      >
        <SortableContext
          items={shipments.map((s) => s._id)}
          strategy={verticalListSortingStrategy}
        >
          {shipments.map((s) => (
            <SortableShipmentCard key={s._id} shipment={s} />
          ))}
        </SortableContext>

        {shipments.length === 0 && (
          <div className="pip-col-empty">
            <i className="bi bi-inbox" style={{ fontSize: 22 }}></i>
            Drop jobs here
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
