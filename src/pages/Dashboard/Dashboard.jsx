import { useEffect, useState } from 'react';
import Card from '../../components/common/Card/Card';
import Loader from '../../components/common/Loader/Loader';
import Badge from '../../components/common/Badge/Badge';
import Icon from '../../components/common/Icon/Icon';
import appointmentService from '../../services/appointmentService';
import sosService from '../../services/sosService';
import vetProfileService from '../../services/vetProfileService';
import { APPOINTMENT_STATUS, VET_STATUS } from '../../utils/constants';
import { formatDate, formatTime } from '../../utils/helpers';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    todayAppointments: 0,
    activeSos: 0,
  });
  const [upcoming, setUpcoming] = useState([]);
  const [vetProfile, setVetProfile] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [apptRes, sosRes, profileRes] = await Promise.allSettled([
        appointmentService.getAll({ per_page: 50 }),
        sosService.getActive(),
        vetProfileService.getProfile(),
      ]);

      if (apptRes.status === 'fulfilled') {
        const rawAppointments = apptRes.value?.data?.data || apptRes.value?.data;
        const appointments = Array.isArray(rawAppointments) ? rawAppointments : (Array.isArray(rawAppointments?.data) ? rawAppointments.data : []);
        const today = new Date().toISOString().split('T')[0];

        setStats((prev) => ({
          ...prev,
          totalAppointments: appointments.length,
          pendingAppointments: appointments.filter((a) => a.status === 'pending').length,
          todayAppointments: appointments.filter((a) => a.appointment_date === today).length,
        }));

        const upcomingAppts = appointments
          .filter((a) => a.status === 'pending' || a.status === 'confirmed')
          .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
          .slice(0, 5);
        setUpcoming(upcomingAppts);
      }

      if (sosRes.status === 'fulfilled') {
        const sosList = sosRes.value?.data || [];
        setStats((prev) => ({
          ...prev,
          activeSos: Array.isArray(sosList) ? sosList.length : 0,
        }));
      }

      if (profileRes.status === 'fulfilled') {
        setVetProfile(profileRes.value?.data);
      }
    } catch {
      // handled by individual catches
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className={styles.dashboard}>
      {vetProfile && vetProfile.vet_status !== 'approved' && (
        <div className={styles.alert}>
          <Icon name="document" />
          <div>
            <strong>Verification Status: </strong>
            <Badge variant={VET_STATUS[vetProfile.vet_status]?.variant || 'warning'}>
              {VET_STATUS[vetProfile.vet_status]?.label || vetProfile.vet_status}
            </Badge>
            {vetProfile.vet_status === 'pending' && (
              <span className={styles.alertText}>
                {' '}Your profile is pending verification. You will be notified once approved.
              </span>
            )}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <Card
          title="Total Appointments"
          value={stats.totalAppointments}
          subtitle="All time"
          icon={<Icon name="appointments" />}
        />
        <Card
          title="Today's Appointments"
          value={stats.todayAppointments}
          subtitle="Scheduled for today"
          icon={<Icon name="clock" />}
        />
        <Card
          title="Pending"
          value={stats.pendingAppointments}
          subtitle="Needs confirmation"
          icon={<Icon name="clock" />}
        />
        <Card
          title="Active SOS"
          value={stats.activeSos}
          subtitle="Emergency requests"
          icon={<Icon name="sos" />}
        />
      </div>

      <Card title="Upcoming Appointments">
        {upcoming.length === 0 ? (
          <p className={styles.empty}>No upcoming appointments</p>
        ) : (
          <div className={styles.list}>
            {upcoming.map((appt) => (
              <div key={appt.uuid || appt.id} className={styles.listItem}>
                <div className={styles.listInfo}>
                  <span className={styles.listName}>
                    {appt.user?.name || 'Pet Owner'}
                  </span>
                  <span className={styles.listMeta}>
                    {appt.pet?.name && `${appt.pet.name} • `}
                    {formatDate(appt.appointment_date)} at {formatTime(appt.appointment_time)}
                  </span>
                </div>
                <Badge variant={APPOINTMENT_STATUS[appt.status]?.variant || 'default'}>
                  {APPOINTMENT_STATUS[appt.status]?.label || appt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
