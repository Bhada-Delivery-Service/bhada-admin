import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Image, Paperclip, RefreshCw, Package, User, MapPin, Clock, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { disputesAPI, filesAPI } from '../services/api';

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
}
function isVideo(url) {
  return /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url);
}

// ─── Order Info Panel ────────────────────────────────────────────────────────
function OrderInfoPanel({ dispute }) {
  if (!dispute) return null;

  const rows = [
    { icon: <Package size={13} />,   label: 'Dispute ID',  val: `#${(dispute.disputeId || '').slice(-10).toUpperCase()}` },
    { icon: <Package size={13} />,   label: 'Order ID',    val: dispute.orderId ? `#${dispute.orderId.slice(-10).toUpperCase()}` : '—' },
    { icon: <User size={13} />,      label: 'Raised By',   val: dispute.raisedBy || '—' },
    { icon: <User size={13} />,      label: 'Role',        val: dispute.raisedByRole || '—' },
    { icon: <Clock size={13} />,     label: 'Status',      val: dispute.status?.replace(/_/g, ' ') || '—' },
    { icon: <Clock size={13} />,     label: 'Created',     val: dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
    { icon: <Paperclip size={13} />, label: 'Reason',      val: dispute.reason?.replace(/_/g, ' ') || '—' },
  ];

  if (dispute.refundAmount) {
    rows.push({ icon: <CreditCard size={13} />, label: 'Refund', val: `₹${dispute.refundAmount}` });
  }

  return (
    <div style={{
      width: 240, borderLeft: '1px solid var(--border)',
      background: 'var(--bg-subtle)', padding: '12px 14px',
      overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 12, color: 'var(--text-0)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Dispute Info
      </div>

      {rows.map(({ icon, label, val }) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)', marginBottom: 2 }}>
            {icon} {label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-0)', fontFamily: ['Dispute ID', 'Order ID'].includes(label) ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
            {val}
          </div>
        </div>
      ))}

      {dispute.description && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5 }}>{dispute.description}</div>
        </div>
      )}

      {dispute.adminNote && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--blue-dim)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 4, fontWeight: 600 }}>Admin Note</div>
          <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5 }}>{dispute.adminNote}</div>
        </div>
      )}

      {dispute.evidenceUrls?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Evidence</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {dispute.evidenceUrls.map((url, i) => (
              isImage(url)
                ? <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="evidence" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                  </a>
                : <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--blue)' }}>File {i + 1}</a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn }) {
  return (
    <div style={{
      display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start',
      marginBottom: 8, padding: '0 12px',
    }}>
      <div style={{ maxWidth: '70%' }}>
        {!isOwn && (
          <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 3, paddingLeft: 2 }}>
            {msg.senderName} · {msg.senderRole}
          </div>
        )}
        <div style={{
          background: isOwn ? 'var(--primary)' : 'var(--bg-surface)',
          color: isOwn ? '#fff' : 'var(--text-0)',
          borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '8px 12px',
          fontSize: 13,
          border: isOwn ? 'none' : '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}>
          {msg.text && <div style={{ lineHeight: 1.5 }}>{msg.text}</div>}

          {msg.mediaUrls?.map((url, i) => (
            <div key={i} style={{ marginTop: msg.text ? 6 : 0 }}>
              {isImage(url) ? (
                <a href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="media" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }} />
                </a>
              ) : isVideo(url) ? (
                <video controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }}>
                  <source src={url} />
                </video>
              ) : (
                <a href={url} target="_blank" rel="noreferrer" style={{ color: isOwn ? 'rgba(255,255,255,0.85)' : 'var(--blue)', fontSize: 12 }}>
                  📎 Attachment
                </a>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2, textAlign: isOwn ? 'right' : 'left', paddingRight: isOwn ? 2 : 0, paddingLeft: isOwn ? 0 : 2 }}>
          {formatTime(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Main DisputeChatModal ────────────────────────────────────────────────────
export default function DisputeChatModal({ dispute, onClose, currentAdminUid, socket }) {
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState([]);
  const bottomRef  = useRef(null);
  const fileRef    = useRef(null);
  const disputeId  = dispute?.disputeId || dispute?.id;

  // Load messages
  const loadMessages = async () => {
    if (!disputeId) return;
    setLoading(true);
    try {
      const { data } = await disputesAPI.getChat(disputeId);
      setMessages(data?.data || []);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [disputeId]);

  // Real-time socket subscription
  useEffect(() => {
    if (!socket || !disputeId) return;
    socket.emit('dispute:chat:join', disputeId);

    const handler = (msg) => {
      if (msg.disputeId === disputeId) {
        setMessages(prev => {
          // Avoid duplicate if our own message was already added optimistically
          if (prev.find(m => m.messageId === msg.messageId)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('dispute:chat:message', handler);
    return () => {
      socket.off('dispute:chat:message', handler);
      socket.emit('dispute:chat:leave', disputeId);
    };
  }, [socket, disputeId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && mediaUrls.length === 0) return;
    setSending(true);
    try {
      const { data } = await disputesAPI.sendMessage(disputeId, { text: text.trim(), mediaUrls });
      setMessages(prev => [...prev, data.data]);
      setText('');
      setMediaUrls([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const { data } = await filesAPI.upload(file);
        return data.url;
      }));
      setMediaUrls(prev => [...prev, ...urls]);
      toast.success(`${urls.length} file(s) attached`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 820, width: '95vw', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '12px 16px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-title">
              Dispute Chat — <span className="code" style={{ fontSize: 12 }}>#{(disputeId || '').slice(-10).toUpperCase()}</span>
            </div>
            <span className={`badge ${dispute?.status === 'OPEN' ? 'badge-open' : dispute?.status === 'RESOLVED' ? '' : ''}`} style={{ fontSize: 11 }}>
              {dispute?.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadMessages}><RefreshCw size={13} /></button>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Body: chat + order info */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Chat area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12, paddingBottom: 8 }}>
              {loading ? (
                <div className="loading-center"><div className="loader" /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13, marginTop: 40 }}>
                  No messages yet. Start the conversation.
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble key={msg.messageId} msg={msg} isOwn={msg.senderUid === currentAdminUid} />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Staged media previews */}
            {mediaUrls.length > 0 && (
              <div style={{ display: 'flex', gap: 6, padding: '6px 12px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                {mediaUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    {isImage(url)
                      ? <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                      : <div style={{ width: 48, height: 48, background: 'var(--bg-3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-2)' }}>FILE</div>
                    }
                    <button
                      onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Attach image or video"
              >
                {uploading ? <div className="loader" style={{ width: 14, height: 14 }} /> : <Image size={15} />}
              </button>
              <textarea
                className="form-textarea"
                style={{ flex: 1, minHeight: 38, maxHeight: 100, resize: 'none', margin: 0 }}
                placeholder="Type a message… (Enter to send)"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSend}
                disabled={sending || (!text.trim() && mediaUrls.length === 0)}
              >
                {sending ? <div className="loader" style={{ width: 14, height: 14, borderTopColor: '#fff' }} /> : <Send size={13} />}
              </button>
            </div>
          </div>

          {/* Order info sidebar */}
          <OrderInfoPanel dispute={dispute} />
        </div>
      </div>
    </div>
  );
}
