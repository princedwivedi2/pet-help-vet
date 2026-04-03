import { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../../components/common/Card/Card';
import Skeleton from '../../components/common/Skeleton/Skeleton';
import Badge from '../../components/common/Badge/Badge';
import Button from '../../components/common/Button/Button';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Icon from '../../components/common/Icon/Icon';
import appointmentService from '../../services/appointmentService';
import sosService from '../../services/sosService';
import vetProfileService from '../../services/vetProfileService';
import { useAuth } from '../../hooks/useAuth';
import { APPOINTMENT_STATUS, SOS_STATUS, VET_STATUS } from '../../utils/constants';
import { formatTime, timeAgo } from '../../utils/helpers';
import styles from './Dashboard.module.css';

const MISSING_FIELD_LABELS = {
  profile_photo: 'Profile Photo',
  license_number: 'License Number',
  qualification: 'Qualification',
  clinic_address: 'Clinic Address',
  working_hours: 'Working Hours',
  latitude: 'Latitude',
  longitude: 'Longitude',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayAppts, setTodayAppts] = useState([]);
  const [pendingAppts, setPendingAppts] = useState([]);
  const [activeSos, setActiveSos] = useState([]);
  const [vetProfile, setVetProfile] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [stats, setStats] = useState({ today: 0, pending: 0, earned: 0 });
  const [profileStatus, setProfileStatus] = useState({ completion_percentage: 0, missing_fields: [], is_complete: false });
  const [accessNotice, setAccessNotice] = useState('');

  useEffect(() => { loadData(); }, []);

  const ensureApproved = () => {
    if (vetProfile?.vet_status !== 'approved') {
      setAccessNotice((msg) => msg || 'Appointment actions are disabled until admin approves your vet profile.');
      return false;
    }

    return true;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      let notice = '';
      const [apptRes, sosRes, profileRes] = await Promise.allSettled([
        appointmentService.getAll({ per_page: 100 }),
        sosService.getActive(),
        vetProfileService.getProfile(),
      ]);

      if (apptRes.status === 'fulfilled') {
        const appointments = apptRes.value?.data?.appointments || [];
        const today = new Date().toISOString().split('T')[0];

        const todayList = appointments
          .filter((a) => a.scheduled_at && a.scheduled_at.startsWith(today) && a.status !== 'cancelled' && a.status !== 'rejected')
          .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

        const pendingList = appointments
          .filter((a) => a.status === 'pending')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setTodayAppts(todayList);
        setPendingAppts(pendingList);
        setStats((s) => ({
          ...s,
          today: todayList.length,
          pending: pendingList.length,
        }));
      } else if (apptRes.status === 'rejected') {
        setTodayAppts([]);
        setPendingAppts([]);
        setStats((s) => ({ ...s, today: 0, pending: 0 }));

        const res = apptRes.reason?.response;
        if (res?.status === 403) {
          notice = res.data?.message || 'Appointments are locked until your profile is approved by admin.';
        } else {
          setError(res?.data?.message || 'Failed to load appointments');
        }
      }

      if (sosRes.status === 'fulfilled') {
        const list = sosRes.value?.data?.sos_requests || sosRes.value?.data || [];
        setActiveSos(Array.isArray(list) ? list : []);
      } else {
        setActiveSos([]);
      }

      if (profileRes.status === 'fulfilled') {
        const payload = profileRes.value?.data || profileRes.value;
        const vet = payload?.vet_profile || payload;
        setVetProfile(vet);
        setProfileStatus(payload?.profile_status || { completion_percentage: 0, missing_fields: [], is_complete: false });

        if (vet?.vet_status && vet.vet_status !== 'approved') {
          notice = notice || 'Your vet profile is awaiting admin approval. Complete missing fields to unlock appointments.';
        }
      }

      setAccessNotice(notice);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (uuid) => {
    if (!ensureApproved()) return;
    try {
      setActionLoading(uuid + '-accept');
      await appointmentService.accept(uuid);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to accept');
    } finally {
      setActionLoading('');
    }
  };

  const handleDecline = async (uuid) => {
    if (!ensureApproved()) return;
    try {
      setActionLoading(uuid + '-decline');
      await appointmentService.reject(uuid, { reason: 'Declined from today view' });
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to decline');
    } finally {
      setActionLoading('');
    }
  };

  const handleSosRespond = async (uuid) => {
    if (!ensureApproved()) return;
    try {
      setActionLoading(uuid + '-sos');
      await sosService.updateStatus(uuid, { status: 'sos_accepted', response_type: 'phone_guidance' });
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to respond');
    } finally {
      setActionLoading('');
    }
  };

  const handleStartVisit = async (uuid) => {
    if (!ensureApproved()) return;
    try {
      setActionLoading(uuid + '-start');
      await appointmentService.start(uuid);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start visit');
    } finally {
      setActionLoading('');
    }
  };

  const handleCompleteVisit = async (uuid) => {
    if (!ensureApproved()) return;
    try {
      setActionLoading(uuid + '-complete');
      await appointmentService.complete(uuid);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to complete visit');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 22, border: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Skeleton variant="circle" width="46px" height="46px" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton variant="line" width="50%" height="11px" />
              <Skeleton variant="line" width="40%" height="22px" />
              <Skeleton variant="line" width="65%" height="10px" />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '16px 18px', border: '1px solid var(--color-border-light)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Skeleton variant="circle" width="36px" height="36px" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Skeleton variant="line" width="60%" height="13px" />
              <Skeleton variant="line" width="35%" height="11px" />
            </div>
            <Skeleton variant="rect" width="70px" height="26px" style={{ borderRadius: 99 }} />
          </div>
        ))}
      </div>
    </div>
  );

  const isApproved = vetProfile?.vet_status === 'approved';
  const completionPercent = Number(profileStatus.completion_percentage || 0);
  const missingFields = Array.isArray(profileStatus.missing_fields) ? profileStatus.missing_fields : [];
  const actionsDisabled = !isApproved;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const nowIdx = todayAppts.findIndex((a) => new Date(a.scheduled_at) > now);

  return (
    <div className={styles.dashboard}>
      {error && <div className={styles.error}>{error}</div>}

      {(accessNotice || (vetProfile && (!profileStatus.is_complete || !isApproved))) && (
        <div className={styles.progressCard}>
          <div className={styles.progressTop}>
            <div>
              <div className={styles.progressLabel}>Onboarding Status</div>
              <div className={styles.progressMeta}>
                {isApproved ? 'Approved — appointments unlocked' : 'Waiting for admin approval'}
              </div>
            </div>
            <Badge variant={VET_STATUS[vetProfile?.vet_status || 'pending']?.variant || 'warning'}>
              {VET_STATUS[vetProfile?.vet_status || 'pending']?.label || vetProfile?.vet_status || 'Pending'}
            </Badge>
          </div>

          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
          </div>

          <div className={styles.progressFooter}>
            <span className={styles.progressPercent}>{completionPercent}% complete</span>
            <span className={styles.progressNote}>
              {accessNotice || (isApproved ? 'You can now take appointments.' : 'Complete missing fields and wait for admin approval.')}
            </span>
          </div>

          {missingFields.length > 0 && (
            <div className={styles.missingChips}>
              {missingFields.slice(0, 4).map((field) => (
                <span key={field} className={styles.missingChip}>{MISSING_FIELD_LABELS[field] || field}</span>
              ))}
              {missingFields.length > 4 && (
                <span className={styles.missingChip}>+{missingFields.length - 4} more</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.greeting}>{greeting}, {user?.name?.split(' ')[0] || 'Doctor'}</h2>
          <p className={styles.dateStr}>{dateStr}</p>
        </div>
      </div>

      {/* Gradient Stat Cards */}
      <div className={styles.statGrid}>
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
          <div className={styles.statCardTop}>
            <span className={styles.statCardLabel}>Today's Appts</span>
            <span className={styles.statCardTrend}>📅</span>
          </div>
          <span className={styles.statCardValue}>{stats.today}</span>
        </div>
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' }}>
          <div className={styles.statCardTop}>
            <span className={styles.statCardLabel}>Pending Requests</span>
            <span className={styles.statCardTrend}>{stats.pending > 0 ? '↑' : '—'}</span>
          </div>
          <span className={styles.statCardValue}>{stats.pending}</span>
        </div>
        <div className={styles.statCard} style={{ background: activeSos.length > 0 ? 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)' : 'linear-gradient(135deg, #059669 0%, #34d399 100%)' }}>
          <div className={styles.statCardTop}>
            <span className={styles.statCardLabel}>Active SOS</span>
            <span className={styles.statCardTrend}>{activeSos.length > 0 ? '🚨' : '✓'}</span>
          </div>
          <span className={styles.statCardValue}>{activeSos.length}</span>
        </div>
      </div>

      {/* Emergency Zone */}
      {activeSos.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className={styles.emergencySection}>
            <h3 className={styles.sectionTitle}>
              <Icon name="zap" /> Emergency
            </h3>
            <div className={styles.sosGrid}>
              {activeSos.map((sos) => (
                <div key={sos.uuid || sos.id} className={styles.sosCard}>
                  <div className={styles.sosHeader}>
                    <Badge variant="danger" size="sm">{sos.emergency_type || 'Emergency'}</Badge>
                    <span className={styles.sosMeta}>{timeAgo(sos.created_at)}</span>
                  </div>
                  <div className={styles.sosBody}>
                    {sos.pet?.name && <span className={styles.sosPet}>{sos.pet.name} ({sos.pet.species || 'Pet'})</span>}
                    {sos.user?.name && <span className={styles.sosOwner}>{sos.user.name}</span>}
                    {sos.description && <p className={styles.sosDesc}>{sos.description}</p>}
                    {sos.address && (
                      <span className={styles.sosLocation}>
                        <Icon name="mapPin" size={14} /> {sos.address}
                      </span>
                    )}
                  </div>
                  <div className={styles.sosActions}>
                    {sos.user?.phone && (
                      <a href={`tel:${sos.user.phone}`} className={styles.sosPhoneBtn}>
                        <Icon name="phone" size={14} /> Call
                      </a>
                    )}
                    {(sos.status === 'pending' || sos.status === 'sos_pending') ? (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={actionsDisabled}
                        loading={actionLoading === sos.uuid + '-sos'}
                        onClick={() => handleSosRespond(sos.uuid)}
                      >
                        Accept &amp; Respond
                      </Button>
                    ) : (
                      <Link to="/sos" className={styles.sosViewBtn}>
                        <Badge variant={SOS_STATUS[sos.status]?.variant || 'warning'} size="sm">
                          {SOS_STATUS[sos.status]?.label || sos.status}
                        </Badge>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeSos.length === 0 && (
        <div className={styles.noEmergency}>
          <Icon name="check" /> No active emergencies
        </div>
      )}

      {/* Today's Schedule */}
      <div className={styles.scheduleSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Icon name="clock" /> Today's Schedule
          </h3>
          <Link to="/appointments" className={styles.viewAll}>View all <Icon name="chevronRight" /></Link>
        </div>

        {todayAppts.length === 0 ? (
          <Card>
            <EmptyState
              icon="appointments"
              title="No appointments today"
              message="Your schedule is clear. Enjoy your day!"
            />
          </Card>
        ) : (
          <div className={styles.timeline}>
            {todayAppts.map((appt, i) => (
              <Fragment key={appt.uuid || appt.id}>
                {i === nowIdx && (
                  <div className={styles.nowMarker}>
                    <span className={styles.nowDot} />
                    <span className={styles.nowLine} />
                    <span className={styles.nowLabel}>Now</span>
                  </div>
                )}
                <div className={`${styles.timelineItem} ${appt.status === 'completed' ? styles.timelineCompleted : ''}`}>
                  <div className={styles.timelineTime}>
                    {appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                  <div className={styles.timelineDot}>
                    {appt.status === 'completed' ? (
                      <span className={styles.dotDone}><Icon name="check" size={12} /></span>
                    ) : appt.status === 'in_progress' ? (
                      <span className={styles.dotActive} />
                    ) : (
                      <span className={styles.dotPending} />
                    )}
                  </div>
                  <div className={styles.timelineCard}>
                    <div className={styles.timelineCardTop}>
                      <span className={styles.timelinePet}>
                        {appt.pet?.name || 'Pet'} {appt.pet?.species ? `(${appt.pet.species})` : ''}
                      </span>
                      <Badge variant={APPOINTMENT_STATUS[appt.status]?.variant || 'default'} size="sm">
                        {APPOINTMENT_STATUS[appt.status]?.label || appt.status}
                      </Badge>
                    </div>
                    <span className={styles.timelineOwner}>{appt.user?.name || 'Pet Owner'}</span>
                    {appt.reason && <span className={styles.timelineReason}>{appt.reason}</span>}
                    {(appt.status === 'confirmed' || appt.status === 'accepted') && (
                      <div className={styles.timelineActions}>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={actionsDisabled}
                          loading={actionLoading === appt.uuid + '-start'}
                          onClick={() => handleStartVisit(appt.uuid)}
                        >
                          Start Visit
                        </Button>
                      </div>
                    )}
                    {appt.status === 'in_progress' && (
                      <div className={styles.timelineActions}>
                        <Button
                          size="sm"
                          variant="success"
                          disabled={actionsDisabled}
                          loading={actionLoading === appt.uuid + '-complete'}
                          onClick={() => handleCompleteVisit(appt.uuid)}
                        >
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Pending Requests */}
      <div className={styles.pendingSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Icon name="alertCircle" /> Needs Your Decision
          </h3>
          {pendingAppts.length > 5 && (
            <Link to="/appointments" className={styles.viewAll}>See all ({pendingAppts.length})</Link>
          )}
        </div>

        {pendingAppts.length === 0 ? (
          <div className={styles.noPending}>All caught up! No pending requests.</div>
        ) : (
          <div className={styles.pendingGrid}>
            {pendingAppts.slice(0, 6).map((appt) => (
              <div key={appt.uuid || appt.id} className={styles.pendingCard}>
                <div className={styles.pendingInfo}>
                  <span className={styles.pendingPet}>
                    {appt.pet?.name || 'Pet'} {appt.pet?.species ? `(${appt.pet.species})` : ''}
                  </span>
                  <span className={styles.pendingOwner}>{appt.user?.name || 'Owner'}</span>
                  <span className={styles.pendingDate}>
                    {appt.scheduled_at
                      ? new Date(appt.scheduled_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) +
                        ' at ' +
                        new Date(appt.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                  {appt.reason && <span className={styles.pendingReason}>{appt.reason}</span>}
                </div>
                <div className={styles.pendingActions}>
                  <Button
                    size="sm"
                    variant="success"
                    disabled={actionsDisabled}
                    loading={actionLoading === appt.uuid + '-accept'}
                    onClick={() => handleAccept(appt.uuid)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={actionsDisabled}
                    loading={actionLoading === appt.uuid + '-decline'}
                    onClick={() => handleDecline(appt.uuid)}
                  >
                    Decline
                  </Button>
                </div>
                <span className={styles.pendingAgo}>{timeAgo(appt.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
