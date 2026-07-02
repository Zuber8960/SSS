import Api from '../services/Api';

const TOKEN_KEY = 'authToken';

export const loginUser = async (userId, password) => {
  const { data } = await Api.post('/login', { userId, password });
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

export const logout = () => localStorage.removeItem(TOKEN_KEY);

export const isAuthenticated = () => !!localStorage.getItem(TOKEN_KEY);

export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
