import api from './api';

const paymentService = {
  getWallet() {
    return api.get('/payments/wallet');
  },

  recordOffline(data) {
    return api.post('/payments/offline', data);
  },

  getAll(params = {}) {
    return api.get('/payments', { params });
  },

  requestPayout(data) {
    return api.post('/vet/wallet/payout-request', data);
  },
};

export default paymentService;
