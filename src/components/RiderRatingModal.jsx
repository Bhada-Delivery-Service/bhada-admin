/**
 * RiderRatingModal.jsx
 *
 * Drop-in replacement for the inline rating modal in RidersPage.jsx.
 *
 * HOW TO USE IN RidersPage.jsx:
 * 1. Import this component:
 *      import RiderRatingModal from './RiderRatingModal';
 *
 * 2. Add state to RidersPage:
 *      const [rateModal, setRateModal] = useState(null); // riderId string
 *
 * 3. Replace your existing rate button with:
 *      <button onClick={() => setRateModal(rider.uid)}>Rate</button>
 *
 * 4. Add the modal to the JSX:
 *      {rateModal && (
 *        <RiderRatingModal
 *          riderId={rateModal}
 *          onClose={() => setRateModal(null)}
 *          onSubmitted={() => { setRateModal(null); fetchRiders(true); }}
 *        />
 *      )}
 */

import React, { useState, useEffect } from 'react';
import { Star, X, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { ridersAPI } from '../services/api';

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: star <= (hover || value) ? '#f59e0b' : 'var(--border-bright)',
            fontSize: 28, lineHeight: 1,
            transition: 'color 0.1s',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function DistributionBar({ label, count, max, color }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--text-2)', width: 16, textAlign: 'right' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#f59e0b' }}>★</span>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color || '#f59e0b',
          borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-2)', width: 24, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

export default function RiderRatingModal({ riderId, onClose, onSubmitted }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentRatings, setRecentRatings] = useState([]);

  // Load current rating stats and recent ratings — both come from the same endpoint
  useEffect(() => {
    if (!riderId) return;
    setLoadingStats(true);
    ridersAPI.getRatings(riderId)
      .then(res => {
        const payload = res.data?.data || {};
        // Backend returns { ratings: [...], summary: { averageRating, totalRatings, distribution } }
        const summary = payload.summary || {};
        setStats({
          averageRating: summary.averageRating || 0,
          totalRatingsCount: summary.totalRatings || 0,
          distribution: summary.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
        setRecentRatings(payload.ratings || []);
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [riderId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await ridersAPI.rate(riderId, stars, comment);
      toast.success(`Rating ${stars}★ submitted!`);
      onSubmitted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const maxCount = stats
    ? Math.max(...Object.values(stats.distribution || {}), 1)
    : 1;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(5,8,15,0.85)', display: 'grid', placeItems: 'center' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-1)', border: '1px solid var(--border-bright)',
          borderRadius: 16, padding: 24, width: '92vw', maxWidth: 480,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Rate Rider</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Current stats */}
        {loadingStats ? (
          <div style={{ display: 'grid', placeItems: 'center', height: 80 }}>
            <div className="loader" />
          </div>
        ) : stats && stats.totalRatingsCount > 0 ? (
          <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>
                  {stats.averageRating.toFixed(1)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>
                  {stats.totalRatingsCount} rating{stats.totalRatingsCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {[5, 4, 3, 2, 1].map(s => (
                  <DistributionBar
                    key={s}
                    label={s}
                    count={stats.distribution?.[s] || 0}
                    max={maxCount}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--text-2)', textAlign: 'center' }}>
            No ratings yet — be the first!
          </div>
        )}

        {/* Submit new rating */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Your Rating</div>
          <StarRating value={stars} onChange={setStars} />
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][stars]}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Comment (optional)</div>
          <textarea
            className="form-input"
            style={{ width: '100%', minHeight: 72, resize: 'vertical', fontSize: 13 }}
            placeholder="Add a comment about this rider…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
          />
          <div style={{ fontSize: 10, color: 'var(--text-2)', textAlign: 'right' }}>{comment.length}/500</div>
        </div>

        {/* Recent ratings list */}
        {recentRatings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Recent Ratings
            </div>
            <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentRatings.map(r => (
                <div key={r.ratingId || r.id} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {'★'.repeat(r.rating || r.stars)}{'☆'.repeat(5 - (r.rating || r.stars))}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && <div style={{ color: 'var(--text-1)', fontSize: 11 }}>{r.comment}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>
                    By {r.ratedByUid?.slice(0, 8)}…{r.orderId ? ` · Order #${r.orderId.slice(-6).toUpperCase()}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary flex-1"
            onClick={handleSubmit}
            disabled={submitting || !stars}
          >
            {submitting ? 'Submitting…' : `Submit ${stars}★ Rating`}
          </button>
        </div>
      </div>
    </div>
  );
}