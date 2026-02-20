import React from 'react';
import {
  X, Bell, CheckCheck, RefreshCw,
  Package, Bike, AlertTriangle, CreditCard, FileText, ShieldCheck, Zap,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

// ── Type meta (icon + colours per notification type) ────────────────────────
const TYPE_META = {
  ONBOARDING_SUBMITTED: { Icon: Bike,          color: 'var(--blue)',   bg: 'var(--blue-dim)',   tag: 'Onboarding' },
  ONBOARDING_APPROVED:  { Icon: ShieldCheck,   color: 'var(--green)',  bg: 'var(--green-dim)',  tag: 'Onboarding' },
  ONBOARDING_REJECTED:  { Icon: ShieldCheck,   color: 'var(--red)',    bg: 'var(--red-dim)',    tag: 'Onboarding' },
  KYC_SUBMITTED:        { Icon: FileText,      color: 'var(--blue)',   bg: 'var(--blue-dim)',   tag: 'KYC' },
  KYC_APPROVED:         { Icon: FileText,      color: 'var(--green)',  bg: 'var(--green-dim)',  tag: 'KYC' },
  KYC_REJECTED:         { Icon: FileText,      color: 'var(--red)',    bg: 'var(--red-dim)',    tag: 'KYC' },
  ORDER_PLACED:         { Icon: Package,       color: 'var(--accent)', bg: 'var(--accent-dim)', tag: 'Order' },
  ORDER_ACCEPTED:       { Icon: Bike,          color: 'var(--accent)', bg: 'var(--accent-dim)', tag: 'Order' },
  ORDER_DISPATCHED:     { Icon: Zap,           color: 'var(--accent)', bg: 'var(--accent-dim)', tag: 'Order' },
  ORDER_DELIVERED:      { Icon: Package,       color: 'var(--green)',  bg: 'var(--green-dim)',  tag: 'Order' },
  ORDER_CANCELLED:      { Icon: Package,       color: 'var(--red)',    bg: 'var(--red-dim)',    tag: 'Order' },
  DISPUTE_RAISED:       { Icon: AlertTriangle, color: 'var(--orange)', bg: 'var(--orange-dim)', tag: 'Dispute' },
  DISPUTE_RESOLVED:     { Icon: AlertTriangle, color: 'var(--green)',  bg: 'var(--green-dim)',  tag: 'Dispute' },
  DISPUTE_REJECTED:     { Icon: AlertTriangle, color: 'var(--red)',    bg: 'var(--red-dim)',    tag: 'Dispute' },
  PAYMENT_SUCCESS:      { Icon: CreditCard,    color: 'var(--green)',  bg: 'var(--green-dim)',  tag: 'Payment' },
  PAYMENT_FAILED:       { Icon: CreditCard,    color: 'var(--red)',    bg: 'var(--red-dim)',    tag: 'Payment' },
  PAYMENT_REFUNDED:     { Icon: CreditCard,    color: 'var(--blue)',   bg: 'var(--blue-dim)',   tag: 'Payment' },
};
const DEFAULT_META = { Icon: Bell, color: 'var(--text-2)', bg: 'var(--bg-3)', tag: 'System' };

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationPanel() {
  const { notifications, unseenCount, loading, panelOpen,
          closePanel, markSeen, markAllSeen, fetchNotifications } = useNotifications();

  if (!panelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closePanel}
        style={{ position:'fixed', inset:0, zIndex:199, background:'rgba(5,8,15,0.55)' }}
      />

      {/* Slide-in panel */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width:380, maxWidth:'95vw',
        background:'var(--bg-1)', borderLeft:'1px solid var(--border)',
        zIndex:200, display:'flex', flexDirection:'column',
        boxShadow:'-12px 0 48px rgba(0,0,0,0.5)',
        animation:'slideInRight 0.2s ease',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Bell size={17} style={{ color:'var(--accent)' }} />
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>
              Notifications
            </span>
            {unseenCount > 0 && (
              <span style={{
                background:'var(--accent)', color:'var(--bg-0)',
                borderRadius:99, fontSize:11, fontWeight:700,
                padding:'1px 8px', fontFamily:'var(--font-mono)',
              }}>
                {unseenCount}
              </span>
            )}
          </div>

          <div style={{ display:'flex', gap:6 }}>
            {unseenCount > 0 && (
              <button
                onClick={markAllSeen}
                className="btn btn-ghost btn-sm"
                title="Mark all as read"
                style={{ gap:4, fontSize:12 }}
              >
                <CheckCheck size={13} /> All read
              </button>
            )}
            <button
              onClick={fetchNotifications}
              className="btn btn-ghost btn-sm"
              title="Refresh"
              style={{ padding:'5px 7px' }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={closePanel}
              className="btn btn-ghost btn-sm"
              style={{ padding:'5px 7px' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── List ── */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading && notifications.length === 0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <div className="loader" />
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding:48, textAlign:'center', color:'var(--text-2)' }}>
              <Bell size={36} style={{ marginBottom:12, opacity:0.25 }} />
              <div style={{ fontSize:13 }}>No notifications yet</div>
            </div>
          ) : (
            notifications.map(n => {
              const m = TYPE_META[n.type] || DEFAULT_META;
              const { Icon } = m;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.seen && markSeen(n.id)}
                  style={{
                    padding:'14px 20px', borderBottom:'1px solid var(--border)',
                    display:'flex', gap:12, cursor: n.seen ? 'default' : 'pointer',
                    background: n.seen ? 'transparent' : 'rgba(0,229,160,0.025)',
                  }}
                >
                  {/* Icon pill */}
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background:m.bg, color:m.color, display:'grid', placeItems:'center',
                  }}>
                    <Icon size={16} />
                  </div>

                  {/* Text */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'flex-start' }}>
                      <span style={{ fontWeight: n.seen ? 500 : 700, fontSize:13, color:'var(--text-0)', lineHeight:1.3 }}>
                        {n.title}
                      </span>
                      {!n.seen && (
                        <div style={{
                          width:7, height:7, borderRadius:'50%',
                          background:'var(--accent)', flexShrink:0, marginTop:3,
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2, lineHeight:1.45 }}>
                      {n.body}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      <span style={{
                        fontSize:10, color:m.color, background:m.bg,
                        padding:'2px 7px', borderRadius:4, fontFamily:'var(--font-mono)',
                      }}>
                        {m.tag}
                      </span>
                      <span style={{ fontSize:11, color:'var(--text-2)', fontFamily:'var(--font-mono)' }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity:0; }
          to   { transform: translateX(0);    opacity:1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
