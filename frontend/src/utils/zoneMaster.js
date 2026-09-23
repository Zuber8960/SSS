import Api from '../services/Api';

export const fetchAllZones   = ()          => Api.get('/zone').then(r => r.data.data || []);
export const fetchZoneById   = (recId)     => Api.get(`/zone/${encodeURIComponent(recId)}`).then(r => r.data.data);
export const saveZone        = (payload)   => Api.post('/zone', payload).then(r => r.data.data);
export const updateZone      = (recId, payload) => Api.put(`/zone/${encodeURIComponent(recId)}`, payload).then(r => r.data.data);
export const deleteZone      = (recId)     => Api.delete(`/zone/${encodeURIComponent(recId)}`).then(r => r.data);
