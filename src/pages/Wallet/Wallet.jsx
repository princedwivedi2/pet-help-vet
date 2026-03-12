import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Icon from '../../components/common/Icon/Icon';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Tabs from '../../components/common/Tabs/Tabs';
import paymentService from '../../services/paymentService';
import { formatDate } from '../../utils/helpers';
import styles from './Wallet.module.css';

const TX_TABS = [
  { key: 'all', label: 'All' },
  { key: 'credit', label: 'Earnings' },
  { key: 'debit', label: 'Withdrawals' },
];

export default function Wallet() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [txTab, setTxTab] = useState('all');

  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [walletRes, payRes] = await Promise.allSettled([
        paymentService.getWallet(),
        paymentService.getAll({ per_page: 20 }),
      ]);

      if (walletRes.status === 'fulfilled') {
        const data = walletRes.value?.data;
        setWallet(data?.wallet || data);
        setTransactions(data?.transactions || []);
      }

      if (payRes.status === 'fulfilled') {
        const data = payRes.value?.data;
        setPayments(data?.payments?.data || data?.payments || data?.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (loading) return <Loader fullPage />;

  const balance = wallet?.balance ?? 0;
  const totalEarned = wallet?.total_earned ?? 0;
  const totalWithdrawn = wallet?.total_withdrawn ?? 0;
  const completedCount = payments.filter((p) => p.status === 'captured' || p.status === 'completed').length;
  const pendingCount = payments.filter((p) => p.status === 'pending' || p.status === 'created').length;
  const offlineCount = payments.filter((p) => p.method === 'cash' || p.method === 'offline').length;

  // Merge and filter transactions
  const allTx = transactions.length > 0
    ? transactions
    : payments.map((p) => ({ ...p, type: 'credit', transaction_type: 'credit' }));
  const filteredTx = txTab === 'all'
    ? allTx
    : allTx.filter((tx) => (tx.type || tx.transaction_type) === txTab);

  return (
    <div className={styles.wallet}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.balanceCard}>
        <div className={styles.balanceInfo}>
          <h3>Available Balance</h3>
          <div className={styles.balanceAmount}>
            ₹{Number(balance).toLocaleString('en-IN')}
          </div>
        </div>
        <div className={styles.balanceMeta}>
          <span>Total Earned: ₹{Number(totalEarned).toLocaleString('en-IN')}</span>
          <span>Total Withdrawn: ₹{Number(totalWithdrawn).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--color-success)' }}><Icon name="check" size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{completedCount}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--color-warning, #f59e0b)' }}><Icon name="clock" size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{pendingCount}</span>
            <span className={styles.statLabel}>Pending</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--color-primary)' }}><Icon name="document" size={20} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{offlineCount}</span>
            <span className={styles.statLabel}>Offline</span>
          </div>
        </div>
      </div>

      <div className={styles.txSection}>
        <Tabs tabs={TX_TABS} active={txTab} onChange={setTxTab} />
        {filteredTx.length === 0 ? (
          <EmptyState
            icon="earnings"
            title="No transactions yet"
            message="Your earnings will appear here once you start receiving payments."
          />
        ) : (
          <div className={styles.txList}>
            {filteredTx.map((tx) => {
              const isCredit = (tx.type || tx.transaction_type) === 'credit';
              return (
                <div key={tx.id || tx.uuid} className={styles.txItem}>
                  <div className={`${styles.txDot} ${isCredit ? styles.dotCredit : styles.dotDebit}`} />
                  <div className={styles.txInfo}>
                    <span className={styles.txType}>
                      {tx.description || tx.type || tx.transaction_type || (tx.method ? `${tx.method} — ${tx.status}` : 'Payment')}
                    </span>
                    <span className={styles.txDate}>{formatDate(tx.created_at)}</span>
                  </div>
                  <span className={`${styles.txAmount} ${isCredit ? styles.credit : styles.debit}`}>
                    {isCredit ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
