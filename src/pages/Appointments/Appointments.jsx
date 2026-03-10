import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Table from '../../components/common/Table/Table';
import Tabs from '../../components/common/Tabs/Tabs';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import SearchBar from '../../components/common/SearchBar/SearchBar';
import Pagination from '../../components/common/Pagination/Pagination';
import appointmentService from '../../services/appointmentService';
import { APPOINTMENT_STATUS } from '../../utils/constants';
import { formatDate, formatTime } from '../../utils/helpers';
import styles from './Appointments.module.css';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, per_page: 15 };
      if (tab !== 'all') params.status = tab;
      if (search) params.search = search;

      const res = await appointmentService.getAll(params);
      const list = res?.data?.appointments || [];
      setAppointments(Array.isArray(list) ? list : []);
      setTotalPages(res?.data?.pagination?.last_page || res?.data?.last_page || 1);
    } catch (err) {
      setAppointments([]);
      setError(err?.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [page, tab, search]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleStatusUpdate = async (uuid, status) => {
    try {
      setActionLoading(true);
      const payload = { status };
      if (status === 'cancelled') payload.reason = 'Cancelled by vet';
      await appointmentService.updateStatus(uuid, payload);
      setSelected(null);
      loadAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update appointment status');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Pet Owner',
      render: (row) => (
        <div>
          <div className={styles.name}>{row.user?.name || '—'}</div>
          <div className={styles.meta}>{row.user?.email || ''}</div>
        </div>
      ),
    },
    {
      key: 'pet',
      label: 'Pet',
      render: (row) => row.pet?.name || '—',
    },
    {
      key: 'date',
      label: 'Date & Time',
      render: (row) => (
        <div>
          <div>{formatDate(row.scheduled_at)}</div>
          <div className={styles.meta}>{row.scheduled_at ? new Date(row.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => (
        <span className={styles.reason}>{row.reason || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={APPOINTMENT_STATUS[row.status]?.variant || 'default'}>
          {APPOINTMENT_STATUS[row.status]?.label || row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {error && <div className={styles.error || 'error'}>{error}</div>}
      <div className={styles.toolbar}>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search appointments..." />
      </div>

      <Tabs tabs={STATUS_TABS} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />

      <Card noPadding>
        <Table
          columns={columns}
          data={appointments}
          loading={loading}
          keyField="uuid"
          emptyTitle="No appointments found"
          emptyMessage="Appointments from pet owners will show up here."
        />
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Appointment Details"
          size="md"
        >
          <div className={styles.detail}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pet Owner</span>
              <span>{selected.user?.name || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email</span>
              <span>{selected.user?.email || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pet</span>
              <span>{selected.pet?.name || '—'} ({selected.pet?.species || ''})</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Date</span>
              <span>{formatDate(selected.scheduled_at)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Time</span>
              <span>{selected.scheduled_at ? new Date(selected.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Reason</span>
              <span>{selected.reason || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <Badge variant={APPOINTMENT_STATUS[selected.status]?.variant || 'default'}>
                {APPOINTMENT_STATUS[selected.status]?.label || selected.status}
              </Badge>
            </div>
            {selected.notes && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Notes</span>
                <span>{selected.notes}</span>
              </div>
            )}
          </div>

          {(selected.status === 'pending' || selected.status === 'confirmed') && (
            <div className={styles.actions}>
              {selected.status === 'pending' && (
                <Button
                  variant="success"
                  loading={actionLoading}
                  onClick={() => handleStatusUpdate(selected.uuid, 'confirmed')}
                >
                  Confirm
                </Button>
              )}
              {selected.status === 'confirmed' && (
                <Button
                  variant="success"
                  loading={actionLoading}
                  onClick={() => handleStatusUpdate(selected.uuid, 'completed')}
                >
                  Mark Complete
                </Button>
              )}
              {(selected.status === 'pending' || selected.status === 'confirmed') && (
                <Button
                  variant="danger"
                  loading={actionLoading}
                  onClick={() => handleStatusUpdate(selected.uuid, 'cancelled')}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
