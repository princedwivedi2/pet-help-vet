import styles from './Skeleton.module.css';

export default function Skeleton({
  variant = 'line',
  width,
  height,
  className = '',
  count = 1,
  style = {},
}) {
  const variantClass = styles[variant] || styles.line;
  const inlineStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  if (count > 1) {
    return (
      <div className={styles.group}>
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={`${styles.base} ${variantClass} ${className}`}
            style={{ ...inlineStyle, width: i === count - 1 ? '70%' : inlineStyle.width || '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={`${styles.base} ${variantClass} ${className}`}
      style={inlineStyle}
    />
  );
}
