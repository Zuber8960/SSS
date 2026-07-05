import Api from '../services/Api';

const TENANT_KEY = 'tenantConfig';

export const fetchAllTenants = () =>
  Api.get('/tenant').then(r => r.data.data || []);

export const tenantLogin = async (userId, password) => {
  const { data } = await Api.post('/tenant/login', { userId, password });
  if (data.success) {
    localStorage.setItem(TENANT_KEY, JSON.stringify(data.config));
  }
  return data;
};

export const getTenantConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(TENANT_KEY));
  } catch {
    return null;
  }
};

export const clearTenantConfig = () => localStorage.removeItem(TENANT_KEY);
