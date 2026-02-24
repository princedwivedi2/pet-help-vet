import styles from './FormInput.module.css';

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder = '',
  options = [],
  rows = 4,
}) {
  const id = `field-${name}`;

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          id={id}
          name={name}
          className={`${styles.input} ${styles.textarea} ${error ? styles.inputError : ''}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          id={id}
          name={name}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={id}
        name={name}
        type={type}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  };

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {renderInput()}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
