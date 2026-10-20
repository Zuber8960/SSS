import Api from '../services/Api';

export const fetchLorryOwners = () =>
  Api.get('/lorryOwnerVehicle/owners').then((r) => r.data.data || []);

export const fetchAttachedVehicles = (ownerBpId) =>
  Api.get('/lorryOwnerVehicle/attached', { params: { owner_bp_id: ownerBpId } }).then((r) => r.data.data || []);

export const fetchAvailableVehicles = (ownerBpId) =>
  Api.get('/lorryOwnerVehicle/available', { params: { owner_bp_id: ownerBpId } }).then((r) => r.data.data || []);

export const fetchOwnerByVehicle = (vehicleNo) =>
  Api.get(`/lorryOwnerVehicle/by-vehicle/${encodeURIComponent(vehicleNo)}`).then((r) => r.data.data ?? null);

export const attachVehicles = (payload) =>
  Api.post('/lorryOwnerVehicle/attach', payload).then((r) => r.data.data || []);

export const detachVehicles = (payload) =>
  Api.post('/lorryOwnerVehicle/detach', payload).then((r) => r.data.data || []);
