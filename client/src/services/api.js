import axios from 'axios';

// Default to relative '/api' so Vercel proxies requests (first-party cookies!),
// or allow overriding via VITE_API_BASE_URL if explicitly set.
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Ignore requests that have no response or are not 401
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints or if already retried
    if (
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/signup') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // If no refresh is currently pending, start one
    if (!refreshPromise) {
      refreshPromise = api
        .post('/auth/refresh', {})
        .then((res) => {
          refreshPromise = null;
          return res;
        })
        .catch((refreshError) => {
          refreshPromise = null;
          // Notify app that authentication has expired
          window.dispatchEvent(new CustomEvent('auth:expired'));
          return Promise.reject(refreshError);
        });
    }

    // Wait for the shared refresh to complete, then retry this original request
    return refreshPromise
      .then(() => api(originalRequest))
      .catch((err) => Promise.reject(err));
  }
);

export default api;
