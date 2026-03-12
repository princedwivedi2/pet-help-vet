import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Icon from '../../common/Icon/Icon';
import styles from './Sidebar.module.css';

const NAV_GROUPS = [
  {
    items: [
      { path: '/dashboard', label: 'Today', icon: 'today' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { path: '/appointments', label: 'Appointments', icon: 'appointments' },
      { path: '/visit-records', label: 'Visit Records', icon: 'clipboardList' },
      { path: '/sos', label: 'SOS Requests', icon: 'sos' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { path: '/earnings', label: 'Earnings', icon: 'earnings' },
      { path: '/reviews', label: 'Reviews', icon: 'star' },
    ],
  },
  {
    label: 'Profile',
    items: [
      { path: '/profile', label: 'My Profile', icon: 'profile' },
      { path: '/notifications', label: 'Notifications', icon: 'notification' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 1024) onClose?.();
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>P</span>
        <div className={styles.logoInfo}>
          <span className={styles.logoText}>PetSathi</span>
          <span className={styles.roleTag}>Veterinarian</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={styles.navGroup}>
            {group.label && (
              <div className={styles.groupLabel}>{group.label}</div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
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
          </div>
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
