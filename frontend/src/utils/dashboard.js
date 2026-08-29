import Api from '../services/Api';

export const fetchDashboardStats = () =>
  Api.get('/dashboard/stats').then(r => r.data.data);

export const fetchInTransitVehicleLocations = () =>
  Api.get('/dashboard/in-transit-vehicle-locations').then(r => r.data.data || r.data || []);

export const fetchInTransitDockets = () =>
  Api.get('/dashboard/in-transit-dockets').then(r => r.data.data || r.data || []);
