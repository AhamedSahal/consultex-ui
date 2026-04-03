import axios from 'axios';

const raw = import.meta.env.VITE_API_URL || '';
const API_BASE = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
// When no external API URL, use /api so Vite proxies only API calls (not document requests like /agents)
const baseURL = API_BASE || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const base = baseURL || '';
        const { data } = await axios.post(`${base}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return new Promise(() => {});
      }
    }
    return Promise.reject(err);
  }
);

export default api;
