// =============================================================================
// pages/ServiceAreaPage.jsx  —  Bhada Admin — Service Area Management
// Allows admin to create, activate/deactivate, and manage service area grids
// on an interactive Google Maps view.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Plus, RefreshCw, X, ToggleLeft, ToggleRight,
  Trash2, Save, Eye, Grid3X3, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { serviceAreaAPI } from '../services/api';

/* ─── Google Maps loader ─────────────────────────────────────────────────── */
let mapsLoaded = false, mapsLoading = false;
const mapsCallbacks = [];
function loadGoogleMaps(key) {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) { resolve(window.google); return; }
    mapsCallbacks.push({ resolve, reject });
    if (mapsLoading) return;
    mapsLoading = true;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry`;
    s.async = true;
    s.onload  = () => { mapsLoaded = true; mapsLoading = false; mapsCallbacks.forEach(c => c.resolve(window.google)); mapsCallbacks.length = 0; };
    s.onerror = e  => { mapsLoading = false; mapsCallbacks.forEach(c => c.reject(e)); mapsCallbacks.length = 0; };
    document.head.appendChild(s);
  });
}

const MAPS_KEY       = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GRID_SIZE      = 0.1;
const BASE_LAT       = 6.5;
const BASE_LNG       = 68.0;

const VEHICLE_TYPES = ['BIKE', 'SCOOTY', 'AUTO', 'VAN', 'TRUCK'];
const ORDER_TYPES   = ['standard', 'express', 'scheduled'];

function calcGridBounds(lat, lng) {
  const li     = Math.floor((lat - BASE_LAT) / GRID_SIZE);
  const gi     = Math.floor((lng - BASE_LNG) / GRID_SIZE);
  const minLat = +(BASE_LAT + li * GRID_SIZE).toFixed(4);
  const minLng = +(BASE_LNG + gi * GRID_SIZE).toFixed(4);
  return {
    gridId: `${li}_${gi}`,
    minLat,
    maxLat: +(minLat + GRID_SIZE).toFixed(4),
    minLng,
    maxLng: +(minLng + GRID_SIZE).toFixed(4),
  };
}

/* ─── Color helpers ──────────────────────────────────────────────────────── */
function serviceColor(isActive) {
  return isActive ? '#22c55e' : '#ef4444';
}

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1220' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6785' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2235' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a2235' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#05080f' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ba8c4' }] },
];

/* ─── Service Area Map Modal ─────────────────────────────────────────────── */
function ServiceAreaMapModal({ grids, onClose, onSave, onToggle, onDelete }) {
  const mapRef        = useRef(null);
  const mapInst       = useRef(null);
  const rectanglesRef = useRef([]);
  const previewRef    = useRef(null);
  const gridsRef      = useRef(grids);
  const [mapsReady, setMapsReady]     = useState(mapsLoaded);
  const [saving, setSaving]           = useState(false);
  const [clickMode, setClickMode]     = useState(false);
  const [previewGrid, setPreviewGrid] = useState(null);
  const [form, setForm]               = useState({
    city: '', state: '', label: '',
    isServiceActive: false,
    allowedVehicleTypes: [],
    allowedOrderTypes: ['standard'],
    maxOrderWeight: '',
  });

  useEffect(() => { gridsRef.current = grids; }, [grids]);

  // Render rectangles for all saved grids
  const renderGrids = useCallback((map) => {
    rectanglesRef.current.forEach(r => r.setMap(null));
    rectanglesRef.current = [];
    gridsRef.current.forEach(g => {
      const rect = new window.google.maps.Rectangle({
        bounds: { north: g.maxLat, south: g.minLat, east: g.maxLng, west: g.minLng },
        map,
        fillColor:   serviceColor(g.isServiceActive),
        fillOpacity: 0.35,
        strokeColor: serviceColor(g.isServiceActive),
        strokeOpacity: 0.9,
        strokeWeight: 1.5,
        clickable: true,
      });
      // Info window on click
      const iw = new window.google.maps.InfoWindow();
      rect.addListener('click', () => {
        iw.setContent(`
          <div style="font-family:Inter,sans-serif;padding:6px 4px;font-size:13px;color:#0d1220">
            <strong>${g.label || g.gridId}</strong><br/>
            ${g.city}${g.state ? ', ' + g.state : ''}<br/>
            Status: <span style="color:${serviceColor(g.isServiceActive)};font-weight:600">${g.isServiceActive ? '✓ Active' : '✗ Inactive'}</span><br/>
            <span style="font-size:11px;color:#555">Grid: ${g.gridId}</span>
          </div>
        `);
        iw.setPosition({ lat: (g.minLat + g.maxLat) / 2, lng: (g.minLng + g.maxLng) / 2 });
        iw.open(map);
      });
      rectanglesRef.current.push(rect);
    });
  }, []);

  useEffect(() => {
    if (!MAPS_KEY) return;
    loadGoogleMaps(MAPS_KEY).then(google => {
      setMapsReady(true);
      const map = new google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 5,
        styles: DARK_STYLE,
        disableDefaultUI: false,
        mapTypeControl: false,
      });
      mapInst.current = map;
      renderGrids(map);
    }).catch(() => toast.error('Failed to load Google Maps'));
  }, [renderGrids]);

  // Re-render grids whenever list changes
  useEffect(() => {
    if (mapInst.current) renderGrids(mapInst.current);
  }, [grids, renderGrids]);

  // Handle map click to preview a grid
  useEffect(() => {
    if (!mapInst.current) return;
    const listener = mapInst.current.addListener('click', e => {
      if (!clickMode) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const bounds = calcGridBounds(lat, lng);
      // Remove old preview
      if (previewRef.current) { previewRef.current.setMap(null); previewRef.current = null; }
      const rect = new window.google.maps.Rectangle({
        bounds: { north: bounds.maxLat, south: bounds.minLat, east: bounds.maxLng, west: bounds.minLng },
        map: mapInst.current,
        fillColor:   '#6366f1',
        fillOpacity: 0.45,
        strokeColor: '#6366f1',
        strokeOpacity: 1,
        strokeWeight: 2,
        clickable: false,
      });
      previewRef.current = rect;
      setPreviewGrid(bounds);
    });
    return () => window.google?.maps.event.removeListener(listener);
  }, [clickMode]);

  const handleSave = async () => {
    if (!previewGrid) return toast.error('Click on the map to select a grid first');
    if (!form.city.trim())  return toast.error('City is required');
    if (!form.state.trim()) return toast.error('State is required');
    setSaving(true);
    try {
      const lat = (previewGrid.minLat + previewGrid.maxLat) / 2;
      const lng = (previewGrid.minLng + previewGrid.maxLng) / 2;
      await onSave({
        lat,
        lng,
        city:                form.city.trim(),
        state:               form.state.trim(),
        label:               form.label.trim() || `${form.city} Grid`,
        isServiceActive:     form.isServiceActive,
        allowedVehicleTypes: form.allowedVehicleTypes,
        allowedOrderTypes:   form.allowedOrderTypes,
        maxOrderWeight:      form.maxOrderWeight ? parseFloat(form.maxOrderWeight) : null,
      });
      if (previewRef.current) { previewRef.current.setMap(null); previewRef.current = null; }
      setPreviewGrid(null);
      setForm({ city: '', state: '', label: '', isServiceActive: false, allowedVehicleTypes: [], allowedOrderTypes: ['standard'], maxOrderWeight: '' });
      setClickMode(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleVehicle = (v) => {
    setForm(f => ({
      ...f,
      allowedVehicleTypes: f.allowedVehicleTypes.includes(v)
        ? f.allowedVehicleTypes.filter(x => x !== v)
        : [...f.allowedVehicleTypes, v],
    }));
  };

  const toggleOrderType = (t) => {
    setForm(f => ({
      ...f,
      allowedOrderTypes: f.allowedOrderTypes.includes(t)
        ? f.allowedOrderTypes.filter(x => x !== t)
        : [...f.allowedOrderTypes, t],
    }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
      <div style={{ background: '#131929', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 1080, height: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={20} color="#6366f1" />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Service Area Map</span>
            <span style={{ fontSize: 12, color: '#9ba8c4', marginLeft: 8 }}>
              {grids.length} grid{grids.length !== 1 ? 's' : ''} · {grids.filter(g => g.isServiceActive).length} active
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ba8c4', padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Map */}
          <div style={{ flex: 1, position: 'relative' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            {!mapsReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1220' }}>
                <div className="loader" />
              </div>
            )}
            {/* Click mode toggle button */}
            <button
              onClick={() => { setClickMode(c => !c); if (!clickMode && previewRef.current) { previewRef.current.setMap(null); previewRef.current = null; setPreviewGrid(null); } }}
              style={{
                position: 'absolute', top: 12, left: 12,
                background: clickMode ? '#6366f1' : 'rgba(19,25,41,0.92)',
                border: `1px solid ${clickMode ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
                color: '#f0f4ff', borderRadius: 8, padding: '8px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={15} />
              {clickMode ? 'Click map to select grid…' : 'Add New Grid'}
            </button>
            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(13,18,32,0.92)', borderRadius: 8, padding: '8px 12px', fontSize: 12, display: 'flex', gap: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} /> Active</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} /> Inactive</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#6366f1', display: 'inline-block' }} /> Preview</span>
            </div>
          </div>

          {/* Side panel */}
          <div style={{ width: 320, borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* New Grid Form */}
            {clickMode && (
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(99,102,241,0.06)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#a5b4fc' }}>
                  {previewGrid ? `Grid: ${previewGrid.gridId}` : 'Click map to select a grid'}
                </div>
                {['city', 'state', 'label'].map(f => (
                  <input key={f}
                    placeholder={f.charAt(0).toUpperCase() + f.slice(1) + (f === 'label' ? ' (optional)' : ' *')}
                    value={form[f]}
                    onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', color: '#f0f4ff', fontSize: 13, marginBottom: 6, boxSizing: 'border-box' }}
                  />
                ))}
                <input
                  type="number" placeholder="Max order weight kg (optional)"
                  value={form.maxOrderWeight}
                  onChange={e => setForm(p => ({ ...p, maxOrderWeight: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', color: '#f0f4ff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                />
                {/* Vehicle types */}
                <div style={{ fontSize: 11, color: '#9ba8c4', marginBottom: 4 }}>Allowed vehicles (empty = all)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {VEHICLE_TYPES.map(v => (
                    <button key={v} onClick={() => toggleVehicle(v)}
                      style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: '1px solid', borderColor: form.allowedVehicleTypes.includes(v) ? '#6366f1' : 'rgba(255,255,255,0.12)', background: form.allowedVehicleTypes.includes(v) ? 'rgba(99,102,241,0.2)' : 'transparent', color: form.allowedVehicleTypes.includes(v) ? '#a5b4fc' : '#9ba8c4' }}>
                      {v}
                    </button>
                  ))}
                </div>
                {/* Order types */}
                <div style={{ fontSize: 11, color: '#9ba8c4', marginBottom: 4 }}>Order types</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {ORDER_TYPES.map(t => (
                    <button key={t} onClick={() => toggleOrderType(t)}
                      style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: '1px solid', borderColor: form.allowedOrderTypes.includes(t) ? '#6366f1' : 'rgba(255,255,255,0.12)', background: form.allowedOrderTypes.includes(t) ? 'rgba(99,102,241,0.2)' : 'transparent', color: form.allowedOrderTypes.includes(t) ? '#a5b4fc' : '#9ba8c4' }}>
                      {t}
                    </button>
                  ))}
                </div>
                {/* Active toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: form.isServiceActive ? '#22c55e' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background .2s' }}>
                    <div style={{ position: 'absolute', top: 2, left: form.isServiceActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                  </div>
                  <input type="checkbox" checked={form.isServiceActive} onChange={e => setForm(p => ({ ...p, isServiceActive: e.target.checked }))} style={{ display: 'none' }} />
                  <span style={{ fontSize: 13, color: form.isServiceActive ? '#22c55e' : '#9ba8c4' }}>
                    {form.isServiceActive ? 'Service Active' : 'Service Inactive'}
                  </span>
                </label>
                <button onClick={handleSave} disabled={saving || !previewGrid}
                  style={{ width: '100%', background: '#6366f1', border: 'none', borderRadius: 8, padding: '9px 0', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving || !previewGrid ? 'not-allowed' : 'pointer', opacity: saving || !previewGrid ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save Grid'}
                </button>
              </div>
            )}

            {/* Grid list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              <div style={{ fontSize: 12, color: '#9ba8c4', marginBottom: 8, fontWeight: 600 }}>SAVED GRIDS</div>
              {grids.length === 0 && (
                <div style={{ color: '#9ba8c4', fontSize: 13, textAlign: 'center', marginTop: 24 }}>No service areas defined yet.<br/>Click "Add New Grid" to start.</div>
              )}
              {grids.map(g => (
                <div key={g.gridId} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: `1px solid ${g.isServiceActive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{g.label || g.gridId}</div>
                      <div style={{ fontSize: 12, color: '#9ba8c4' }}>{g.city}{g.state ? ', ' + g.state : ''}</div>
                      <div style={{ fontSize: 11, color: '#5a6785', marginTop: 2 }}>Grid: {g.gridId}</div>
                      {g.maxOrderWeight && <div style={{ fontSize: 11, color: '#9ba8c4' }}>Max weight: {g.maxOrderWeight}kg</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: g.isServiceActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: g.isServiceActive ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                        {g.isServiceActive ? 'Active' : 'Inactive'}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => onToggle(g)}
                          title={g.isServiceActive ? 'Deactivate' : 'Activate'}
                          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, cursor: 'pointer', padding: '4px 6px', color: g.isServiceActive ? '#ef4444' : '#22c55e' }}>
                          {g.isServiceActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button onClick={() => onDelete(g.gridId)}
                          title="Delete"
                          style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, cursor: 'pointer', padding: '4px 6px', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {g.allowedVehicleTypes?.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {g.allowedVehicleTypes.map(v => (
                        <span key={v} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>{v}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function ServiceAreaPage() {
  const [grids, setGrids]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showMap, setShowMap]     = useState(false);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all'); // 'all' | 'active' | 'inactive'

  const fetchGrids = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await serviceAreaAPI.getAll();
      setGrids(data.data ?? []);
    } catch (e) {
      toast.error('Failed to load service areas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrids(); }, [fetchGrids]);

  const handleSave = async (dto) => {
    try {
      await serviceAreaAPI.upsert(dto);
      toast.success('Service area saved');
      await fetchGrids();
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Save failed');
      throw e;
    }
  };

  const handleToggle = async (grid) => {
    try {
      if (grid.isServiceActive) {
        await serviceAreaAPI.deactivate(grid.gridId);
        toast.success(`${grid.label || grid.gridId} deactivated`);
      } else {
        await serviceAreaAPI.activate(grid.gridId);
        toast.success(`${grid.label || grid.gridId} activated`);
      }
      await fetchGrids();
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Toggle failed');
    }
  };

  const handleDelete = async (gridId) => {
    if (!window.confirm('Delete this service area grid?')) return;
    try {
      await serviceAreaAPI.delete(gridId);
      toast.success('Grid deleted');
      await fetchGrids();
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Delete failed');
    }
  };

  const filtered = grids.filter(g => {
    const matchesSearch = !search ||
      g.city?.toLowerCase().includes(search.toLowerCase()) ||
      g.state?.toLowerCase().includes(search.toLowerCase()) ||
      g.label?.toLowerCase().includes(search.toLowerCase()) ||
      g.gridId?.includes(search);
    const matchesFilter = filter === 'all' || (filter === 'active' ? g.isServiceActive : !g.isServiceActive);
    return matchesSearch && matchesFilter;
  });

  const activeCount   = grids.filter(g => g.isServiceActive).length;
  const inactiveCount = grids.length - activeCount;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Areas</h1>
          <p className="page-subtitle">Control which geographic grids offer Bhada delivery service</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchGrids} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowMap(true)} className="btn-primary">
            <Plus size={15} />
            Manage on Map
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Grids',     value: grids.length,  color: '#6366f1' },
          { label: 'Service Active',  value: activeCount,   color: '#22c55e' },
          { label: 'Service Inactive', value: inactiveCount, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#9ba8c4', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ba8c4' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by city, state, label, or grid ID…"
            style={{ width: '100%', paddingLeft: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px 9px 36px', color: '#f0f4ff', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        {['all', 'active', 'inactive'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500, textTransform: 'capitalize', borderColor: filter === f ? '#6366f1' : 'rgba(255,255,255,0.1)', background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent', color: filter === f ? '#a5b4fc' : '#9ba8c4' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ba8c4' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ba8c4' }}>
          <MapPin size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>{grids.length === 0 ? 'No service areas defined yet. Click "Manage on Map" to add grids.' : 'No results match your search.'}</div>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Label / Grid', 'City', 'State', 'Status', 'Vehicles', 'Weight Limit', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#9ba8c4', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => (
                <tr key={g.gridId} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{g.label || '—'}</div>
                    <div style={{ fontSize: 11, color: '#5a6785' }}>{g.gridId}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#9ba8c4' }}>{g.city || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#9ba8c4' }}>{g.state || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: g.isServiceActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: g.isServiceActive ? '#22c55e' : '#ef4444' }}>
                      {g.isServiceActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#9ba8c4' }}>
                    {g.allowedVehicleTypes?.length ? g.allowedVehicleTypes.join(', ') : 'All'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#9ba8c4' }}>
                    {g.maxOrderWeight ? `${g.maxOrderWeight} kg` : 'No limit'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleToggle(g)}
                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${g.isServiceActive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, background: 'none', color: g.isServiceActive ? '#ef4444' : '#22c55e', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {g.isServiceActive ? <><ToggleRight size={13} /> Deactivate</> : <><ToggleLeft size={13} /> Activate</>}
                      </button>
                      <button onClick={() => handleDelete(g.gridId)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Map Modal */}
      {showMap && (
        <ServiceAreaMapModal
          grids={grids}
          onClose={() => setShowMap(false)}
          onSave={handleSave}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
