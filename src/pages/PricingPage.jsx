import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BadgePercent, Plus, RefreshCw, X, Zap, Map, Trash2,
  Settings, Calculator, Grid3X3,
  Save, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pricingAPI, itemCatalogAPI } from '../services/api';

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

const AREA_COLORS = {
  metro:      '#cc0022',
  urban:      '#cc5500',
  semi_urban: '#997700',
  rural:      '#007744',
  remote:     '#0055cc',
};

/* ── NEW: color + opacity purely from multiplier value ─────────────────────
   ≤ 1.0  →  green   (#00aa44)   low price area
   1.0–1.5 → yellow  (#ddaa00)   normal
   1.5–2.0 → orange  (#dd5500)   high demand
   ≥ 2.0  →  red     (#cc0000)   peak pricing
   opacity: 0.40 at 0.5×  →  0.85 at 3.0×                                 */
function multiplierColor(v) {
  v = Math.min(Math.max(Number(v) || 1, 0.5), 3.0);
  if (v <= 1.0) return '#00aa44';
  if (v <= 1.5) {
    const t = (v - 1.0) / 0.5;
    return `rgb(${Math.round(t * 221)},${Math.round(170)},${Math.round(68 - t * 68)})`;
  }
  if (v <= 2.0) {
    const t = (v - 1.5) / 0.5;
    return `rgb(${Math.round(221 - t * 17)},${Math.round(170 - t * 170)},0)`;
  }
  return '#cc0000';
}
function multiplierOpacity(v) {
  v = Math.min(Math.max(Number(v) || 1, 0.5), 3.0);
  return +(0.40 + ((v - 0.5) / 2.5) * 0.45).toFixed(2);
}

const DEFAULT_CONFIG = {
  distanceSlabs: { slab1MaxKm: 10, rateA: 12, slab2MaxKm: 30, rateB: 9, slab3MaxKm: 100, rateC: 7 },
  sizeMultipliers: { mini: 0.8, small: 1.0, medium: 1.3, large: 1.6, extra_large: 2.0 },
  defaultSizeMultiplier: 1.0,
  defaultAreaMultiplier: 1.0,
  surgeMultiplier: 1.0,
  surgeEnabled: false,
  minimumFare: 40,
  commissionPercent: 15,
  minDriverPayout: 30,
  platformFee: 5,
  gstPercent: 18,
};

/* ─── Grid Map Modal ─────────────────────────────────────────────────────── */
function GridMapModal({ grids, onClose, onSave, onDelete }) {
  const mapRef        = useRef(null);
  const mapInst       = useRef(null);
  const rectanglesRef = useRef([]);
  const previewRef    = useRef(null);
  const gridsRef      = useRef(grids);

  const [mapsReady, setMapsReady] = useState(mapsLoaded);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState({ areaMultiplier: 1.0, areaType: 'urban', label: '' });
  const [saving, setSaving]       = useState(false);

  useEffect(() => { gridsRef.current = grids; }, [grids]);

  useEffect(() => {
    if (!MAPS_KEY) return;
    loadGoogleMaps(MAPS_KEY)
      .then(() => setMapsReady(true))
      .catch(() => toast.error('Google Maps failed to load'));
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInst.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER, zoom: 5,
      mapTypeId: 'roadmap', disableDefaultUI: true,
      zoomControl: true, gestureHandling: 'greedy',
    });
    mapInst.current = map;
    map.addListener('click', (e) => {
      const lat    = e.latLng.lat();
      const lng    = e.latLng.lng();
      const bounds = calcGridBounds(lat, lng);
      const ex     = gridsRef.current.find(g => g.gridId === bounds.gridId) || null;
      setSelected({ gridId: bounds.gridId, bounds, existing: ex });
      setForm(ex
        ? { areaMultiplier: ex.areaMultiplier, areaType: ex.areaType, label: ex.label }
        : { areaMultiplier: 1.0, areaType: 'urban', label: '' }
      );
    });
  }, [mapsReady]);

  /* Draw rectangles — ONLY change from original: color & opacity from multiplier */
  useEffect(() => {
    if (!mapInst.current || !mapsReady) return;
    rectanglesRef.current.forEach(r => r.setMap(null));
    rectanglesRef.current = [];

    grids.forEach(g => {
      const color   = multiplierColor(g.areaMultiplier);
      const opacity = multiplierOpacity(g.areaMultiplier);

      const rect = new window.google.maps.Rectangle({
        bounds: { north: g.maxLat, south: g.minLat, east: g.maxLng, west: g.minLng },
        strokeColor:   '#1a1a2e',
        strokeOpacity: 1,
        strokeWeight:  1.5,
        fillColor:     color,
        fillOpacity:   opacity,
        map:           mapInst.current,
        clickable:     true,
        zIndex:        2,
      });

      rect.addListener('click', () => {
        setSelected({
          gridId: g.gridId,
          bounds: { minLat: g.minLat, maxLat: g.maxLat, minLng: g.minLng, maxLng: g.maxLng },
          existing: g,
        });
        setForm({ areaMultiplier: g.areaMultiplier, areaType: g.areaType, label: g.label });
      });

      rect.addListener('mouseover', () => rect.setOptions({ fillOpacity: Math.min(opacity + 0.2, 0.95), strokeWeight: 2.5 }));
      rect.addListener('mouseout',  () => rect.setOptions({ fillOpacity: opacity, strokeWeight: 1.5 }));

      rectanglesRef.current.push(rect);
    });
  }, [grids, mapsReady]);

  useEffect(() => {
    if (previewRef.current) { previewRef.current.setMap(null); previewRef.current = null; }
    if (!selected || !mapInst.current) return;
    const { bounds } = selected;
    previewRef.current = new window.google.maps.Rectangle({
      bounds: { north: bounds.maxLat, south: bounds.minLat, east: bounds.maxLng, west: bounds.minLng },
      strokeColor: '#ffdd00', strokeOpacity: 1, strokeWeight: 3,
      fillColor: '#ffdd00', fillOpacity: 0.1,
      map: mapInst.current, clickable: false, zIndex: 20,
    });
    mapInst.current.panTo({
      lat: (bounds.minLat + bounds.maxLat) / 2,
      lng: (bounds.minLng + bounds.maxLng) / 2,
    });
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    if (!form.label.trim()) { toast.error('Enter a label for this grid'); return; }
    setSaving(true);
    try {
      const center = {
        lat: (selected.bounds.minLat + selected.bounds.maxLat) / 2,
        lng: (selected.bounds.minLng + selected.bounds.maxLng) / 2,
      };
      await onSave({ lat: center.lat, lng: center.lng, areaMultiplier: Number(form.areaMultiplier), areaType: form.areaType, label: form.label });
      setSelected(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected?.existing) return;
    if (!window.confirm('Delete this grid?')) return;
    await onDelete(selected.gridId);
    setSelected(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: '#05080f' }}>
      <div style={{ padding: '14px 20px', background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>🗺 Grid Area Multiplier Map</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Click any location on the map to set or update its pricing multiplier</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-1)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {!MAPS_KEY ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-2)' }}>
              <div style={{ textAlign: 'center' }}>
                <Map size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>VITE_GOOGLE_MAPS_API_KEY not set</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Add it to your .env file</div>
              </div>
            </div>
          ) : !mapsReady ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
              <div className="loader" />
            </div>
          ) : (
            <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
          )}

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(13,18,32,0.92)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, pointerEvents: 'none' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-0)', marginBottom: 8 }}>Multiplier Scale</div>
            {[
              ['≤ 1.0×', '#00aa44', 'Low price'],
              ['1.0 – 1.5×', '#ddaa00', 'Normal'],
              ['1.5 – 2.0×', '#dd5500', 'High demand'],
              ['2.0×+', '#cc0000', 'Peak pricing'],
            ].map(([range, color, lbl]) => (
              <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 14, height: 14, borderRadius: 2, background: color, border: '1px solid #1a1a2e', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{range}</span>
                <span style={{ color: 'var(--text-2)' }}>{lbl}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, color: 'var(--text-2)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
              {grids.length} grid{grids.length !== 1 ? 's' : ''} configured
            </div>
          </div>
        </div>

        <div style={{ width: 300, background: 'var(--bg-1)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 16, flexShrink: 0 }}>
            {selected ? (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
                  {selected.existing ? '✏️ Edit Grid' : '➕ New Grid'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                  {selected.gridId}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                  Lat: {selected.bounds.minLat.toFixed(4)} → {selected.bounds.maxLat.toFixed(4)}<br />
                  Lng: {selected.bounds.minLng.toFixed(4)} → {selected.bounds.maxLng.toFixed(4)}
                </div>

                <div className="form-group">
                  <label className="form-label">Label</label>
                  <input className="form-input" placeholder="e.g. Mumbai Central" value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Area Type</label>
                  <select className="form-input" value={form.areaType} onChange={e => setForm(f => ({ ...f, areaType: e.target.value }))}>
                    {Object.keys(AREA_COLORS).map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Area Multiplier</label>
                  <input className="form-input" type="number" step="0.05" min="0.1" max="10"
                    value={form.areaMultiplier}
                    onChange={e => setForm(f => ({ ...f, areaMultiplier: e.target.value }))} />
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 3, border: '1px solid #1a1a2e', display: 'inline-block', background: multiplierColor(form.areaMultiplier) }} />
                    <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                      {form.areaMultiplier <= 1 ? 'Low price' : form.areaMultiplier <= 1.5 ? 'Normal' : form.areaMultiplier <= 2 ? 'High demand' : 'Peak pricing'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {selected.existing && (
                    <button className="btn btn-danger btn-sm" onClick={handleDelete} style={{ flex: 1 }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
                    <Save size={12} /> {saving ? 'Saving…' : 'Save Grid'}
                  </button>
                </div>
                <button onClick={() => setSelected(null)} style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', padding: '4px 0' }}>
                  ✕ Cancel selection
                </button>
              </>
            ) : (
              <div style={{ color: 'var(--text-2)', fontSize: 12, textAlign: 'center', paddingTop: 30 }}>
                <Map size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div>Click anywhere on the map to set a grid multiplier for that area</div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
              Configured Grids
            </div>
            {grids.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>No grids set yet</div>
            ) : grids.map(g => (
              <div key={g.gridId}
                style={{ marginBottom: 8, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 8, border: `1px solid ${(AREA_COLORS[g.areaType] || '#333')}44`, cursor: 'pointer' }}
                onClick={() => {
                  setSelected({ gridId: g.gridId, bounds: { minLat: g.minLat, maxLat: g.maxLat, minLng: g.minLng, maxLng: g.maxLng }, existing: g });
                  setForm({ areaMultiplier: g.areaMultiplier, areaType: g.areaType, label: g.label });
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>{g.label || g.gridId}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{g.gridId}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: multiplierColor(g.areaMultiplier) }}>{g.areaMultiplier}×</div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'capitalize' }}>{g.areaType?.replace('_', ' ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Pricing Config Form ────────────────────────────────────────────────── */
function ConfigForm({ initial, onSubmit, submitting, onCancel, catalogSizes = [] }) {
  const [cfg, setCfg]         = useState(initial?.config ?? DEFAULT_CONFIG);
  const [version, setVersion] = useState(initial?.version ?? '');
  const [section, setSection] = useState('slabs');

  // Derive size keys: use catalog if available, fallback to keys in current config
  const sizeKeys = catalogSizes.length > 0
    ? catalogSizes.map(s => s.key)
    : Object.keys(cfg.sizeMultipliers || { mini: 0.8, small: 1.0, medium: 1.3, large: 1.6 });

  const update = (path, value) => {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value === '' ? '' : isNaN(Number(value)) ? value : Number(value);
      return next;
    });
  };

  const sections = [
    { id: 'slabs',     label: '📏 Distance Slabs' },
    { id: 'size',      label: '📦 Size Multipliers' },
    { id: 'surge',     label: '⚡ Surge & Area' },
    { id: 'financial', label: '💰 Financial Rules' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: section === s.id ? 'var(--accent)' : 'var(--bg-2)',
            color: section === s.id ? '#000' : 'var(--text-2)',
          }}>{s.label}</button>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">Version Tag</label>
        <input className="form-input" placeholder="e.g. v2" value={version} onChange={e => setVersion(e.target.value)} />
      </div>

      {section === 'slabs' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Progressive pricing — each slab rate applies only to distance within that range.</div>
          <div className="two-col" style={{ gap: 10 }}>
            {[
              ['Slab 1 Max (km)', 'distanceSlabs.slab1MaxKm'],
              ['Rate A (₹/km)',   'distanceSlabs.rateA'],
              ['Slab 2 Max (km)', 'distanceSlabs.slab2MaxKm'],
              ['Rate B (₹/km)',   'distanceSlabs.rateB'],
              ['Slab 3 Max (km)', 'distanceSlabs.slab3MaxKm'],
              ['Rate C (₹/km)',   'distanceSlabs.rateC'],
            ].map(([label, path]) => (
              <div className="form-group" key={path} style={{ marginBottom: 0 }}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="number" step="0.5"
                  value={cfg.distanceSlabs[path.split('.')[1]]}
                  onChange={e => update(path, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'size' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Applied after distance cost. e.g. 1.3 = 30% premium for that size. Sizes come from your Item Catalog.</div>
          <div className="form-group">
            <label className="form-label">Default Multiplier (for new/unknown sizes)</label>
            <input className="form-input" type="number" step="0.05"
              value={cfg.defaultSizeMultiplier ?? 1.0}
              onChange={e => update('defaultSizeMultiplier', e.target.value)} />
          </div>
          {sizeKeys.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-2)', padding: '12px 0' }}>
              No item sizes configured yet. Add sizes in the Item Catalog first.
            </div>
          ) : (
            <div className="two-col" style={{ gap: 10 }}>
              {sizeKeys.map(size => (
                <div className="form-group" key={size} style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ textTransform: 'capitalize' }}>{size} ×</label>
                  <input className="form-input" type="number" step="0.05"
                    value={cfg.sizeMultipliers?.[size] ?? cfg.defaultSizeMultiplier ?? 1.0}
                    onChange={e => update(`sizeMultipliers.${size}`, e.target.value)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === 'surge' && (
        <div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={cfg.surgeEnabled}
                onChange={e => update('surgeEnabled', e.target.checked)}
                style={{ accentColor: 'var(--accent)' }} />
              Enable Surge Pricing
            </label>
          </div>
          <div className="two-col" style={{ gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Surge Multiplier</label>
              <input className="form-input" type="number" step="0.1" min="1"
                value={cfg.surgeMultiplier}
                onChange={e => update('surgeMultiplier', e.target.value)}
                disabled={!cfg.surgeEnabled} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Default Area Multiplier</label>
              <input className="form-input" type="number" step="0.05" min="0.1"
                value={cfg.defaultAreaMultiplier}
                onChange={e => update('defaultAreaMultiplier', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {section === 'financial' && (
        <div>
          <div className="two-col" style={{ gap: 10 }}>
            {[
              ['Minimum Fare (₹)',      'minimumFare'],
              ['Commission %',          'commissionPercent'],
              ['Min Driver Payout (₹)', 'minDriverPayout'],
              ['Platform Fee (₹)',      'platformFee'],
              ['GST %',                'gstPercent'],
            ].map(([label, key]) => (
              <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="number" step="0.5"
                  value={cfg[key]}
                  onChange={e => update(key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        {onCancel && <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary" onClick={() => onSubmit({ version, config: cfg })} disabled={submitting}>
          {submitting ? 'Saving…' : <><Save size={13} /> Save Config</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Fare Breakdown Display ─────────────────────────────────────────────── */
function FareBreakdownView({ b }) {
  if (!b) return null;
  const rows = [
    ['Distance',                                `${b.distanceKm?.toFixed(2)} km`],
    ['Distance Cost',                            `₹${b.distanceCost}`],
    [`Size (${b.itemSize})`,                     `₹${b.sizeCost}`],
    [`Area ×${b.areaMultiplier} [${b.gridId}]`,  `₹${b.areaCost}`],
    [`Surge ×${b.surgeMultiplier}`,              `₹${b.surgeCost}`],
    ['Final Base',                               `₹${b.finalBase}`],
    ['Commission',                               `-₹${b.commission}`],
    ['Driver Earning',                           `₹${b.driverEarning}`],
    ['Platform Fee',                             `+₹${b.platformFee}`],
    ['Subtotal',                                 `₹${b.subtotal}`],
    [`GST (${b.gstPercent ?? 18}%)`,             `+₹${b.gstAmount}`],
  ];
  return (
    <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
        ₹{b.finalCustomerPrice}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 14 }}>Customer pays · v{b.pricingVersion}</div>
      {rows.map(([label, val]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-2)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)', fontWeight: 600 }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function PricingPage() {
  const [active, setActive]           = useState(null);
  const [configs, setConfigs]         = useState([]);
  const [grids, setGrids]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('overview');
  const [showCreate, setShowCreate]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [showGridMap, setShowGridMap] = useState(false);
  const [activating, setActivating]   = useState(null); // id being activated/deactivated
  const [cleaning, setCleaning]         = useState(false);

  const [catalogSizes, setCatalogSizes] = useState([]);
  const [syncing, setSyncing]           = useState(false);

  const [estimateForm, setEstimateForm] = useState({ pickupLat: '', pickupLng: '', dropLat: '', dropLng: '', itemSize: '' });
  const [breakdown, setBreakdown]       = useState(null);
  const [estimating, setEstimating]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, all, g, sizes] = await Promise.allSettled([
        pricingAPI.getActive(),
        pricingAPI.getAll(),
        pricingAPI.getGrids(),
        itemCatalogAPI.getSizes(true),  // active only
      ]);
      if (a.status === 'fulfilled')     setActive(a.value.data?.data || a.value.data);
      if (all.status === 'fulfilled')   setConfigs(all.value.data?.data || []);
      if (g.status === 'fulfilled')     setGrids(g.value.data?.data || []);
      if (sizes.status === 'fulfilled') {
        const loadedSizes = sizes.value.data?.data || [];
        setCatalogSizes(loadedSizes);
        // Set default estimator size to first catalog size
        if (loadedSizes.length > 0) {
          setEstimateForm(f => ({ ...f, itemSize: f.itemSize || loadedSizes[0].key }));
        }
      }
    } catch { toast.error('Failed to load pricing data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);


  const handleCleanup = async () => {
    if (!window.confirm('This will keep only the most recently updated active pricing and deactivate all others. Continue?')) return;
    setCleaning(true);
    try {
      const { data } = await pricingAPI.cleanup();
      toast.success(data.message);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Cleanup failed'); }
    finally { setCleaning(false); }
  };

  const handleActivate = async (id) => {
    setActivating(id);
    try {
      await pricingAPI.activate(id);
      toast.success('Pricing activated — all others deactivated');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to activate'); }
    finally { setActivating(null); }
  };

  const handleDeactivate = async (id) => {
    setActivating(id);
    try {
      await pricingAPI.deactivate(id);
      toast.success('Pricing deactivated');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to deactivate'); }
    finally { setActivating(null); }
  };

  const handleCreate = async (dto) => {
    setSubmitting(true);
    try {
      await pricingAPI.create(dto);
      toast.success('Pricing config created!');
      setShowCreate(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleSyncSizes = async () => {
    setSyncing(true);
    try {
      await pricingAPI.syncSizes();
      toast.success('Size multipliers synced with item catalog!');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Sync failed'); }
    finally { setSyncing(false); }
  };

  const handleGridSave = async (dto) => {
    try {
      await pricingAPI.upsertGrid(dto);
      toast.success('Grid saved!');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save grid'); }
  };

  const handleGridDelete = async (gridId) => {
    try {
      await pricingAPI.deleteGrid(gridId);
      toast.success('Grid deleted');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEstimate = async (e) => {
    e.preventDefault();
    setEstimating(true);
    setBreakdown(null);
    try {
      const { data } = await pricingAPI.estimate(estimateForm);
      setBreakdown(data?.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Estimation failed'); }
    finally { setEstimating(false); }
  };

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'config',   label: '⚙️ Config' },
    { id: 'grids',    label: '🗺 Grids' },
    { id: 'estimate', label: '🧮 Estimator' },
  ];

  if (loading) return <div className="loading-center"><div className="loader" /></div>;

  return (
    <div>
      {showGridMap && (
        <GridMapModal
          grids={grids}
          onClose={() => setShowGridMap(false)}
          onSave={handleGridSave}
          onDelete={handleGridDelete}
        />
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1>Pricing Engine</h1>
          <p>Bhada progressive pricing with geo-grid area multipliers</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Config</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-2)', padding: 4, borderRadius: 10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: tab === t.id ? 'var(--bg-1)' : 'transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--text-2)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          {active ? (
            <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)', borderWidth: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div className="stat-icon accent" style={{ width: 32, height: 32 }}><Zap size={15} /></div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Active Pricing Config</div>
                  <span className="code" style={{ fontSize: 11 }}>{active.version || 'v1'}</span>
                </div>
                <span className="badge accent" style={{ marginLeft: 'auto' }}>ACTIVE</span>
              </div>

              {active.config && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Distance Slabs</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        [`0 – ${active.config.distanceSlabs?.slab1MaxKm}km`, `₹${active.config.distanceSlabs?.rateA}/km`, '#00e5a0'],
                        [`${active.config.distanceSlabs?.slab1MaxKm} – ${active.config.distanceSlabs?.slab2MaxKm}km`, `₹${active.config.distanceSlabs?.rateB}/km`, '#ff9500'],
                        [`${active.config.distanceSlabs?.slab2MaxKm}km+`, `₹${active.config.distanceSlabs?.rateC}/km`, '#4d9fff'],
                      ].map(([range, rate, color]) => (
                        <div key={range} style={{ flex: 1, background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', border: `1px solid ${color}33` }}>
                          <div style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{range}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{rate}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Size Multipliers
                      <button onClick={handleSyncSizes} disabled={syncing} style={{ marginLeft: 10, padding: '2px 8px', fontSize: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontWeight: 700 }}>
                        {syncing ? '…' : '⟳ Sync from Catalog'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(active.config.sizeMultipliers || {}).map(([s, v]) => (
                        <div key={s} style={{ minWidth: 70, background: 'var(--bg-2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 2 }}>{s}</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{v}×</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="divider" />
                  <div className="detail-grid">
                    <div className="detail-item"><label>Min Fare</label><p>₹{active.config.minimumFare}</p></div>
                    <div className="detail-item"><label>Commission</label><p>{active.config.commissionPercent}%</p></div>
                    <div className="detail-item"><label>Min Driver Pay</label><p>₹{active.config.minDriverPayout}</p></div>
                    <div className="detail-item"><label>Platform Fee</label><p>₹{active.config.platformFee}</p></div>
                    <div className="detail-item"><label>GST</label><p>{active.config.gstPercent}%</p></div>
                    <div className="detail-item"><label>Surge</label><p>{active.config.surgeEnabled ? `🟡 ${active.config.surgeMultiplier}×` : '⚫ Off'}</p></div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: 40 }}>
              <BadgePercent size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ color: 'var(--text-2)' }}>No active pricing config. Create one to get started.</div>
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Grid Areas ({grids.length})</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowGridMap(true)}><Map size={13} /> Open Grid Map</button>
            </div>
            {grids.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <div className="empty-state-icon"><Grid3X3 size={18} /></div>
                <h3>No grids configured</h3>
                <p>Open the Grid Map to set area multipliers</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Grid ID</th><th>Label</th><th>Type</th><th>Multiplier</th></tr></thead>
                  <tbody>
                    {grids.map(g => (
                      <tr key={g.gridId}>
                        <td><span className="code" style={{ fontSize: 10 }}>{g.gridId}</span></td>
                        <td>{g.label || '—'}</td>
                        <td><span className="badge" style={{ background: (AREA_COLORS[g.areaType] || '#aaa') + '22', color: AREA_COLORS[g.areaType] || '#aaa' }}>{g.areaType}</span></td>
                        <td><strong>{g.areaMultiplier}×</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Config tab ── */}
      {tab === 'config' && (
        <div>
          {/* Info banner */}
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            Only <strong style={{ color: 'var(--text-1)', margin: '0 4px' }}>one</strong> pricing config can be active at a time. Activating one will automatically deactivate all others.
            <button
              className="btn btn-secondary btn-sm"
              disabled={cleaning}
              onClick={handleCleanup}
              style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 11 }}
            >
              {cleaning ? '…' : '🧹 Fix Duplicates'}
            </button>
          </div>

          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>All Pricing Configs</div>
            {configs.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"><BadgePercent size={22} /></div><h3>No configs yet</h3><p>Create a new config to get started</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {configs.map((c, i) => {
                  const isActive  = c.isActive;
                  const isBusy    = activating === c.id;
                  return (
                    <div key={c.id || i} style={{
                      background: 'var(--bg-2)', borderRadius: 12, padding: '14px 16px',
                      border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      transition: 'border-color 0.2s',
                    }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <span className="code" style={{ fontSize: 13, fontWeight: 700 }}>{c.version || 'v?'}</span>
                        {isActive
                          ? <span className="badge accent" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={10} /> ACTIVE</span>
                          : <span className="badge neutral">INACTIVE</span>
                        }
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-2)' }}>
                          {c.createdAt ? new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {[
                          [`0–${c.config?.distanceSlabs?.slab1MaxKm}km`, `₹${c.config?.distanceSlabs?.rateA}/km`],
                          [`${c.config?.distanceSlabs?.slab1MaxKm}–${c.config?.distanceSlabs?.slab2MaxKm}km`, `₹${c.config?.distanceSlabs?.rateB}/km`],
                          [`${c.config?.distanceSlabs?.slab2MaxKm}km+`, `₹${c.config?.distanceSlabs?.rateC}/km`],
                          ['Min Fare', `₹${c.config?.minimumFare}`],
                          ['Commission', `${c.config?.commissionPercent}%`],
                          ['GST', `${c.config?.gstPercent}%`],
                          ['Platform Fee', `₹${c.config?.platformFee}`],
                          ['Surge', c.config?.surgeEnabled ? `${c.config?.surgeMultiplier}×` : 'Off'],
                        ].map(([label, val]) => (
                          <div key={label} style={{ background: 'var(--bg-0)', borderRadius: 6, padding: '4px 8px', fontSize: 11 }}>
                            <span style={{ color: 'var(--text-2)' }}>{label} </span>
                            <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{val}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {isActive ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={isBusy}
                            onClick={() => handleDeactivate(c.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {isBusy ? '…' : <><Eye size={12} /> Deactivate</>}
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={isBusy || !!activating}
                            onClick={() => handleActivate(c.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {isBusy ? '…' : <><Zap size={12} /> Set Active</>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Grids tab ── */}
      {tab === 'grids' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={() => setShowGridMap(true)}><Map size={14} /> Open Grid Map</button>
          </div>
          <div className="card">
            {grids.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"><Grid3X3 size={22} /></div><h3>No grids configured</h3><p>Use the Grid Map to add area multipliers</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Grid ID</th><th>Label</th><th>Type</th><th>Multiplier</th><th>Lat Range</th><th>Lng Range</th></tr></thead>
                  <tbody>
                    {grids.map(g => (
                      <tr key={g.gridId}>
                        <td><span className="code" style={{ fontSize: 10 }}>{g.gridId}</span></td>
                        <td>{g.label || '—'}</td>
                        <td><span style={{ color: AREA_COLORS[g.areaType] }}>{g.areaType?.replace('_', ' ')}</span></td>
                        <td><strong>{g.areaMultiplier}×</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{g.minLat} → {g.maxLat}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{g.minLng} → {g.maxLng}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Estimator tab ── */}
      {tab === 'estimate' && (
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Fare Estimator</div>
          <form onSubmit={handleEstimate}>
            <div className="two-col" style={{ gap: 10, marginBottom: 12 }}>
              {[
                ['Pickup Lat', 'pickupLat', '19.0760'],
                ['Pickup Lng', 'pickupLng', '72.8777'],
                ['Drop Lat',   'dropLat',   '18.9220'],
                ['Drop Lng',   'dropLng',   '72.8347'],
              ].map(([label, key, ph]) => (
                <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" type="number" step="any" placeholder={ph}
                    value={estimateForm[key]}
                    onChange={e => setEstimateForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Item Size</label>
              <select className="form-input" value={estimateForm.itemSize} onChange={e => setEstimateForm(f => ({ ...f, itemSize: e.target.value }))}>
                {catalogSizes.length > 0
                  ? catalogSizes.map(s => <option key={s.key} value={s.key}>{s.name} ({s.key})</option>)
                  : ['mini', 'small', 'medium', 'large'].map(s => <option key={s} value={s}>{s}</option>)
                }
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={estimating}>
              {estimating ? 'Calculating…' : '⚡ Calculate Fare'}
            </button>
          </form>
          <FareBreakdownView b={breakdown} />
        </div>
      )}

      {/* Create Config Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Pricing Config</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}><X size={15} /></button>
            </div>
            <ConfigForm onSubmit={handleCreate} submitting={submitting} onCancel={() => setShowCreate(false)} catalogSizes={catalogSizes} />
          </div>
        </div>
      )}
    </div>
  );
}