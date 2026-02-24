import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vet_token');
      localStorage.removeItem('vet_user');
      window.location.href = '/login';
    }
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject({ message, errors: error.response?.data?.errors });
  }
);

export default api;
