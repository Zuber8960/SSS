import Api from '../services/Api';

export const fetchDashboardStats = () =>
  Api.get('/dashboard/stats').then(r => r.data.data);
