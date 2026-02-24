import Loader from '../Loader/Loader';
import EmptyState from '../EmptyState/EmptyState';
import styles from './Table.module.css';

export default function Table({
  columns,
  data = [],
  loading = false,
  emptyTitle,
  emptyMessage,
  onRowClick,
  keyField = 'id',
}) {
  if (loading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader />
      </div>
    );
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={styles.th}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row[keyField]}
              className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={styles.td}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
