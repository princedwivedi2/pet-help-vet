import { useEffect, useState, useCallback, useRef } from 'react';
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

const RESPONSE_TYPES = [
  { value: 'phone_guidance', label: 'Phone Guidance', desc: 'Guide the owner over phone' },
  { value: 'come_to_clinic', label: 'Come to Clinic', desc: 'Ask owner to bring pet to your clinic' },
  { value: 'home_visit', label: 'Home Visit', desc: 'Go to the pet owner\'s location' },
];

export default function SosRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [responseType, setResponseType] = useState('phone_guidance');
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [sharingLocationFor, setSharingLocationFor] = useState(null);
  const [locationShareError, setLocationShareError] = useState('');
  const watchIdRef = useRef(null);

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

  const handleStatusUpdate = async (uuid, status, extra = {}) => {
    try {
      setActionLoading(true);
      await sosService.updateStatus(uuid, { status, ...extra });
      setSelected(null);
      setAcceptTarget(null);
      loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update SOS status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptWithResponse = (req) => {
    setAcceptTarget(req);
    setResponseType('phone_guidance');
  };

  const confirmAccept = () => {
    if (!acceptTarget) return;
    handleStatusUpdate(acceptTarget.uuid, 'sos_accepted', { response_type: responseType });
  };

  const toggleLocationShare = (uuid) => {
    if (sharingLocationFor === uuid) {
      // Stop sharing
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharingLocationFor(null);
      setLocationShareError('');
      return;
    }

    if (!navigator.geolocation) {
      setLocationShareError('Geolocation is not supported by your browser');
      return;
    }

    setLocationShareError('');
    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setSharingLocationFor(uuid);
        sosService.updateLocation(uuid, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }).catch(() => {});
      },
      () => {
        setLocationShareError('Location access denied — enable GPS to share location');
        setSharingLocationFor(null);
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (loading) return <Loader fullPage />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Active SOS Requests</h2>
        <Button variant="secondary" onClick={loadRequests}>Refresh</Button>
      </div>

      {error && <div className={styles.error || 'error'}>{error}</div>}
      {locationShareError && <div className={styles.error || 'error'}>{locationShareError}</div>}

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
                {(req.status === 'pending' || req.status === 'sos_pending') && (
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => handleAcceptWithResponse(req)}
                  >
                    Respond
                  </Button>
                )}
                {(req.status === 'acknowledged' || req.status === 'sos_accepted') && (
                  <Button
                    size="sm"
                    variant="info"
                    onClick={() => handleStatusUpdate(req.uuid, 'sos_in_progress')}
                  >
                    Start Treatment
                  </Button>
                )}
                {(req.status === 'in_progress' || req.status === 'sos_in_progress' || req.status === 'treatment_in_progress') && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleStatusUpdate(req.uuid, 'sos_completed')}
                  >
                    Resolve
                  </Button>
                )}
                {(req.status === 'sos_accepted' || req.status === 'acknowledged' || req.status === 'sos_in_progress' || req.status === 'in_progress' || req.status === 'treatment_in_progress') && (
                  <Button
                    size="sm"
                    variant={sharingLocationFor === req.uuid ? 'danger' : 'secondary'}
                    onClick={() => toggleLocationShare(req.uuid)}
                  >
                    {sharingLocationFor === req.uuid ? 'Stop Location' : 'Share Location'}
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
            {(selected.status === 'pending' || selected.status === 'sos_pending') && (
              <Button
                variant="warning"
                loading={actionLoading}
                onClick={() => handleAcceptWithResponse(selected)}
              >
                Respond to Emergency
              </Button>
            )}
            {(selected.status === 'acknowledged' || selected.status === 'sos_accepted') && (
              <Button
                variant="info"
                loading={actionLoading}
                onClick={() => handleStatusUpdate(selected.uuid, 'sos_in_progress')}
              >
                Start Treatment
              </Button>
            )}
            {(selected.status === 'in_progress' || selected.status === 'sos_in_progress' || selected.status === 'treatment_in_progress') && (
              <Button
                variant="success"
                loading={actionLoading}
                onClick={() => handleStatusUpdate(selected.uuid, 'sos_completed')}
              >
                Mark as Resolved
              </Button>
            )}
          </div>
        </Modal>
      )}

      {acceptTarget && (
        <Modal
          open={!!acceptTarget}
          onClose={() => setAcceptTarget(null)}
          title="How will you respond?"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            {RESPONSE_TYPES.map((rt) => (
              <label
                key={rt.value}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  border: `2px solid ${responseType === rt.value ? '#f97316' : '#e5e7eb'}`,
                  borderRadius: 10, cursor: 'pointer', background: responseType === rt.value ? '#fff7ed' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="response_type"
                  value={rt.value}
                  checked={responseType === rt.value}
                  onChange={() => setResponseType(rt.value)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{rt.label}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{rt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="ghost" onClick={() => setAcceptTarget(null)}>Cancel</Button>
            <Button variant="warning" loading={actionLoading} onClick={confirmAccept}>Accept &amp; Respond</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
