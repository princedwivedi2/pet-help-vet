import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Tabs from '../../components/common/Tabs/Tabs';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import SearchBar from '../../components/common/SearchBar/SearchBar';
import Pagination from '../../components/common/Pagination/Pagination';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Loader from '../../components/common/Loader/Loader';
import Icon from '../../components/common/Icon/Icon';
import appointmentService from '../../services/appointmentService';
import paymentService from '../../services/paymentService';
import { APPOINTMENT_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import styles from './Appointments.module.css';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Requests' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
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

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const handleRecordOfflinePayment = async (appointment) => {
    try {
      setRecordingPayment(true);
      await paymentService.recordOffline({
        payable_type: 'appointment',
        payable_uuid: appointment.uuid,
        amount: appointment.fee || appointment.consultation_fee || 500,
        method: 'cash',
      });
      setError('');
      loadAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

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

  const handleAction = async (appointment, action) => {
    if (action === 'reject') {
      setRejectTarget(appointment);
      setRejectReason('');
      return;
    }
    try {
      setActionLoading(true);
      if (action === 'accept') {
        await appointmentService.accept(appointment.uuid);
      } else if (action === 'start') {
        await appointmentService.start(appointment.uuid);
      } else if (action === 'complete') {
        await appointmentService.complete(appointment.uuid);
      } else if (action === 'cancel') {
        await appointmentService.cancel(appointment.uuid, { reason: 'Cancelled by vet' });
      }
      setSelected(null);
      loadAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await appointmentService.reject(rejectTarget.uuid, { reason: rejectReason.trim() });
      setRejectTarget(null);
      setRejectReason('');
      setSelected(null);
      loadAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reject appointment');
    } finally {
      setActionLoading(false);
    }
  };

  // Group appointments by date
  const grouped = {};
  appointments.forEach((appt) => {
    const dateKey = appt.scheduled_at ? appt.scheduled_at.split('T')[0] : 'unknown';
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(appt);
  });
  const dateKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorBar}>{error}</div>}
      <div className={styles.toolbar}>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search appointments..." />
      </div>

      <Tabs tabs={STATUS_TABS} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />

      {loading ? (
        <Loader fullPage />
      ) : appointments.length === 0 ? (
        <Card>
          <EmptyState
            icon="appointments"
            title="No appointments found"
            message="Appointments from pet owners will show up here."
          />
        </Card>
      ) : (
        <div className={styles.dateGroups}>
          {dateKeys.map((dateKey) => (
            <div key={dateKey} className={styles.dateGroup}>
              <div className={styles.dateHeader}>
                {dateKey === 'unknown' ? 'Unscheduled' : formatDate(dateKey)}
              </div>
              <div className={styles.cardList}>
                {grouped[dateKey].map((appt) => (
                  <div key={appt.uuid || appt.id} className={styles.apptCard} onClick={() => setSelected(appt)}>
                    <div className={styles.apptTime}>
                      {appt.scheduled_at
                        ? new Date(appt.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </div>
                    <div className={styles.apptBody}>
                      <div className={styles.apptTop}>
                        <span className={styles.apptPet}>
                          {appt.pet?.name || 'Pet'} {appt.pet?.species ? `(${appt.pet.species})` : ''}
                        </span>
                        <Badge variant={APPOINTMENT_STATUS[appt.status]?.variant || 'default'} size="sm">
                          {APPOINTMENT_STATUS[appt.status]?.label || appt.status}
                        </Badge>
                      </div>
                      <span className={styles.apptOwner}>{appt.user?.name || 'Pet Owner'}</span>
                      {appt.reason && <span className={styles.apptReason}>{appt.reason}</span>}
                    </div>
                    <div className={styles.apptActions} onClick={(e) => e.stopPropagation()}>
                      {appt.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => handleAction(appt, 'accept')}>Accept</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleAction(appt, 'reject')}>Decline</Button>
                        </>
                      )}
                      {(appt.status === 'accepted' || appt.status === 'confirmed') && (
                        <Button size="sm" variant="primary" onClick={() => handleAction(appt, 'start')}>Start</Button>
                      )}
                      {appt.status === 'in_progress' && (
                        <Button size="sm" variant="success" onClick={() => handleAction(appt, 'complete')}>Complete</Button>
                      )}
                      {appt.status === 'completed' && appt.payment_status !== 'paid' && appt.payment_status !== 'offline' && (
                        <Button size="sm" variant="ghost" loading={recordingPayment} onClick={() => handleRecordOfflinePayment(appt)}>Record Cash</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Detail Modal */}
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

          {(['pending', 'accepted', 'confirmed', 'in_progress'].includes(selected.status)) && (
            <div className={styles.actions}>
              {selected.status === 'pending' && (
                <>
                  <Button variant="success" loading={actionLoading} onClick={() => handleAction(selected, 'accept')}>
                    Accept
                  </Button>
                  <Button variant="danger" loading={actionLoading} onClick={() => handleAction(selected, 'reject')}>
                    Decline
                  </Button>
                </>
              )}
              {(selected.status === 'accepted' || selected.status === 'confirmed') && (
                <Button variant="success" loading={actionLoading} onClick={() => handleAction(selected, 'start')}>
                  Start Visit
                </Button>
              )}
              {selected.status === 'in_progress' && (
                <Button variant="success" loading={actionLoading} onClick={() => handleAction(selected, 'complete')}>
                  Complete Visit
                </Button>
              )}
              {selected.status === 'completed' && selected.payment_status !== 'paid' && selected.payment_status !== 'offline' && (
                <Button variant="ghost" loading={recordingPayment} onClick={() => handleRecordOfflinePayment(selected)}>
                  Record Cash Payment
                </Button>
              )}
              {(selected.status === 'pending' || selected.status === 'accepted' || selected.status === 'confirmed') && (
                <Button variant="danger" loading={actionLoading} onClick={() => handleAction(selected, 'cancel')}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Rejection Dialog */}
      {rejectTarget && (
        <Modal
          open={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          title="Decline Appointment"
          size="sm"
        >
          <div className={styles.rejectDialog}>
            <p className={styles.rejectMessage}>
              Decline <strong>{rejectTarget.pet?.name || 'this'}</strong>'s visit
              {rejectTarget.scheduled_at && <> on {formatDate(rejectTarget.scheduled_at)}</>}?
            </p>
            <label className={styles.rejectLabel}>
              Reason for declining <span className={styles.required}>(shared with pet owner)</span>
            </label>
            <textarea
              className={styles.rejectTextarea}
              rows={3}
              placeholder="e.g., Schedule conflict, not my specialization..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className={styles.rejectActions}>
              <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
              >
                Decline Appointment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
