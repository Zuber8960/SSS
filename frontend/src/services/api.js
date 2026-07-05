import axios from 'axios';

const TOKEN_KEY = 'authToken';

const Api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request (except login/reset which have no token yet)
Api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → clear token and redirect to login, unless the 401 came from the login endpoint itself
Api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

export const AllRequest = (promises) => axios.all(promises);

export default Api;
