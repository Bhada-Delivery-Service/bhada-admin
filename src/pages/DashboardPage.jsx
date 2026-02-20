import React, { useState, useEffect } from 'react';
import { Package, Bike, AlertTriangle, CreditCard, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ordersAPI, ridersAPI, disputesAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const ORDER_STATUSES = ['PLACED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      ordersAPI.getAll(100),
      ridersAPI.getAll(),
      disputesAPI.getAll(),
    ]).then(([o, r, d]) => {
      if (o.status === 'fulfilled') setOrders(o.value.data?.data || []);
      if (r.status === 'fulfilled') setRiders(r.value.data?.data || []);
      if (d.status === 'fulfilled') setDisputes(d.value.data?.data || []);
      setLoading(false);
    });
  }, []);

  const orderStats = ORDER_STATUSES.map(s => ({
    status: s,
    count: orders.filter(o => o.status === s).length,
  }));

  const riderOnline = riders.filter(r => r.isOnline || r.availabilityStatus === 'ONLINE').length;
  const openDisputes = disputes.filter(d => d.status === 'OPEN').length;

  const barData = orderStats.map(s => ({ name: s.status.slice(0, 4), count: s.count }));

  if (loading) return <div className="loading-center"><div className="loader" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Real-time overview of Bhada operations</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-icon accent"><Package size={18} /></div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-sub">{orderStats.find(s => s.status === 'PLACED')?.count || 0} active</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><CheckCircle size={18} /></div>
          <div className="stat-label">Delivered</div>
          <div className="stat-value">{orderStats.find(s => s.status === 'DELIVERED')?.count || 0}</div>
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
          <div className="stat-value">{orderStats.find(s => s.status === 'CANCELLED')?.count || 0}</div>
          <div className="stat-sub">orders cancelled</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><Clock size={18} /></div>
          <div className="stat-label">Dispatched</div>
          <div className="stat-value">{orderStats.find(s => s.status === 'DISPATCHED')?.count || 0}</div>
          <div className="stat-sub">in-transit now</div>
        </div>
      </div>

      <div className="two-col" style={{ gap: 20 }}>
        {/* Chart */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-0)', marginBottom: 20 }}>
            Order Status Distribution
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={32}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-2)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13 }}
                labelStyle={{ color: 'var(--text-0)' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-0)', marginBottom: 16 }}>
            Recent Orders
          </div>
          {orders.slice(0, 6).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Package size={22} /></div>
              <h3>No orders yet</h3>
            </div>
          ) : (
            <div>
              {orders.slice(0, 6).map(order => (
                <div key={order.orderId || order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-0)' }}>#{(order.orderId || order.id || '').slice(-8)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    PLACED: 'blue', DISPATCHED: 'orange', DELIVERED: 'green', CANCELLED: 'red',
    DRAFT: 'neutral', ACTIVE: 'green', INACTIVE: 'neutral', DELETED: 'red',
    PENDING: 'orange', APPROVED: 'green', REJECTED: 'red',
    OPEN: 'orange', UNDER_REVIEW: 'blue', RESOLVED: 'green',
    ONLINE: 'green', OFFLINE: 'neutral', BREAK: 'orange',
    SUCCESS: 'green', FAILED: 'red', REFUNDED: 'purple',
  };
  const color = map[status] || 'neutral';
  return <span className={`badge ${color}`}>{status}</span>;
}
