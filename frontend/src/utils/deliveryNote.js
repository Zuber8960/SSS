import Api from '../services/Api';

export const fetchDeliveryNotes = (params = {}) =>
  Api.get('/deliveryNote', { params }).then((r) => r.data.data || r.data || []);

export const fetchDeliveryNoteByDlyNoteNo = (dlyNoteNo) =>
  Api.get(`/deliveryNote/${encodeURIComponent(dlyNoteNo)}`).then((r) => r.data.data || r.data || null);

export const fetchDeliveryNoteByDocketNo = (docketNo) =>
  Api.get(`/deliveryNote/docket/${encodeURIComponent(docketNo)}`).then((r) => r.data.data || r.data || null);

export const saveDeliveryNote = (payload) =>
  Api.post('/deliveryNote', payload).then((r) => r.data.data || r.data);

export const updateDeliveryNote = (dlyNoteNo, payload) =>
  Api.put(`/deliveryNote/${encodeURIComponent(dlyNoteNo)}`, payload).then((r) => r.data.data || r.data);

export const deleteDeliveryNote = (dlyNoteNo) =>
  Api.delete(`/deliveryNote/${encodeURIComponent(dlyNoteNo)}`).then((r) => r.data);
