import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import styles from './Navbar.module.css';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/appointments': 'Appointments',
  '/sos': 'SOS Requests',
  '/profile': 'My Profile',
  '/notifications': 'Notifications',
};

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <header className={styles.navbar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
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
