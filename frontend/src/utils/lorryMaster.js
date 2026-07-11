import Api from '../services/Api';

export const fetchAllLorries = ()                          => Api.get('/lorryMaster').then(r => r.data.data || []);
export const createLorry     = (lorryData)                 => Api.post('/lorryMaster', lorryData).then(r => r.data.data);
export const updateLorry     = (recId, lorryData)          => Api.put(`/lorryMaster/${encodeURIComponent(recId)}`, lorryData).then(r => r.data.data);
export const deleteLorry     = (recId)                     => Api.delete(`/lorryMaster/${encodeURIComponent(recId)}`).then(r => r.data);