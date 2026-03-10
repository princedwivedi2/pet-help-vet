import api from './api';

const authService = {
  login(credentials) {
    return api.post('/auth/login', credentials);
  },

  logout() {
    return api.post('/auth/logout');
  },

  me() {
    return api.get('/auth/me');
  },

  updateProfile(data) {
    return api.put('/auth/profile', data);
  },

  changePassword(data) {
    return api.put('/auth/change-password', data);
  },

  deleteAccount(data) {
    return api.delete('/auth/account', { data });
  },
};

export default authService;
