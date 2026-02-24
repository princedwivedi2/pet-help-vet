import styles from './Loader.module.css';

export default function Loader({ size = 'md', fullPage = false }) {
  if (fullPage) {
    return (
      <div className={styles.fullPage}>
        <div className={`${styles.spinner} ${styles[size]}`} />
      </div>
    );
  }
  return <div className={`${styles.spinner} ${styles[size]}`} />;
}
