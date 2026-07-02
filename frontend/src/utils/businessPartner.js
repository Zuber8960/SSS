import Api from '../services/Api';

export const fetchAllBusinessPartners = ()               => Api.get('/businessPartner').then(r => r.data.data || []);
export const saveBusinessPartner      = (payload)        => Api.post('/businessPartner', payload).then(r => r.data.data || []);
export const updateBusinessPartner    = (recId, payload) => Api.put(`/businessPartner/${encodeURIComponent(recId)}`, payload).then(r => r.data.data);
export const deleteBusinessPartner    = (recId)          => Api.delete(`/businessPartner/${encodeURIComponent(recId)}`).then(r => r.data);
