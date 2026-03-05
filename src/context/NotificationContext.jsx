import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socketService';

const NotificationContext = createContext(null);

const NOTIF_EMOJI = {
  ONBOARDING_SUBMITTED: '📋',
  ONBOARDING_APPROVED:  '🎉',
  ONBOARDING_REJECTED:  '❌',
  KYC_SUBMITTED:        '📄',
  KYC_APPROVED:         '✅',
  KYC_REJECTED:         '❌',
  ORDER_PLACED:         '📦',
  ORDER_ACCEPTED:       '🛵',
  ORDER_DISPATCHED:     '🚀',
  ORDER_DELIVERED:      '✅',
  ORDER_CANCELLED:      '🚫',
  ORDER_AVAILABLE:      '📦',
  DISPUTE_RAISED:       '⚠️',
  DISPUTE_RESOLVED:     '✅',
  DISPUTE_REJECTED:     '❌',
  PAYMENT_SUCCESS:      '💳',
  PAYMENT_FAILED:       '❌',
  PAYMENT_REFUNDED:     '💸',
};

export function NotificationProvider({ children, accessToken }) {
  const [notifications, setNotifications] = useState([]);
  const [unseenCount,   setUnseenCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [panelOpen,     setPanelOpen]     = useState(false);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { data } = await notificationsAPI.getAll(40);
      setNotifications(data.data || []);
      setUnseenCount(data.unseen ?? 0);
    } catch (e) {
      console.error('[Notif] fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    // Disconnect any existing socket before creating a new one.
    // This is critical: when accessToken changes (refresh or new login),
    // we must reconnect with the fresh token so the server accepts it.
    disconnectSocket();

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    socket.on('notification:new', (n) => {
      if (n.id) {
        setNotifications(prev => [n, ...prev]);
        setUnseenCount(prev => prev + 1);
      }
      const emoji = NOTIF_EMOJI[n.type] || '🔔';
      toast(`${emoji}  ${n.title}\n${n.body}`, {
        duration: 6000,
        style: {
          background: '#131929',
          color: '#f0f4ff',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '13px',
          maxWidth: '360px',
          whiteSpace: 'pre-line',
          lineHeight: 1.5,
        },
      });
    });

    socket.on('notification:count', ({ unseen }) => {
      setUnseenCount(unseen);
    });

    // ── Real-time data sync events → dispatch as window CustomEvents
    // so individual pages (OrdersPage, DisputesPage, RefundsPage, etc.)
    // can subscribe without prop drilling or an extra context layer.
    socket.on('order:updated', (data) => {
      window.dispatchEvent(new CustomEvent('ws:order:updated', { detail: data }));
    });

    socket.on('dispute:updated', (data) => {
      window.dispatchEvent(new CustomEvent('ws:dispute:updated', { detail: data }));
    });

    socket.on('refund:updated', (data) => {
      window.dispatchEvent(new CustomEvent('ws:refund:updated', { detail: data }));
    });

    socket.on('rider:updated', (data) => {
      window.dispatchEvent(new CustomEvent('ws:rider:updated', { detail: data }));
    });

    fetchNotifications();

    return () => {
      socket.off('notification:new');
      socket.off('notification:count');
      socket.off('order:updated');
      socket.off('dispute:updated');
      socket.off('refund:updated');
      socket.off('rider:updated');
    };
  }, [accessToken, fetchNotifications]);

  // Cleanup on logout (accessToken becomes null)
  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      setNotifications([]);
      setUnseenCount(0);
      setPanelOpen(false);
    }
  }, [accessToken]);

  const markSeen = useCallback(async (id) => {
    try {
      await notificationsAPI.markSeen(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, seen: true } : n));
      setUnseenCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error('[Notif] markSeen failed', e); }
  }, []);

  const markAllSeen = useCallback(async () => {
    try {
      await notificationsAPI.markAllSeen();
      setNotifications(prev => prev.map(n => ({ ...n, seen: true })));
      setUnseenCount(0);
    } catch (e) { console.error('[Notif] markAllSeen failed', e); }
  }, []);

  const openPanel  = useCallback(() => setPanelOpen(true),  []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <NotificationContext.Provider value={{
      notifications, unseenCount, loading, panelOpen,
      fetchNotifications, markSeen, markAllSeen, openPanel, closePanel,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
};