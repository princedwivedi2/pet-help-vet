import api from './api';

const visitRecordService = {
  create(data) {
    return api.post('/visit-records', data);
  },
  update(uuid, data) {
    return api.put(`/visit-records/${uuid}`, data);
  },
  uploadPrescription(uuid, formData) {
    return api.post(`/visit-records/${uuid}/prescription`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImages(uuid, formData) {
    return api.post(`/visit-records/${uuid}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getForAppointment(appointmentUuid) {
    return api.get(`/visit-records/appointment/${appointmentUuid}`);
  },
};

export default visitRecordService;
