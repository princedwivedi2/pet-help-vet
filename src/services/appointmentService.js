import api from './api';

const appointmentService = {
  getAll(params = {}) {
    return api.get('/appointments/vet', { params });
  },

  getOne(uuid) {
    return api.get(`/appointments/${uuid}`);
  },

  updateStatus(uuid, data) {
    return api.put(`/appointments/${uuid}/status`, data);
  },

  endVisit(uuid, data) {
    return api.put(`/appointments/${uuid}/end-visit`, data);
  },
};

export default appointmentService;
