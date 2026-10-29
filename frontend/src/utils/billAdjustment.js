import Api from "../services/Api";

const partyParams = (p = {}) => ({
  loc_code: p.loc_code,
  bp_code: p.bp_code,
  bp_name: p.bp_name,
  bp_id: p.bp_id,
});

export const fetchOpenReceipts = (params) =>
  Api.get("/billAdjustment/receipts", { params: partyParams(params) }).then((r) => r.data.data || []);

export const fetchOpenBills = (params) =>
  Api.get("/billAdjustment/bills", { params: partyParams(params) }).then((r) => r.data.data || []);

export const saveBillAdjustment = (payload) =>
  Api.post("/billAdjustment", payload).then((r) => r.data.data || r.data);
