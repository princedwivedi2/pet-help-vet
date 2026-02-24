import api from './api';

const notificationService = {
  getAll(params = {}) {
    return api.get('/notifications', { params });
  },

  getUnreadCount() {
    return api.get('/notifications/unread-count');
  },

  markAllAsRead() {
    return api.put('/notifications/read-all');
  },

  markAsRead(id) {
    return api.put(`/notifications/${id}/read`);
  },
};

export default notificationService;
