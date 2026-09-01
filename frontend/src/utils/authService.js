import Api from '../services/Api';
import { getTenantToken } from './tenantService';
import { clearLocationsCache } from './locationMaster';

const TOKEN_KEY = 'authToken';

// Keys that hold tenant-specific session data and must be reset when
// switching tenants or logging out, otherwise the previous tenant's
// company/location will leak into the new session.
export const TENANT_SCOPED_KEYS = [
  'current_user',
  'loc_code',
  'division_code',
  'company_code',
  'header_branch_label',
  'header_division_label',
];

export const clearTenantScopedStorage = () => {
  TENANT_SCOPED_KEYS.forEach((k) => localStorage.removeItem(k));
  clearLocationsCache();
};

export const loginUser = async (userId, password, loc_id, division_code) => {
  const tenantToken = getTenantToken();
  const { data } = await Api.post('/login', {
    userId,
    password,
    ...(tenantToken && { tenantToken }),
    ...(loc_id && { loc_id }),
    ...(division_code && { division_code }),
  });
  if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
  return data;
};

export const resetPassword = (userId, email, mobileNo, newPassword) =>
  Api.post('/reset-password', {
    user_id: userId,
    email_id: email,
    mobile_no: mobileNo,
    new_password: newPassword,
  }).then(r => r.data);

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  clearTenantScopedStorage();
};

export const isAuthenticated = () => !!localStorage.getItem(TOKEN_KEY);

export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getCompanyCode = () => {
  const user = JSON.parse(localStorage.getItem('current_user') || 'null');
  return user?.company_code ?? null;
};

export const getDivisionCode = () => {
  return localStorage.getItem('division_code');
};

export const getStoredCompanyCode = () => {
  return localStorage.getItem('company_code');
};
