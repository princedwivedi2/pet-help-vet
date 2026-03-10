import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Modal from '../../components/common/Modal/Modal';
import sosService from '../../services/sosService';
import { SOS_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/helpers';
import styles from './SosRequests.module.css';

export default function SosRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await sosService.getActive();
      const list = res?.data?.sos_requests || res?.data || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      setRequests([]);
      setError(err?.response?.data?.message || 'Failed to load SOS requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleStatusUpdate = async (uuid, status) => {
    try {
      setActionLoading(true);
      await sosService.updateStatus(uuid, { status });
      setSelected(null);
      loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update SOS status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Active SOS Requests</h2>
        <Button variant="secondary" onClick={loadRequests}>Refresh</Button>
      </div>

      {error && <div className={styles.error || 'error'}>{error}</div>}

      {requests.length === 0 ? (
        <Card>
          <EmptyState
            title="No active SOS requests"
            message="Emergency requests from pet owners will appear here."
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {requests.map((req) => (
            <div key={req.uuid || req.id} className={styles.sosCard}>
              <div className={styles.sosHeader}>
                <Badge variant={SOS_STATUS[req.status]?.variant || 'danger'} size="sm">
                  {SOS_STATUS[req.status]?.label || req.status}
                </Badge>
                <span className={styles.time}>{formatDateTime(req.created_at)}</span>
              </div>

              <div className={styles.sosBody}>
                <h3 className={styles.sosTitle}>{req.emergency_type || 'Emergency'}</h3>
                <p className={styles.sosDesc}>{req.description || 'No description provided'}</p>

                <div className={styles.sosMeta}>
                  {req.user?.name && (
                    <span className={styles.metaItem}>
                      <strong>Owner:</strong> {req.user.name}
                    </span>
                  )}
                  {req.user?.phone && (
                    <span className={styles.metaItem}>
                      <strong>Phone:</strong> {req.user.phone}
                    </span>
                  )}
                  {req.pet?.name && (
                    <span className={styles.metaItem}>
                      <strong>Pet:</strong> {req.pet.name} ({req.pet.species || ''})
                    </span>
                  )}
                  {req.address && (
                    <span className={styles.metaItem}>
                      <strong>Location:</strong> {req.address}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.sosActions}>
                <Button size="sm" variant="ghost" onClick={() => setSelected(req)}>
                  Details
                </Button>
                {req.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => handleStatusUpdate(req.uuid, 'acknowledged')}
                  >
                    Respond
                  </Button>
                )}
                {req.status === 'acknowledged' && (
                  <Button
                    size="sm"
                    variant="info"
                    onClick={() => handleStatusUpdate(req.uuid, 'in_progress')}
                  >
                    Start Treatment
                  </Button>
                )}
                {req.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleStatusUpdate(req.uuid, 'completed')}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="SOS Request Details"
          size="md"
        >
          <div className={styles.detail}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Type</span>
              <span>{selected.emergency_type || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <Badge variant={SOS_STATUS[selected.status]?.variant || 'danger'}>
                {SOS_STATUS[selected.status]?.label || selected.status}
              </Badge>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Description</span>
              <span>{selected.description || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pet Owner</span>
              <span>{selected.user?.name || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Phone</span>
              <span>{selected.user?.phone || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pet</span>
              <span>{selected.pet?.name || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Location</span>
              <span>{selected.address || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Created</span>
              <span>{formatDateTime(selected.created_at)}</span>
            </div>
          </div>

          <div className={styles.modalActions}>
            {selected.status === 'pending' && (
              <Button
                variant="warning"
                loading={actionLoading}
                onClick={() => handleStatusUpdate(selected.uuid, 'acknowledged')}
              >
                Respond to Emergency
              </Button>
            )}
            {selected.status === 'acknowledged' && (
              <Button
                variant="info"
                loading={actionLoading}
                onClick={() => handleStatusUpdate(selected.uuid, 'in_progress')}
              >
                Start Treatment
              </Button>
            )}
            {selected.status === 'in_progress' && (
              <Button
                variant="success"
                loading={actionLoading}
                onClick={() => handleStatusUpdate(selected.uuid, 'completed')}
              >
                Mark as Resolved
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
