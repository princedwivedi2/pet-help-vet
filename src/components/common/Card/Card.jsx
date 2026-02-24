import styles from './Card.module.css';

export default function Card({
  children,
  title,
  value,
  subtitle,
  icon,
  noPadding = false,
  className = '',
}) {
  if (value !== undefined) {
    return (
      <div className={`${styles.stat} ${className}`}>
        {icon && <div className={styles.statIcon}>{icon}</div>}
        <div className={styles.statBody}>
          <span className={styles.statTitle}>{title}</span>
          <span className={styles.statValue}>{value}</span>
          {subtitle && <span className={styles.statSub}>{subtitle}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${noPadding ? styles.noPad : ''} ${className}`}>
      {title && (
        <div className={styles.header}>
          <h3 className={styles.heading}>{title}</h3>
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
