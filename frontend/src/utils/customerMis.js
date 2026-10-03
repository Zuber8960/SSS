/**
 * Customer MIS data source — live API calls (no bundled data).
 *
 * The report is served from the backend `/customerMis` endpoints, which join
 * sst_docket with the business-partner master, the location master and the
 * latest delivery note. Filtering (date From/To, customer, search) is pushed to
 * SQL so only the matching rows come back.
 */
import Api from '../services/Api';

const unwrap = (res) => res.data?.data ?? [];

/** Build a querystring, dropping empty values. */
const qs = (params = {}) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

/** MIS rows for the given filters. */
export const fetchCustomerMisData = (filters = {}) =>
  Api.get(`/customerMis${qs(filters)}`).then(unwrap);

/** Totals for the same filter set (drives the summary strip). */
export const fetchCustomerMisSummary = (filters = {}) =>
  Api.get(`/customerMis/summary${qs(filters)}`)
    .then((r) => r.data?.data ?? { total_shipments: 0, total_amount: 0, total_charge_wt: 0, total_packages: 0, distinct_customers: 0 });

/** Distinct customers for the dropdown, as { bp_id, bp_name, bp_grp_code, bp_gstin }. */
export const fetchCustomerMisCustomers = (search = '') =>
  Api.get(`/customerMis/customers${qs({ search })}`).then(unwrap);

/** Min / max LR date in the data set, used to bound the date inputs. */
export const fetchCustomerMisDateRange = () =>
  Api.get('/customerMis/date-range')
    .then((r) => r.data?.data ?? { min_date: null, max_date: null });