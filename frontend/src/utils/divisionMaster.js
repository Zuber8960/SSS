import Api from '../services/Api';

export const fetchAllDivisions = ()               => Api.get('/divisionMaster').then(r => r.data.data || []);
export const saveDivision      = (payload)        => Api.post('/divisionMaster', payload).then(r => r.data.data || []);
export const updateDivision    = (recId, payload) => Api.put(`/divisionMaster/${encodeURIComponent(recId)}`, payload).then(r => r.data.data);
export const deleteDivision    = (recId)          => Api.delete(`/divisionMaster/${encodeURIComponent(recId)}`).then(r => r.data);
