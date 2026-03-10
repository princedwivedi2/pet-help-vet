import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import reviewService from '../../services/reviewService';
import vetProfileService from '../../services/vetProfileService';
import { formatDate } from '../../utils/helpers';
import styles from './Reviews.module.css';

function StarRating({ rating }) {
  return (
    <span className={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width="16"
          height="16"
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

export default function Reviews() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

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

  return (
    <div className={styles.reviews}>
      <div className={styles.header}>
        <h2>My Reviews</h2>
        <div className={styles.statsRow}>
          <div className={styles.ratingBig}>
            <strong>{Number(avgRating).toFixed(1)}</strong>
            <span>/ 5.0</span>
          </div>
          <StarRating rating={Math.round(avgRating)} />
          <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
            ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
          </span>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <Card title={`All Reviews (${reviews.length})`}>
        {reviews.length === 0 ? (
          <EmptyState
            icon="star"
            title="No reviews yet"
            description="Reviews from pet owners will appear here after completed appointments."
          />
        ) : (
          <div className={styles.reviewList}>
            {reviews.map((review) => (
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
                    <input
                      className={styles.replyInput}
                      type="text"
                      placeholder="Write your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(review.uuid)}
                    />
                    <button
                      className={styles.replyBtn}
                      onClick={() => handleReply(review.uuid)}
                      disabled={replying || !replyText.trim()}
                    >
                      {replying ? 'Sending...' : 'Reply'}
                    </button>
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
      </Card>
    </div>
  );
}
