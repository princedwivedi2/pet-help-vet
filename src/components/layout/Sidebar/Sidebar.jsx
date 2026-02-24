import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Icon from '../../common/Icon/Icon';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/appointments', label: 'Appointments', icon: 'appointments' },
  { path: '/sos', label: 'SOS Requests', icon: 'sos' },
  { path: '/profile', label: 'My Profile', icon: 'profile' },
  { path: '/notifications', label: 'Notifications', icon: 'notification' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>P</span>
        <span className={styles.logoText}>PetSathi</span>
        <span className={styles.roleTag}>Vet</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>
              <Icon name={item.icon} />
            </span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.navIcon}>
            <Icon name="logout" />
          </span>
          <span className={styles.navLabel}>Log out</span>
        </button>
      </div>
    </aside>
  );
}
