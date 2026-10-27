import Api from '../services/Api';

export const fetchMrBanks = () =>
  Api.get('/moneyReceipt/banks').then((r) => r.data.data || []);

export const fetchOutstandingInvoices = (params) =>
  Api.get('/moneyReceipt/outstanding', { params }).then((r) => r.data.data || []);

export const fetchMoneyReceiptByNumber = (mrNo, locCode) =>
  Api.get(`/moneyReceipt/by-number/${encodeURIComponent(mrNo)}`, {
    params: locCode ? { loc_code: locCode } : {},
  }).then((r) => r.data.data || null);

export const saveMoneyReceipt = (payload) =>
  Api.post('/moneyReceipt', payload).then((r) => r.data.data || r.data);

export const deleteMoneyReceipt = (mrNo, mrDate, locCode) =>
  Api.delete(`/moneyReceipt/${encodeURIComponent(mrNo)}/${encodeURIComponent(mrDate)}/${encodeURIComponent(locCode)}`)
    .then((r) => r.data);
