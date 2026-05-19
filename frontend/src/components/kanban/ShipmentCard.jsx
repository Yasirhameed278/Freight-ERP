import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const fmtCompact = (v) => {
  if (!v) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    notation: 'compact', maximumFractionDigits: 0,
  }).format(v);
};

const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const MODE_ICON = {
  sea:        'bi-water',
  air:        'bi-airplane',
  road:       'bi-truck',
  rail:       'bi-train-front',
  multimodal: 'bi-diagram-3',
  courier:    'bi-envelope',
};

const DIR_LABEL = {
  export:      'E',
  import:      'I',
  cross_trade: 'X',
  domestic:    'D',
};

export const cardValue = (s) => {
  if (s.charges?.length) {
    const rev = s.charges
      .filter((c) => c.type === 'revenue')
      .reduce((sum, c) => sum + (c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1), 0);
    if (rev > 0) return rev;
  }
  return s.invoiceValue || 0;
};

/* ── Card view (used both inline and in DragOverlay) ─────────── */
export const ShipmentCardView = forwardRef(({ shipment, isOverlay, style, className = '', ...rest }, ref) => {
  const origin = shipment.portOfLoading?.code || shipment.placeOfReceipt?.code || '—';
  const dest   = shipment.portOfDischarge?.code || shipment.placeOfDelivery?.code || '—';
  const client = shipment.customer?.companyName || shipment.shipper?.companyName || '—';
  const mode   = shipment.mode || 'sea';
  const dir    = DIR_LABEL[shipment.direction] || '';
  const eta    = fmtDate(shipment.eta);
  const value  = cardValue(shipment);

  return (
    <div
      ref={ref}
      className={`pip-card${isOverlay ? ' is-overlay' : ''} ${className}`}
      style={style}
      {...rest}
    >
      {/* Top row: shipment number + badges */}
      <div className="pip-card-top">
        <span className="pip-card-num">{shipment.shipmentNumber}</span>
        <div className="pip-card-badges">
          <span className={`pip-card-badge ${mode}`}>
            <i className={`bi ${MODE_ICON[mode] || 'bi-box'}`} style={{ fontSize: 9 }}></i>
            {mode.slice(0, 3).toUpperCase()}
          </span>
          {dir && <span className="pip-card-dir">{dir}</span>}
        </div>
      </div>

      {/* Route */}
      <div className="pip-card-route">
        <span>{origin}</span>
        <i className="bi bi-arrow-right pip-card-route-arrow"></i>
        <span>{dest}</span>
      </div>

      {/* Client */}
      <div className="pip-card-client">{client}</div>

      {/* Footer: ETA + value */}
      <div className="pip-card-footer">
        <span className="pip-card-eta">
          {eta
            ? <>ETA <strong>{eta}</strong></>
            : <span style={{ opacity: 0.45 }}>No ETA</span>}
        </span>
        {value > 0 && <span className="pip-card-value">{fmtCompact(value)}</span>}
      </div>
    </div>
  );
});

ShipmentCardView.displayName = 'ShipmentCardView';

/* ── Sortable wrapper ────────────────────────────────────────── */
const SortableShipmentCard = ({ shipment }) => {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: shipment._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <ShipmentCardView shipment={shipment} className={isDragging ? 'is-dragging' : ''} />
    </div>
  );
};

export default SortableShipmentCard;
