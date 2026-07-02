import Api from '../services/Api';

export const fetchAllLocations = ()                      => Api.get('/locationMaster').then(r => r.data.data || []);
export const saveLocations     = (payload)               => Api.post('/locationMaster', payload).then(r => r.data.data || []);
export const updateLocation    = (locCode, payload)      => Api.put(`/locationMaster/${encodeURIComponent(locCode)}`, payload).then(r => r.data.data);
export const deleteLocation    = (locCode)               => Api.delete(`/locationMaster/${encodeURIComponent(locCode)}`).then(r => r.data);
