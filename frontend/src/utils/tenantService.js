import Api from '../services/Api';
import { clearTenantScopedStorage } from './authService';

const TENANT_KEY = 'tenantConfig';

export const fetchAllTenants = () =>
  Api.get('/tenant').then(r => r.data.data || []);

const TENANT_TOKEN_KEY = 'tenantToken';

export const tenantLogin = async (userId, password) => {
  const { data } = await Api.post('/tenant/login', { userId, password });
  if (data.success) {
    // Reset any cached company/location data from a previously
    // logged-in tenant so the new tenant starts clean.
    clearTenantScopedStorage();
    localStorage.setItem(TENANT_KEY, JSON.stringify(data.config));
    if (data.tenantToken) localStorage.setItem(TENANT_TOKEN_KEY, data.tenantToken);
  }
  return data;
};

export const getTenantToken = () => localStorage.getItem(TENANT_TOKEN_KEY);

export const clearTenantToken = () => localStorage.removeItem(TENANT_TOKEN_KEY);

export const getTenantConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(TENANT_KEY));
  } catch {
    return null;
  }
};

export const getDateFormat = () =>
  getTenantConfig()?.dateFormate || "DD/MM/YYYY";

export const clearTenantConfig = () => {
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(TENANT_TOKEN_KEY);
};
