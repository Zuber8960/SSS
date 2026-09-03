import Api from '../services/Api';

const TOKEN_KEY = 'authToken';
const hasAuthToken = () => !!localStorage.getItem(TOKEN_KEY);

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

// Fetch manifests by location
export const fetchManifestsByLocation = (locationId) =>
  Api.get(`/manifest/by-location/${encodeURIComponent(locationId)}`).then(r => r.data.data || r.data || []);

// Update manifest (header + details)
export const updateManifest = (mnfNo, mnfLoc, mnfDate, header, details) =>
  Api.put(`/manifest/${encodeURIComponent(mnfNo)}/${encodeURIComponent(mnfLoc)}/${encodeURIComponent(mnfDate)}`, { header, details }).then(r => r.data);

// Delete manifest (soft)
export const deleteManifest = (mnfNo, mnfLoc, mnfDate) =>
  Api.delete(`/manifest/${encodeURIComponent(mnfNo)}/${encodeURIComponent(mnfLoc)}/${encodeURIComponent(mnfDate)}`).then(r => r.data);

// Fetch manifests by docket number (for Docket Enquiry)
export const fetchManifestsByDocketNo = (docketNo) => {
  const url = hasAuthToken()
    ? `/manifest/by-docket/${encodeURIComponent(docketNo)}`
    : `/public/manifest/by-docket/${encodeURIComponent(docketNo)}`;
  return Api.get(url).then(r => r.data.data || r.data || []);
};

// Check if a docket already exists in the manifest unloading table (sst_unloading_dtl)
export const checkDocketUnloaded = (docketNo) =>
  Api.get(`/manifest/unloading/by-docket/${encodeURIComponent(docketNo)}`)
    .then(r => !!r.data?.exists)
    .catch(() => false);

// Fetch vehicle tracking data
export const fetchVehicleTrackingData = (vehicleNo) =>
  Api.get(`/manifest/tracking/${encodeURIComponent(vehicleNo)}`)
    .then(r => r.data.data || r.data || null)
    .catch(() => null);