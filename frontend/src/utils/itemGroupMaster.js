import Api from '../services/Api';

const BASE = '/itemGroupMaster';

// GET /itemGroupMaster/next-code → { success, data: { item_group_code } }
export const fetchNextItemGroupCode = () =>
  Api.get(`${BASE}/next-code`).then(r => r.data?.data?.item_group_code || '');

export const fetchAllItemGroups = () => Api.get(BASE).then(r => r.data.data || []);

// POST → { success, data: [row] }  (insert returns an array of rows)
export const createItemGroup = (payload)       => Api.post(BASE, payload).then(r => r.data.data || []);
// PUT → { success, data: [row] }
export const updateItemGroup = (recId, payload) => Api.put(`${BASE}/${encodeURIComponent(recId)}`, payload).then(r => r.data.data);
export const deleteItemGroup = (recId)         => Api.delete(`${BASE}/${encodeURIComponent(recId)}`).then(r => r.data);
