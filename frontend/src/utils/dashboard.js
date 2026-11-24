import Api from '../services/Api';

export const fetchDashboardStats = () =>
  Api.get('/dashboard/stats').then(r => r.data.data);

export const fetchDashboardOverview = () =>
  Api.get('/dashboard/overview').then(r => r.data.data);

export const fetchInTransitVehicleLocations = () =>
  Api.get('/dashboard/in-transit-vehicle-locations').then(r => r.data.data || r.data || []);

export const fetchInTransitDockets = () =>
  Api.get('/dashboard/in-transit-dockets').then(r => r.data.data || r.data || []);

export const fetchOrderBoard = () =>
  Api.get('/dashboard/orders').then(r => r.data.data);

export const fetchOrderDockets = (params) =>
  Api.get('/dashboard/orders/dockets', { params }).then(r => r.data.data || []);

export const fetchDespatchBoard = () =>
  Api.get('/dashboard/despatches').then(r => r.data.data);

export const fetchDespatchDockets = (params) =>
  Api.get('/dashboard/despatches/dockets', { params }).then(r => r.data.data || []);

export const fetchVehicleBoard = () =>
  Api.get('/dashboard/vehicles').then(r => r.data.data);

export const fetchVehicleTrips = (params) =>
  Api.get('/dashboard/vehicles/trips', { params }).then(r => r.data.data || []);

export const fetchDeliveryBoard = () =>
  Api.get('/dashboard/deliveries').then(r => r.data.data);

export const fetchDeliveryDockets = (params) =>
  Api.get('/dashboard/deliveries/dockets', { params }).then(r => r.data.data || []);

export const fetchRevenueBoard = () =>
  Api.get('/dashboard/revenue').then(r => r.data.data);

export const fetchRevenueDockets = (params) =>
  Api.get('/dashboard/revenue/dockets', { params }).then(r => r.data.data || []);

export const fetchCollectionBoard = () =>
  Api.get('/dashboard/collection').then(r => r.data.data);

export const fetchCollectionBills = (params) =>
  Api.get('/dashboard/collection/bills', { params }).then(r => r.data.data || []);

export const fetchCollectionReceipts = (params) =>
  Api.get('/dashboard/collection/receipts', { params }).then(r => r.data.data || []);

export const fetchOutstandingBoard = () =>
  Api.get('/dashboard/outstanding').then(r => r.data.data);

export const fetchOutstandingBills = (params) =>
  Api.get('/dashboard/outstanding/bills', { params }).then(r => r.data.data || []);

export const fetchHireBoard = () =>
  Api.get('/dashboard/hire').then(r => r.data.data);

export const fetchHireVouchers = (params) =>
  Api.get('/dashboard/hire/vouchers', { params }).then(r => r.data.data || []);

export const fetchEwbBoard = () =>
  Api.get('/dashboard/ewb').then(r => r.data.data);

export const fetchEwbBills = (params) =>
  Api.get('/dashboard/ewb/bills', { params }).then(r => r.data.data || []);
