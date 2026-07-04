import Api from '../services/Api';

export const fetchAllDivisionsApi = ()               => Api.get('/divisionMaster').then(r => r.data.data || []);
export const saveDivisionApi      = (payload)        => Api.post('/divisionMaster', payload).then(r => r.data.data || []);
export const updateDivisionApi    = (recId, payload) => Api.put(`/divisionMaster/${encodeURIComponent(recId)}`, payload).then(r => r.data.data);
export const deleteDivisionApi    = (recId)          => Api.delete(`/divisionMaster/${encodeURIComponent(recId)}`).then(r => r.data);
