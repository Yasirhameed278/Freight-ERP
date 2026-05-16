import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/*
 * All markers use DivIcon so we never hit the broken-default-icon issue
 * that affects Leaflet inside Vite/Webpack bundlers.
 */
const portIcon = (color) =>
  L.divIcon({
    html: `<div style="width:13px;height:13px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 5px rgba(0,0,0,.35)"></div>`,
    className: '',
    iconSize:   [13, 13],
    iconAnchor: [6, 6],
  });

const makeVesselIcon = (heading = 0, mode = 'sea') => {
  const symbol = mode === 'air' ? '✈' : '⛴';
  return L.divIcon({
    html: `<div style="font-size:20px;line-height:1;transform:rotate(${heading - 90}deg);filter:drop-shadow(0 1px 3px rgba(0,0,0,.4))">${symbol}</div>`,
    className:  '',
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
  });
};

/* Fits the map to show all key points when they change */
const BoundsFitter = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 6 });
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const VesselMap = ({ origin, destination, vesselPosition, mode = 'sea' }) => {
  if (!origin || !destination) return null;

  const originPt  = [origin.lat,      origin.lng];
  const destPt    = [destination.lat, destination.lng];
  const vesselPt  = vesselPosition ? [vesselPosition.lat, vesselPosition.lng] : null;

  const bounds = [originPt, destPt, vesselPt].filter(Boolean);

  // Full route: origin → destination (dashed grey)
  const fullRoute = [originPt, destPt];
  // Traveled segment: origin → vessel (solid brand blue)
  const traveled  = vesselPt ? [originPt, vesselPt] : [];

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
      <MapContainer
        center={originPt}
        zoom={4}
        style={{ height: 320, width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Full route line — dashed */}
        <Polyline
          positions={fullRoute}
          pathOptions={{ color: '#94a3b8', weight: 1.5, dashArray: '6 5', opacity: 0.7 }}
        />

        {/* Traveled portion — solid */}
        {traveled.length > 0 && (
          <Polyline
            positions={traveled}
            pathOptions={{ color: '#2563eb', weight: 2.5, opacity: 0.9 }}
          />
        )}

        {/* Origin marker */}
        <Marker position={originPt} icon={portIcon('#16a34a')}>
          <Popup>
            <strong>Origin</strong><br />{origin.name || origin.code}
          </Popup>
        </Marker>

        {/* Destination marker */}
        <Marker position={destPt} icon={portIcon('#dc2626')}>
          <Popup>
            <strong>Destination</strong><br />{destination.name || destination.code}
          </Popup>
        </Marker>

        {/* Vessel marker */}
        {vesselPt && (
          <Marker position={vesselPt} icon={makeVesselIcon(vesselPosition.heading || 0, mode)}>
            <Popup>
              <strong>Last Position</strong><br />
              {vesselPosition.speed != null && <>Speed: {vesselPosition.speed} kn<br /></>}
              {vesselPosition.heading != null && <>Hdg: {vesselPosition.heading}°<br /></>}
              {vesselPosition.updatedAt && (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {new Date(vesselPosition.updatedAt).toLocaleString()}
                </span>
              )}
            </Popup>
          </Marker>
        )}

        <BoundsFitter bounds={bounds} />
      </MapContainer>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, padding: '8px 14px',
        background: 'var(--surface-2)', fontSize: 11.5,
        color: 'var(--bs-secondary-color)', borderTop: '1px solid var(--border-soft)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, background: '#16a34a', borderRadius: '50%', display: 'inline-block' }} />
          {origin.name || 'Origin'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, background: '#dc2626', borderRadius: '50%', display: 'inline-block' }} />
          {destination.name || 'Destination'}
        </span>
        {vesselPt && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>{mode === 'air' ? '✈' : '⛴'}</span>
            Current position
          </span>
        )}
      </div>
    </div>
  );
};

export default VesselMap;
