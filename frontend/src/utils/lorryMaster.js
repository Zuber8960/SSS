import Api from '../services/Api';

// Document fields are uploaded as real files via multipart/form-data.
// When none are present we still use FormData so the payload shape is
// identical for create and update (the backend always runs multer).
const DOC_FIELDS = ['doc_permit', 'doc_insurance', 'doc_vehicle_rc', 'doc_fitness', 'doc_pollution'];

/**
 * Builds a FormData body from the lorry form.
 * `files` maps a doc field name -> File object for newly picked documents.
 * Values that are null/undefined/'' are skipped so the DB keeps its defaults.
 */
const toFormData = (lorryData, files = {}) => {
  const fd = new FormData();
  Object.entries(lorryData || {}).forEach(([key, value]) => {
    if (DOC_FIELDS.includes(key)) return;          // handled below
    if (value === null || value === undefined) return;
    if (typeof value === 'boolean') { fd.append(key, value ? 'Y' : 'N'); return; }
    if (value instanceof Date) { fd.append(key, value.toISOString().slice(0, 10)); return; }
    fd.append(key, String(value));
  });
  DOC_FIELDS.forEach((key) => {
    const file = files?.[key];
    if (file instanceof File) fd.append(key, file);
  });
  return fd;
};

export const fetchAllLorries = ()                          => Api.get('/lorryMaster').then(r => r.data.data || []);
export const fetchLorryByVehicleNo = (vehicleNo)           => Api.get(`/lorryMaster/vehicle/${encodeURIComponent(vehicleNo)}`).then(r => r.data.data ?? null);
export const createLorry     = (lorryData, files)          => Api.post('/lorryMaster', toFormData(lorryData, files)).then(r => r.data.data);
export const updateLorry     = (recId, lorryData, files)   => Api.put(`/lorryMaster/${encodeURIComponent(recId)}`, toFormData(lorryData, files)).then(r => r.data.data);
export const deleteLorry     = (recId)                     => Api.delete(`/lorryMaster/${encodeURIComponent(recId)}`).then(r => r.data);
