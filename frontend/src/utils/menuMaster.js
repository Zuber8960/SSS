import Api from '../services/Api';

export const fetchAllMenus  = ()                => Api.get('/menuMaster').then(r => r.data.data || []);
export const createMenu     = (payload)         => Api.post('/menuMaster', payload).then(r => r.data.data);
export const updateMenu     = (recId, payload)  => Api.put(`/menuMaster/${recId}`, payload).then(r => r.data.data);
export const deleteMenu     = (recId)           => Api.delete(`/menuMaster/${recId}`).then(r => r.data);
