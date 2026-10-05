/**
 * SRS Job Approval — approve/reject job-card lines.
 *
 * Backed by the backend `/jobApproval` endpoints. A job is addressed by the
 * composite `disp` key (branch>fleet>lorry>job_code>job_date>prop>rm) that the
 * job list returns, so the same key round-trips through getJob and save.
 */
import Api from '../services/Api';

const BASE = '/jobApproval';

const unwrap = (r) => r.data?.data ?? [];

/** GET /jobApproval/branches → [{ branch_code, branchname, region, cntrling }] */
export const fetchJobApprovalBranches = () => Api.get(`${BASE}/branches`).then(unwrap);

/** GET /jobApproval/jobs?branch → [{ disp, job_code, job_branch, job_date, lorry_no, fleet_no }] */
export const fetchJobApprovalJobs = (branch) =>
  Api.get(`${BASE}/jobs`, { params: { branch } }).then(unwrap);

/** GET /jobApproval/job?disp → job header + approval lines */
export const fetchJobApprovalJob = (disp) =>
  Api.get(`${BASE}/job`, { params: { disp } }).then((r) => r.data?.data ?? null);

/** GET /jobApproval/vehicle-cost?lorry_no → per financial-year approved totals */
export const fetchJobApprovalVehicleCost = (lorry_no) =>
  Api.get(`${BASE}/vehicle-cost`, { params: { lorry_no } }).then(unwrap);

/** GET /jobApproval/history?lorry_no → recent approved/rejected job lines */
export const fetchJobApprovalHistory = (lorry_no) =>
  Api.get(`${BASE}/history`, { params: { lorry_no } }).then(unwrap);

/** POST /jobApproval → { success, message, data: { job_code, approved_flag } } */
export const saveJobApproval = (payload) => Api.post(BASE, payload).then((r) => r.data);