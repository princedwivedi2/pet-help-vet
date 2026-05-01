import { useEffect, useState } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import FormInput from '../../components/common/FormInput/FormInput';
import Badge from '../../components/common/Badge/Badge';
import Loader from '../../components/common/Loader/Loader';
import Tabs from '../../components/common/Tabs/Tabs';
import LocationPicker from '../../components/common/LocationPicker/LocationPicker';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';
import vetProfileService from '../../services/vetProfileService';
import { VET_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import styles from './Profile.module.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const REQUIRED_DOCUMENTS = [
  { type: 'license', label: 'License Proof', field: 'license_document_url' },
  { type: 'degree', label: 'Degree Certificate', field: 'degree_certificate_url' },
  { type: 'id_proof', label: 'Government ID', field: 'government_id_url' },
];

const MISSING_FIELD_LINKS = {
  profile_photo: '#field-profile_photo',
  license_number: '#field-license_number',
  qualification: '#field-qualifications',
  clinic_address: '#field-address',
  working_hours: '#availability-section',
  latitude: '#field-latitude',
  longitude: '#field-longitude',
  license_document: '#doc-license',
  degree_certificate: '#doc-degree',
  government_id: '#doc-id_proof',
};

const MISSING_FIELD_LABELS = {
  profile_photo: 'Upload Profile Photo',
  license_number: 'Add License Number (Text)',
  qualification: 'Add Qualification',
  clinic_address: 'Add Clinic Address',
  working_hours: 'Add Working Hours',
  latitude: 'Add Latitude',
  longitude: 'Add Longitude',
  license_document: 'Upload License Proof',
  degree_certificate: 'Upload Degree Certificate',
  government_id: 'Upload Government ID',
};

const PROFILE_TABS = [
  { key: 'info', label: 'Profile Info' },
  { key: 'vet', label: 'Vet Details' },
  { key: 'availability', label: 'Availability' },
  { key: 'password', label: 'Change Password' },
  { key: 'account', label: 'Account' },
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

  const [vetForm, setVetForm] = useState({
    vet_name: '',
    phone: '',
    clinic_name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    latitude: '',
    longitude: '',
    specialization: '',
    consultation_fee: '',
    home_visit_fee: '',
    online_fee: '',
    max_home_visit_km: '',
    consultation_types: ['clinic_visit'],
    bio: '',
    profile_photo: '',
    qualifications: '',
    license_number: '',
    services_text: '',
    accepted_species_text: '',
  });

  const [availabilities, setAvailabilities] = useState([]);
  const [availForm, setAvailForm] = useState({ day_of_week: '1', open_time: '09:00', close_time: '17:00' });
  const [editAvail, setEditAvail] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState('');
  const [profileStatus, setProfileStatus] = useState({ completion_percentage: 0, missing_fields: [], is_complete: false });
  const [docStatus, setDocStatus] = useState({});
  const [docFiles, setDocFiles] = useState({
    license: null,
    degree: null,
    id_proof: null,
  });
  const [viewingDoc, setViewingDoc] = useState('');

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
        const payload = vetRes.value?.data || vetRes.value;
        const vp = payload?.vet_profile || payload;
        setVetProfile(vp);
        setProfileStatus(payload?.profile_status || { completion_percentage: 0, missing_fields: [], is_complete: false });
        setDocStatus(payload?.document_status || {});
        if (vp) {
          setVetForm({
            vet_name: vp.vet_name || '',
            phone: vp.phone || '',
            clinic_name: vp.clinic_name || '',
            address: vp.address || '',
            city: vp.city || '',
            state: vp.state || '',
            postal_code: vp.postal_code || '',
            latitude: vp.latitude ?? '',
            longitude: vp.longitude ?? '',
            specialization: vp.specialization || '',
            consultation_fee: vp.consultation_fee ?? '',
            home_visit_fee: vp.home_visit_fee ?? '',
            online_fee: vp.online_fee ?? '',
            max_home_visit_km: vp.max_home_visit_km ?? '',
            consultation_types: Array.isArray(vp.consultation_types) ? vp.consultation_types : ['clinic_visit'],
            bio: vp.bio || '',
            profile_photo: vp.profile_photo || '',
            qualifications: vp.qualifications || '',
            license_number: vp.license_number || '',
            services_text: Array.isArray(vp.services) ? vp.services.join(', ') : '',
            accepted_species_text: Array.isArray(vp.accepted_species) ? vp.accepted_species.join(', ') : '',
          });
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const isDocumentUploaded = (doc) => {
    if (docStatus?.[doc.type] && typeof docStatus[doc.type].uploaded === 'boolean') {
      return docStatus[doc.type].uploaded;
    }
    return !!vetProfile?.[doc.field];
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

  const handleVetFormChange = (e) => {
    const { name, value } = e.target;
    setVetForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleLocationChange = (lat, lng) => {
    setVetForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setError('');
    setSuccess('');
  };

  const handleAddressFound = ({ address, city, state, postal_code }) => {
    setVetForm((prev) => ({
      ...prev,
      address: address || prev.address,
      city: city || prev.city,
      state: state || prev.state,
      postal_code: postal_code || prev.postal_code,
    }));
  };

  const toggleConsultationType = (value) => {
    setVetForm((prev) => ({
      ...prev,
      consultation_types: prev.consultation_types.includes(value)
        ? prev.consultation_types.filter((v) => v !== value)
        : [...prev.consultation_types, value],
    }));
  };

  const mapAvailabilitiesToWorkingHours = (slots) =>
    slots.map((slot) => ({
      day_of_week: Number(slot.day_of_week),
      open_time: slot.open_time?.slice(0, 5),
      close_time: slot.close_time?.slice(0, 5),
      is_emergency_hours: !!slot.is_emergency_hours,
    }));

  const handleUploadDocument = async (type) => {
    const file = docFiles[type];
    if (!file) {
      setError('Please choose a file before uploading.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', type);

    try {
      setUploadingDoc(type);
      setError('');
      await vetProfileService.uploadDocument(formData);
      setDocFiles((prev) => ({ ...prev, [type]: null }));
      setSuccess('Document uploaded successfully.');
      await loadProfile();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc('');
    }
  };

  const handleViewDocument = async (type) => {
    try {
      setViewingDoc(type);
      setError('');
      const fileBlob = await vetProfileService.getDocument(type);
      const fileUrl = URL.createObjectURL(fileBlob);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 30000);
    } catch (err) {
      setError(err?.message || 'Unable to open document.');
    } finally {
      setViewingDoc('');
    }
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

  const handleVetProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');

      let workingHours = Array.isArray(vetProfile?.working_hours) ? vetProfile.working_hours : [];
      let latestAvailabilities = availabilities;

      if (!latestAvailabilities.length) {
        const res = await vetProfileService.getAvailabilities();
        const d = res?.data || res;
        latestAvailabilities = d?.availabilities || d?.data || [];
      }

      if (latestAvailabilities.length) {
        workingHours = mapAvailabilitiesToWorkingHours(latestAvailabilities);
      }

      const missingDocs = REQUIRED_DOCUMENTS
        .filter((doc) => !isDocumentUploaded(doc))
        .map((doc) => doc.label);

      if (missingDocs.length > 0) {
        setError(`Upload required documents first: ${missingDocs.join(', ')}`);
        return;
      }

      if (!workingHours.length) {
        setError('Please add at least one availability slot before saving vet profile.');
        return;
      }

      const payload = {
        clinic_name: vetForm.clinic_name?.trim() || '',
        vet_name: vetForm.vet_name?.trim() || vetProfile?.vet_name || user?.name || '',
        phone: vetForm.phone?.trim() || vetProfile?.phone || profileForm.phone || '',
        ...(vetForm.profile_photo?.trim() ? { profile_photo: vetForm.profile_photo.trim() } : {}),
        clinic_address: vetForm.address?.trim() || '',
        city: vetForm.city?.trim() || vetProfile?.city || '',
        state: vetForm.state?.trim() || vetProfile?.state || '',
        postal_code: vetForm.postal_code?.trim() || vetProfile?.postal_code || '',
        latitude: Number(vetForm.latitude || vetProfile?.latitude || 0),
        longitude: Number(vetForm.longitude || vetProfile?.longitude || 0),
        qualification: vetForm.qualifications?.trim() || '',
        license_number: vetForm.license_number?.trim() || '',
        specialization: vetForm.specialization?.trim() || vetProfile?.specialization || '',
        consultation_fee: Number(vetForm.consultation_fee || 0),
        home_visit_fee: vetForm.home_visit_fee ? Number(vetForm.home_visit_fee) : Number(vetProfile?.home_visit_fee || 0),
        online_fee: vetForm.online_fee ? Number(vetForm.online_fee) : 0,
        max_home_visit_km: vetForm.max_home_visit_km ? Number(vetForm.max_home_visit_km) : 0,
        consultation_types: vetForm.consultation_types.length > 0 ? vetForm.consultation_types : ['clinic_visit'],
        services: vetForm.services_text
          ? vetForm.services_text.split(',').map((item) => item.trim()).filter(Boolean)
          : (Array.isArray(vetProfile?.services) ? vetProfile.services : []),
        accepted_species: vetForm.accepted_species_text
          ? vetForm.accepted_species_text.split(',').map((item) => item.trim()).filter(Boolean)
          : (Array.isArray(vetProfile?.accepted_species) ? vetProfile.accepted_species : []),
        working_hours: workingHours,
      };

      const missingFields = [];
      ['clinic_name', 'vet_name', 'phone', 'clinic_address', 'qualification', 'license_number'].forEach((field) => {
        if (!payload[field]) missingFields.push(field);
      });
      if (!payload.latitude || !payload.longitude) {
        missingFields.push('latitude/longitude');
      }
      if (!payload.services.length) {
        missingFields.push('services');
      }
      if (!payload.accepted_species.length) {
        missingFields.push('accepted_species');
      }

      if (missingFields.length > 0) {
        setError(`Please complete required fields before saving: ${missingFields.join(', ')}`);
        return;
      }

      await vetProfileService.updateProfile({
        ...payload,
      });
      setSuccess('Vet profile updated successfully.');
      await loadProfile();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to update vet profile.');
    } finally {
      setSaving(false);
    }
  };

  const loadAvailabilities = async () => {
    try {
      setLoadingAvail(true);
      const res = await vetProfileService.getAvailabilities();
      const d = res?.data || res;
      const slots = d?.availabilities || d?.data || [];
      setAvailabilities(slots);
    } catch (err) {
      setAvailabilities([]);
    } finally {
      setLoadingAvail(false);
    }
  };

  const handleAvailSubmit = async () => {
    try {
      setSaving(true);
      setError('');
      if (editAvail) {
        await vetProfileService.updateAvailability(editAvail.id, availForm);
      } else {
        await vetProfileService.createAvailability(availForm);
      }
      setEditAvail(null);
      setAvailForm({ day_of_week: '1', open_time: '09:00', close_time: '17:00' });
      setSuccess(editAvail ? 'Availability updated.' : 'Availability added.');
      loadAvailabilities();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save availability.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvail = async (id) => {
    try {
      await vetProfileService.deleteAvailability(id);
      loadAvailabilities();
      setSuccess('Availability slot removed.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete availability.');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    try {
      setDeleting(true);
      setError('');
      await authService.deleteAccount({ password: deletePassword });
      window.location.href = '/login';
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader fullPage />;

  const requiredDocsReady = REQUIRED_DOCUMENTS.every((doc) => isDocumentUploaded(doc));
  const workingHoursReady = availabilities.length > 0 || (Array.isArray(vetProfile?.working_hours) && vetProfile.working_hours.length > 0);
  const requiredFieldsReady = [
    vetForm.qualifications,
    vetForm.license_number,
    vetForm.address,
    vetForm.latitude,
    vetForm.longitude,
    vetForm.services_text,
    vetForm.accepted_species_text,
  ].every((val) => String(val ?? '').trim() !== '');
  const profileBlocked = !requiredFieldsReady || !workingHoursReady || !requiredDocsReady;
  const completionPercent = Number(profileStatus.completion_percentage || 0);

  return (
    <div className={styles.page}>
      {/* Persistent profile completion banner */}
      {!profileStatus.is_complete && (
        <div className={styles.topProgress}>
          <div className={styles.topProgressHeader}>
            <span className={styles.topProgressLabel}>Profile Completion</span>
            <strong className={styles.topProgressPercent}>{completionPercent}%</strong>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
          </div>
          {Array.isArray(profileStatus.missing_fields) && profileStatus.missing_fields.length > 0 && (
            <div className={styles.topProgressMissing}>
              {profileStatus.missing_fields.slice(0, 3).map((field) => (
                <a key={field} href={MISSING_FIELD_LINKS[field] || '#'} className={styles.missingLink}>
                  {MISSING_FIELD_LABELS[field] || field}
                </a>
              ))}
              {profileStatus.missing_fields.length > 3 && (
                <span className={styles.topProgressMore}>+{profileStatus.missing_fields.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      )}

      <Tabs tabs={PROFILE_TABS} active={tab} onChange={(t) => { setTab(t); setError(''); setSuccess(''); if (t === 'availability') loadAvailabilities(); }} />

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
            <form onSubmit={handleVetProfileSubmit} className={styles.form}>
              <div className={styles.completionCard}>
                <div className={styles.completionHeader}>
                  <strong>Profile Status:</strong>
                  <span>{profileStatus.is_complete ? 'Complete' : 'Incomplete'}</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
                </div>
                <div className={styles.progressText}>Profile Completion: {completionPercent}%</div>
                {Array.isArray(profileStatus.missing_fields) && profileStatus.missing_fields.length > 0 && (
                  <div className={styles.missingList}>
                    <strong>Missing:</strong>
                    {profileStatus.missing_fields.map((field) => (
                      <a key={field} href={MISSING_FIELD_LINKS[field] || '#'} className={styles.missingLink}>
                        {MISSING_FIELD_LABELS[field] || field}
                      </a>
                    ))}
                  </div>
                )}
                {!profileStatus.is_complete && (
                  <div className={styles.formActions}>
                    <Button type="button" size="sm" onClick={() => document.getElementById('field-clinic_name')?.focus()}>
                      Complete Profile
                    </Button>
                  </div>
                )}
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Verification Status</span>
                <Badge variant={VET_STATUS[vetProfile.vet_status]?.variant || 'warning'}>
                  {VET_STATUS[vetProfile.vet_status]?.label || vetProfile.vet_status}
                </Badge>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Availability Status</span>
                <select
                  className={styles.statusSelect}
                  value={vetProfile.availability_status || 'offline'}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      setError('');
                      await vetProfileService.updateStatus(newStatus);
                      setVetProfile((prev) => ({ ...prev, availability_status: newStatus }));
                      setSuccess(`Status updated to ${newStatus.replace('_', ' ')}.`);
                    } catch (err) {
                      setError(err?.message || 'Failed to update status.');
                    }
                  }}
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              {/* ── Identity & Contact ── */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Identity & Clinic</h3>
                  <span className={styles.sectionHint}>How pet owners will see and reach you</span>
                </div>
                <div className={styles.grid2}>
                  <FormInput
                    label="Vet Name"
                    name="vet_name"
                    value={vetForm.vet_name}
                    onChange={handleVetFormChange}
                  />
                  <FormInput
                    label="Clinic Name"
                    name="clinic_name"
                    value={vetForm.clinic_name}
                    onChange={handleVetFormChange}
                  />
                </div>
                <div className={styles.grid2}>
                  <FormInput
                    label="Phone"
                    name="phone"
                    value={vetForm.phone}
                    onChange={handleVetFormChange}
                  />
                  <FormInput
                    label="Profile Photo URL"
                    name="profile_photo"
                    value={vetForm.profile_photo}
                    onChange={handleVetFormChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* ── Credentials ── */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Credentials</h3>
                  <span className={styles.sectionHint}>Your licence and qualifications</span>
                </div>
                <div className={styles.grid2}>
                  <FormInput
                    label="License Number"
                    name="license_number"
                    value={vetForm.license_number}
                    onChange={handleVetFormChange}
                  />
                  <FormInput
                    label="Qualification"
                    name="qualifications"
                    value={vetForm.qualifications}
                    onChange={handleVetFormChange}
                    placeholder="BVSc, MVSc"
                  />
                </div>
                <FormInput
                  label="Specialization"
                  name="specialization"
                  value={vetForm.specialization}
                  onChange={handleVetFormChange}
                  placeholder="Small animals, surgery, dermatology..."
                />
                <FormInput
                  label="Bio"
                  name="bio"
                  type="textarea"
                  value={vetForm.bio}
                  onChange={handleVetFormChange}
                  placeholder="Brief introduction shown on your public profile"
                />
              </div>

              {/* ── Services & Species ── */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Services & Species</h3>
                  <span className={styles.sectionHint}>What you offer and which pets you treat</span>
                </div>
                <div className={styles.chipGroup}>
                  <span className={styles.chipLabel}>Consultation Types</span>
                  <div className={styles.chipRow}>
                    {[
                      { value: 'clinic_visit', label: 'Clinic Visit' },
                      { value: 'home_visit', label: 'Home Visit' },
                      { value: 'phone_consultation', label: 'Phone Consultation' },
                      { value: 'video_call', label: 'Video Call' },
                    ].map((opt) => {
                      const checked = vetForm.consultation_types.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className={`${styles.chip} ${checked ? styles.chipActive : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleConsultationType(opt.value)}
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <FormInput
                  label="Services (comma separated)"
                  name="services_text"
                  value={vetForm.services_text}
                  onChange={handleVetFormChange}
                  placeholder="general, emergency, surgery"
                />
                <FormInput
                  label="Accepted Species (comma separated)"
                  name="accepted_species_text"
                  value={vetForm.accepted_species_text}
                  onChange={handleVetFormChange}
                  placeholder="dog, cat, rabbit"
                />
              </div>

              {/* ── Pricing ── */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Pricing</h3>
                  <span className={styles.sectionHint}>Set 0 for any service you don't offer</span>
                </div>
                <div className={styles.grid3}>
                  <FormInput
                    label="Clinic Visit Fee (₹)"
                    name="consultation_fee"
                    type="number"
                    value={vetForm.consultation_fee}
                    onChange={handleVetFormChange}
                  />
                  <FormInput
                    label="Home Visit Fee (₹)"
                    name="home_visit_fee"
                    type="number"
                    value={vetForm.home_visit_fee}
                    onChange={handleVetFormChange}
                  />
                  <FormInput
                    label="Online Fee (₹)"
                    name="online_fee"
                    type="number"
                    value={vetForm.online_fee}
                    onChange={handleVetFormChange}
                  />
                </div>
                <FormInput
                  label="Max Home Visit Distance (km)"
                  name="max_home_visit_km"
                  type="number"
                  value={vetForm.max_home_visit_km}
                  onChange={handleVetFormChange}
                  placeholder="e.g. 15"
                />
              </div>

              {/* ── Clinic Location ── */}
              <div className={styles.section} id="field-address">
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Clinic Location</h3>
                  <span className={styles.sectionHint}>
                    Search, click the map, or detect your location. The pin sets your exact spot —
                    address fields below auto-fill.
                  </span>
                </div>

                <LocationPicker
                  latitude={vetForm.latitude}
                  longitude={vetForm.longitude}
                  onLocationChange={handleLocationChange}
                  onAddressFound={handleAddressFound}
                />

                <FormInput
                  label="Street Address"
                  name="address"
                  value={vetForm.address}
                  onChange={handleVetFormChange}
                  placeholder="Will auto-fill from map"
                />
                <div className={styles.grid3}>
                  <FormInput
                    label="City"
                    name="city"
                    value={vetForm.city}
                    onChange={handleVetFormChange}
                  />
                  <FormInput
                    label="State"
                    name="state"
                    value={vetForm.state}
                    onChange={handleVetFormChange}
                  />
                  <FormInput
                    label="Postal Code"
                    name="postal_code"
                    value={vetForm.postal_code}
                    onChange={handleVetFormChange}
                  />
                </div>
                <input type="hidden" id="field-latitude" value={vetForm.latitude} readOnly />
                <input type="hidden" id="field-longitude" value={vetForm.longitude} readOnly />
              </div>

              <div className={styles.docSection}>
                <p className={styles.docTitle}>Required Verification Documents</p>
                {REQUIRED_DOCUMENTS.map((doc) => (
                  <div key={doc.type} className={styles.docRow} id={`doc-${doc.type}`}>
                    <div className={styles.docMeta}>
                      <strong>{doc.label}</strong>
                      <span className={styles.docStatus}>
                        {isDocumentUploaded(doc) ? (
                          <span className={styles.docStatusUploaded}>✓ Uploaded</span>
                        ) : docFiles[doc.type] ? (
                          <span className={styles.docStatusSelected}>📄 {docFiles[doc.type].name}</span>
                        ) : (
                          <span className={styles.docStatusMissing}>Missing</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.docActions}>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className={styles.fileInput}
                        onChange={(e) =>
                          setDocFiles((prev) => ({ ...prev, [doc.type]: e.target.files?.[0] || null }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUploadDocument(doc.type)}
                        loading={uploadingDoc === doc.type}
                        disabled={!docFiles[doc.type]}
                      >
                        Upload
                      </Button>
                      {isDocumentUploaded(doc) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleViewDocument(doc.type)}
                          loading={viewingDoc === doc.type}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.formActions}>
                <Button type="submit" loading={saving} disabled={saving || profileBlocked}>Save Vet Profile</Button>
              </div>
            </form>
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

      {tab === 'availability' && (
        <Card title="Weekly Availability">
          <div className={styles.form} id="availability-section">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Day</label>
                <select
                  value={availForm.day_of_week}
                  onChange={(e) => setAvailForm({ ...availForm, day_of_week: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 14 }}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>{DAY_NAMES[d]}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 100 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Open</label>
                <input
                  type="time"
                  value={availForm.open_time}
                  onChange={(e) => setAvailForm({ ...availForm, open_time: e.target.value })}
                  style={{ padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 14 }}
                />
              </div>
              <div style={{ minWidth: 100 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Close</label>
                <input
                  type="time"
                  value={availForm.close_time}
                  onChange={(e) => setAvailForm({ ...availForm, close_time: e.target.value })}
                  style={{ padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 14 }}
                />
              </div>
              <Button onClick={handleAvailSubmit} loading={saving}>
                {editAvail ? 'Update' : 'Add'}
              </Button>
              {editAvail && (
                <Button variant="ghost" onClick={() => { setEditAvail(null); setAvailForm({ day_of_week: '1', open_time: '09:00', close_time: '17:00' }); }}>
                  Cancel
                </Button>
              )}
            </div>

            {loadingAvail ? (
              <Loader />
            ) : availabilities.length === 0 ? (
              <p className={styles.empty}>No availability slots set. Add your weekly schedule above.</p>
            ) : (
              <div className={styles.vetDetails} style={{ marginTop: 16 }}>
                {availabilities.map((slot) => (
                  <div key={slot.id} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{DAY_NAMES[slot.day_of_week] || `Day ${slot.day_of_week}`}</span>
                    <span>{slot.open_time?.slice(0, 5)} — {slot.close_time?.slice(0, 5)}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditAvail(slot);
                        setAvailForm({ day_of_week: String(slot.day_of_week), open_time: slot.open_time?.slice(0, 5), close_time: slot.close_time?.slice(0, 5) });
                      }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteAvail(slot.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === 'account' && (
        <Card title="Delete Account">
          <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            Permanently delete your vet account and all associated data. This action cannot be undone.
          </p>
          <form onSubmit={handleDeleteAccount} className={styles.form}>
            <FormInput
              label="Enter your password to confirm"
              name="delete_password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
            <div className={styles.formActions}>
              <Button type="submit" variant="danger" loading={deleting} disabled={!deletePassword}>
                Delete My Account
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
