import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import paymentService from '../../services/paymentService';
import { formatDate } from '../../utils/helpers';
import styles from './Wallet.module.css';

export default function Wallet() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);

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
      setError(err?.response?.data?.message || 'Failed to load wallet');
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

  return (
    <div className={styles.wallet}>
      <div className={styles.header}>
        <h2>My Wallet</h2>
      </div>

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
        <Card
          title="Completed Payments"
          value={payments.filter((p) => p.status === 'captured' || p.status === 'completed').length}
          subtitle="Recent transactions"
          icon="check"
        />
        <Card
          title="Pending"
          value={payments.filter((p) => p.status === 'pending' || p.status === 'created').length}
          subtitle="Awaiting capture"
          icon="clock"
        />
        <Card
          title="Offline Payments"
          value={payments.filter((p) => p.method === 'cash' || p.method === 'offline').length}
          subtitle="Cash collections"
          icon="document"
        />
      </div>

      <Card title="Recent Transactions">
        <div className={styles.section}>
          {transactions.length === 0 && payments.length === 0 ? (
            <EmptyState
              icon="document"
              title="No transactions yet"
              description="Your wallet transactions will appear here once you start receiving payments."
            />
          ) : (
            <div className={styles.txList}>
              {transactions.map((tx) => (
                <div key={tx.id || tx.uuid} className={styles.txItem}>
                  <div className={styles.txInfo}>
                    <span className={styles.txType}>
                      {tx.type || tx.transaction_type || 'Payment'}
                    </span>
                    <span className={styles.txDate}>{formatDate(tx.created_at)}</span>
                    {tx.description && (
                      <span className={styles.txDate}>{tx.description}</span>
                    )}
                  </div>
                  <span
                    className={`${styles.txAmount} ${
                      tx.type === 'credit' || tx.transaction_type === 'credit'
                        ? styles.credit
                        : styles.debit
                    }`}
                  >
                    {tx.type === 'credit' || tx.transaction_type === 'credit' ? '+' : '-'}₹
                    {Number(tx.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              {transactions.length === 0 &&
                payments.map((p) => (
                  <div key={p.id || p.uuid} className={styles.txItem}>
                    <div className={styles.txInfo}>
                      <span className={styles.txType}>
                        {p.method || 'online'} — {p.status}
                      </span>
                      <span className={styles.txDate}>{formatDate(p.created_at)}</span>
                    </div>
                    <span className={`${styles.txAmount} ${styles.credit}`}>
                      ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
