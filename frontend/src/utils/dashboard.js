import Api from '../services/Api';

export const fetchDashboardStats = () =>
  Api.get('/dashboard/stats').then(r => {
    return r.data.data
  });
