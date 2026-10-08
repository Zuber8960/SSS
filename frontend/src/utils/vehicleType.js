import Api from '../services/Api';

/** GET /vehicleType — all ssm_vehicle_type rows */
export const fetchAllVehicleTypes = () =>
  Api.get('/vehicleType').then((r) => r.data.data || []);

/** GET /vehicleType/types — distinct vehicle_type strings for dropdowns */
export const fetchVehicleTypeOptions = () =>
  Api.get('/vehicleType/types').then((r) => r.data.data || []);

/** GET /vehicleType/:recId — single row by rec_id */
export const fetchVehicleTypeById = (recId) =>
  Api.get(`/vehicleType/${encodeURIComponent(recId)}`).then((r) => r.data.data);
