import Api from '../services/Api';

export const fetchPreAllocatedDockets = (params = {}) =>
  Api.get('/docketPreAlloc', { params }).then((r) => r.data.data || r.data || []);

export const previewAutoDocketNos = (loc_code, count) =>
  Api.get('/docketPreAlloc/preview-auto', { params: { loc_code, count } }).then(
    (r) => r.data.data || r.data || []
  );

export const saveDocketPreAlloc = (payload) =>
  Api.post('/docketPreAlloc', payload).then((r) => r.data);
