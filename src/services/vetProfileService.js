import api from './api';

const vetProfileService = {
  getProfile() {
    return api.get('/vet/profile');
  },

  uploadDocument(formData) {
    return api.post('/vet/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default vetProfileService;
