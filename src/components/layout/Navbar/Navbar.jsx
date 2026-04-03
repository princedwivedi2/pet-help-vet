import { useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import Icon from '../../common/Icon/Icon';
import notificationService from '../../../services/notificationService';
import styles from './Navbar.module.css';

const PAGE_META = {
  '/dashboard': { group: null, title: 'Today' },
  '/appointments': { group: 'Patients', title: 'Appointments' },
  '/visit-records': { group: 'Patients', title: 'Visit Records' },
  '/sos': { group: 'Patients', title: 'SOS Requests' },
  '/earnings': { group: 'Practice', title: 'Earnings' },
  '/reviews': { group: 'Practice', title: 'Reviews' },
  '/profile': { group: 'Profile', title: 'My Profile' },
  '/notifications': { group: null, title: 'Notifications' },
};

export default function Navbar({ onToggleSidebar }) {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const meta = PAGE_META[location.pathname] || { group: null, title: 'Dashboard' };

  useEffect(() => {
    const fetchCount = () => {
      notificationService.getUnreadCount()
        .then((res) => {
          setUnreadCount(res?.data?.unread_count ?? res?.data?.count ?? 0);
        })
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className={styles.breadcrumb}>
          {meta.group && (
            <>
              <span className={styles.breadcrumbGroup}>{meta.group}</span>
              <span className={styles.breadcrumbSep}>
                <Icon name="chevronRight" />
              </span>
            </>
          )}
          <h1 className={styles.title}>{meta.title}</h1>
        </div>
      </div>
      <div className={styles.actions}>
        <Link to="/notifications" className={styles.notifBtn} aria-label="Notifications">
          <Icon name="notification" />
          {unreadCount > 0 && (
            <span className={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Link>
        <div className={styles.user}>
          <div className={styles.avatar}>
            {(user?.name || 'V').charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || 'Veterinarian'}</span>
            <span className={styles.userRole}>Veterinarian</span>
          </div>
        </div>
      </div>
    </header>
  );
}
