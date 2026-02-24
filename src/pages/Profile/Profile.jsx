import { useEffect, useState } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import FormInput from '../../components/common/FormInput/FormInput';
import Badge from '../../components/common/Badge/Badge';
import Loader from '../../components/common/Loader/Loader';
import Tabs from '../../components/common/Tabs/Tabs';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';
import vetProfileService from '../../services/vetProfileService';
import { VET_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import styles from './Profile.module.css';

const PROFILE_TABS = [
  { key: 'info', label: 'Profile Info' },
  { key: 'vet', label: 'Vet Details' },
  { key: 'password', label: 'Change Password' },
];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [meRes, vetRes] = await Promise.allSettled([
        authService.me(),
        vetProfileService.getProfile(),
      ]);

      if (meRes.status === 'fulfilled') {
        const u = meRes.value?.data?.user;
        if (u) {
          setProfileForm({
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
          });
        }
      }

      if (vetRes.status === 'fulfilled') {
        setVetProfile(vetRes.value?.data);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await authService.updateProfile(profileForm);
      await refreshUser();
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await authService.changePassword(passwordForm);
      setSuccess('Password changed successfully.');
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className={styles.page}>
      <Tabs tabs={PROFILE_TABS} active={tab} onChange={setTab} />

      {success && <div className={styles.success}>{success}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {tab === 'info' && (
        <Card title="Personal Information">
          <form onSubmit={handleProfileSubmit} className={styles.form}>
            <FormInput
              label="Full Name"
              name="name"
              value={profileForm.name}
              onChange={handleProfileChange}
              required
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              disabled
            />
            <FormInput
              label="Phone"
              name="phone"
              value={profileForm.phone}
              onChange={handleProfileChange}
            />
            <div className={styles.formActions}>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'vet' && (
        <Card title="Veterinarian Details">
          {vetProfile ? (
            <div className={styles.vetDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Verification Status</span>
                <Badge variant={VET_STATUS[vetProfile.vet_status]?.variant || 'warning'}>
                  {VET_STATUS[vetProfile.vet_status]?.label || vetProfile.vet_status}
                </Badge>
              </div>
              {vetProfile.specialization && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Specialization</span>
                  <span>{vetProfile.specialization}</span>
                </div>
              )}
              {vetProfile.license_number && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>License Number</span>
                  <span>{vetProfile.license_number}</span>
                </div>
              )}
              {vetProfile.experience_years !== undefined && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Experience</span>
                  <span>{vetProfile.experience_years} years</span>
                </div>
              )}
              {vetProfile.clinic_name && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Clinic</span>
                  <span>{vetProfile.clinic_name}</span>
                </div>
              )}
              {vetProfile.clinic_address && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Clinic Address</span>
                  <span>{vetProfile.clinic_address}</span>
                </div>
              )}
              {vetProfile.consultation_fee !== undefined && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Consultation Fee</span>
                  <span>₹{vetProfile.consultation_fee}</span>
                </div>
              )}
              {vetProfile.bio && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Bio</span>
                  <span>{vetProfile.bio}</span>
                </div>
              )}
              {vetProfile.verified_at && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Verified On</span>
                  <span>{formatDate(vetProfile.verified_at)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.empty}>No vet profile data available.</p>
          )}
        </Card>
      )}

      {tab === 'password' && (
        <Card title="Change Password">
          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <FormInput
              label="Current Password"
              name="current_password"
              type="password"
              value={passwordForm.current_password}
              onChange={handlePasswordChange}
              required
            />
            <FormInput
              label="New Password"
              name="password"
              type="password"
              value={passwordForm.password}
              onChange={handlePasswordChange}
              required
            />
            <FormInput
              label="Confirm New Password"
              name="password_confirmation"
              type="password"
              value={passwordForm.password_confirmation}
              onChange={handlePasswordChange}
              required
            />
            <div className={styles.formActions}>
              <Button type="submit" loading={saving}>Update Password</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
