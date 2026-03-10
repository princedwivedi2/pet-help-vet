import api from './api';

const sosService = {
  getActive() {
    return api.get('/sos/active');
  },

  updateStatus(uuid, data) {
    return api.put(`/sos/${uuid}/status`, data);
  },

  updateLocation(uuid, data) {
    return api.put(`/sos/${uuid}/location`, data);
  },
};

export default sosService;
