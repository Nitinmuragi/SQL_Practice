import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization token to every request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sql_practice_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for handling 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect on login or register endpoint errors
      const isAuthUrl = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthUrl && window.location.pathname !== '/login') {
        localStorage.removeItem('sql_practice_token');
        localStorage.removeItem('sql_practice_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
