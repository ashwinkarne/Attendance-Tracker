import axios from 'axios';

// When running in the browser on Vercel or any non-localhost host,
// ALWAYS use relative '/api' so requests go through the same-origin Vercel proxy.
// This guarantees cookies are first-party and immune to browser third-party cookie blocking.
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const apiBaseURL = isLocalhost ? (import.meta.env.VITE_API_BASE_URL || '/api') : '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// In-memory access token cache for active session resilience
// (Never stored in localStorage or sessionStorage, completely secure)
let memoryToken = null;

export function setMemoryToken(token) {
  memoryToken = token;
}

export function getMemoryToken() {
  return memoryToken;
}

// Request Interceptor: Attach Authorization Bearer token from memory if present
api.interceptors.request.use((config) => {
  if (memoryToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }
  return config;
});

let refreshPromise = null;

// Response Interceptor: Automatically refresh on 401 and capture new access token
api.interceptors.response.use(
  (response) => {
    // Capture new access token in memory if provided in response body
    if (response.data && response.data.accessToken) {
      setMemoryToken(response.data.accessToken);
    }
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    // Ignore requests without response or non-401 errors
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

    // Singleton refresh: exactly one refresh call executes at any given time
    if (!refreshPromise) {
      refreshPromise = api
        .post('/auth/refresh', {})
        .then((res) => {
          refreshPromise = null;
          if (res.data && res.data.accessToken) {
            setMemoryToken(res.data.accessToken);
          }
          return res;
        })
        .catch((refreshError) => {
          refreshPromise = null;
          setMemoryToken(null);
          // Notify the application that the session is expired
          window.dispatchEvent(new CustomEvent('auth:expired'));
          return Promise.reject(refreshError);
        });
    }

    // Wait for the shared refresh to complete, then retry this original request
    return refreshPromise
      .then(() => {
        // Update header with fresh memory token if available
        if (memoryToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${memoryToken}`;
        }
        return api(originalRequest);
      })
      .catch((err) => Promise.reject(err));
  }
);

export default api;
