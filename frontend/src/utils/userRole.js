import Api from '../services/Api';

export const fetchAllUserRoles  = ()                          => Api.get('/userRole').then(r => r.data.data || []);
export const createUserRole     = (payload)                   => Api.post('/userRole', payload).then(r => r.data.data);
export const deleteUserRole     = (userId, roleCode)          => Api.delete(`/userRole/${encodeURIComponent(userId)}/${encodeURIComponent(roleCode)}`).then(r => r.data);
