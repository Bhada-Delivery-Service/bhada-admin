import React, { useState, useEffect } from 'react';
import { Package, Bike, AlertTriangle, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { ordersAPI, ridersAPI, disputesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

// ─── Status Badge (shared across pages) ──────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    PLACED: 'blue', DISPATCHED: 'orange', DELIVERED: 'green', CANCELLED: 'red',
    DRAFT: 'neutral', CREATED: 'blue', READY: 'orange',
    ACTIVE: 'green', INACTIVE: 'neutral', DELETED: 'red',
    PENDING: 'orange', APPROVED: 'green', REJECTED: 'red',
    OPEN: 'orange', UNDER_REVIEW: 'blue', RESOLVED: 'green',
    ONLINE: 'green', OFFLINE: 'neutral', BREAK: 'orange',
    SUCCESS: 'green', FAILED: 'red', REFUNDED: 'purple', INITIATED: 'blue',
  };
  return <span className={`badge ${map[status] || 'neutral'}`}>{status}</span>;
}

const ORDER_STATUSES = ['PLACED', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'DRAFT'];

// Bar color per status
const BAR_COLORS = {
  PLACED:     '#4d9fff',
  READY:      '#ff9a3c',
  DISPATCHED: '#a855f7',
  DELIVERED:  '#36d399',
  CANCELLED:  '#ff4d6d',
  DRAFT:      '#5a6785',
};

// Custom Y axis tick — bigger font
function CustomYTick({ x, y, payload }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--text-1)" fontSize={13} fontFamily="var(--font-mono)" fontWeight={600}>
      {payload.value}
    </text>
  );
}

// Custom X axis tick — bigger font
function CustomXTick({ x, y, payload }) {
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fill="var(--text-1)" fontSize={12} fontFamily="var(--font-mono)" fontWeight={600}>
      {payload.value}
    </text>
  );
}

// Custom bar label on top of each bar
function CustomBarLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="var(--text-0)" fontSize={12} fontFamily="var(--font-mono)" fontWeight={700}>
      {value}
    </text>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [riders,   setRiders]   = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.allSettled([
      ordersAPI.getAll(200),
      ridersAPI.getAll(),
      disputesAPI.getAll(),
    ]).then(([o, r, d]) => {
      if (o.status === 'fulfilled') setOrders(o.value.data?.data || []);
      if (r.status === 'fulfilled') setRiders(r.value.data?.data || []);
      if (d.status === 'fulfilled') setDisputes(d.value.data?.data || []);
      setLoading(false);
    });
  }, []);

  const count        = (s) => orders.filter(o => o.status === s).length;
  const riderOnline  = riders.filter(r => r.availabilityStatus === 'ONLINE' || r.isOnline).length;
  const openDisputes = disputes.filter(d => d.status === 'OPEN').length;

  const barData = ORDER_STATUSES.map(s => ({
    name:   s.slice(0, 4),
    count:  count(s),
    status: s,
  }));

  const maxCount  = Math.max(...barData.map(d => d.count), 1);
  const yAxisMax  = Math.ceil(maxCount * 1.2);
  const tickCount = Math.min(yAxisMax + 1, 6);

  if (loading) return <div className="loading-center"><div className="loader" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Real-time overview of Bhada operations</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-icon accent"><Package size={18} /></div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-sub">{count('PLACED')} awaiting rider</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><CheckCircle size={18} /></div>
          <div className="stat-label">Delivered</div>
          <div className="stat-value">{count('DELIVERED')}</div>
          <div className="stat-sub">completed orders</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue"><Bike size={18} /></div>
          <div className="stat-label">Riders</div>
          <div className="stat-value">{riders.length}</div>
          <div className="stat-sub">{riderOnline} online now</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><AlertTriangle size={18} /></div>
          <div className="stat-label">Open Disputes</div>
          <div className="stat-value">{openDisputes}</div>
          <div className="stat-sub">{disputes.length} total</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red"><XCircle size={18} /></div>
          <div className="stat-label">Cancelled</div>
          <div className="stat-value">{count('CANCELLED')}</div>
          <div className="stat-sub">orders cancelled</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><Clock size={18} /></div>
          <div className="stat-label">Dispatched</div>
          <div className="stat-value">{count('DISPATCHED')}</div>
          <div className="stat-sub">in-transit now</div>
        </div>
      </div>

      {/* ── Chart + Recent Orders — same height always ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>

        {/* Chart card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-0)', marginBottom: 20, flexShrink: 0 }}>
            Order Status Distribution
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                barSize={36}
                margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={<CustomXTick />}
                  orientation="bottom"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={<CustomYTick />}
                  domain={[0, yAxisMax]}
                  tickCount={tickCount}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                  }}
                  labelStyle={{ color: 'var(--text-0)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--accent)' }}
                  formatter={(value, name, props) => [value, props.payload.status]}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  label={<CustomBarLabel />}
                  isAnimationActive={true}
                >
                  {barData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={BAR_COLORS[entry.status] || 'var(--accent)'}
                      fillOpacity={entry.count === 0 ? 0.25 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pills at bottom */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            marginTop: 16, paddingTop: 16,
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {ORDER_STATUSES.map(s => (
              <div
                key={s}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--bg-2)', borderRadius: 8,
                  padding: '5px 10px', fontSize: 12,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: BAR_COLORS[s], flexShrink: 0 }} />
                <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{s}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-0)', fontSize: 12 }}>
                  {count(s)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders — same height, list scrolls inside */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-0)' }}>
              Recent Orders
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')} style={{ fontSize: 12 }}>
              View All <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {orders.slice(0, 8).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Package size={22} /></div>
                <h3>No orders yet</h3>
              </div>
            ) : (
              orders.slice(0, 8).map(order => (
                <div
                  key={order.orderId || order.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  }}
                  onClick={() => navigate('/orders', { state: { viewOrderId: order.orderId || order.id } })}
                >
                  <div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-0)' }}>
                      #{(order.orderId || order.id || '').slice(-8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-0)', marginBottom: 16 }}>
          Quick Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { label: 'View All Orders',  icon: Package,       color: 'purple', action: () => navigate('/orders') },
            { label: 'Placed Orders',    icon: Clock,         color: 'orange', action: () => navigate('/orders', { state: { status: 'PLACED' } }) },
            { label: 'Active Disputes',  icon: AlertTriangle, color: 'red',    action: () => navigate('/disputes') },
            { label: 'Manage Riders',    icon: Bike,          color: 'green',  action: () => navigate('/riders') },
          ].map(({ label, icon: Icon, color, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                background: `var(--${color}-dim)`,
                border: `1px solid rgba(255,255,255,0.06)`,
                borderRadius: 10,
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `var(--${color})`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${color}-dim)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon size={15} style={{ color: `var(--${color})` }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}