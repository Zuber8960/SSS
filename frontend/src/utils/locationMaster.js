import Api from '../services/Api';

let _locationsCache = null;

export const fetchAllLocations = async () => {
  if (_locationsCache) return _locationsCache;
  const data = await Api.get('/locationMaster').then(r => r.data.data || []);
  _locationsCache = data;
  return data;
};

export const clearLocationsCache = () => { _locationsCache = null; };

export const fetchLocationTowns = (locCode)         => Api.get('/locationMaster/towns', { params: { loc_code: locCode } }).then(r => r.data.data || []);
export const saveLocations      = (payload)         => Api.post('/locationMaster', payload).then(r => { clearLocationsCache(); return r.data.data || []; });
export const updateLocation     = (locCode, payload) => Api.put(`/locationMaster/${encodeURIComponent(locCode)}`, payload).then(r => { clearLocationsCache(); return r.data.data; });
export const deleteLocation     = (locCode)         => Api.delete(`/locationMaster/${encodeURIComponent(locCode)}`).then(r => { clearLocationsCache(); return r.data; });
