import axios from 'axios';

const TOKEN_KEY = 'authToken';
const TENANT_TOKEN_KEY = 'tenantToken';

const Api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token and company code to every request
Api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TENANT_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');
  if (currentUser?.company_code) config.headers['x-company-code'] = currentUser.company_code;
  return config;
});

// On 401 → clear token and redirect to login, unless the 401 came from the login endpoint itself
Api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/login');
    const hasToken       = !!localStorage.getItem(TOKEN_KEY);
    if (error.response?.status === 401 && !isLoginRequest && hasToken) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/';
    }
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

export const AllRequest = (promises) => axios.all(promises);

export default Api;
