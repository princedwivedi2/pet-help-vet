import styles from './SearchBar.module.css';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className={styles.wrapper}>
      <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className={styles.clear} onClick={() => onChange('')}>
          ×
        </button>
      )}
    </div>
  );
}
