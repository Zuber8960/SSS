import Api from '../services/Api';

export const fetchAllTowns = (locCode) =>
  Api.get('/locationMaster/towns', {
    params: locCode ? { loc_code: locCode } : {},
  }).then(r => r.data.data || []);

export const fetchTownsByLocation = (locCode) =>
  Api.get('/locationMaster/towns', { params: { loc_code: locCode } }).then(r => r.data.data || []);

export const updateTownLocation = (townName, fromLocCode, toLocCode, newTownName, latitude, longitude) =>
  Api.put(`/locationMaster/towns/${encodeURIComponent(townName)}`, {
    town_name: townName,
    from_loc_code: fromLocCode,
    to_loc_code: toLocCode,
    new_town_name: newTownName,
    latitude,
    longitude,
  }).then(r => r.data.data || r.data);

export const addTownToLocation = (locCode, townName, latitude, longitude) =>
  Api.post('/locationMaster/towns', {
    loc_code: locCode,
    town_name: townName,
    latitude,
    longitude,
  }).then(r => r.data.data || r.data);

export const deleteTownFromLocation = (locCode, townName) =>
  Api.delete(`/locationMaster/towns/${encodeURIComponent(townName)}`, {
    params: { loc_code: locCode },
  }).then(r => r.data);
