import api from './api';

const vetProfileService = {
  getProfile() {
    return api.get('/vet/profile');
  },

  updateProfile(data) {
    return api.put('/vet/profile', data);
  },

  uploadDocument(formData) {
    return api.post('/vet/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAvailabilities() {
    return api.get('/vet/availabilities');
  },

  createAvailability(data) {
    return api.post('/vet/availabilities', data);
  },

  updateAvailability(id, data) {
    return api.put(`/vet/availabilities/${id}`, data);
  },

  deleteAvailability(id) {
    return api.delete(`/vet/availabilities/${id}`);
  },

  updateStatus(status) {
    return api.put('/vet/status', { availability_status: status });
  },
};

export default vetProfileService;
