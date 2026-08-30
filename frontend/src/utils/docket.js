import Api from '../services/Api';

const TOKEN_KEY = 'authToken';
const hasAuthToken = () => !!localStorage.getItem(TOKEN_KEY);

export const fetchAllDockets = (cnor_cnee) => Api.get(`/docket?cnor_cnee=${cnor_cnee}`).then(r => r.data.data || r.data || []);
export const fetchEwayBill = (ewbLists) => Api.get(`/docket/ewbDetails/${encodeURIComponent(ewbLists)}`).then(r => r.data?.length ? r.data.data : r.data || []);
export const fetchDocketById = (recId) => Api.get(`/user/${recId}`).then(r => r.data.data);
export const fetchDocketByDocketNo = (docketNo) => Api.get(`/docket/${encodeURIComponent(docketNo)}`).then(r => r.data.data || r.data);
export const createDocket = (docketData) => Api.post('/docket', docketData).then(r => r.data.data || r.data);
export const updateDocket = (docketNo, data) => Api.put(`/docket/${encodeURIComponent(docketNo)}`, data).then(r => r.data.data || r.data);
export const updateDocketByRecId = (recId, data, docketNo) => Api.put(`/docket/rec/${encodeURIComponent(recId)}?docketNo=${encodeURIComponent(docketNo)}`, data).then(r => r.data.data || r.data);
export const getDocketByRecId = (recId, docketNo) => {
  if (!hasAuthToken() && docketNo) {
    return Api.get(`/public/docket/${encodeURIComponent(docketNo)}`).then(r => r.data.data || r.data);
  }
  return Api.get(`/docket/rec/${encodeURIComponent(recId)}?docketNo=${docketNo ? encodeURIComponent(docketNo) :''}`).then(r => r.data.data || r.data);
};

export const fetchChargeMaster = () => Api.get('/docket/charge-master').then(r => r.data.data || r.data || []);
export const fetchCharges = (docketId) => Api.get(`/docket/${docketId}/charges`).then(r => r.data.data || r.data || []);
export const createCharge = (docketId, data) => Api.post(`/docket/${docketId}/charges`, data).then(r => r.data.data || r.data);
export const updateCharge = (chargeId, data) => Api.put(`/docket/charges/${chargeId}`, data).then(r => r.data.data || r.data);
export const deleteCharge = (chargeId) => Api.delete(`/docket/charges/${chargeId}`).then(r => r.data);

export const fetchEwayBillFromDB = (ewbNumbers) => Api.get(`/docket/ewayfile/db/${encodeURIComponent(ewbNumbers?.join(','))}`);
export const saveEwayBillToDB = (ewbData) => Api.post('/docket/ewayfile/db', ewbData).then(r => r.data.data || r.data || []);
export const updateEwayBillByRecId = (recId, data) => Api.put(`/docket/ewayfile/db/${encodeURIComponent(recId)}`, data).then(r => r.data.data || r.data);
export const fetchAllEwayBillsFromDB = () => Api.get('/docket/ewayfile/db').then(r => r.data.data || r.data || []);
export const findOrCreateBp = (payload) => Api.post('/docket/bp/find-or-create', payload).then(r => r.data);
