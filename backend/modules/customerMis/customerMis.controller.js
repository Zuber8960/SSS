const db = require('../../config/db');

/**
 * Customer MIS — a per-shipment MIS view built from live tables.
 *
 * One row per docket, joined to the business-partner master (customer name/code),
 * the location master (origin/destination names) and the latest delivery note
 * (delivery status + actual delivery date). E-way bill numbers are aggregated
 * per docket, and delay days are computed so the frontend only renders.
 */

// Delivery notes can be raised more than once per docket — pick the most recent
// one so the status shown is the latest known state.
//
// NOTE: this is raw SQL with explicit parentheses. A knex subquery builder passed
// to .leftJoin() is emitted WITHOUT wrapping parens ("left join select ..."),
// which Postgres rejects with a syntax error near "select".
const LATEST_DELIVERY_NOTE = db.raw(`(
  SELECT dn.docket_no,
         dn.dly_note_no,
         dn.delivery_status,
         dn.dly_date      AS actual_delivery_date,
         dn.delivery_remarks,
         dn.pod_url,
         COALESCE(dn.record_updated_on, dn.record_created_on) AS delivery_updated_on
    FROM sss.sst_dly_note dn
   WHERE dn.record_id = (
         SELECT MAX(d2.record_id)
           FROM sss.sst_dly_note d2
          WHERE d2.docket_no = dn.docket_no
   )
) as dn`);

/**
 * Base query shared by the list and summary endpoints.
 * Filters: from_date / to_date (LR date), bp_id (customer), search text.
 *
 * Location names are resolved with scalar subqueries rather than joins on
 * ssm_location: loc_code is not guaranteed to be unique there, and a join would
 * duplicate docket rows — inflating COUNT(*) and the SUM() totals.
 */
function buildMisQuery(filters = {}, tenant_id = null) {
  const q = db('sss.sst_docket as d')
    .leftJoin('sss.ssm_business_partner as cnor', 'd.cnor_id', 'cnor.record_id')
    .leftJoin('sss.ssm_business_partner as cnee', 'd.cnee_id', 'cnee.record_id')
    .leftJoin('sss.ssm_business_partner_type as bpt', 'cnor.bp_type', 'bpt.rec_id')
    .leftJoin(LATEST_DELIVERY_NOTE, 'd.docket_no', 'dn.docket_no')
    .where({ 'd.record_status': 0 })
    .select(
      'd.rec_id',
      'd.docket_no',
      'd.docket_date',
      'd.docket_loc',
      'd.docket_pickup_town',
      'd.docket_to_loc',
      'd.docket_dly_town',
      'd.docket_tot_pkgs',
      'd.docket_act_wt',
      'd.docket_chrg_wt',
      'd.docket_rate',
      'd.docket_rate_uom',
      'd.docket_tot_amt',
      'd.docket_load_type',
      'd.docket_transit_type',
      'd.docket_pay_type',
      'd.docket_remark',
      db.raw(`COALESCE(
        (SELECT STRING_AGG(
                  inv.inv_no::text || ' / ' || UPPER(TO_CHAR(inv.inv_date::date, 'DD-MON-YY')),
                  ', ' ORDER BY inv.inv_date, inv.inv_no)
           FROM sss.sst_docket_inv inv
          WHERE inv.docket_no = d.docket_no),
        NULLIF(TRIM(COALESCE(d.docket_inv_no, '')), '')
      ) as docket_inv_no`),
      'd.docket_transit_days',
      // Customer = consignor (falls back to consignee when no consignor is set).
      'cnor.record_id as bp_id',
      db.raw('COALESCE(cnor.bp_name, cnee.bp_name) as bp_name'),
      db.raw('COALESCE(cnor.bp_gstin, cnee.bp_gstin) as bp_gstin'),
      db.raw('COALESCE(cnor.loc_code, cnee.loc_code) as bp_loc_code'),
      // Customer address (consignor first, consignee as fallback).
      db.raw(`TRIM(COALESCE(cnor.bp_addres, cnee.bp_addres, '')
                   || CASE WHEN COALESCE(cnor.bp_city, cnee.bp_city) IS NULL THEN ''
                           ELSE ', ' || COALESCE(cnor.bp_city, cnee.bp_city) END
                   || CASE WHEN COALESCE(cnor.bp_state, cnee.bp_state) IS NULL THEN ''
                           ELSE ', ' || COALESCE(cnor.bp_state, cnee.bp_state) END
                   || CASE WHEN COALESCE(cnor.bp_pincode, cnee.bp_pincode) IS NULL THEN ''
                           ELSE ' - ' || COALESCE(cnor.bp_pincode, cnee.bp_pincode) END) as bp_address`),
      db.raw('COALESCE(cnee.bp_name, cnor.bp_name) as party_name'),
      db.raw('COALESCE(cnee.bp_pincode, cnor.bp_pincode) as pin_code'),
      'bpt.rec_name as bp_type_name',
      // Scalar subqueries (not joins) so a duplicate loc_code can't fan out rows.
      db.raw(`(SELECT fl.loc_name FROM sss.ssm_location fl
                WHERE fl.loc_code = d.docket_loc LIMIT 1) as from_place`),
      db.raw(`(SELECT tl.loc_name FROM sss.ssm_location tl
                WHERE tl.loc_code = d.docket_to_loc LIMIT 1) as to_place`),
      'dn.delivery_status',
      'dn.actual_delivery_date',
      'dn.delivery_remarks',
      'dn.pod_url',
      'dn.dly_note_no',
      'dn.delivery_updated_on',
      // Docket-number series = everything before the trailing counter digits
      // (docket numbers are built as <docket_loc>CN<000001>).
      db.raw(`COALESCE(
                NULLIF(regexp_replace(d.docket_no, '[0-9]+$', ''), ''),
                NULLIF(regexp_replace(d.docket_no, '[0-9]', '', 'g'), ''),
                d.docket_no) as docket_no_series`),
      db.raw(
        `(SELECT STRING_AGG(
                   e.ewb_no::text
                   || CASE WHEN e.ewb_valid_upto IS NULL THEN ''
                           ELSE ' / ' || UPPER(TO_CHAR(e.ewb_valid_upto::date, 'DD-MON-YY')) END,
                   ', ' ORDER BY e.ewb_no)
           FROM sss.sst_docket_ewb e
          WHERE e.docket_no = d.docket_no) as ewb_no`
      ),
      db.raw(
        `(SELECT tz.zone_name FROM sss.ssm_town_zone tz
           WHERE UPPER(TRIM(tz.town_name)) = UPPER(TRIM(COALESCE(d.docket_dly_town, '')))
           LIMIT 1) as region`
      ),
      db.raw(
        `(SELECT dc.charge_amt FROM sss.sst_docket_charges dc
           WHERE dc.docket_no = d.docket_no AND dc.charge_code = 'DK06'
             AND dc.record_status = 0 LIMIT 1) as handling_charge`
      ),
      db.raw(
        `(SELECT dc.charge_amt FROM sss.sst_docket_charges dc
           WHERE dc.docket_no = d.docket_no AND dc.charge_code = 'DK04'
             AND dc.record_status = 0 LIMIT 1) as factory_charge`
      ),
      db.raw(
        `(SELECT id.invoice_no FROM sss.sst_invoice_dtl id
           WHERE id.docket_no = d.docket_no
           ORDER BY id.invoice_date DESC NULLS LAST LIMIT 1) as bill_no`
      ),
      db.raw(
        `(SELECT id.invoice_date FROM sss.sst_invoice_dtl id
           WHERE id.docket_no = d.docket_no
           ORDER BY id.invoice_date DESC NULLS LAST LIMIT 1) as bill_date`
      ),
      db.raw(
        `COALESCE(NULLIF(TRIM(d.veh_no), ''),
          (SELECT h.desp_veh_no FROM sss.sst_mnf_dtl dt
            INNER JOIN sss.sst_mnf_hdr h
              ON h.mnf_no = dt.mnf_no AND h.mnf_loc = dt.mnf_loc AND h.mnf_date = dt.mnf_date
           WHERE dt.dwb_no = d.docket_no
             AND COALESCE(h.desp_veh_no, '') <> ''
           ORDER BY h.mnf_date DESC, h.mnf_no DESC
           LIMIT 1)
        ) as veh_no`
      )
    );

  if (tenant_id) q.andWhere('d.tenant_id', tenant_id);
  if (filters.from_date) q.andWhere('d.docket_date', '>=', filters.from_date);
  if (filters.to_date)   q.andWhere('d.docket_date', '<=', filters.to_date);
  if (filters.bp_id)     q.andWhere(db.raw('COALESCE(cnor.record_id, cnee.record_id)'), filters.bp_id);
  if (filters.delivery_status) q.andWhere('dn.delivery_status', filters.delivery_status);
  if (filters.search) {
    const like = `%${filters.search}%`;
    q.andWhere((b) => b
      .whereILike('d.docket_no', like)
      .orWhereILike('cnor.bp_name', like)
      .orWhereILike('cnee.bp_name', like)
      .orWhereILike('d.docket_pickup_town', like)
      .orWhereILike('d.docket_dly_town', like)
      .orWhereILike('d.docket_inv_no', like)
      .orWhereILike('cnor.bp_addres', like)
      .orWhereILike('cnee.bp_addres', like)
    );
  }
  return q;
}

/** Map a raw DB row to the shape the grid consumes. */
function addDays(date, days) {
  const n = parseInt(days, 10);
  if (!date || !Number.isFinite(n)) return null;
  const d = new Date(date);
  if (isNaN(d)) return null;
  d.setDate(d.getDate() + n);
  return d;
}

function dayDiff(from, to) {
  if (!from || !to) return null;
  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function mapMisRow(r) {
  const estimateDate = addDays(r.docket_date, r.docket_transit_days);
  const tatDays = dayDiff(r.docket_date, r.actual_delivery_date);
  const delayDays = dayDiff(estimateDate, r.actual_delivery_date);
  const loadType = String(r.docket_load_type || "").toUpperCase();
  const rateUom = String(r.docket_rate_uom || "").toUpperCase();
  const rateDisplay = loadType === "FIX" || rateUom === "FIX" ? "FIX" : r.docket_rate;
  return {
    rec_id: r.rec_id,
    docket_no: r.docket_no,
    docket_no_series: r.docket_no_series || "",
    docket_date: r.docket_date,
    docket_inv_no: r.docket_inv_no || "",
    docket_inv_date: r.docket_inv_date,
    bp_id: r.bp_id,
    bp_name: r.bp_name,
    party_name: r.party_name || r.bp_name || "",
    pin_code: r.pin_code || "",
    bp_gstin: r.bp_gstin,
    bp_address: r.bp_address || "",
    bp_type_name: r.bp_type_name,
    bp_loc_code: r.bp_loc_code,
    from_place: r.from_place || r.docket_loc || "",
    to_place: r.to_place || r.docket_to_loc || "",
    from_town: r.docket_pickup_town,
    to_town: r.docket_dly_town,
    docket_tot_pkgs: r.docket_tot_pkgs,
    docket_act_wt: r.docket_act_wt,
    docket_chrg_wt: r.docket_chrg_wt,
    docket_rate: rateDisplay,
    docket_rate_uom: r.docket_rate_uom,
    docket_tot_amt: r.docket_tot_amt,
    docket_load_type: r.docket_load_type,
    docket_transit_type: r.docket_transit_type,
    docket_pay_type: r.docket_pay_type,
    docket_remark: r.docket_remark,
    handling_charge: r.handling_charge || 0,
    factory_charge: r.factory_charge || 0,
    estimate_delivery_date: estimateDate,
    region: r.region || "",
    bill_no: r.bill_no || "",
    bill_date: r.bill_date || null,
    veh_no: r.veh_no || "",
    delivery_status: r.delivery_status,
    actual_delivery_date: r.actual_delivery_date,
    delivery_remarks: r.delivery_remarks,
    delivery_update_date: r.delivery_updated_on || null,
    dly_note_no: r.dly_note_no || "",
    pod_url: r.pod_url,
    ewb_no: r.ewb_no || "NO EWB",
    delay_responsible: r.delivery_remarks || "",
    ewb_date_expiry: r.ewb_date_expiry,
    delivery_tat_days: tatDays,
    delay_days: delayDays,
  };
}

const getCustomerMisList = async (filters = {}, tenant_id = null) => {
  const rows = await buildMisQuery(filters, tenant_id)
    .orderBy('d.docket_date', 'asc')
    .orderBy('d.docket_no', 'asc')
    .limit(filters.limit || 5000);
  return rows.map(mapMisRow);
};

/** Grand totals for the currently filtered set (drives the summary strip). */
const getCustomerMisSummary = async (filters = {}, tenant_id = null) => {
  const [row] = await buildMisQuery(filters, tenant_id)
    .clearSelect()
    .clearOrder()
    .count({ total_shipments: '*' })
    .sum({ total_amount: 'd.docket_tot_amt' })
    .sum({ total_charge_wt: 'd.docket_chrg_wt' })
    .sum({ total_packages: 'd.docket_tot_pkgs' })
    // .count() wraps its argument in COUNT(), which would nest the DISTINCT
    // count — add this one as a raw select instead.
    .select(
      db.raw('COUNT(DISTINCT COALESCE(cnor.record_id, cnee.record_id)) as distinct_customers')
    );

  return {
    total_shipments: Number(row?.total_shipments || 0),
    total_amount: Number(row?.total_amount || 0),
    total_charge_wt: Number(row?.total_charge_wt || 0),
    total_packages: Number(row?.total_packages || 0),
    distinct_customers: Number(row?.distinct_customers || 0),
  };
};

/**
 * Distinct customers that actually appear in the MIS, so the dropdown only
 * offers customers with shipments. `search` narrows it for type-ahead.
 */
const getCustomerMisCustomers = async ({ search } = {}, tenant_id = null) => {
  const q = db('sss.sst_docket as d')
    .leftJoin('sss.ssm_business_partner as cnor', 'd.cnor_id', 'cnor.record_id')
    .leftJoin('sss.ssm_business_partner as cnee', 'd.cnee_id', 'cnee.record_id')
    .where({ 'd.record_status': 0 })
    .select(
      db.raw('COALESCE(cnor.record_id, cnee.record_id) as bp_id'),
      db.raw('COALESCE(cnor.bp_name, cnee.bp_name) as bp_name'),
      db.raw('COALESCE(cnor.bp_grp_code, cnee.bp_grp_code) as bp_grp_code'),
      db.raw('COALESCE(cnor.bp_gstin, cnee.bp_gstin) as bp_gstin'),
      db.raw('COUNT(*) as shipment_count')
    )
    // Every non-aggregated expression in the SELECT must appear in GROUP BY.
    // NOTE: pass an ARRAY — this knex version only honours the first argument
    // when groupBy() is called with multiple positional args.
    .groupBy([
      db.raw('COALESCE(cnor.record_id, cnee.record_id)'),
      db.raw('COALESCE(cnor.bp_name, cnee.bp_name)'),
      db.raw('COALESCE(cnor.bp_grp_code, cnee.bp_grp_code)'),
      db.raw('COALESCE(cnor.bp_gstin, cnee.bp_gstin)'),
    ])
    .orderBy(db.raw('COALESCE(cnor.bp_name, cnee.bp_name)'), 'asc');

  if (tenant_id) q.andWhere('d.tenant_id', tenant_id);
  if (search) {
    const like = `%${search}%`;
    q.andWhere((b) => b
      .whereILike(db.raw('COALESCE(cnor.bp_name, cnee.bp_name)'), like)
      .orWhereILike(db.raw('COALESCE(cnor.bp_grp_code, cnee.bp_grp_code)'), like)
      .orWhereILike(db.raw('COALESCE(cnor.bp_gstin, cnee.bp_gstin)'), like)
    );
  }
  return q.limit(500);
};

/** Min / max LR date, used to bound the From/To pickers. */
const getCustomerMisDateRange = async (tenant_id = null) => {
  const q = db('sss.sst_docket')
    .where({ record_status: 0 })
    .min({ min_date: 'docket_date' })
    .max({ max_date: 'docket_date' });
  if (tenant_id) q.andWhere('tenant_id', tenant_id);
  const [row] = await q;
  return {
    min_date: row?.min_date ? new Date(row.min_date).toISOString().slice(0, 10) : null,
    max_date: row?.max_date ? new Date(row.max_date).toISOString().slice(0, 10) : null,
  };
};

module.exports = {
  getCustomerMisList,
  getCustomerMisSummary,
  getCustomerMisCustomers,
  getCustomerMisDateRange,
};