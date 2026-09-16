import Api from '../services/Api';

export const fetchAllRoleMenus  = ()                  => Api.get('/roleMenu').then(r => r.data.data || []);
export const fetchRoleMenusByRole = (roleCode)        => Api.get(`/roleMenu/byRole/${encodeURIComponent(roleCode)}`).then(r => r.data.data || []);
export const createRoleMenu     = (payload)           => Api.post('/roleMenu', payload).then(r => r.data.data);
export const updateRoleMenu     = (recId, payload)    => Api.put(`/roleMenu/${recId}`, payload).then(r => r.data.data);
export const deleteRoleMenu     = (recId)             => Api.delete(`/roleMenu/${recId}`).then(r => r.data);
