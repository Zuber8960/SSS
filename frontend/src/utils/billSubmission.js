/**
 * Bill Submission — submit pending invoices (Bill) or a bill annexure (Annexure).
 *
 * Backed by the backend `/billSubmission` endpoints. Saving stamps
 * sst_invoice_hdr.inv_sub_date and writes an audit row in sst_bill_submission.
 */
import Api from '../services/Api';

const BASE = '/billSubmission';

const unwrap = (r) => r.data?.data ?? [];

/** GET /billSubmission/pending?loc_code&bp_code&submit_type&annexure_no */
export const fetchPendingBills = (params = {}) =>
  Api.get(`${BASE}/pending`, { params }).then(unwrap);

/** GET /billSubmission/annexures?loc_code&bp_code → [{ annexure_no, from_date, label }] */
export const fetchBillAnnexures = (params = {}) =>
  Api.get(`${BASE}/annexures`, { params }).then(unwrap);

/** POST /billSubmission → { success, message, data: { saved } } */
export const saveBillSubmission = (payload) => Api.post(BASE, payload).then((r) => r.data);