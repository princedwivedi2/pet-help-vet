import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import notificationService from '../../services/notificationService';
import { timeAgo } from '../../utils/helpers';
import styles from './Notifications.module.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll();
      const list = res?.data?.data || res?.data || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch {
      // handled
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch {
      // handled
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) return <Loader fullPage />;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.count}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </span>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" loading={markingAll} onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Card noPadding>
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            message="You're all caught up. Notifications will appear here."
          />
        ) : (
          <div className={styles.list}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`${styles.item} ${!notif.read_at ? styles.unread : ''}`}
                onClick={() => !notif.read_at && handleMarkAsRead(notif.id)}
              >
                <div className={styles.dot} />
                <div className={styles.body}>
                  <p className={styles.message}>
                    {notif.data?.message || notif.data?.title || 'Notification'}
                  </p>
                  <span className={styles.time}>{timeAgo(notif.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
