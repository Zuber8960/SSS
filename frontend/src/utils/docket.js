import Api from '../services/Api';

export const fetchAllDockets        = ()                  => Api.get('/docket').then(r => r.data.data || r.data || []);
export const fetchEwayBill          = (ewbLists)          => Api.get(`/docket/ewbDetails/${encodeURIComponent(ewbLists)}`).then(r => r.data?.length ? r.data.data : r.data || []);
export const fetchDocketById        = (recId)             => Api.get(`/user/${recId}`).then(r => r.data.data);
export const fetchDocketByDocketNo  = (docketNo)          => Api.get(`/docket/${encodeURIComponent(docketNo)}`).then(r => r.data.data || r.data);
export const createDocket           = (docketData)        => Api.post('/docket', docketData).then(r => r.data.data || r.data);
export const updateDocket           = (docketNo, data)    => Api.put(`/docket/${encodeURIComponent(docketNo)}`, data).then(r => r.data.data || r.data);
export const updateDocketByRecId    = (recId, data)       => Api.put(`/docket/rec/${encodeURIComponent(recId)}`, data).then(r => r.data.data || r.data);

export const fetchCharges           = (docketId)          => Api.get(`/docket/${docketId}/charges`).then(r => r.data.data || r.data || []);
export const createCharge           = (docketId, data)    => Api.post(`/docket/${docketId}/charges`, data).then(r => r.data.data || r.data);
export const updateCharge           = (chargeId, data)    => Api.put(`/docket/charges/${chargeId}`, data).then(r => r.data.data || r.data);
export const deleteCharge           = (chargeId)          => Api.delete(`/docket/charges/${chargeId}`).then(r => r.data);

export const fetchEwayBillFromDB    = (ewbNumbers)        => Api.get(`/docket/ewayfile/db/${encodeURIComponent(ewbNumbers?.join(','))}`);
export const saveEwayBillToDB       = (ewbData)           => Api.post('/docket/ewayfile/db', ewbData).then(r => r.data.data || r.data || []);
export const updateEwayBillByRecId  = (recId, data)       => Api.put(`/docket/ewayfile/db/${encodeURIComponent(recId)}`, data).then(r => r.data.data || r.data);
export const fetchAllEwayBillsFromDB = ()                 => Api.get('/docket/ewayfile/db').then(r => r.data.data || r.data || []);
