import { useState, forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const fmtCurrency = (amount, currency = 'USD') => {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    notation: amount >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(amount);
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtDateFull = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const initials = (user) => {
  if (!user) return '?';
  return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
};

const PRIORITY_COLOR = {
  low:    '#6b7280',
  medium: '#2563eb',
  high:   '#d97706',
  urgent: '#dc2626',
};

const MODE_ICON = {
  sea:  'bi-water',
  air:  'bi-airplane',
  road: 'bi-truck',
  rail: 'bi-train-front',
};

const STAGE_CONFIG = {
  inquiry:   { color: '#6b7280', bg: '#f3f4f6', label: 'Inquiry' },
  quoted:    { color: '#0891b2', bg: '#e0f2fe', label: 'Quoted' },
  confirmed: { color: '#16a34a', bg: '#dcfce7', label: 'Confirmed' },
  on_hold:   { color: '#d97706', bg: '#fef9c3', label: 'On Hold' },
  lost:      { color: '#dc2626', bg: '#fee2e2', label: 'Lost' },
};

/* ── Deal Detail Modal ──────────────────────────────────────── */
const DealDetailModal = ({ deal, onClose }) => {
  const priorityColor = PRIORITY_COLOR[deal.priority] || '#6b7280';
  const stageCfg = STAGE_CONFIG[deal.stage] || { color: '#6b7280', bg: '#f3f4f6', label: deal.stage };

  return (
    <div
      className="modal show d-block"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 1080 }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ borderRadius: 16, border: 'none', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', background: 'var(--surface)' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-soft)' }}>
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--bs-secondary-color)', marginBottom: 4 }}>
                  {deal.dealCode}
                </div>
                <h5 style={{ fontWeight: 800, marginBottom: 10, color: 'var(--bs-body-color)' }}>{deal.title}</h5>
                <div className="d-flex gap-2 flex-wrap">
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: stageCfg.bg, color: stageCfg.color }}>
                    {stageCfg.label}
                  </span>
                  {deal.priority && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${priorityColor}18`, color: priorityColor }}>
                      {deal.priority} priority
                    </span>
                  )}
                  {deal.mode && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--bs-secondary-color)' }}>
                      <i className={`bi ${MODE_ICON[deal.mode] || 'bi-box'} me-1`}></i>{deal.mode}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--bs-secondary-color)', cursor: 'pointer', lineHeight: 1, padding: 4, flexShrink: 0 }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            {/* Client + Route */}
            <div className="d-flex gap-3 mb-4 flex-wrap">
              {deal.client?.companyName && (
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--bs-secondary-color)', marginBottom: 4 }}>Client</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    <i className="bi bi-building me-2 opacity-50"></i>{deal.client.companyName}
                  </div>
                </div>
              )}
              {(deal.origin || deal.destination) && (
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--bs-secondary-color)', marginBottom: 4 }}>Route</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {deal.origin?.code || deal.origin || '—'}
                    <i className="bi bi-arrow-right mx-2 opacity-50" style={{ fontSize: 10 }}></i>
                    {deal.destination?.code || deal.destination || '—'}
                  </div>
                </div>
              )}
            </div>

            {/* KPI tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--bs-secondary-color)', marginBottom: 6 }}>Value</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{fmtCurrency(deal.estimatedValue, deal.currency)}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--bs-secondary-color)', marginBottom: 6 }}>Probability</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{deal.probability != null ? `${deal.probability}%` : '—'}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--bs-secondary-color)', marginBottom: 6 }}>Close Date</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{fmtDateFull(deal.expectedCloseDate)}</div>
              </div>
            </div>

            {/* Owner */}
            {deal.owner && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: deal.notes ? 12 : 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {initials(deal.owner)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{deal.owner.firstName} {deal.owner.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>Deal Owner</div>
                </div>
              </div>
            )}

            {deal.notes && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 13, color: 'var(--bs-secondary-color)', lineHeight: 1.5 }}>
                <i className="bi bi-chat-text me-2 opacity-50"></i>{deal.notes}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ss-action-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── DealCardView ────────────────────────────────────────────── */
export const DealCardView = forwardRef(({ deal, isOverlay, dragListeners, onClick, ...props }, ref) => {
  const priorityColor = PRIORITY_COLOR[deal.priority] || '#6b7280';
  const daysToClose   = deal.expectedCloseDate
    ? Math.ceil((new Date(deal.expectedCloseDate) - Date.now()) / 86400000)
    : null;

  return (
    <div
      ref={ref}
      className={`deal-card ${deal.priority ? `priority-${deal.priority}` : ''} ${isOverlay ? 'is-overlay' : ''}`}
      style={{ borderLeftColor: priorityColor, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      {...props}
    >
      {/* Header row */}
      <div className="d-flex justify-content-between align-items-start mb-1">
        <span className="deal-card-code">{deal.dealCode}</span>
        <div className="d-flex align-items-center gap-1">
          {deal.mode && (
            <i
              className={`bi ${MODE_ICON[deal.mode] || 'bi-box'}`}
              style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}
              title={deal.mode}
            ></i>
          )}
          {deal.priority === 'urgent' && (
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>!</span>
          )}
          {deal.priority === 'high' && (
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#fffbeb', color: '#d97706', fontWeight: 700 }}>↑</span>
          )}
          {/* Drag handle — only responds to drag, stopPropagation prevents card click */}
          <span
            className="deal-drag-handle"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            {...(dragListeners || {})}
          >
            <i className="bi bi-grip-vertical"></i>
          </span>
        </div>
      </div>

      {/* Title */}
      <h6 className="deal-card-title">{deal.title}</h6>

      {/* Client */}
      <div className="deal-card-client">
        <i className="bi bi-building me-1"></i>
        {deal.client?.companyName || 'No client linked'}
      </div>

      {/* Origin → Destination */}
      {(deal.origin || deal.destination) && (
        <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{deal.origin?.code || deal.origin || '—'}</span>
          <i className="bi bi-arrow-right" style={{ fontSize: 9, opacity: 0.6 }}></i>
          <span style={{ fontWeight: 600 }}>{deal.destination?.code || deal.destination || '—'}</span>
        </div>
      )}

      {/* Footer */}
      <div className="deal-card-footer">
        <span className="deal-card-value">{fmtCurrency(deal.estimatedValue, deal.currency)}</span>
        <span
          style={{ fontSize: 11, color: daysToClose != null && daysToClose < 7 ? '#dc2626' : 'var(--bs-secondary-color)' }}
          title={`Expected close: ${fmtDate(deal.expectedCloseDate)}`}
        >
          <i className="bi bi-calendar3 me-1"></i>
          {fmtDate(deal.expectedCloseDate)}
        </span>
      </div>

      {/* Owner avatar + probability */}
      {(deal.owner || deal.probability != null) && (
        <div className="d-flex justify-content-between align-items-center mt-2">
          <div>
            {deal.probability != null && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                background: deal.probability >= 70 ? '#dcfce7' : deal.probability >= 40 ? '#fffbeb' : '#f3f4f6',
                color: deal.probability >= 70 ? '#16a34a' : deal.probability >= 40 ? '#d97706' : '#6b7280',
              }}>{deal.probability}%</span>
            )}
          </div>
          {deal.owner && (
            <span
              className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
              style={{ width: 22, height: 22, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}
              title={`${deal.owner.firstName} ${deal.owner.lastName}`}
            >
              {initials(deal.owner)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

DealCardView.displayName = 'DealCardView';

/* ── SortableDealCard ────────────────────────────────────────── */
const SortableDealCard = ({ deal }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal._id });
  const [showDetail, setShowDetail] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={isDragging ? 'is-dragging' : ''}
        {...attributes}
        {...listeners}
      >
        <DealCardView
          deal={deal}
          onClick={() => !isDragging && setShowDetail(true)}
        />
      </div>
      {showDetail && <DealDetailModal deal={deal} onClose={() => setShowDetail(false)} />}
    </>
  );
};

export default SortableDealCard;
