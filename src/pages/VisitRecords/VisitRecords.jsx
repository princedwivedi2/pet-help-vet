import { useEffect, useState, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import SearchBar from '../../components/common/SearchBar/SearchBar';
import Loader from '../../components/common/Loader/Loader';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Badge from '../../components/common/Badge/Badge';
import Tabs from '../../components/common/Tabs/Tabs';
import Pagination from '../../components/common/Pagination/Pagination';
import Icon from '../../components/common/Icon/Icon';
import appointmentService from '../../services/appointmentService';
import visitRecordService from '../../services/visitRecordService';
import { formatDate } from '../../utils/helpers';
import styles from './VisitRecords.module.css';

const SOURCE_TABS = [
  { key: 'all', label: 'All Visits' },
  { key: 'completed', label: 'Completed' },
  { key: 'in_progress', label: 'In Progress' },
];

export default function VisitRecords() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Record form
  const [formTarget, setFormTarget] = useState(null);
  const [existingRecord, setExistingRecord] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ diagnosis: '', treatment: '', notes: '', prescription_text: '' });

  // View record
  const [viewTarget, setViewTarget] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, per_page: 15 };
      if (tab === 'completed') params.status = 'completed';
      else if (tab === 'in_progress') params.status = 'in_progress';
      else {
        params.status = 'completed,in_progress';
      }
      if (search) params.search = search;

      const res = await appointmentService.getAll(params);
      const list = res?.data?.appointments || [];
      setAppointments(Array.isArray(list) ? list : []);
      setTotalPages(res?.data?.pagination?.last_page || res?.data?.last_page || 1);
    } catch (err) {
      setAppointments([]);
      setError(err?.response?.data?.message || 'Failed to load visit data');
    } finally {
      setLoading(false);
    }
  }, [page, tab, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openForm = async (appt) => {
    setFormTarget(appt);
    setExistingRecord(null);
    setForm({ diagnosis: '', treatment: '', notes: '', prescription_text: '' });
    setFormLoading(true);
    try {
      const res = await visitRecordService.getForAppointment(appt.uuid);
      const record = res?.data?.visit_record || res?.data;
      if (record?.uuid) {
        setExistingRecord(record);
        setForm({
          diagnosis: record.diagnosis || '',
          treatment: record.treatment || '',
          notes: record.notes || '',
          prescription_text: record.prescription_text || '',
        });
      }
    } catch {
      // No existing record — that's fine
    } finally {
      setFormLoading(false);
    }
  };

  const openView = async (appt) => {
    setViewTarget(appt);
    setViewRecord(null);
    setViewLoading(true);
    try {
      const res = await visitRecordService.getForAppointment(appt.uuid);
      setViewRecord(res?.data?.visit_record || res?.data || null);
    } catch {
      setViewRecord(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      if (existingRecord?.uuid) {
        await visitRecordService.update(existingRecord.uuid, form);
      } else {
        await visitRecordService.create({
          ...form,
          appointment_uuid: formTarget.uuid,
        });
      }
      setFormTarget(null);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save visit record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorBar}>{error}</div>}

      <div className={styles.toolbar}>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search visits..." />
      </div>

      <Tabs tabs={SOURCE_TABS} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />

      {loading ? (
        <Loader fullPage />
      ) : appointments.length === 0 ? (
        <Card>
          <EmptyState
            icon="clipboardList"
            title="No visit records"
            message="Completed and in-progress appointments will appear here so you can add clinical notes."
          />
        </Card>
      ) : (
        <div className={styles.visitList}>
          {appointments.map((appt) => (
            <div key={appt.uuid || appt.id} className={styles.visitCard}>
              <div className={styles.visitLeft}>
                <div className={styles.visitPet}>
                  {appt.pet?.name || 'Pet'}
                  {appt.pet?.species && <span className={styles.visitSpecies}>({appt.pet.species})</span>}
                </div>
                <div className={styles.visitOwner}>{appt.user?.name || 'Owner'}</div>
                <div className={styles.visitDate}>{formatDate(appt.scheduled_at)}</div>
              </div>
              <div className={styles.visitCenter}>
                {appt.reason && <span className={styles.visitReason}>{appt.reason}</span>}
                <Badge variant={appt.status === 'completed' ? 'success' : 'info'} size="sm">
                  {appt.status === 'completed' ? 'Completed' : 'In Progress'}
                </Badge>
              </div>
              <div className={styles.visitActions}>
                <Button size="sm" variant="ghost" onClick={() => openView(appt)}>
                  <Icon name="eye" size={14} /> View
                </Button>
                <Button size="sm" variant="primary" onClick={() => openForm(appt)}>
                  <Icon name="edit" size={14} /> {appt.status === 'completed' ? 'Edit Record' : 'Add Record'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* View Record Modal */}
      {viewTarget && (
        <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Visit Record" size="md">
          {viewLoading ? (
            <Loader />
          ) : viewRecord?.uuid ? (
            <div className={styles.recordView}>
              <div className={styles.recordField}>
                <span className={styles.recordLabel}>Pet</span>
                <span>{viewTarget.pet?.name} ({viewTarget.pet?.species || ''})</span>
              </div>
              <div className={styles.recordField}>
                <span className={styles.recordLabel}>Date</span>
                <span>{formatDate(viewTarget.scheduled_at)}</span>
              </div>
              <div className={styles.recordField}>
                <span className={styles.recordLabel}>Diagnosis</span>
                <span>{viewRecord.diagnosis || '—'}</span>
              </div>
              <div className={styles.recordField}>
                <span className={styles.recordLabel}>Treatment</span>
                <span>{viewRecord.treatment || '—'}</span>
              </div>
              <div className={styles.recordField}>
                <span className={styles.recordLabel}>Prescription</span>
                <span>{viewRecord.prescription_text || '—'}</span>
              </div>
              <div className={styles.recordField}>
                <span className={styles.recordLabel}>Notes</span>
                <span>{viewRecord.notes || '—'}</span>
              </div>
            </div>
          ) : (
            <EmptyState icon="clipboardList" title="No record yet" message="No visit record has been created for this appointment." />
          )}
        </Modal>
      )}

      {/* Create/Edit Record Modal */}
      {formTarget && (
        <Modal
          open={!!formTarget}
          onClose={() => setFormTarget(null)}
          title={existingRecord ? 'Edit Visit Record' : 'New Visit Record'}
          size="md"
        >
          {formLoading ? (
            <Loader />
          ) : (
            <div className={styles.recordForm}>
              <div className={styles.formHeader}>
                <span className={styles.formPet}>{formTarget.pet?.name} ({formTarget.pet?.species || ''})</span>
                <span className={styles.formDate}>{formatDate(formTarget.scheduled_at)}</span>
              </div>
              <label className={styles.fieldLabel}>Diagnosis</label>
              <textarea
                className={styles.fieldInput}
                rows={2}
                placeholder="Enter diagnosis..."
                value={form.diagnosis}
                onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
              />
              <label className={styles.fieldLabel}>Treatment</label>
              <textarea
                className={styles.fieldInput}
                rows={2}
                placeholder="Enter treatment plan..."
                value={form.treatment}
                onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))}
              />
              <label className={styles.fieldLabel}>Prescription</label>
              <textarea
                className={styles.fieldInput}
                rows={2}
                placeholder="Medications, dosage, duration..."
                value={form.prescription_text}
                onChange={(e) => setForm((f) => ({ ...f, prescription_text: e.target.value }))}
              />
              <label className={styles.fieldLabel}>Notes</label>
              <textarea
                className={styles.fieldInput}
                rows={2}
                placeholder="Additional observations..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <div className={styles.formActions}>
                <Button variant="ghost" onClick={() => setFormTarget(null)}>Cancel</Button>
                <Button variant="primary" loading={saving} onClick={handleSave}>
                  {existingRecord ? 'Update Record' : 'Create Record'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
