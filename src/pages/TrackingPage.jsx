import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw, Navigation, Users, Wifi, WifiOff,
  X, MapPin, Crosshair, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { trackingAPI } from '../services/api';
import { getSocket } from '../services/socketService';

/* ─── Google Maps loader ─────────────────────────────────────────────────── */
let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks = [];

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) { resolve(window.google); return; }
    mapsCallbacks.push({ resolve, reject });
    if (mapsLoading) return;
    mapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.onload = () => {
      mapsLoaded = true; mapsLoading = false;
      mapsCallbacks.forEach(cb => cb.resolve(window.google));
      mapsCallbacks.length = 0;
    };
    script.onerror = (e) => {
      mapsLoading = false;
      mapsCallbacks.forEach(cb => cb.reject(e));
      mapsCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1220' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6785' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2235' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#131929' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#252f45' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#05080f' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4d9fff' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ba8c4' }] },
];

const DEFAULT_CENTER = { lat: 19.0760, lng: 72.8777 };

/* ─── Rider info panel ───────────────────────────────────────────────────── */
function RiderPanel({ rider, onClose, onFocus }) {
  if (!rider) return null;
  const name = `${rider.firstName || ''} ${rider.lastName || ''}`.trim() || 'Unknown';
  const since = rider.timestamp ? new Date(rider.timestamp).toLocaleTimeString() : '—';
  const speedKmh = rider.speed != null ? (rider.speed * 3.6).toFixed(1) : null;

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, right: 16,
      background: 'var(--bg-1)', border: '1px solid var(--border-bright)',
      borderRadius: 14, padding: '14px 16px', zIndex: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--accent-dim)', display: 'grid', placeItems: 'center',
          }}>
            <Navigation size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-0)' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
              {rider.phoneNumber || rider.uid?.slice(0, 10)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onFocus(rider)}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '5px 10px', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Crosshair size={12} /> Focus
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 4 }}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Vehicle', value: rider.vehicleType || '—' },
          { label: 'Speed', value: speedKmh != null ? `${speedKmh} km/h` : '—' },
          { label: 'Updated', value: since },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <MapPin size={10} />
        {rider.latitude?.toFixed(6)}, {rider.longitude?.toFixed(6)}
        {rider.accuracy ? ` ± ${rider.accuracy.toFixed(0)}m` : ''}
      </div>
    </div>
  );
}

/* ─── Rider list sidebar item ────────────────────────────────────────────── */
function RiderListItem({ rider, selected, onClick }) {
  const name = `${rider.firstName || ''} ${rider.lastName || ''}`.trim() || 'Unknown';
  const since = rider.updatedAt ? new Date(rider.updatedAt).toLocaleTimeString() : '';
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: selected ? 'var(--accent-dim)' : 'transparent',
        transition: 'background 0.15s',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: 'var(--green)',
        boxShadow: '0 0 6px var(--green)',
        animation: 'livePulse 2s ease-in-out infinite',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{rider.vehicleType || '—'} · {since}</div>
      </div>
      <Navigation size={13} style={{ color: selected ? 'var(--accent)' : 'var(--text-2)', flexShrink: 0 }} />
    </div>
  );
}

/* ─── Main TrackingPage ──────────────────────────────────────────────────── */
export default function TrackingPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef(new Map()); // uid → {marker, infoWindow}
  const [mapsReady, setMapsReady] = useState(mapsLoaded);
  const [riders, setRiders] = useState([]); // array of RiderLocation enriched
  const [selectedRider, setSelectedRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  /* Load Maps SDK */
  useEffect(() => {
    if (!MAPS_API_KEY) return;
    loadGoogleMaps(MAPS_API_KEY)
      .then(() => setMapsReady(true))
      .catch(() => toast.error('Failed to load Google Maps'));
  }, []);

  /* Init map */
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      styles: DARK_STYLE,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });
  }, [mapsReady]);

  /* Fetch initial snapshot from REST */
  const fetchSnapshot = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await trackingAPI.getAll();
      const locs = data?.data || [];
      setRiders(locs);
      setLastRefresh(new Date());
      // Put all markers on map
      locs.forEach(loc => upsertMarker(loc));
      // Remove stale markers
      const activeUids = new Set(locs.map(l => l.uid));
      markersRef.current.forEach((_, uid) => {
        if (!activeUids.has(uid)) removeMarker(uid);
      });
    } catch {
      if (!silent) toast.error('Failed to load rider locations');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);

  /* Socket: live location updates */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Request snapshot via socket too (fast path)
    socket.emit('admin:request:locations');

    const onSnapshot = (locations) => {
      setRiders(locations);
      locations.forEach(loc => upsertMarker(loc));
    };

    const onUpdate = (location) => {
      setRiders(prev => {
        const existing = prev.findIndex(r => r.uid === location.uid);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], ...location };
          return updated;
        }
        return [...prev, location];
      });
      upsertMarker(location);
      // Update selected rider panel if this is the one being viewed
      setSelectedRider(prev => prev?.uid === location.uid ? { ...prev, ...location } : prev);
    };

    const onOffline = ({ uid }) => {
      setRiders(prev => prev.filter(r => r.uid !== uid));
      removeMarker(uid);
      setSelectedRider(prev => prev?.uid === uid ? null : prev);
    };

    socket.on('admin:locations:snapshot', onSnapshot);
    socket.on('rider:location:update', onUpdate);
    socket.on('rider:location:offline', onOffline);

    return () => {
      socket.off('admin:locations:snapshot', onSnapshot);
      socket.off('rider:location:update', onUpdate);
      socket.off('rider:location:offline', onOffline);
    };
  }, []);

  /* Create or update a rider marker on the map */
  const upsertMarker = useCallback((loc) => {
    if (!mapInstance.current) return;
    const pos = { lat: loc.latitude, lng: loc.longitude };
    const name = `${loc.firstName || ''} ${loc.lastName || ''}`.trim() || `Rider ${loc.uid?.slice(0, 6)}`;

    if (markersRef.current.has(loc.uid)) {
      // Update position with smooth animation
      const { marker, infoWindow } = markersRef.current.get(loc.uid);
      marker.setPosition(pos);
      // Update info window content
      infoWindow.setContent(buildInfoContent(loc, name));
    } else {
      // Create new marker
      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        title: name,
        icon: buildRiderIcon(loc),
        animation: window.google.maps.Animation.DROP,
        zIndex: 10,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: buildInfoContent(loc, name),
      });

      marker.addListener('click', () => {
        // Close all open info windows first
        markersRef.current.forEach(({ infoWindow: iw }) => iw.close());
        infoWindow.open(mapInstance.current, marker);
        setSelectedRider(loc);
      });

      markersRef.current.set(loc.uid, { marker, infoWindow });
    }
  }, []);

  const removeMarker = useCallback((uid) => {
    if (markersRef.current.has(uid)) {
      const { marker, infoWindow } = markersRef.current.get(uid);
      infoWindow.close();
      marker.setMap(null);
      markersRef.current.delete(uid);
    }
  }, []);

  const buildRiderIcon = (loc) => ({
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: '#00e5a0',
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 1.5,
    rotation: loc.heading || 0,
    anchor: new window.google.maps.Point(0, 2.5),
  });

  const buildInfoContent = (loc, name) => {
    const speedKmh = loc.speed != null ? (loc.speed * 3.6).toFixed(0) : null;
    return `
      <div style="font-family:Inter,sans-serif;color:#0d1220;min-width:160px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${name}</div>
        ${loc.vehicleType ? `<div style="font-size:11px;color:#666;">${loc.vehicleType}</div>` : ''}
        ${speedKmh != null ? `<div style="font-size:11px;color:#666;">🏃 ${speedKmh} km/h</div>` : ''}
        <div style="font-size:10px;color:#999;margin-top:4px;font-family:monospace;">
          ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}
        </div>
      </div>
    `;
  };

  const focusRider = (rider) => {
    if (!mapInstance.current || !rider) return;
    mapInstance.current.panTo({ lat: rider.latitude, lng: rider.longitude });
    mapInstance.current.setZoom(17);
    // Open info window
    const entry = markersRef.current.get(rider.uid);
    if (entry) {
      markersRef.current.forEach(({ infoWindow: iw }) => iw.close());
      entry.infoWindow.open(mapInstance.current, entry.marker);
    }
  };

  /* Fit all riders in view */
  const fitAll = () => {
    if (!mapInstance.current || riders.length === 0) return;
    if (riders.length === 1) {
      mapInstance.current.panTo({ lat: riders[0].latitude, lng: riders[0].longitude });
      mapInstance.current.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    riders.forEach(r => bounds.extend({ lat: r.latitude, lng: r.longitude }));
    mapInstance.current.fitBounds(bounds, 60);
  };

  const onlineCount = riders.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Live Tracking
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontFamily: 'var(--font-mono)',
              background: 'var(--green-dim)', color: 'var(--green)',
              border: '1px solid rgba(54,211,153,0.25)',
              borderRadius: 20, padding: '2px 10px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'livePulse 2s ease-in-out infinite', display: 'inline-block' }} />
              LIVE
            </span>
          </h1>
          <p>
            {onlineCount === 0
              ? 'No riders currently online'
              : `${onlineCount} rider${onlineCount !== 1 ? 's' : ''} online — locations update every 5 seconds`
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {riders.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={fitAll}>
              <Eye size={13} /> Fit All
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => fetchSnapshot(true)}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? 260 : 0,
          flexShrink: 0,
          background: 'var(--bg-1)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Online Riders
              </div>
              <span style={{
                background: onlineCount > 0 ? 'var(--green-dim)' : 'var(--bg-3)',
                color: onlineCount > 0 ? 'var(--green)' : 'var(--text-2)',
                borderRadius: 20, padding: '1px 8px', fontSize: 11, fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}>
                {onlineCount}
              </span>
            </div>
          </div>

          {/* Rider list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'grid', placeItems: 'center', height: 120 }}>
                <div className="loader" />
              </div>
            ) : onlineCount === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)', fontSize: 12 }}>
                <WifiOff size={24} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div>No riders online</div>
              </div>
            ) : riders.map(rider => (
              <RiderListItem
                key={rider.uid}
                rider={rider}
                selected={selectedRider?.uid === rider.uid}
                onClick={() => {
                  setSelectedRider(rider);
                  focusRider(rider);
                }}
              />
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

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 5,
              background: 'var(--bg-1)', border: '1px solid var(--border-bright)',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: 'var(--text-1)', fontSize: 11, fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Users size={12} />
            {sidebarOpen ? '← Hide' : `${onlineCount} Online →`}
          </button>

          {/* Stats overlay */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 5,
            background: 'rgba(13,18,32,0.9)', border: '1px solid var(--border-bright)',
            borderRadius: 10, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-0)', lineHeight: 1 }}>
              {onlineCount}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              RIDERS ONLINE
            </div>
          </div>

          {/* Map */}
          {!MAPS_API_KEY ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: 32 }}>
                <MapPin size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Google Maps API key not configured</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 360, lineHeight: 1.6 }}>
                  Add <code style={{ background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>VITE_GOOGLE_MAPS_API_KEY</code> to your admin app's <code>.env</code> file and restart the dev server.
                </div>
              </div>
            </div>
          ) : !mapsReady ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}>
              <div className="loader" />
            </div>
          ) : (
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          )}

          {/* Selected rider info panel */}
          {selectedRider && (
            <RiderPanel
              rider={selectedRider}
              onClose={() => setSelectedRider(null)}
              onFocus={focusRider}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
