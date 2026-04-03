import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Icon from '../../components/common/Icon/Icon';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Tabs from '../../components/common/Tabs/Tabs';
import Modal from '../../components/common/Modal/Modal';
import Button from '../../components/common/Button/Button';
import FormInput from '../../components/common/FormInput/FormInput';
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
  const [showPayout, setShowPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: '', payment_detail: '' });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState('');

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
      setError(err?.message || 'Failed to load earnings');
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
  const completedCount = payments.filter((p) => p.payment_status === 'captured' || p.payment_status === 'paid').length;
  const pendingCount = payments.filter((p) => p.payment_status === 'pending' || p.payment_status === 'created').length;
  const offlineCount = payments.filter((p) => p.payment_mode === 'cash' || p.payment_mode === 'offline').length;

  const handlePayoutSubmit = async () => {
    const amount = parseInt(payoutForm.amount, 10);
    if (!amount || amount < 1) { setPayoutError('Enter a valid amount'); return; }
    if (!payoutForm.payment_detail.trim()) { setPayoutError('Enter your UPI ID or bank details'); return; }
    if (amount > balance) { setPayoutError('Amount exceeds available balance'); return; }
    setPayoutLoading(true);
    setPayoutError('');
    try {
      await paymentService.requestPayout({ amount, payment_detail: payoutForm.payment_detail });
      setPayoutSuccess('Payout request submitted! Admin will process it shortly.');
      setPayoutForm({ amount: '', payment_detail: '' });
      setTimeout(() => { setShowPayout(false); setPayoutSuccess(''); loadWallet(); }, 2000);
    } catch (err) {
      setPayoutError(err?.message || 'Failed to submit payout request');
    } finally {
      setPayoutLoading(false);
    }
  };

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
        {balance > 0 && (
          <Button size="sm" onClick={() => { setShowPayout(true); setPayoutError(''); setPayoutSuccess(''); }}>
            Request Payout
          </Button>
        )}
      </div>

      <Modal open={showPayout} onClose={() => setShowPayout(false)} title="Request Payout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Available balance: <strong>₹{Number(balance).toLocaleString('en-IN')}</strong>
          </p>
          <FormInput
            label="Amount (₹)"
            type="number"
            min={1}
            max={balance}
            value={payoutForm.amount}
            onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="Enter amount"
          />
          <FormInput
            label="UPI ID or Bank Details"
            value={payoutForm.payment_detail}
            onChange={(e) => setPayoutForm((f) => ({ ...f, payment_detail: e.target.value }))}
            placeholder="e.g. name@upi or Account: 1234... IFSC: SBIN..."
          />
          {payoutError && <p style={{ color: '#dc2626', fontSize: 13 }}>{payoutError}</p>}
          {payoutSuccess && <p style={{ color: '#166534', fontSize: 13 }}>{payoutSuccess}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowPayout(false)}>Cancel</Button>
            <Button loading={payoutLoading} onClick={handlePayoutSubmit}>Submit Request</Button>
          </div>
        </div>
      </Modal>

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
