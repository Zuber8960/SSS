import Api from '../services/Api';

export const fetchAllInvoices = (params = {}) =>
  Api.get('/customerBill', { params }).then((r) => r.data.data || r.data || []);

export const fetchInvoiceByKeys = (invoiceNo, invoiceDate, invoiceLoc) =>
  Api.get(`/customerBill/${encodeURIComponent(invoiceNo)}/${encodeURIComponent(invoiceDate)}/${encodeURIComponent(invoiceLoc)}`)
    .then((r) => r.data.data || r.data || null);

export const fetchInvoiceDetails = (invoiceNo, invoiceDate, invoiceLoc) =>
  Api.get(`/customerBill/${encodeURIComponent(invoiceNo)}/${encodeURIComponent(invoiceDate)}/${encodeURIComponent(invoiceLoc)}/details`)
    .then((r) => r.data.data || r.data || []);

export const saveInvoice = (payload) =>
  Api.post('/customerBill', payload).then((r) => r.data.data || r.data);

export const updateInvoice = (invoiceNo, invoiceDate, invoiceLoc, payload) =>
  Api.put(`/customerBill/${encodeURIComponent(invoiceNo)}/${encodeURIComponent(invoiceDate)}/${encodeURIComponent(invoiceLoc)}`, payload)
    .then((r) => r.data.data || r.data);

export const deleteInvoice = (invoiceNo, invoiceDate, invoiceLoc) =>
  Api.delete(`/customerBill/${encodeURIComponent(invoiceNo)}/${encodeURIComponent(invoiceDate)}/${encodeURIComponent(invoiceLoc)}`)
    .then((r) => r.data);