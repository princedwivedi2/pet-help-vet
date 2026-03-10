import api from './api';

const reviewService = {
  getForVet(vetUuid) {
    return api.get(`/reviews/vet/${vetUuid}`);
  },
  reply(uuid, data) {
    return api.put(`/reviews/${uuid}/reply`, data);
  },
};

export default reviewService;
