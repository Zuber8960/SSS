import Api from '../services/Api';

export const fetchAllMaterialGroups = () =>
  Api.get('/materialGroup').then(r => r.data.data || []);

export const fetchAllMaterialSubGroups = () =>
  Api.get('/materialGroup/subgroups').then(r => r.data.data || []);

export const fetchMaterialSubGroups = (groupCode) =>
  Api.get(`/materialGroup/${encodeURIComponent(groupCode)}/subgroups`).then(r => r.data.data || []);
