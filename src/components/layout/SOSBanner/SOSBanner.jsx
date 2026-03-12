import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../common/Icon/Icon';
import sosService from '../../../services/sosService';
import { timeAgo } from '../../../utils/helpers';
import styles from './SOSBanner.module.css';

export default function SOSBanner() {
  const [activeSOS, setActiveSOS] = useState([]);

  useEffect(() => {
    loadSOS();
    const interval = setInterval(loadSOS, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSOS = async () => {
    try {
      const res = await sosService.getActive();
      const list = res?.data?.sos_requests || res?.data || [];
      setActiveSOS(Array.isArray(list) ? list : []);
    } catch {
      // silent — banner is supplementary
    }
  };

  if (activeSOS.length === 0) return null;

  const first = activeSOS[0];

  return (
    <div className={styles.banner} role="alert" aria-live="assertive">
      <div className={styles.pulse} />
      <span className={styles.icon}>
        <Icon name="zap" />
      </span>
      <span className={styles.text}>
        <strong>{activeSOS.length} active emergency{activeSOS.length > 1 ? 's' : ''}</strong>
        {first.emergency_type && <> &middot; {first.emergency_type}</>}
        {first.created_at && <> &middot; {timeAgo(first.created_at)}</>}
      </span>
      <Link to="/sos" className={styles.link}>
        Respond <Icon name="arrowRight" />
      </Link>
    </div>
  );
}
