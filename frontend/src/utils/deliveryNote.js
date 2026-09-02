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

// Upload a POD file to the backend (stored in backend/uploads/pod, served at /uploads/pod/...)
export const uploadPodFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return Api.post('/deliveryNote/pod', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data?.data?.url || r.data?.url || null);
};
