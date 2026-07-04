import Api from '../services/Api';

export const fetchAllRoles  = ()                => Api.get('/roleMaster').then(r => r.data.data || []);
export const createRole     = (payload)         => Api.post('/roleMaster', payload).then(r => r.data.data);
export const updateRole     = (recId, payload)  => Api.put(`/roleMaster/${recId}`, payload).then(r => r.data.data);
export const deleteRole     = (recId)           => Api.delete(`/roleMaster/${recId}`).then(r => r.data);
