import Api from '../services/Api';

export const fetchAllHireVouchers = () =>
  Api.get('/hireVoucher').then(r => r.data.data || r.data || []);

export const fetchHireVoucherByNo = (hvNo) =>
  Api.get(`/hireVoucher/by-no/${encodeURIComponent(hvNo)}`).then(r => r.data.data || r.data);

export const fetchNextHireVoucherNo = () =>
  Api.get('/hireVoucher/next-no').then(r => r.data.data || r.data);

export const createHireVoucher = (header, details) =>
  Api.post('/hireVoucher', { header, details }).then(r => r.data);

export const updateHireVoucher = (hvNo, hvLoc, hvDate, header, details) =>
  Api.put(`/hireVoucher/${encodeURIComponent(hvNo)}/${encodeURIComponent(hvLoc)}/${encodeURIComponent(hvDate)}`, { header, details }).then(r => r.data);

export const deleteHireVoucher = (hvNo, hvLoc, hvDate) =>
  Api.delete(`/hireVoucher/${encodeURIComponent(hvNo)}/${encodeURIComponent(hvLoc)}/${encodeURIComponent(hvDate)}`).then(r => r.data);

export const fetchVendorByLorryNo = (lorryNo) =>
  Api.get(`/hireVoucher/vendor/${encodeURIComponent(lorryNo)}`).then(r => r.data.data || r.data);