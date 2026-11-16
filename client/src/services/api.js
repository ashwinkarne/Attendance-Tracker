import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints or if already retried
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/signup') ||
      originalRequest.url.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await axios.post('/api/auth/refresh', {}, {
        withCredentials: true,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
