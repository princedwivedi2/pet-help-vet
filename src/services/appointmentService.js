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

  accept(uuid) {
    return api.patch(`/appointments/${uuid}/accept`);
  },

  reject(uuid, data) {
    return api.patch(`/appointments/${uuid}/reject`, data);
  },

  start(uuid, data = {}) {
    return api.patch(`/appointments/${uuid}/start`, data);
  },

  complete(uuid, data = {}) {
    return api.patch(`/appointments/${uuid}/complete`, data);
  },

  cancel(uuid, data) {
    return api.patch(`/appointments/${uuid}/cancel`, data);
  },

  endVisit(uuid, data) {
    return api.put(`/appointments/${uuid}/end-visit`, data);
  },
};

export default appointmentService;
