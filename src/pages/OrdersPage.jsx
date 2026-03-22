import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Package, RefreshCw, X, Search, Plus, FileText,
  MapPin, Navigation, ChevronLeft, ChevronRight,
  User, Bike, Clock, CheckCircle, XCircle, Lock,
  ArrowRight, Images, Eye, ChevronDown, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersAPI, ridersAPI } from '../services/api';
import { StatusBadge } from './DashboardPage';

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_STATUSES = ['ALL', 'DRAFT', 'PLACED', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
// Note: ITEM_TYPES, ITEM_CATS, ITEM_SIZES are now admin-configured via Item Catalog.
// In this page they are only used for display labels — keeping a fallback list for legacy orders.
const ITEM_TYPES   = ['FRAGILE','NON_FRAGILE','PERISHABLE','NON_PERISHABLE','ELECTRONICS','CLOTHING','MEDICAL','DOCUMENT','FOOD','OTHER'];
const ITEM_CATS    = ['DOCUMENT','FOOD','GROCERY','ELECTRONICS','CLOTHING','MEDICAL','PERISHABLE','OTHER'];
const ITEM_SIZES   = ['MINI','SMALL','MEDIUM','LARGE','EXTRA_LARGE'];
const PAY_MODES    = ['COD','UPI','CARD','NET_BANKING','WALLET'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtShort = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
const addrStr = (node) => node ? [node.buildingOrFlat, node.street, node.area, node.city].filter(Boolean).join(', ') : '—';
const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// ─── Google Maps loader ───────────────────────────────────────────────────────
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return; }
    const ex = document.getElementById('gmap-script');
    if (ex) { ex.addEventListener('load', () => resolve(window.google.maps)); ex.addEventListener('error', reject); return; }
    const s = document.createElement('script');
    s.id = 'gmap-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}`;
    s.async = true; s.defer = true;
    s.onload = () => resolve(window.google.maps);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── Item Images Gallery ──────────────────────────────────────────────────────
function ItemImages({ images }) {
  const [cur, setCur] = useState(0);
  const [lb, setLb]   = useState(false);
  if (!images?.length) return null;
  const prev = (e) => { e.stopPropagation(); setCur(i => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setCur(i => (i + 1) % images.length); };
  return (
    <>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
        {images.map((url, i) => (
          <div key={i} onClick={() => { setCur(i); setLb(true); }}
            style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: i === cur ? '2px solid var(--accent)' : '2px solid var(--border)', flexShrink: 0 }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
      {lb && (
        <div onClick={() => setLb(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setLb(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
          {images.length > 1 && <>
            <button onClick={prev} style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} /></button>
            <button onClick={next} style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} /></button>
          </>}
          <img src={images[cur]} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }} />
        </div>
      )}
    </>
  );
}

// ─── Mini Map ─────────────────────────────────────────────────────────────────
function OrderMap({ order }) {
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const pLat = order.senderNode?.latitude, pLng = order.senderNode?.longitude;
  const dLat = order.receiverNode?.latitude, dLng = order.receiverNode?.longitude;

  useEffect(() => {
    if (!pLat || !pLng || !dLat || !dLng) return;
    loadGoogleMaps().then(maps => {
      const pPos = { lat: parseFloat(pLat), lng: parseFloat(pLng) };
      const dPos = { lat: parseFloat(dLat), lng: parseFloat(dLng) };
      const map  = new maps.Map(mapRef.current, {
        zoom: 13, center: pPos, disableDefaultUI: true, zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb0' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c2433' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080e18' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        ],
      });
      new maps.Marker({ position: pPos, map, title: 'Pickup', icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#00e5a0', fillOpacity: 1, strokeColor: '#131929', strokeWeight: 2 }, label: { text: 'P', color: '#131929', fontSize: '10px', fontWeight: 'bold' } });
      new maps.Marker({ position: dPos, map, title: 'Drop',   icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#ff4d6d', fillOpacity: 1, strokeColor: '#131929', strokeWeight: 2 }, label: { text: 'D', color: '#fff',     fontSize: '10px', fontWeight: 'bold' } });
      const dr = new maps.DirectionsRenderer({ map, suppressMarkers: true, polylineOptions: { strokeColor: '#e8ff47', strokeOpacity: 0.7, strokeWeight: 3 } });
      new maps.DirectionsService().route({ origin: pPos, destination: dPos, travelMode: maps.TravelMode.DRIVING }, (r, s) => {
        if (s === 'OK') dr.setDirections(r);
        else new maps.Polyline({ path: [pPos, dPos], map, strokeColor: '#e8ff47', strokeOpacity: 0.5, strokeWeight: 2 });
      });
      const b = new maps.LatLngBounds(); b.extend(pPos); b.extend(dPos);
      map.fitBounds(b, { top: 24, right: 24, bottom: 24, left: 24 });
      setReady(true);
    }).catch(() => {});
  }, [pLat, pLng, dLat, dLng]);

  if (!pLat || !pLng || !dLat || !dLng) return null;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', height: 200, position: 'relative', border: '1px solid var(--border)' }}>
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--bg-2)', zIndex: 1 }}><div className="loader" /></div>}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 2, background: 'rgba(13,17,23,0.85)', borderRadius: 8, padding: '4px 9px', display: 'flex', gap: 10, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: '#00e5a0' }}>● Pickup</span>
        <span style={{ color: '#ff4d6d' }}>● Drop</span>
      </div>
      <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, display: 'flex', gap: 6 }}>
        <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}&travelmode=driving`, '_blank')}
          style={{ background: 'rgba(0,229,160,0.15)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#00e5a0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Navigation size={10} /> Pickup
        </button>
        <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${dLat},${dLng}&travelmode=driving`, '_blank')}
          style={{ background: 'rgba(255,77,109,0.15)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#ff4d6d', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Navigation size={10} /> Drop
        </button>
      </div>
    </div>
  );
}

// ─── OTP Badge ────────────────────────────────────────────────────────────────
function OtpBadge({ label, otp, color }) {
  const [show, setShow] = useState(false);
  if (!otp) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: color === 'green' ? 'var(--green-dim)' : 'var(--blue-dim)', border: `1px solid ${color === 'green' ? 'rgba(54,211,153,0.2)' : 'rgba(77,159,255,0.2)'}`, borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
      <Lock size={11} style={{ color: color === 'green' ? 'var(--green)' : 'var(--blue)' }} />
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      {show
        ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, letterSpacing: '0.15em', color: color === 'green' ? 'var(--green)' : 'var(--blue)' }}>{otp}</span>
        : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>••••••</span>}
      <button onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 0, display: 'flex', alignItems: 'center' }}>
        <Eye size={12} />
      </button>
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text-0)', textAlign: 'right', fontFamily: mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 16 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `var(--${color}-dim)`, display: 'grid', placeItems: 'center' }}>
        <Icon size={14} style={{ color: `var(--${color})` }} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-0)' }}>{title}</span>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function OrderTimeline({ order }) {
  const events = [
    { key: 'createdAt',    label: 'Order Created',       icon: Package,      color: 'accent' },
    { key: 'placedAt',     label: 'Order Placed',         icon: CheckCircle,  color: 'blue' },
    { key: 'readyAt',      label: 'Package Ready',        icon: CheckCircle,  color: 'orange' },
    { key: 'dispatchedAt', label: 'Picked Up (Dispatched)', icon: Bike,       color: 'purple' },
    { key: 'deliveredAt',  label: 'Delivered',            icon: CheckCircle,  color: 'green' },
    { key: 'cancelledAt',  label: 'Cancelled',            icon: XCircle,      color: 'red' },
  ].filter(e => order[e.key] || (e.key === 'createdAt'));

  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      {/* vertical line */}
      <div style={{ position: 'absolute', left: 8, top: 10, bottom: 10, width: 2, background: 'var(--border)', borderRadius: 1 }} />
      {events.map((ev, i) => {
        const time = order[ev.key];
        const Icon = ev.icon;
        return (
          <div key={ev.key} style={{ position: 'relative', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              position: 'absolute', left: -24, top: 0,
              width: 18, height: 18, borderRadius: '50%',
              background: time ? `var(--${ev.color}-dim)` : 'var(--bg-3)',
              border: `2px solid ${time ? `var(--${ev.color})` : 'var(--border)'}`,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Icon size={9} style={{ color: time ? `var(--${ev.color})` : 'var(--text-2)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: time ? 'var(--text-0)' : 'var(--text-2)' }}>{ev.label}</div>
              {time && <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{fmt(time)}</div>}
              {!time && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>Pending</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onCancel, cancelling }) {
  const [showMap, setShowMap]         = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const id       = order.orderId || order.id;
  const billing  = order.billing || {};
  const sender   = order.sender  || order.senderUser  || {};
  const receiver = order.receiver || order.receiverUser || {};
  const rider    = order.assignedRider || {};
  const hasCoords = order.senderNode?.latitude && order.receiverNode?.latitude;
  const canCancel = !['DELIVERED','CANCELLED'].includes(order.status);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ overflowY: 'auto', alignItems: 'flex-start', padding: '24px 0' }}>
      <div className="modal" style={{ maxWidth: 700, width: '95vw', maxHeight: 'none' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Order Details</div>
            <StatusBadge status={order.status} />
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ padding: '0 20px 20px' }}>

          {/* Order ID */}
          <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>ORDER ID</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{id}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <OtpBadge label="Pickup OTP" otp={order.pickupOtp} color="green" />
              <OtpBadge label="Drop OTP"   otp={order.dropOtp}   color="blue"  />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* LEFT COLUMN */}
            <div>
              {/* Sender */}
              <SectionHeader icon={User} title="Sender" color="accent" />
              <InfoRow label="Name"  value={[sender.firstName, sender.lastName].filter(Boolean).join(' ') || '—'} />
              <InfoRow label="Phone" value={sender.phoneNumber} mono />
              <InfoRow label="Email" value={sender.email} />
              <InfoRow label="UID"   value={sender.uid || order.senderUserId} mono />

              {/* Receiver */}
              <SectionHeader icon={User} title="Receiver" color="blue" />
              <InfoRow label="Name"  value={[receiver.firstName, receiver.lastName].filter(Boolean).join(' ') || '—'} />
              <InfoRow label="Phone" value={receiver.phoneNumber} mono />
              <InfoRow label="Email" value={receiver.email} />
              <InfoRow label="UID"   value={receiver.uid || order.receiverUserId} mono />

              {/* Rider */}
              <SectionHeader icon={Bike} title="Rider" color="purple" />
              {order.assignedRiderId
                ? <>
                    <InfoRow label="Name"     value={[rider.firstName, rider.lastName].filter(Boolean).join(' ') || '—'} />
                    <InfoRow label="Phone"    value={rider.phoneNumber} mono />
                    <InfoRow label="Rider ID" value={order.assignedRiderId} mono />
                    <InfoRow label="Vehicle"  value={rider.vehicleType} />
                  </>
                : <div style={{ fontSize: 12, color: 'var(--text-2)', padding: '6px 0' }}>No rider assigned yet</div>
              }

              {/* Billing */}
              <SectionHeader icon={CreditCard_icon} title="Billing" color="green" />
              <InfoRow label="Payment Mode"    value={billing.paymentMode || order.paymentMode} />
              <InfoRow label="Delivery Charge" value={billing.deliveryCharge != null ? `₹${billing.deliveryCharge}` : null} />
              <InfoRow label="GST"             value={billing.gst != null ? `₹${billing.gst}` : null} />
              <InfoRow label="Discount"        value={billing.discountAmount > 0 ? `-₹${billing.discountAmount}` : null} />
              <InfoRow label="Payable"         value={billing.payableAmount != null ? `₹${billing.payableAmount}` : null} />
              <InfoRow label="Billing Status"  value={billing.status} />
            </div>

            {/* RIGHT COLUMN */}
            <div>
              {/* Pickup */}
              <SectionHeader icon={MapPin} title="Pickup Location" color="green" />
              <InfoRow label="Building" value={order.senderNode?.buildingOrFlat} />
              <InfoRow label="Street"   value={order.senderNode?.street} />
              <InfoRow label="Area"     value={order.senderNode?.area} />
              <InfoRow label="City"     value={order.senderNode?.city} />
              <InfoRow label="Contact"  value={order.senderNode?.contactPerson} />
              <InfoRow label="Phone"    value={order.senderNode?.contactNumber} mono />
              {order.senderNode?.latitude && <InfoRow label="Coords" value={`${order.senderNode.latitude}, ${order.senderNode.longitude}`} mono />}

              {/* Drop */}
              <SectionHeader icon={MapPin} title="Drop Location" color="red" />
              <InfoRow label="Building" value={order.receiverNode?.buildingOrFlat} />
              <InfoRow label="Street"   value={order.receiverNode?.street} />
              <InfoRow label="Area"     value={order.receiverNode?.area} />
              <InfoRow label="City"     value={order.receiverNode?.city} />
              <InfoRow label="Contact"  value={order.receiverNode?.contactPerson} />
              <InfoRow label="Phone"    value={order.receiverNode?.contactNumber} mono />
              {order.receiverNode?.latitude && <InfoRow label="Coords" value={`${order.receiverNode.latitude}, ${order.receiverNode.longitude}`} mono />}

              {/* Map toggle */}
              {hasCoords && (
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8, gap: 6 }} onClick={() => setShowMap(v => !v)}>
                  <MapPin size={12} style={{ color: 'var(--accent)' }} />
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              )}
              {showMap && hasCoords && <div style={{ marginTop: 8 }}><OrderMap order={order} /></div>}

              {/* Timeline */}
              <SectionHeader icon={Clock} title="Tracking Timeline" color="orange" />
              <OrderTimeline order={order} />
            </div>
          </div>

          {/* Items */}
          {order.items?.length > 0 && (
            <>
              <SectionHeader icon={Package} title={`Items (${order.items.length})`} color="accent" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-0)', marginBottom: 6 }}>{item.name || `Item ${i+1}`}</div>
                    <InfoRow label="Qty"      value={item.quantity} />
                    <InfoRow label="Type"     value={item.type} />
                    <InfoRow label="Category" value={item.category} />
                    <InfoRow label="Size"     value={item.size} />
                    {item.description && <InfoRow label="Notes" value={item.description} />}
                    {item.images?.length > 0 && <ItemImages images={item.images} />}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Cancel Order */}
          {canCancel && (
            <div style={{ marginTop: 20, padding: 14, background: 'var(--red-dim)', borderRadius: 10, border: '1px solid rgba(255,77,109,0.15)' }}>
              {!confirmCancel
                ? <button className="btn btn-sm" style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.25)' }}
                    onClick={() => setConfirmCancel(true)}>
                    <XCircle size={13} /> Cancel This Order
                  </button>
                : <>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8, fontWeight: 600 }}>Reason for cancellation (optional)</div>
                    <textarea className="form-textarea" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                      placeholder="Reason..." style={{ minHeight: 56, marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(false)}>Back</button>
                      <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                        onClick={() => onCancel(id, cancelReason)} disabled={cancelling}>
                        {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                      </button>
                    </div>
                  </>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// Inline CreditCard icon (to avoid import conflict)
function CreditCard_icon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }

// ─── Place Order Modal (Admin) ─────────────────────────────────────────────────
const EMPTY_ADDR = { street: '', city: '', area: '', buildingOrFlat: '', state: '', postalCode: '', country: 'India', contactNumber: '', contactPerson: '', latitude: '', longitude: '' };
const EMPTY_ITEM = { name: '', quantity: 1, type: 'NON_FRAGILE', category: 'OTHER', size: 'SMALL' };

function PlaceOrderModal({ mode, onClose, onSuccess }) {
  const [form, setForm]     = useState({ senderUid: '', receiverPhone: '', receiverFirstName: '', receiverLastName: '', paymentMode: 'COD', pickup: { ...EMPTY_ADDR }, drop: { ...EMPTY_ADDR }, items: [{ ...EMPTY_ITEM }] });
  const [loading, setLoading] = useState(false);

  const set = (path, val) => {
    setForm(prev => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...prev, [path]: val };
      if (parts.length === 2) return { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: val } };
      if (parts[0] === 'items') {
        const idx = parseInt(parts[1]);
        const items = [...prev.items];
        items[idx] = { ...items[idx], [parts[2]]: val };
        return { ...prev, items };
      }
      return prev;
    });
  };

  const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    if (!form.senderUid.trim()) return toast.error('Sender UID is required');
    if (!form.receiverPhone.trim()) return toast.error('Receiver phone is required');
    if (!form.receiverFirstName.trim()) return toast.error('Receiver first name is required');
    setLoading(true);
    try {
      const payload = {
        ...form,
        pickup: { ...form.pickup, latitude: parseFloat(form.pickup.latitude) || 0, longitude: parseFloat(form.pickup.longitude) || 0 },
        drop:   { ...form.drop,   latitude: parseFloat(form.drop.latitude)   || 0, longitude: parseFloat(form.drop.longitude)   || 0 },
        items:  form.items.map(it => ({ ...it, quantity: parseInt(it.quantity) || 1 })),
      };
      if (mode === 'place') await ordersAPI.adminPlace(payload);
      else                  await ordersAPI.adminDraft(payload);
      toast.success(mode === 'place' ? 'Order placed successfully!' : 'Draft saved successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to ' + (mode === 'place' ? 'place order' : 'save draft'));
    } finally { setLoading(false); }
  };

  const addrFields = (prefix) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {[['Street *', `${prefix}.street`], ['City *', `${prefix}.city`], ['Area', `${prefix}.area`], ['Building/Flat', `${prefix}.buildingOrFlat`], ['State', `${prefix}.state`], ['Postal Code', `${prefix}.postalCode`], ['Contact Person', `${prefix}.contactPerson`], ['Contact Phone', `${prefix}.contactNumber`], ['Latitude *', `${prefix}.latitude`], ['Longitude *', `${prefix}.longitude`]].map(([lbl, path]) => (
        <div key={path} className="form-group">
          <label className="form-label">{lbl}</label>
          <input className="form-input" value={form[prefix][path.split('.')[1]] ?? ''} onChange={e => set(path, e.target.value)} placeholder={lbl} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ overflowY: 'auto', alignItems: 'flex-start', padding: '24px 0' }}>
      <div className="modal" style={{ maxWidth: 640, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{mode === 'place' ? '+ Place Order (Admin)' : '+ Save Draft Order (Admin)'}</div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ padding: '0 20px 20px', maxHeight: '80vh', overflowY: 'auto' }}>

          {/* Sender / Receiver */}
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-0)', marginBottom: 8, marginTop: 4 }}>Sender & Receiver</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Sender UID *</label>
              <input className="form-input" value={form.senderUid} onChange={e => set('senderUid', e.target.value)} placeholder="uid_xxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-input" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
                {PAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Receiver Phone *</label>
              <input className="form-input" value={form.receiverPhone} onChange={e => set('receiverPhone', e.target.value)} placeholder="+91XXXXXXXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">Receiver First Name *</label>
              <input className="form-input" value={form.receiverFirstName} onChange={e => set('receiverFirstName', e.target.value)} placeholder="First Name" />
            </div>
            <div className="form-group">
              <label className="form-label">Receiver Last Name</label>
              <input className="form-input" value={form.receiverLastName} onChange={e => set('receiverLastName', e.target.value)} placeholder="Last Name" />
            </div>
          </div>

          {/* Pickup */}
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)', marginBottom: 8 }}>📍 Pickup Address</div>
          {addrFields('pickup')}

          {/* Drop */}
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)', margin: '16px 0 8px' }}>📍 Drop Address</div>
          {addrFields('drop')}

          {/* Items */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-0)' }}>Items ({form.items.length})</div>
            <button className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={13} /> Add Item</button>
          </div>
          {form.items.map((item, i) => (
            <div key={i} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Item {i + 1}</div>
                {form.items.length > 1 && <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => removeItem(i)}><X size={12} /></button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={item.name} onChange={e => set(`items.${i}.name`, e.target.value)} placeholder="Item name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min={1} value={item.quantity} onChange={e => set(`items.${i}.quantity`, e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={item.type} onChange={e => set(`items.${i}.type`, e.target.value)}>
                    {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={item.category} onChange={e => set(`items.${i}.category`, e.target.value)}>
                    {ITEM_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Size</label>
                  <select className="form-input" value={item.size} onChange={e => set(`items.${i}.size`, e.target.value)}>
                    {ITEM_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? 'Processing...' : mode === 'place' ? 'Place Order' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Page ──────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const location = useLocation();

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Search / Filter state
  const [searchType,  setSearchType]  = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');

  // Modals
  const [selected,    setSelected]    = useState(null);
  const [placeMode,   setPlaceMode]   = useState(null);  // 'place' | 'draft' | null

  // Handle deep-link from Dashboard (navigate state)
  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (state.openModal === 'place') setPlaceMode('place');
    if (state.openModal === 'draft') setPlaceMode('draft');
    if (state.status) setStatusFilter(state.status);
    if (state.viewOrderId) {
      ordersAPI.adminSearch({ orderId: state.viewOrderId }).then(res => {
        const orders = res.data?.data || [];
        if (orders.length > 0) setSelected(orders[0]);
      }).catch(() => {});
    }
    // Clear state so navigating back doesn't re-open
    window.history.replaceState({}, document.title);
  }, []);

  // Normalize phone: strip spaces/dashes, ensure +91 prefix
  const normalizePhone = (phone) => {
    let p = phone.trim().replace(/[\s\-]/g, '');
    // Already has a + country code — return as is
    if (p.startsWith('+')) return p;
    // 10 digit Indian number — add +91
    if (/^[6-9]\d{9}$/.test(p)) return '+91' + p;
    // 11 digits starting with 91 — add +
    if (/^91\d{10}$/.test(p)) return '+' + p;
    // Fallback — add +91 and hope for the best
    return '+91' + p;
  };

  const PHONE_SEARCH_TYPES = ['senderPhone', 'receiverPhone', 'riderPhone'];

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchType !== 'all' && searchValue.trim()) {
        // Normalize phone numbers before sending to backend
        const val = PHONE_SEARCH_TYPES.includes(searchType)
          ? normalizePhone(searchValue)
          : searchValue.trim();
        params[searchType] = val;
      }
      if (searchType === 'dateRange') {
        if (fromDate) params.fromDate = fromDate;
        if (toDate)   params.toDate   = toDate;
        delete params.dateRange; // don't send the key itself
      }
      if (statusFilter !== 'ALL') params.status = statusFilter;
      params.pageSize = 100;
      const res = await ordersAPI.adminSearch(params);
      setOrders(res.data?.data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally { setLoading(false); }
  }, [searchType, searchValue, statusFilter]);

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  // ── Real-time: update order list and open detail modal without full reload ──
  useEffect(() => {
    const handler = (e) => {
      const updated = e.detail;
      if (!updated?.orderId) return;
      // Update existing row in list
      setOrders(prev => {
        const exists = prev.some(o => o.orderId === updated.orderId);
        if (exists) return prev.map(o => o.orderId === updated.orderId ? { ...o, ...updated } : o);
        // New order (just placed) — prepend to top of list if not filtered out
        if (!statusFilter || statusFilter === 'ALL' || updated.status === statusFilter) {
          return [updated, ...prev];
        }
        return prev;
      });
      // If this order is currently open in the detail modal, update it too
      setSelected(prev => prev?.orderId === updated.orderId ? { ...prev, ...updated } : prev);
    };
    window.addEventListener('ws:order:updated', handler);
    return () => window.removeEventListener('ws:order:updated', handler);
  }, [statusFilter]);

  const handleSearch = (e) => { e.preventDefault(); fetchOrders(); };

  const handleCancel = async (orderId, reason) => {
    setCancelling(true);
    try {
      await ordersAPI.cancel(orderId, reason);
      toast.success('Order cancelled');
      setSelected(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    } finally { setCancelling(false); }
  };

  const searchTypeOpts = [
    { val: 'all',          label: 'All Orders' },
    { val: 'orderId',      label: 'Order ID' },
    { val: 'senderId',     label: 'Sender ID' },
    { val: 'receiverId',   label: 'Receiver ID' },
    { val: 'riderId',      label: 'Rider ID' },
    { val: 'senderPhone',   label: 'Sender Phone' },
    { val: 'receiverPhone', label: 'Receiver Phone' },
    { val: 'riderPhone',    label: 'Rider Phone' },
    { val: 'dateRange',    label: 'Date Range' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Orders</h1>
          <p>Search, view, and manage all delivery orders</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-sm" style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(77,159,255,0.2)' }} onClick={() => setPlaceMode('draft')}>
            <FileText size={13} /> Save Draft
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setPlaceMode('place')}>
            <Plus size={13} /> Place Order
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
            <label className="form-label">Search By</label>
            <select className="form-input" value={searchType} onChange={e => setSearchType(e.target.value)}>
              {searchTypeOpts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          {searchType !== 'all' && searchType !== 'dateRange' && (
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">{searchTypeOpts.find(o => o.val === searchType)?.label}</label>
              <input className="form-input" value={searchValue} onChange={e => setSearchValue(e.target.value)}
                placeholder={`Enter ${searchTypeOpts.find(o => o.val === searchType)?.label}...`} />
            </div>
          )}
          {searchType === 'dateRange' && (
            <>
              <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
                <label className="form-label">From Date</label>
                <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
                <label className="form-label">To Date</label>
                <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </>
          )}
          <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end', height: 38 }} disabled={loading}>
            <Search size={13} /> Search
          </button>
          {(searchValue || fromDate || toDate || statusFilter !== 'ALL') && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end', height: 38 }}
              onClick={() => { setSearchValue(''); setSearchType('all'); setStatusFilter('ALL'); setFromDate(''); setToDate(''); }}>
              <X size={13} /> Clear
            </button>
          )}
        </form>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 10px' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-0)' }}>
            {loading ? 'Loading...' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {loading ? (
          <div className="loading-center" style={{ minHeight: 200 }}><div className="loader" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Package size={22} /></div>
            <h3>No orders found</h3>
            <p>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Rider</th>
                  <th>Pickup</th>
                  <th>Drop</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const id       = order.orderId || order.id;
                  const billing  = order.billing || {};
                  const sender   = order.sender  || order.senderUser  || {};
                  const receiver = order.receiver || order.receiverUser || {};
                  const rider    = order.assignedRider || {};
                  return (
                    <tr key={id}>
                      <td>
                        <span className="code" style={{ fontSize: 11 }}>#{(id || '').slice(-10).toUpperCase()}</span>
                      </td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-0)' }}>{[sender.firstName, sender.lastName].filter(Boolean).join(' ') || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{sender.phoneNumber || order.senderUserId?.slice(-8) || '—'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-0)' }}>{[receiver.firstName, receiver.lastName].filter(Boolean).join(' ') || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{receiver.phoneNumber || order.receiverUserId?.slice(-8) || '—'}</div>
                      </td>
                      <td>
                        {order.assignedRiderId
                          ? <div>
                              <div style={{ fontSize: 12, color: 'var(--text-0)' }}>{[rider.firstName, rider.lastName].filter(Boolean).join(' ') || 'Assigned'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{order.assignedRiderId.slice(-8)}</div>
                            </div>
                          : <span style={{ fontSize: 12, color: 'var(--text-2)' }}>—</span>
                        }
                      </td>
                      <td style={{ maxWidth: 140 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-1)', whiteSpace: 'normal', lineHeight: 1.4 }}>
                          <span style={{ color: '#00e5a0', marginRight: 4 }}>●</span>
                          {addrStr(order.senderNode)}
                        </div>
                      </td>
                      <td style={{ maxWidth: 140 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-1)', whiteSpace: 'normal', lineHeight: 1.4 }}>
                          <span style={{ color: '#ff4d6d', marginRight: 4 }}>●</span>
                          {addrStr(order.receiverNode)}
                        </div>
                      </td>
                      <td>
                        {billing.payableAmount != null
                          ? <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>₹{billing.payableAmount}</span>
                          : <span style={{ color: 'var(--text-2)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {fmtShort(order.createdAt) || '—'}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(order)}>
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      )}

      {/* Place / Draft Modal */}
      {placeMode && (
        <PlaceOrderModal
          mode={placeMode}
          onClose={() => setPlaceMode(null)}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
}