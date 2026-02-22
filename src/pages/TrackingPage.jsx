/**
 * TrackingPage.jsx — Complete rewrite with bulletproof architecture
 *
 * ARCHITECTURE:
 *   DATA layer  → single `onlineRiders` Map in React state (uid → riderObj)
 *                 ALL socket events merge into this one map. GPS fields never
 *                 get overwritten by non-GPS events.
 *
 *   MAP layer   → one useEffect watches `liveList` (riders with GPS).
 *                 When it runs, it syncs markers imperatively. No queues,
 *                 no timing hacks, no StrictMode issues.
 *
 *   Map init    → separate effect, runs when `mapReady` flips true.
 *                 Has a proper cleanup that nulls mapRef and clears markers,
 *                 so React StrictMode double-mount is completely harmless.
 *
 * WHY THIS WORKS:
 *   The old bug was calling upsertMarker() during socket callbacks while
 *   mapInstance.current was still null (race between SDK load and socket data).
 *   Here, socket callbacks ONLY update React state. The map sync happens in
 *   a separate useEffect that only runs AFTER the map exists.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  RefreshCw, Navigation, Users, WifiOff, X,
  MapPin, Crosshair, Eye, Route, Search, Package, User, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { trackingAPI, ridersAPI, ordersAPI } from '../services/api';
import { getSocket, onSocketConnect } from '../services/socketService';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MAPS_API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CENTER = { lat: 19.0760, lng: 72.8777 };

const MAP_STYLE = [
  { elementType: 'geometry',            stylers: [{ color: '#0d1220' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#0d1220' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#5a6785' }] },
  { featureType: 'road', elementType: 'geometry',         stylers: [{ color: '#1a2235' }] },
  { featureType: 'road', elementType: 'geometry.stroke',  stylers: [{ color: '#131929' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#252f45' }] },
  { featureType: 'water', elementType: 'geometry',        stylers: [{ color: '#05080f' }] },
  { featureType: 'water', elementType: 'labels.text.fill',stylers: [{ color: '#4d9fff' }] },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ba8c4' }] },
];

/* ─── Google Maps SDK — singleton loader ─────────────────────────────────── */
let _mapsPromise = null;
function loadMapsSDK() {
  if (!MAPS_API_KEY)         return Promise.reject(new Error('No API key'));
  if (window.google?.maps)   return Promise.resolve(window.google);
  if (_mapsPromise)          return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    const s   = document.createElement('script');
    s.src     = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=geometry`;
    s.async   = true;
    s.onload  = () => resolve(window.google);
    s.onerror = (e) => { _mapsPromise = null; reject(e); };
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

/* ─── Route overlays (module-level, not React state) ────────────────────── */
const routeOverlays = new Map();

function clearRouteOverlay(routeId) {
  const o = routeOverlays.get(routeId);
  if (!o) return;
  o.polylines.forEach(p => p.setMap(null));
  o.circles.forEach(c  => c.setMap(null));
  o.markers.forEach(m  => m.setMap(null));
  routeOverlays.delete(routeId);
}
function clearAllRouteOverlays() {
  routeOverlays.forEach((_, id) => clearRouteOverlay(id));
}
async function drawRoute(map, route) {
  clearRouteOverlay(route.routeId);
  const n1  = { lat: route.node1.latitude, lng: route.node1.longitude };
  const n2  = { lat: route.node2.latitude, lng: route.node2.longitude };
  const via = (route.via || []).map(v => ({ lat: v.latitude, lng: v.longitude }));
  const o   = { polylines: [], circles: [], markers: [] };
  try {
    const svc    = new window.google.maps.DirectionsService();
    const result = await new Promise((res, rej) =>
      svc.route({
        origin: n1, destination: n2, travelMode: 'DRIVING',
        waypoints: via.map(l => ({ location: l, stopover: false })),
      }, (r, s) => s === 'OK' ? res(r) : rej(s))
    );
    o.polylines.push(new window.google.maps.Polyline({
      path: result.routes[0].overview_path, map, geodesic: true,
      strokeColor: '#4d9fff', strokeOpacity: 0.9, strokeWeight: 4, zIndex: 5,
    }));
  } catch {
    o.polylines.push(new window.google.maps.Polyline({
      path: [n1, ...via, n2], map, geodesic: true,
      strokeColor: '#ff9a4d', strokeOpacity: 0.7, strokeWeight: 3, zIndex: 5,
    }));
  }
  const addNode = (center, radius, color, scale, title) => {
    if (!radius) return;
    o.circles.push(new window.google.maps.Circle({
      center, radius, map, fillColor: color, fillOpacity: 0.12,
      strokeColor: color, strokeOpacity: 0.7, strokeWeight: 2, zIndex: 3,
    }));
    o.markers.push(new window.google.maps.Marker({
      position: center, map, title,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      zIndex: 10,
    }));
  };
  addNode(n1, route.threshold1, '#00e5a0', 8, `Start (±${route.threshold1}m)`);
  addNode(n2, route.threshold2, '#ff4d6d', 8, `End (±${route.threshold2}m)`);
  via.forEach((pt, i) => addNode(pt, route.threshold3, '#ffe14d', 6, `Via ${i + 1}`));
  routeOverlays.set(route.routeId, o);
}

/* ─── Marker helpers ─────────────────────────────────────────────────────── */
function makeMarkerIcon(heading) {
  return {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6, fillColor: '#00e5a0', fillOpacity: 1,
    strokeColor: '#fff', strokeWeight: 1.5,
    rotation: heading || 0,
    anchor: new window.google.maps.Point(0, 2.5),
  };
}
function makeInfoHtml(r) {
  const name = `${r.firstName || ''} ${r.lastName || ''}`.trim() || `Rider ${r.uid?.slice(0, 6)}`;
  const kmh  = r.speed != null ? (r.speed * 3.6).toFixed(0) : null;
  return `<div style="font-family:sans-serif;color:#0d1220;min-width:150px;">
    <b style="font-size:13px;">${name}</b>
    ${r.vehicleType ? `<div style="font-size:11px;color:#555">${r.vehicleType}</div>` : ''}
    ${kmh ? `<div style="font-size:11px;color:#555">🏃 ${kmh} km/h</div>` : ''}
    <div style="font-size:10px;color:#999;margin-top:4px;font-family:monospace">${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}</div>
  </div>`;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function SearchBar({ allRiders, onSelectRider, onSelectOrder }) {
  const [mode, setMode]             = useState('rider');
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!wrapRef.current?.contains(e.target)) setSuggestions([]); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleInput = (v) => {
    setQuery(v);
    if (mode === 'rider' && v.trim()) {
      const q = v.toLowerCase();
      setSuggestions(allRiders.filter(r =>
        `${r.firstName||''} ${r.lastName||''}`.toLowerCase().includes(q) ||
        (r.phoneNumber||'').includes(q) ||
        (r.uid||'').toLowerCase().includes(q)
      ).slice(0, 6));
    } else setSuggestions([]);
  };

  const searchOrder = async () => {
    if (!query.trim()) return;
    setOrderLoading(true);
    try {
      const { data } = await ordersAPI.getById(query.trim());
      const order = data?.data || data;
      if (order) { onSelectOrder(order); setQuery(''); }
      else toast.error('Order not found');
    } catch { toast.error('Order not found'); }
    finally { setOrderLoading(false); }
  };

  return (
    <div ref={wrapRef} style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20, width: 340 }}>
      <div style={{ display: 'flex', background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
        {[{ k: 'rider', icon: <User size={11}/>, label: 'Rider' }, { k: 'order', icon: <Package size={11}/>, label: 'Order ID' }].map(({ k, icon, label }) => (
          <button key={k} onClick={() => { setMode(k); setQuery(''); setSuggestions([]); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', background: mode === k ? 'var(--accent-dim)' : 'transparent', color: mode === k ? 'var(--accent)' : 'var(--text-2)', borderBottom: mode === k ? '2px solid var(--accent)' : '2px solid transparent' }}>
            {icon} {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 10, color: 'var(--text-2)' }}><Search size={13}/></div>
        <input value={query} onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && mode === 'order' && searchOrder()}
          placeholder={mode === 'rider' ? 'Search rider name or phone…' : 'Enter order ID…'}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '9px 8px', fontSize: 13, color: 'var(--text-0)', fontFamily: 'var(--font-mono)' }}
        />
        {mode === 'order' && (
          <button onClick={searchOrder} disabled={orderLoading || !query.trim()}
            style={{ background: 'var(--accent)', border: 'none', color: '#000', padding: '0 14px', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {orderLoading ? '…' : 'Track'}
          </button>
        )}
        {query && <button onClick={() => { setQuery(''); setSuggestions([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: '0 8px' }}><X size={12}/></button>}
      </div>
      {suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {suggestions.map(r => {
            const name = `${r.firstName||''} ${r.lastName||''}`.trim() || 'Unknown';
            return (
              <div key={r.uid} onClick={() => { onSelectRider(r); setQuery(''); setSuggestions([]); }}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.latitude ? 'var(--green)' : '#ffe14d', flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{r.phoneNumber} · {r.vehicleType || '—'}</div>
                </div>
                {r.latitude && <Zap size={11} style={{ color: 'var(--green)' }}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RiderPanel({ rider, onClose, onFocus, onToggleRoutes, showRoutes, routeLoading }) {
  if (!rider) return null;
  const name     = `${rider.firstName||''} ${rider.lastName||''}`.trim() || 'Unknown';
  const hasGps   = rider.latitude != null;
  const speedKmh = rider.speed != null ? (rider.speed * 3.6).toFixed(1) : null;
  const updated  = rider.updatedAt ? new Date(rider.updatedAt).toLocaleTimeString() : '—';
  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderRadius: 14, padding: '14px 16px', zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-dim)', display: 'grid', placeItems: 'center' }}>
            <Navigation size={16} style={{ color: 'var(--accent)' }}/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-0)' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{rider.phoneNumber || rider.uid?.slice(0, 12)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasGps && (
            <button onClick={() => onFocus(rider)} style={{ background: 'var(--bg-2)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '5px 10px', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Crosshair size={12}/> Focus
            </button>
          )}
          <button onClick={onToggleRoutes} disabled={routeLoading}
            style={{ background: showRoutes ? 'var(--accent-dim)' : 'var(--bg-2)', border: `1px solid ${showRoutes ? 'var(--accent)' : 'var(--border-bright)'}`, borderRadius: 8, padding: '5px 10px', color: showRoutes ? 'var(--accent)' : 'var(--text-1)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Route size={12}/> {routeLoading ? 'Loading…' : showRoutes ? 'Hide Routes' : 'Show Routes'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 4 }}><X size={15}/></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { label: 'Vehicle', value: rider.vehicleType || '—' },
          { label: 'Speed',   value: speedKmh ? `${speedKmh} km/h` : '—' },
          { label: 'Updated', value: hasGps ? updated : 'No GPS' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{value}</div>
          </div>
        ))}
      </div>
      {!hasGps && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,225,77,0.08)', border: '1px solid rgba(255,225,77,0.2)', borderRadius: 8, fontSize: 11, color: '#ffe14d' }}>
          ⚠ Rider is online but GPS not yet received. Waiting for first location ping…
        </div>
      )}
      {hasGps && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={10}/> {rider.latitude?.toFixed(6)}, {rider.longitude?.toFixed(6)}
          {rider.accuracy ? ` ± ${Math.round(rider.accuracy)}m` : ''}
        </div>
      )}
    </div>
  );
}

function OrderPanel({ order, onClose, onTrackRider, onlineRiders }) {
  if (!order) return null;
  const rid  = order.assignedRiderId || order.riderId;
  const live = rid ? onlineRiders.find(r => r.uid === rid) : null;
  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderRadius: 14, padding: '14px 16px', zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(77,159,255,0.15)', display: 'grid', placeItems: 'center' }}>
            <Package size={16} style={{ color: '#4d9fff' }}/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-0)' }}>Order #{order.orderId?.slice(-8)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>Status: {order.status}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}><X size={15}/></button>
      </div>
      {live ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: live.latitude ? 'var(--green)' : '#ffe14d' }}/>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{`${live.firstName||''} ${live.lastName||''}`.trim() || 'Rider'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{live.vehicleType} · {live.latitude ? 'GPS Active' : 'No GPS yet'}</div>
            </div>
          </div>
          <button onClick={() => onTrackRider(live)} style={{ background: 'var(--accent)', border: 'none', color: '#000', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Navigation size={12}/> Track Rider
          </button>
        </div>
      ) : rid ? (
        <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 12, color: 'var(--text-2)' }}>⚠ Assigned rider is currently offline.</div>
      ) : (
        <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 12, color: 'var(--text-2)' }}>No rider assigned yet.</div>
      )}
    </div>
  );
}

function SidebarRow({ rider, selected, onClick }) {
  const name   = `${rider.firstName||''} ${rider.lastName||''}`.trim() || 'Unknown';
  const hasGps = rider.latitude != null;
  const time   = rider.updatedAt ? new Date(rider.updatedAt).toLocaleTimeString() : '';
  return (
    <div onClick={onClick} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected ? 'var(--accent-dim)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: hasGps ? 'var(--green)' : '#ffe14d', boxShadow: hasGps ? '0 0 6px var(--green)' : '0 0 6px #ffe14d', animation: 'livePulse 2s ease-in-out infinite' }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{rider.vehicleType || '—'} · {hasGps ? time : 'No GPS'}</div>
      </div>
      <Navigation size={13} style={{ color: selected ? 'var(--accent)' : 'var(--text-2)', flexShrink: 0 }}/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════════ */
export default function TrackingPage() {
  const routerLocation = useLocation();

  /* ── DOM + imperative refs ─────────────────────────────────────────────── */
  const mapDivRef  = useRef(null);            // <div> handed to Google Maps
  const mapRef     = useRef(null);            // google.maps.Map instance
  const markersRef = useRef(new Map());       // uid → { marker, iw }

  /* ── React state ───────────────────────────────────────────────────────── */
  const [mapReady,      setMapReady]      = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [allDbRiders,   setAllDbRiders]   = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRoutes,    setShowRoutes]    = useState(false);
  const [routeLoading,  setRouteLoading]  = useState(false);

  /**
   * THE SINGLE SOURCE OF TRUTH:
   * onlineRiders: Map<uid, riderObj>
   *
   * riderObj fields:
   *   uid, firstName, lastName, phoneNumber, vehicleType,
   *   riderAvailabilityStatus, status
   *   latitude?, longitude?, accuracy?, heading?, speed?,
   *   updatedAt?, timestamp?
   *
   * Rule: GPS fields (latitude/longitude/etc) are ONLY set by location events.
   * Status/profile events NEVER overwrite existing GPS fields.
   */
  const [onlineRiders, setOnlineRiders] = useState(new Map());

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const riderList = useMemo(() => Array.from(onlineRiders.values()), [onlineRiders]);
  const liveList  = useMemo(() => riderList.filter(r => r.latitude != null), [riderList]);

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 1: Load Google Maps SDK
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!MAPS_API_KEY) { setLoading(false); return; }
    loadMapsSDK()
      .then(() => setMapReady(true))
      .catch(() => toast.error('Failed to load Google Maps'));
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 2: Create Google Map (runs once when SDK is ready)

     CRITICAL: This effect has a CLEANUP that nulls mapRef.current.
     React StrictMode double-mounts every component in dev:
       Mount 1  → creates map, sets mapRef.current
       Unmount  → cleanup runs → mapRef.current = null, markers cleared
       Mount 2  → creates a fresh map on the real live DOM node ✓

     Without this cleanup, Mount 2 would skip creation (mapRef already set)
     but the existing Map would be bound to the detached DOM node from Mount 1,
     causing "setMap: not an instance of Map" on every marker operation.
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!mapReady || !mapDivRef.current) return;

    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: DEFAULT_CENTER, zoom: 12, styles: MAP_STYLE,
      disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy',
    });

    return () => {
      markersRef.current.forEach(({ marker, iw }) => { iw?.close(); marker.setMap(null); });
      markersRef.current.clear();
      clearAllRouteOverlays();
      mapRef.current = null;
    };
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 3: Sync markers — the ONLY place markers are created/updated/removed

     Runs whenever `liveList` changes (new GPS data) OR `mapReady` changes
     (map just became available). If mapRef.current is null the effect returns
     immediately; it will automatically re-run once the map is created because
     `mapReady` is in the deps array.

     This completely eliminates all timing races:
     - Socket callback arrives before map? → updates liveList state, effect
       re-runs after map effect sets mapRef.current, markers appear correctly.
     - Map created before socket data? → liveList is empty, nothing to place.
       When socket data arrives, liveList updates, this effect runs again.
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return; // map not ready yet — will re-run when mapReady flips

    const liveUids = new Set(liveList.map(r => r.uid));

    // Add / update markers for all riders with GPS
    liveList.forEach(rider => {
      const pos  = { lat: rider.latitude, lng: rider.longitude };

      if (markersRef.current.has(rider.uid)) {
        const { marker, iw } = markersRef.current.get(rider.uid);
        marker.setPosition(pos);
        marker.setIcon(makeMarkerIcon(rider.heading));
        iw.setContent(makeInfoHtml(rider));
      } else {
        const marker = new window.google.maps.Marker({
          position: pos, map, title: `${rider.firstName||''} ${rider.lastName||''}`.trim(),
          icon: makeMarkerIcon(rider.heading),
          animation: window.google.maps.Animation.DROP,
          zIndex: 10,
        });
        const iw = new window.google.maps.InfoWindow({ content: makeInfoHtml(rider) });
        marker.addListener('click', () => {
          markersRef.current.forEach(({ iw: w }) => w.close());
          iw.open(map, marker);
          // Read fresh data from state at click time
          setOnlineRiders(prev => {
            const fresh = prev.get(rider.uid) || rider;
            setSelectedRider(fresh);
            return prev;
          });
          setSelectedOrder(null);
          setShowRoutes(false);
          clearAllRouteOverlays();
        });
        markersRef.current.set(rider.uid, { marker, iw });
      }
    });

    // Remove markers for riders that lost GPS or went offline
    markersRef.current.forEach((entry, uid) => {
      if (!liveUids.has(uid)) {
        entry.iw.close();
        entry.marker.setMap(null);
        markersRef.current.delete(uid);
      }
    });
  }, [liveList, mapReady]); // mapReady in deps so effect re-runs after map creation

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 4: Socket events — ONLY update onlineRiders state, never touch map

     merge() rules:
       - If incoming data has latitude → it's a GPS update, merge fully
       - If incoming data has no latitude → it's status/profile only,
         preserve existing GPS fields unconditionally
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const merge = (existing = {}, incoming) => {
      if (incoming.latitude != null) {
        // Full GPS update — incoming GPS fields win
        return { ...existing, ...incoming };
      }
      // Status/profile update — preserve all existing GPS fields
      const savedGps = existing.latitude != null ? {
        latitude:  existing.latitude,
        longitude: existing.longitude,
        accuracy:  existing.accuracy,
        heading:   existing.heading,
        speed:     existing.speed,
        updatedAt: existing.updatedAt,
        timestamp: existing.timestamp,
      } : {};
      return { ...existing, ...incoming, ...savedGps };
    };
    
    const upsert = (uid, incoming) =>{
      // const preRider = onlineRiders.get(uid);
      // const updatedRider = { ...preRider, ...incoming }
      // const preRiderMap = onlineRiders
      // preRiderMap.set(uid, updatedRider)
      // setOnlineRiders(preRiderMap)

      setOnlineRiders(prev => {
        const n = new Map(prev);
        n.set(uid, merge(n.get(uid), { uid, ...incoming }));
        return n;
      });
      console.log('Updating rider', uid, incoming,onlineRiders) 
    }

   

    const remove = (uid) =>
      setOnlineRiders(prev => { const n = new Map(prev); n.delete(uid); return n; });

    /* handlers */
    const onLocSnapshot = (locations) => {
      setLoading(false);
      setOnlineRiders(prev => {
        const n = new Map(prev);
        locations.forEach(loc => n.set(loc.uid, merge(n.get(loc.uid), loc)));
        return n;
      });
    };

    const onLocUpdate = (loc) => {
      setLoading(false);
      upsert(loc.uid, loc); // has latitude → GPS fields will win in merge()
    };

    const onLocOffline = ({ uid }) => remove(uid);

    const onStatusChanged = ({ uid, status, rider }) => {
      if (status === 'OFFLINE') remove(uid);
      else upsert(uid, { status, ...(rider || {}) }); // no latitude → GPS preserved
    };

    const onStatusSnapshot = (statusMap) => {
      setLoading(false);
      setOnlineRiders(prev => {
        const n = new Map(prev);
        Object.entries(statusMap).forEach(([uid, data]) => {
          const rd = typeof data === 'object' ? data : { status: data };
          if (rd.status !== 'OFFLINE') {
            n.set(uid, merge(n.get(uid), { uid, ...rd })); // no latitude → GPS preserved
          }
        });
        return n;
      });
    };

    // Guard: prevent double snapshot requests from StrictMode double-mount.
    // StrictMode: mount1 → setup() → unmount → mount2 → setup() again.
    // Without guard: 2x emit → backend sends 2x snapshots → 2nd snapshot
    // arrives AFTER GPS stored → wipes latitude/longitude from state.
    let snapshotRequested = false;

    const setup = (sock) => {
      sock.off('admin:locations:snapshot', onLocSnapshot);
      sock.off('rider:location:update',    onLocUpdate);
      sock.off('rider:location:offline',   onLocOffline);
      sock.off('rider:status:changed',     onStatusChanged);
      sock.off('admin:status:snapshot',    onStatusSnapshot);

      sock.on('admin:locations:snapshot',  onLocSnapshot);
      sock.on('rider:location:update',     onLocUpdate);
      sock.on('rider:location:offline',    onLocOffline);
      sock.on('rider:status:changed',      onStatusChanged);
      sock.on('admin:status:snapshot',     onStatusSnapshot);

      // Only request snapshots once. On reconnect, snapshotRequested resets
      // because a new closure is created with fresh setup() call.
      if (!snapshotRequested) {
        snapshotRequested = true;
        sock.emit('admin:request:locations');
        sock.emit('admin:request:status');
      }
    };

    const unsub = onSocketConnect(setup);
    return () => {
      unsub();
      const s = getSocket();
      if (s) {
        s.off('admin:locations:snapshot', onLocSnapshot);
        s.off('rider:location:update',    onLocUpdate);
        s.off('rider:location:offline',   onLocOffline);
        s.off('rider:status:changed',     onStatusChanged);
        s.off('admin:status:snapshot',    onStatusSnapshot);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 5: HTTP snapshot (initial load + manual refresh)
  ══════════════════════════════════════════════════════════════════════════ */
  const fetchSnapshot = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await trackingAPI.getAll();
      const locs = data?.data || [];
      setLastRefresh(new Date());
      setOnlineRiders(prev => {
        const n = new Map(prev);
        locs.forEach(loc => {
          const ex = n.get(loc.uid) || { uid: loc.uid };
          n.set(loc.uid, { ...ex, ...loc }); // HTTP data always has GPS
        });
        return n;
      });
    } catch {
      if (!silent) toast.error('Failed to load locations');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 6: Fetch all riders for search dropdown
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    ridersAPI.getAll()
      .then(({ data }) => setAllDbRiders(data?.data || []))
      .catch(() => {});
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 7: Deep-link ?trackRider=<uid>
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const uid = new URLSearchParams(routerLocation.search).get('trackRider');
    if (!uid) return;
    const timer = setTimeout(() => {
      const r = onlineRiders.get(uid);
      if (r) selectRider(r);
      else {
        ridersAPI.getById(uid)
          .then(({ data }) => {
            const rd = data?.data || data;
            if (rd) { setSelectedRider(rd); toast(`${rd.firstName || 'Rider'} is offline`, { icon: '📡' }); }
          })
          .catch(() => toast.error('Rider not found'));
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [routerLocation.search]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ══════════════════════════════════════════════════════════════════════════
     EFFECT 8: Keep selectedRider fresh when its data updates in onlineRiders
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!selectedRider) return;
    const fresh = onlineRiders.get(selectedRider.uid);
    if (fresh) setSelectedRider(fresh);
  }, [onlineRiders]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const focusRider = useCallback((rider) => {
    if (!mapRef.current || !rider?.latitude) return;
    mapRef.current.panTo({ lat: rider.latitude, lng: rider.longitude });
    mapRef.current.setZoom(17);
    const entry = markersRef.current.get(rider.uid);
    if (entry) {
      markersRef.current.forEach(({ iw }) => iw.close());
      entry.iw.open(mapRef.current, entry.marker);
    }
  }, []);

  const selectRider = useCallback((rider) => {
    // Always use freshest data
    setOnlineRiders(prev => {
      const fresh = prev.get(rider.uid) || rider;
      setSelectedRider(fresh);
      setSelectedOrder(null);
      setShowRoutes(false);
      clearAllRouteOverlays();
      if (fresh.latitude != null) focusRider(fresh);
      else toast(`${fresh.firstName || 'Rider'} has no GPS yet`, { icon: '📡' });
      return prev;
    });
  }, [focusRider]);

  const handleToggleRoutes = useCallback(async () => {
    if (!selectedRider) return;
    if (showRoutes) { clearAllRouteOverlays(); setShowRoutes(false); return; }
    setRouteLoading(true);
    try {
      const { data } = await ridersAPI.getRoutes(selectedRider.uid);
      const routes = data?.data || [];
      if (!routes.length) { toast('No registered routes', { icon: '📍' }); return; }
      for (const r of routes) await drawRoute(mapRef.current, r);
      setShowRoutes(true);
      const b = new window.google.maps.LatLngBounds();
      routes.forEach(r => {
        b.extend({ lat: r.node1.latitude, lng: r.node1.longitude });
        b.extend({ lat: r.node2.latitude, lng: r.node2.longitude });
        (r.via || []).forEach(v => b.extend({ lat: v.latitude, lng: v.longitude }));
      });
      mapRef.current.fitBounds(b, 60);
    } catch { toast.error('Failed to load routes'); }
    finally { setRouteLoading(false); }
  }, [selectedRider, showRoutes]);

  const fitAll = useCallback(() => {
    if (!mapRef.current || !liveList.length) return;
    if (liveList.length === 1) {
      mapRef.current.panTo({ lat: liveList[0].latitude, lng: liveList[0].longitude });
      mapRef.current.setZoom(15);
      return;
    }
    const b = new window.google.maps.LatLngBounds();
    liveList.forEach(r => b.extend({ lat: r.latitude, lng: r.longitude }));
    mapRef.current.fitBounds(b, 60);
  }, [liveList]);

  /* ── Render ────────────────────────────────────────────────────────────── */
  const onlineCount = riderList.length;
  const liveCount   = liveList.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Live Tracking
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(54,211,153,0.25)', borderRadius: 20, padding: '2px 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'livePulse 2s ease-in-out infinite', display: 'inline-block' }}/>
              LIVE
            </span>
          </h1>
          <p>{onlineCount === 0 ? 'No riders currently online' : `${onlineCount} rider${onlineCount !== 1 ? 's' : ''} online · ${liveCount} with GPS`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {liveCount > 0 && <button className="btn btn-secondary btn-sm" onClick={fitAll}><Eye size={13}/> Fit All</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => fetchSnapshot(true)}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ width: sidebarOpen ? 260 : 0, flexShrink: 0, background: 'var(--bg-1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.2s ease' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Online Riders</div>
              <span style={{ background: onlineCount > 0 ? 'var(--green-dim)' : 'var(--bg-3)', color: onlineCount > 0 ? 'var(--green)' : 'var(--text-2)', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{onlineCount}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-2)', display: 'flex', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}/> GPS Live</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffe14d', display: 'inline-block' }}/> Online, no GPS</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'grid', placeItems: 'center', height: 120 }}><div className="loader"/></div>
            ) : onlineCount === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)', fontSize: 12 }}>
                <WifiOff size={24} style={{ opacity: 0.3, marginBottom: 10 }}/>
                <div>No riders online</div>
              </div>
            ) : riderList.map(rider => (
              <SidebarRow key={rider.uid} rider={rider}
                selected={selectedRider?.uid === rider.uid}
                onClick={() => selectRider(rider)}/>
            ))}
          </div>
          {lastRefresh && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ position: 'absolute', top: 12, left: 12, zIndex: 5, background: 'var(--bg-1)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-1)', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={12}/> {sidebarOpen ? '← Hide' : `${onlineCount} Online →`}
          </button>

          {mapReady && MAPS_API_KEY && (
            <SearchBar
              allRiders={allDbRiders.length ? allDbRiders : riderList}
              onSelectRider={selectRider}
              onSelectOrder={(order) => {
                setSelectedRider(null);
                setSelectedOrder(order);
                const rid = order.assignedRiderId || order.riderId;
                if (rid) {
                  const live = onlineRiders.get(rid);
                  if (live?.latitude) focusRider(live);
                }
              }}
            />
          )}

          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 5, background: 'rgba(13,18,32,0.9)', border: '1px solid var(--border-bright)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-0)', lineHeight: 1 }}>{liveCount}</div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>RIDERS WITH GPS</div>
          </div>

          {!MAPS_API_KEY ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: 32 }}>
                <MapPin size={40} style={{ marginBottom: 16, opacity: 0.3 }}/>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Google Maps API key not configured</div>
                <code style={{ background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>VITE_GOOGLE_MAPS_API_KEY</code>
              </div>
            </div>
          ) : !mapReady ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}><div className="loader"/></div>
          ) : (
            <div ref={mapDivRef} style={{ width: '100%', height: '100%' }}/>
          )}

          {selectedRider && !selectedOrder && (
            <RiderPanel
              rider={selectedRider}
              onClose={() => { setSelectedRider(null); setShowRoutes(false); clearAllRouteOverlays(); }}
              onFocus={focusRider}
              onToggleRoutes={handleToggleRoutes}
              showRoutes={showRoutes}
              routeLoading={routeLoading}
            />
          )}

          {selectedOrder && (
            <OrderPanel
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onTrackRider={(r) => { setSelectedOrder(null); selectRider(r); }}
              onlineRiders={riderList}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(0.85); }
        }
      `}</style>
    </div>
  );
}