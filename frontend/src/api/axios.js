import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('freight_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ── Token refresh on 401 ──────────────────────────────────────
   On any 401, attempt a silent refresh via the httpOnly refreshToken cookie.
   If refresh succeeds: store the new access token and retry once.
   If refresh fails: clear session and redirect to login.           */
let isRefreshing = false;
let waitQueue = []; // requests queued while refresh is in flight

const drainQueue = (token, error) => {
  waitQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)));
  waitQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    const is401 = err.response?.status === 401;
    const isRefreshRoute = original?.url?.includes('/auth/refresh');
    const alreadyRetried = original?._retry;

    if (!is401 || isRefreshRoute || alreadyRetried) {
      if (is401) {
        localStorage.removeItem('freight_token');
        localStorage.removeItem('freight_user');
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh resolves
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = data.token;
      localStorage.setItem('freight_token', newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      original.headers.Authorization = `Bearer ${newToken}`;
      drainQueue(newToken, null);
      return api(original);
    } catch (refreshErr) {
      drainQueue(null, refreshErr);
      localStorage.removeItem('freight_token');
      localStorage.removeItem('freight_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
