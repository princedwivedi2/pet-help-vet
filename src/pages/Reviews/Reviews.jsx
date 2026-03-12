import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Tabs from '../../components/common/Tabs/Tabs';
import reviewService from '../../services/reviewService';
import vetProfileService from '../../services/vetProfileService';
import { formatDate } from '../../utils/helpers';
import styles from './Reviews.module.css';

function StarRating({ rating, size = 16 }) {
  return (
    <span className={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={s <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'needs_reply', label: 'Needs Reply' },
  { key: '5', label: '5★' },
  { key: '4', label: '4★' },
  { key: '3', label: '3★' },
  { key: '2', label: '2★' },
  { key: '1', label: '1★' },
];

export default function Reviews() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const profileRes = await vetProfileService.getProfile();
      const profile = profileRes?.data?.vet_profile || profileRes?.data;
      const vetUuid = profile?.uuid;
      setAvgRating(profile?.avg_rating || 0);
      setTotalReviews(profile?.total_reviews || 0);

      if (vetUuid) {
        const res = await reviewService.getForVet
          ? reviewService.getForVet(vetUuid)
          : fetch(`/api/v1/reviews/vet/${vetUuid}`).then((r) => r.json());
        const data = res?.data;
        setReviews(data?.reviews?.data || data?.reviews || data?.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleReply = async (uuid) => {
    if (!replyText.trim()) return;
    try {
      setReplying(true);
      await reviewService.reply(uuid, { reply: replyText });
      setReviews((prev) =>
        prev.map((r) =>
          r.uuid === uuid ? { ...r, vet_reply: replyText, vet_replied_at: new Date().toISOString() } : r
        )
      );
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit reply');
    } finally {
      setReplying(false);
    }
  };

  if (loading) return <Loader fullPage />;

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  // Filtered reviews
  const filteredReviews = filter === 'all'
    ? reviews
    : filter === 'needs_reply'
      ? reviews.filter((r) => !r.vet_reply)
      : reviews.filter((r) => r.rating === Number(filter));

  const needsReplyCount = reviews.filter((r) => !r.vet_reply).length;

  return (
    <div className={styles.reviews}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryLeft}>
          <div className={styles.ratingBig}>
            <strong>{Number(avgRating).toFixed(1)}</strong>
          </div>
          <StarRating rating={Math.round(avgRating)} size={20} />
          <span className={styles.totalCount}>
            {totalReviews} review{totalReviews !== 1 ? 's' : ''}
          </span>
          {needsReplyCount > 0 && (
            <span className={styles.needsReplyBadge}>
              {needsReplyCount} need{needsReplyCount !== 1 ? '' : 's'} reply
            </span>
          )}
        </div>
        <div className={styles.distribution}>
          {distribution.map(({ star, count }) => (
            <div key={star} className={styles.distRow}>
              <span className={styles.distStar}>{star}★</span>
              <div className={styles.distBar}>
                <div
                  className={styles.distFill}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className={styles.distCount}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <Tabs tabs={FILTER_TABS} active={filter} onChange={setFilter} />

      {filteredReviews.length === 0 ? (
        <Card>
          <EmptyState
            icon="star"
            title="No reviews found"
            message={filter === 'needs_reply' ? 'All reviews have been replied to!' : 'No reviews match this filter.'}
          />
        </Card>
      ) : (
        <div className={styles.reviewList}>
          {filteredReviews.map((review) => (
            <div key={review.uuid || review.id} className={styles.reviewItem}>
              <div className={styles.reviewTop}>
                <span className={styles.reviewUser}>
                  {review.user?.name || review.user_name || 'Pet Owner'}
                </span>
                <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
              </div>
              <StarRating rating={review.rating} />
              {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}

              {review.vet_reply ? (
                <div className={styles.replyBox}>
                  <div className={styles.replyLabel}>Your Reply</div>
                  <p className={styles.replyText}>{review.vet_reply}</p>
                </div>
              ) : replyingTo === review.uuid ? (
                <div className={styles.replyForm}>
                  <textarea
                    className={styles.replyInput}
                    rows={3}
                    placeholder="Write your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className={styles.replyActions}>
                    <button
                      className={styles.replyCancelBtn}
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.replyBtn}
                      onClick={() => handleReply(review.uuid)}
                      disabled={replying || !replyText.trim()}
                    >
                      {replying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={styles.replyBtn}
                  onClick={() => {
                    setReplyingTo(review.uuid);
                    setReplyText('');
                  }}
                  style={{ marginTop: 8 }}
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
