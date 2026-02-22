import React, { useState, useEffect, useRef } from 'react';
import { Package, RefreshCw, X, CheckCircle, Truck, KeyRound, MapPin, Navigation, ExternalLink, Images, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ─── Google Maps helpers ──────────────────────────────────────────────────── */

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return; }
    const existing = document.getElementById('gmap-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/* ─── Item Images Gallery ──────────────────────────────────────────────────── */
function ItemImages({ images }) {
  const [current, setCurrent] = React.useState(0);
  const [lightbox, setLightbox] = React.useState(false);
  if (!images || images.length === 0) return null;
  const prev = (e) => { e.stopPropagation(); setCurrent(i => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setCurrent(i => (i + 1) % images.length); };
  return (
    <>
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          <Images size={11} /> {images.length} PHOTO{images.length > 1 ? 'S' : ''}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {images.map((url, i) => (
            <div
              key={i}
              onClick={() => { setCurrent(i); setLightbox(true); }}
              style={{
                width: 64, height: 64, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                border: i === current ? '2px solid var(--accent)' : '2px solid var(--border)',
                flexShrink: 0, transition: 'border-color 0.15s',
              }}
            >
              <img src={url} alt={`item-photo-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button onClick={() => setLightbox(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
          {images.length > 1 && (
            <>
              <button onClick={prev} style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} /></button>
              <button onClick={next} style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} /></button>
            </>
          )}
          <img
            src={images[current]} alt="full" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}
          />
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
              {images.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setCurrent(i); }} style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? 'var(--accent, #fff)' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all 0.2s' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Order Map Component ──────────────────────────────────────────────────── */

function OrderMap({ order }) {
  const mapRef  = useRef(null);
  const mapObj  = useRef(null);
  const riderMarkerRef = useRef(null);
  const [ready, setReady] = useState(false);

  const pickupLat = order.senderNode?.latitude;
  const pickupLng = order.senderNode?.longitude;
  const dropLat   = order.receiverNode?.latitude;
  const dropLng   = order.receiverNode?.longitude;

  useEffect(() => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) return;

    loadGoogleMaps().then(maps => {
      const pickupPos = { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) };
      const dropPos   = { lat: parseFloat(dropLat),   lng: parseFloat(dropLng)   };

      const map = new maps.Map(mapRef.current, {
        zoom: 13,
        center: pickupPos,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb0' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c2433' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c3a4f' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080e18' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapObj.current = map;

      // Pickup marker (green)
      new maps.Marker({
        position: pickupPos,
        map,
        title: 'Pickup',
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#00e5a0',
          fillOpacity: 1,
          strokeColor: '#131929',
          strokeWeight: 2,
        },
        label: { text: 'P', color: '#131929', fontSize: '10px', fontWeight: 'bold' },
      });

      // Drop marker (red)
      new maps.Marker({
        position: dropPos,
        map,
        title: 'Drop',
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ff4d6d',
          fillOpacity: 1,
          strokeColor: '#131929',
          strokeWeight: 2,
        },
        label: { text: 'D', color: '#fff', fontSize: '10px', fontWeight: 'bold' },
      });

      // Route line
      const directionsService  = new maps.DirectionsService();
      const directionsRenderer = new maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#e8ff47',
          strokeOpacity: 0.7,
          strokeWeight: 3,
        },
      });

      directionsService.route(
        { origin: pickupPos, destination: dropPos, travelMode: maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === 'OK') directionsRenderer.setDirections(result);
          else {
            new maps.Polyline({
              path: [pickupPos, dropPos], map,
              strokeColor: '#e8ff47', strokeOpacity: 0.5, strokeWeight: 2,
            });
          }
        }
      );

      // Fit bounds
      const bounds = new maps.LatLngBounds();
      bounds.extend(pickupPos);
      bounds.extend(dropPos);
      map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });

      setReady(true);
    }).catch(() => {});
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  if (!pickupLat || !pickupLng || !dropLat || !dropLng) return null;

  const navToPickup = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}&travelmode=driving`, '_blank');
  const navToDrop   = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${dropLat},${dropLng}&travelmode=driving`, '_blank');

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Map */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 180 }}>
        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--bg-2)', zIndex: 1 }}>
            <div className="loader" />
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 8, left: 8, zIndex: 2,
          background: 'rgba(13,17,23,0.85)', borderRadius: 8, padding: '4px 9px',
          display: 'flex', gap: 10, fontSize: 10, fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ color: '#00e5a0' }}>● Pickup</span>
          <span style={{ color: '#ff4d6d' }}>● Drop</span>
        </div>
      </div>

      {/* Navigate buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, fontSize: 12 }}
          onClick={navToPickup}
        >
          <Navigation size={12} style={{ color: '#00e5a0' }} />
          Navigate to Pickup
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, fontSize: 12 }}
          onClick={navToDrop}
        >
          <Navigation size={12} style={{ color: '#ff4d6d' }} />
          Navigate to Drop
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const statusBadge = (status) => {
  const map = {
    PLACED: 'blue', DISPATCHED: 'orange', DELIVERED: 'green',
    CANCELLED: 'red', DRAFT: 'neutral',
  };
  return <span className={`badge ${map[status] || 'neutral'}`}>{status}</span>;
};

function OtpInput({ label, onSubmit, loading }) {
  const [otp, setOtp] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
      <input
        className="form-input"
        placeholder={`Enter ${label} OTP`}
        value={otp}
        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        style={{ flex: 1, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', fontSize: 16 }}
        maxLength={6}
      />
      <button className="btn btn-primary btn-sm" onClick={() => { onSubmit(otp); setOtp(''); }} disabled={loading || otp.length < 4}>
        <CheckCircle size={13} />
        Confirm
      </button>
    </div>
  );
}

/* ─── Order Card ───────────────────────────────────────────────────────────── */

function OrderCard({ order, onAction, loading }) {
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [showDeliver, setShowDeliver] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const status = order.status;
  const id = order.orderId || order.id;

  const pickupAddr = [
    order.senderNode?.buildingOrFlat,
    order.senderNode?.street,
    order.senderNode?.area,
    order.senderNode?.city,
  ].filter(Boolean).join(', ');

  const dropAddr = [
    order.receiverNode?.buildingOrFlat,
    order.receiverNode?.street,
    order.receiverNode?.area,
    order.receiverNode?.city,
  ].filter(Boolean).join(', ');

  const hasCoords = order.senderNode?.latitude && order.receiverNode?.latitude;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-8">
        <span className="code">#{(id || '').slice(-10)}</span>
        {statusBadge(status)}
      </div>

      {order.items?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}: {order.items.map(i => i.description || i.name || 'Item').join(', ')}
          </div>
          {/* Show images from all items */}
          {order.items.some(i => i.images?.length > 0) && (
            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '8px 10px' }}>
              {order.items.filter(i => i.images?.length > 0).map((item, i) => (
                <div key={i} style={{ marginBottom: i < order.items.filter(x => x.images?.length > 0).length - 1 ? 10 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>{item.name || `Item ${i+1}`}</div>
                  <ItemImages images={item.images} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Address summary */}
      {(pickupAddr || dropAddr) && (
        <div style={{ marginBottom: 10 }}>
          {pickupAddr && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5a0', flexShrink: 0, marginTop: 4 }} />
              <div style={{ fontSize: 12, color: 'var(--text-1)' }}>{pickupAddr}</div>
            </div>
          )}
          {dropAddr && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d6d', flexShrink: 0, marginTop: 4 }} />
              <div style={{ fontSize: 12, color: 'var(--text-1)' }}>{dropAddr}</div>
            </div>
          )}
        </div>
      )}

      {/* Map toggle */}
      {hasCoords && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 10, width: '100%', justifyContent: 'center', gap: 6 }}
          onClick={() => setShowMap(v => !v)}
        >
          <MapPin size={12} style={{ color: 'var(--accent)' }} />
          {showMap ? 'Hide Map' : 'Show on Map'}
        </button>
      )}

      {/* Map */}
      {showMap && hasCoords && <OrderMap order={order} />}

      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
        Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
      </div>

      {/* Actions */}
      {status === 'PLACED' && (
        <div className="flex gap-8">
          <button className="btn btn-primary btn-sm flex-1" disabled={loading} onClick={() => onAction('accept', id)}>
            <Truck size={13} /> Accept Order
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowCancel(true)}>
            <X size={13} />
          </button>
        </div>
      )}

      {status === 'DISPATCHED' && (
        <div className="flex flex-col gap-8">
          {!showHandover && !showDeliver && (
            <div className="flex gap-8">
              <button className="btn btn-primary btn-sm flex-1" onClick={() => setShowHandover(true)}>
                <KeyRound size={13} /> Pickup Handover
              </button>
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => setShowDeliver(true)}>
                <CheckCircle size={13} /> Deliver
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setShowCancel(true)}>
                <X size={13} />
              </button>
            </div>
          )}
          {showHandover && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>Enter pickup OTP from sender:</div>
              <OtpInput label="Pickup" loading={loading}
                onSubmit={otp => { onAction('handover', id, otp); setShowHandover(false); }} />
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setShowHandover(false)}>Cancel</button>
            </div>
          )}
          {showDeliver && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>Enter drop OTP from recipient:</div>
              <OtpInput label="Drop" loading={loading}
                onSubmit={otp => { onAction('deliver', id, otp); setShowDeliver(false); }} />
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setShowDeliver(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {showCancel && (
        <div style={{ marginTop: 10, background: 'var(--bg-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Reason for cancellation:</div>
          <textarea className="form-textarea" placeholder="Optional reason..." value={cancelReason}
            onChange={e => setCancelReason(e.target.value)} style={{ minHeight: 60 }} />
          <div className="flex gap-8" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm flex-1" onClick={() => setShowCancel(false)}>Back</button>
            <button className="btn btn-danger btn-sm flex-1" disabled={loading}
              onClick={() => { onAction('cancel', id, cancelReason); setShowCancel(false); }}>
              Cancel Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Orders Page ──────────────────────────────────────────────────────────── */

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState('available');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getAvailable();
      setOrders(res.data?.data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleAction = async (action, orderId, extra) => {
    setActionLoading(true);
    try {
      if (action === 'accept') {
        await ordersAPI.accept(orderId);
        toast.success('Order accepted!');
      } else if (action === 'cancel') {
        await ordersAPI.cancelDelivery(orderId, extra);
        toast.success('Delivery cancelled');
      } else if (action === 'handover') {
        await ordersAPI.handover(orderId, extra);
        toast.success('Pickup confirmed! Parcel collected.');
      } else if (action === 'deliver') {
        await ordersAPI.deliver(orderId, extra);
        toast.success('Order delivered! Great work!');
      }
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const tabs = ['available', 'dispatched'];

  const filtered = orders.filter(o => {
    if (tab === 'available') return o.status === 'PLACED';
    if (tab === 'dispatched') return o.status === 'DISPATCHED';
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Orders</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Accept and manage deliveries</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchOrders} style={{ padding: 8 }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-2)', padding: 4, borderRadius: 10 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === t ? 'var(--bg-1)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-2)',
              transition: 'all 0.15s ease',
            }}>
            {t === 'available' ? 'Available' : 'In Progress'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="loader" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Package size={22} /></div>
          <h3>{tab === 'available' ? 'No available orders' : 'No active deliveries'}</h3>
          <p>{tab === 'available' ? 'Go online to receive orders' : 'Accept an order to see it here'}</p>
        </div>
      ) : (
        filtered.map(order => (
          <OrderCard key={order.orderId || order.id} order={order} onAction={handleAction} loading={actionLoading} />
        ))
      )}
    </div>
  );
}