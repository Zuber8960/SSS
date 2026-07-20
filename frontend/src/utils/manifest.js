import Api from '../services/Api';

// Create manifest (header + details in transaction)
export const createManifest = (header, details) =>
  Api.post('/manifest', { header, details }).then(r => r.data);

// Fetch all manifests
export const fetchAllManifests = () =>
  Api.get('/manifest').then(r => r.data.data || r.data || []);

// Fetch manifest by composite key
export const fetchManifestByKey = (mnfNo, mnfLoc, mnfDate) =>
  Api.get(`/manifest/${encodeURIComponent(mnfNo)}/${encodeURIComponent(mnfLoc)}/${encodeURIComponent(mnfDate)}`).then(r => r.data.data || r.data);

// Fetch manifest by no only (header + details)
export const fetchManifestByNo = (mnfNo) =>
  Api.get(`/manifest/by-no/${encodeURIComponent(mnfNo)}`).then(r => r.data.data || r.data);

// Fetch next manifest no
export const fetchNextManifestNo = () =>
  Api.get('/manifest/next-no').then(r => r.data.data || r.data);

// Update manifest (header + details)
export const updateManifest = (mnfNo, mnfLoc, mnfDate, header, details) =>
  Api.put(`/manifest/${encodeURIComponent(mnfNo)}/${encodeURIComponent(mnfLoc)}/${encodeURIComponent(mnfDate)}`, { header, details }).then(r => r.data);

// Delete manifest (soft)
export const deleteManifest = (mnfNo, mnfLoc, mnfDate) =>
  Api.delete(`/manifest/${encodeURIComponent(mnfNo)}/${encodeURIComponent(mnfLoc)}/${encodeURIComponent(mnfDate)}`).then(r => r.data);

// Fetch manifests by docket number (for Docket Enquiry)
export const fetchManifestsByDocketNo = (docketNo) =>
  Api.get(`/manifest/by-docket/${encodeURIComponent(docketNo)}`).then(r => r.data.data || r.data || []);