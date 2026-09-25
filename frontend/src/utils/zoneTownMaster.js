import Api from '../services/Api';

// GET /zone-town  — optional filters: { zone_code, loc_code, cust_code, cust_loc_code }
export const fetchAllZoneTowns  = (params)     => Api.get('/zone-town', params ? { params } : undefined).then(r => r.data.data || []);
export const fetchZoneTownById  = (recId)      => Api.get(`/zone-town/${encodeURIComponent(recId)}`).then(r => r.data.data);
// POST /zone-town — bulk map towns to a zone
// payload: { cust_loc_code, cust_code, cust_name, zone_code, zone_name, towns: [{ loc_code, town_name }] }
export const saveZoneTowns      = (payload)    => Api.post('/zone-town', payload).then(r => r.data.data || []);
// PUT /zone-town/:record_id — update a single town ↔ zone mapping
export const updateZoneTown     = (recId, payload) => Api.put(`/zone-town/${encodeURIComponent(recId)}`, payload).then(r => r.data.data);
export const deleteZoneTown     = (recId)      => Api.delete(`/zone-town/${encodeURIComponent(recId)}`).then(r => r.data);

