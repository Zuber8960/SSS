import Api from '../services/Api';

const TOKEN_KEY = 'authToken';
const TENANT_TOKEN_KEY = 'tenantToken';

let _locationsCache = null;

export const fetchAllLocations = async () => {
  if (_locationsCache) return _locationsCache;
  const hasToken = !!(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TENANT_TOKEN_KEY));
  const url = hasToken ? '/locationMaster' : '/public/locations';
  const data = await Api.get(url).then(r => r.data.data || []);
  _locationsCache = data;
  return data;
};

export const clearLocationsCache = () => { _locationsCache = null; };

export const fetchLocationTowns = (locCode)         => Api.get('/locationMaster/towns', { params: { loc_code: locCode } }).then(r => r.data.data || []);
export const saveLocations      = (payload)         => Api.post('/locationMaster', payload).then(r => { clearLocationsCache(); return r.data.data || []; });
export const updateLocation     = (locCode, payload) => Api.put(`/locationMaster/${encodeURIComponent(locCode)}`, payload).then(r => { clearLocationsCache(); return r.data.data; });
export const deleteLocation     = (locCode)         => Api.delete(`/locationMaster/${encodeURIComponent(locCode)}`).then(r => { clearLocationsCache(); return r.data; });
