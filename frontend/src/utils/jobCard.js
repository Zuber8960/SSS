/**
 * Job Card Creation — fleet service job cards (SRS).
 *
 * Backed by the backend `/jobCard` endpoints. The job number is allocated
 * server-side from the ssm_doc_series 'SRS' series for the branch.
 */
import Api from '../services/Api';

const BASE = '/jobCard';

const unwrap = (r) => r.data?.data ?? [];

/** GET /jobCard/lorries?loc_code → [{ vehicle_no, branch, fleet_no, make, label }] */
export const fetchJobCardLorries = (loc_code) =>
  Api.get(`${BASE}/lorries`, { params: { loc_code: loc_code || undefined } }).then(unwrap);

/** GET /jobCard/lorry/:lorryNo?loc_code → vehicle details + peeked job code + last km */
export const lookupJobCardLorry = (lorryNo, loc_code) =>
  Api.get(`${BASE}/lorry/${encodeURIComponent(lorryNo)}`, {
    params: { loc_code: loc_code || undefined },
  }).then((r) => r.data?.data ?? null);

/** GET /jobCard/next-no?loc_code → { job_code } */
export const fetchNextJobNo = (loc_code) =>
  Api.get(`${BASE}/next-no`, { params: { loc_code } }).then((r) => r.data?.data ?? null);

/** GET /jobCard/history?lorry_no → recent job lines for the vehicle */
export const fetchJobCardHistory = (lorry_no) =>
  Api.get(`${BASE}/history`, { params: { lorry_no } }).then(unwrap);

/** POST /jobCard → { success, message, data: { job_code, ... } } */
export const saveJobCard = (payload) => Api.post(BASE, payload).then((r) => r.data);