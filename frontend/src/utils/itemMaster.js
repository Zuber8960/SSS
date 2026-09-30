import Api from '../services/Api';

const BASE = '/itemMaster';

// GET /itemMaster/next-code → { success, data: { item_code } }
export const fetchNextItemCode = () =>
  Api.get(`${BASE}/next-code`).then(r => r.data?.data?.item_code || '');

// GET /itemMaster?item_group_code&search&searchBy
export const fetchAllItems = (params) => Api.get(BASE, params ? { params } : undefined).then(r => r.data.data || []);

// POST → { success, data: [row] }
export const createItem = (payload)        => Api.post(BASE, payload).then(r => r.data.data || []);
export const updateItem = (recId, payload) => Api.put(`${BASE}/${encodeURIComponent(recId)}`, payload).then(r => r.data.data);
export const deleteItem = (recId)          => Api.delete(`${BASE}/${encodeURIComponent(recId)}`).then(r => r.data);
