const db = require('../../config/db');

const getDashboardStats = async (tenant_id) => {
  const today = new Date().toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [
    totalRow,
    payTypeCounts,
    dailyCounts,
    lorryRow,
    bpRow,
    inTransitDocketRow,
    undeliveredRow,
    deliveredRow,
    deliveredNotBilledRow,
    inTransitVehiclesRow,
    waitingForDispatchRow,
    ewbExpiringTodayRow,
    manifestCompletedRow,
    manifestInTransitRow,
  ] = await Promise.all([
    // 1. Total dockets booked
    db('sss.sst_docket')
      .where({ tenant_id, record_status: 0 })
      .count('rec_id as count')
      .then(r => r[0]),

    // Pay type breakdown (for donut chart)
    db('sss.sst_docket')
      .where({ tenant_id, record_status: 0 })
      .select('docket_pay_type')
      .count('rec_id as count')
      .groupBy('docket_pay_type'),

    // Daily counts last 30 days (for bar chart)
    db('sss.sst_docket')
      .where({ tenant_id, record_status: 0 })
      .andWhere('docket_date', '>=', thirtyDaysAgoStr)
      .select(db.raw('DATE(docket_date) as day'))
      .count('rec_id as count')
      .groupByRaw('DATE(docket_date)')
      .orderBy('day', 'asc'),

    // Total lorries
    db('sss.ssm_vehicle_master')
      .where({ tenant_id })
      .count('rec_id as count')
      .then(r => r[0]),

    // Total business partners
    db('sss.ssm_business_partner')
      .where({ tenant_id })
      .count('record_id as count')
      .then(r => r[0]),

    // 2. In transit dockets — dockets linked to a manifest that hasn't arrived yet
    db('sss.sst_mnf_dtl as md')
      .join('sss.sst_mnf_hdr as mh', function () {
        this.on('mh.mnf_no', 'md.mnf_no')
          .andOn('mh.mnf_loc', 'md.mnf_loc')
          .andOn('mh.mnf_date', 'md.mnf_date');
      })
      .where('mh.tenant_id', tenant_id)
      .where('mh.record_status', 0)
      .whereNull('mh.mnf_arrival_time')
      .countDistinct('md.dwb_no as count')
      .then(r => r[0]),

    // 3. Undelivered dockets — packages not yet fully dispatched
    db('sss.sst_docket')
      .where({ tenant_id, record_status: 0 })
      .whereRaw('docket_tot_pkgs - desp_pkgs > 0')
      .count('rec_id as count')
      .then(r => r[0]),

    // 4. Delivered dockets — all packages dispatched
    db('sss.sst_docket')
      .where({ tenant_id, record_status: 0 })
      .whereRaw('desp_pkgs >= docket_tot_pkgs AND docket_tot_pkgs > 0')
      .count('rec_id as count')
      .then(r => r[0]),

    // 5. Delivered but not billed — delivered + pay type is TO PAY (freight not yet collected)
    db('sss.sst_docket')
      .where({ tenant_id, record_status: 0 })
      .whereRaw('desp_pkgs >= docket_tot_pkgs AND docket_tot_pkgs > 0')
      .where('docket_pay_type', 'TO PAY')
      .count('rec_id as count')
      .then(r => r[0]),

    // 6. In transit vehicles — distinct vehicles on open manifests
    db('sss.sst_mnf_hdr')
      .where({ tenant_id, record_status: 0 })
      .whereNull('mnf_arrival_time')
      .whereNotNull('desp_veh_no')
      .countDistinct('desp_veh_no as count')
      .then(r => r[0]),

    // 7. Waiting for dispatch — packages received at branch but not yet re-dispatched
    db('sss.sst_unloading_dtl as ud')
      .join('sss.sst_docket as d', function () {
        this.on('d.docket_no', 'ud.docket_no')
          .andOn('d.docket_date', 'ud.docket_date')
          .andOn('d.docket_loc', 'ud.docket_from_loc');
      })
      .where('d.tenant_id', tenant_id)
      .where('d.record_status', 0)
      .whereRaw('ud.pkgs_received - ud.desp_pkgs > 0')
      .countDistinct('ud.docket_no as count')
      .then(r => r[0]),

    // 8. EWB expiring today
    db('sss.sst_docket_ewb')
      .where({ tenant_id })
      .whereRaw('DATE(ewb_valid_upto) = ?', [today])
      .count('rec_id as count')
      .then(r => r[0]),

    // 9. Manifests completed (arrived)
    db('sss.sst_mnf_hdr')
      .where({ tenant_id, record_status: 0 })
      .whereNotNull('mnf_arrival_time')
      .count('mnf_no as count')
      .then(r => r[0]),

    // 10. Manifests in transit (not yet arrived)
    db('sss.sst_mnf_hdr')
      .where({ tenant_id, record_status: 0 })
      .whereNull('mnf_arrival_time')
      .count('mnf_no as count')
      .then(r => r[0]),
  ]);

  return {
    totalDockets: Number(totalRow?.count || 0),
    inTransitDockets: Number(inTransitDocketRow?.count || 0),
    undeliveredDockets: Number(undeliveredRow?.count || 0),
    deliveredDockets: Number(deliveredRow?.count || 0),
    deliveredNotBilled: Number(deliveredNotBilledRow?.count || 0),
    inTransitVehicles: Number(inTransitVehiclesRow?.count || 0),
    waitingForDispatch: Number(waitingForDispatchRow?.count || 0),
    ewbExpiringToday: Number(ewbExpiringTodayRow?.count || 0),
    manifestCompleted: Number(manifestCompletedRow?.count || 0),
    manifestInTransit: Number(manifestInTransitRow?.count || 0),
    statusCounts: payTypeCounts.map(r => ({
      status: r.docket_pay_type || 'Other',
      count: Number(r.count),
    })),
    dailyCounts: dailyCounts.map(r => ({ day: r.day, count: Number(r.count) })),
    totalLorries: Number(lorryRow?.count || 0),
    totalBusinessPartners: Number(bpRow?.count || 0),
  };
};

const fmtL = (num) => {
  const n = Number(num || 0);
  if (n === 0) return '₹0';
  return `₹${(n / 100000).toFixed(1)}L`;
};

const getDashboardOverview = async (tenant_id) => {
  const today = new Date().toISOString().split('T')[0];

  const [
    docketsRow, inTransitRow, undeliveredRow, deliveredRow, pickupDoneRow,
    pickupPendingRow, waitingForDispatchRow, ewbRow,
    vehOwnRow, vehTotalRow,
    invoiceAgg, unsubmittedAgg, docketAmtAgg,
  ] = await Promise.all([
    // Total dockets booked
    db('sss.sst_docket').where({ tenant_id, record_status: 0 }).count('rec_id as count').then(r => r[0]),

    // In transit dockets (on open manifests)
    db('sss.sst_mnf_dtl as md')
      .join('sss.sst_mnf_hdr as mh', function () {
        this.on('mh.mnf_no', 'md.mnf_no')
          .andOn('mh.mnf_loc', 'md.mnf_loc')
          .andOn('mh.mnf_date', 'md.mnf_date');
      })
      .where('mh.tenant_id', tenant_id)
      .where('mh.record_status', 0)
      .whereNull('mh.mnf_arrival_time')
      .countDistinct('md.dwb_no as count')
      .then(r => r[0]),

    // Undelivered dockets
    db('sss.sst_docket').where({ tenant_id, record_status: 0 })
      .whereRaw('docket_tot_pkgs - desp_pkgs > 0').count('rec_id as count').then(r => r[0]),

    // Delivered dockets
    db('sss.sst_docket').where({ tenant_id, record_status: 0 })
      .whereRaw('desp_pkgs >= docket_tot_pkgs AND docket_tot_pkgs > 0').count('rec_id as count').then(r => r[0]),

    // Pickup done — dockets with at least one package dispatched
    db('sss.sst_docket').where({ tenant_id, record_status: 0 })
      .whereRaw('desp_pkgs > 0').count('rec_id as count').then(r => r[0]),

    // Pickup pending — no packages dispatched yet
    db('sss.sst_docket').where({ tenant_id, record_status: 0 })
      .whereRaw('desp_pkgs = 0').count('rec_id as count').then(r => r[0]),

    // Waiting for dispatch
    db('sss.sst_docket').where({ tenant_id, record_status: 0 })
      .whereRaw('docket_tot_pkgs - desp_pkgs > 0 AND desp_pkgs = 0').count('rec_id as count').then(r => r[0]),

    // EWB expiring today
    db('sss.sst_docket_ewb').where({ tenant_id })
      .whereRaw('DATE(ewb_valid_upto) = ?', [today]).count('rec_id as count').then(r => r[0]),

    // Own vehicles registered in the vehicle master
    db('sss.ssm_vehicle_master').where({ tenant_id }).count('rec_id as count').then(r => r[0]),

    // Total vehicles engaged across manifests (own + market)
    db('sss.sst_mnf_hdr').where({ tenant_id, record_status: 0 })
      .whereNotNull('desp_veh_no').countDistinct('desp_veh_no as count').then(r => r[0]),

    // Billing totals — submitted invoices (billed)
    db('sss.sst_invoice_hdr as ih')
      .where('ih.tenant_id', tenant_id)
      .whereNotNull('ih.inv_sub_date')
      .whereRaw("COALESCE(UPPER(TRIM(ih.cancel_flag::text)), '') NOT IN ('Y','C','1','TRUE')")
      .sum('ih.total_inv_amt as amt')
      .count('ih.invoice_no as count')
      .then(r => r[0]),

    // Unsubmitted invoices
    db('sss.sst_invoice_hdr as ih')
      .where('ih.tenant_id', tenant_id)
      .whereNull('ih.inv_sub_date')
      .whereRaw("COALESCE(UPPER(TRIM(ih.cancel_flag::text)), '') NOT IN ('Y','C','1','TRUE')")
      .sum('ih.total_inv_amt as amt')
      .then(r => r[0]),

    // Total docket freight value
    db('sss.sst_docket').where({ tenant_id, record_status: 0 })
      .sum('docket_tot_amt as amt').then(r => r[0]),
  ]);

  const totalDockets = Number(docketsRow?.count || 0);
  const delivered = Number(deliveredRow?.count || 0);
  const undelivered = Number(undeliveredRow?.count || 0);
  const pickupDone = Number(pickupDoneRow?.count || 0);
  const pickupPending = Number(pickupPendingRow?.count || 0);
  const inTransit = Number(inTransitRow?.count || 0);
  const billedAmt = Number(invoiceAgg?.amt || 0);
  const unsubmittedAmt = Number(unsubmittedAgg?.amt || 0);
  const billedCount = Number(invoiceAgg?.count || 0);
  const totalAmt = Number(docketAmtAgg?.amt || 0);
  const deliveryRate = totalDockets ? ((delivered / totalDockets) * 100).toFixed(1) + '%' : '0%';
  const realisedAmt = billedAmt; // submitted invoices = realised amount

  /* ---------- Vehicle performance: own vs market ---------- */
  const ownVehRows = await db('sss.ssm_vehicle_master')
    .where({ tenant_id }).select('lry_regis_no');
  const ownVehNo = new Set(
    ownVehRows.map(r => String(r.lry_regis_no).trim().toUpperCase()).filter(Boolean)
  );

  const vehRows = await db('sss.sst_mnf_hdr')
    .where({ tenant_id, record_status: 0 })
    .whereNotNull('desp_veh_no')
    .select('desp_veh_no', db.raw('(mnf_arrival_time IS NOT NULL) as arrived'));

  const vehAgg = { own: { transit: 0, arrived: 0 }, market: { transit: 0, arrived: 0 } };
  const seenVeh = new Set();
  for (const r of vehRows) {
    const key = String(r.desp_veh_no).trim().toUpperCase();
    const bucket = ownVehNo.has(key) ? 'own' : 'market';
    const seenKey = bucket + key;
    if (!seenVeh.has(seenKey)) {
      seenVeh.add(seenKey);
      if (r.arrived) vehAgg[bucket].arrived += 1;
      else vehAgg[bucket].transit += 1;
    }
  }

  const perf = {
    own: {
      title: 'Own Vehicles',
      rows: [
        ['In Transit', vehAgg.own.transit, null],
        ['Arrived', vehAgg.own.arrived, null],
        ['Total Fleet', Number(vehOwnRow?.count || 0), null],
      ],
    },
    market: {
      title: 'Market / Vendor Vehicles',
      rows: [
        ['In Transit', vehAgg.market.transit, null],
        ['Arrived', vehAgg.market.arrived, null],
        ['Engaged', Number(vehTotalRow?.count || 0), null],
      ],
    },
  };


  /* ---------- Customer wise analysis ---------- */
  /* Paid -> consignor. To Pay -> consignee. TBB follows the customer bill:
     same from and to, consignee CMF Y and consignor CMF not Y -> consignee, else consignor. */
  const customerRows = await db.raw(`
    WITH asof AS (
      SELECT (timezone('Asia/Kolkata', now()))::date AS today
    ),
    bounds AS (
      SELECT
        today,
        date_trunc('month', today)::date AS month_start,
        (date_trunc('month', today) - interval '1 month')::date AS last_start,
        CASE WHEN EXTRACT(MONTH FROM today) >= 4
             THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
             ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
        END AS fy_start
      FROM asof
    ),
    dkt AS (
      SELECT
        CASE
          WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) IN ('TO PAY', 'TOPAY', 'TO-PAY') THEN d.cnee_id
          WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) IN ('PAID', 'PAID BASIS') THEN d.cnor_id
          WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) IN ('', 'TBB')
           AND UPPER(TRIM(SPLIT_PART(COALESCE(d.docket_loc::text, ''), ' - ', 1))) <> ''
           AND UPPER(TRIM(SPLIT_PART(COALESCE(d.docket_loc::text, ''), ' - ', 1)))
               = UPPER(TRIM(SPLIT_PART(COALESCE(d.docket_to_loc::text, ''), ' - ', 1)))
           AND UPPER(TRIM(COALESCE(cnee.cmf_flag, ''))) IN ('Y', 'YES', '1')
           AND UPPER(TRIM(COALESCE(cnor.cmf_flag, ''))) NOT IN ('Y', 'YES', '1')
            THEN d.cnee_id
          ELSE d.cnor_id
        END AS party_id,
        d.docket_date::date AS ddt,
        CASE WHEN UPPER(TRIM(COALESCE(d.docket_load_type, ''))) = 'FTL' THEN 'FTL' ELSE 'PTL' END AS lane,
        ROUND(COALESCE(d.docket_tot_amt, 0), 2) AS amt,
        COALESCE(note.delivered, FALSE) AS delivered,
        (bill.billed IS NOT NULL) AS billed
      FROM sss.sst_docket d
      CROSS JOIN bounds b
      LEFT JOIN sss.ssm_business_partner cnor ON cnor.record_id = d.cnor_id
      LEFT JOIN sss.ssm_business_partner cnee ON cnee.record_id = d.cnee_id
      LEFT JOIN LATERAL (
        SELECT LOWER(TRIM(COALESCE(dn.delivery_status, ''))) = 'delivered' AS delivered
          FROM sss.sst_dly_note dn
         WHERE dn.docket_no = d.docket_no
         ORDER BY dn.record_id DESC
         LIMIT 1
      ) note ON TRUE
      LEFT JOIN LATERAL (
        SELECT 1 AS billed
          FROM sss.sst_invoice_dtl dtl
          JOIN sss.sst_invoice_hdr h
            ON CAST(h.invoice_no AS INTEGER) = CAST(dtl.invoice_no AS INTEGER)
           AND CAST(h.invoice_date AS DATE) = CAST(dtl.invoice_date AS DATE)
           AND UPPER(TRIM(h.loc_code::text)) = UPPER(TRIM(dtl.invoice_loc::text))
         WHERE dtl.docket_no = d.docket_no
           AND COALESCE(UPPER(TRIM(h.cancel_flag::text)), '') NOT IN ('Y', 'C', '1', 'TRUE')
         LIMIT 1
      ) bill ON TRUE
      WHERE d.tenant_id = ?
        AND d.record_status = 0
        AND d.docket_date IS NOT NULL
        AND (
          (d.docket_date::date >= b.fy_start AND d.docket_date::date <= b.today)
          OR (d.docket_date::date >= b.last_start AND d.docket_date::date < b.month_start)
        )
    ),
    bill_age AS (
      SELECT
        TRIM(h.bp_code::text) AS code,
        (b.today - h.invoice_date::date) AS age,
        (h.inv_sub_date IS NOT NULL) AS submitted,
        ROUND(COALESCE(h.total_inv_amt, 0)::numeric, 2) AS bill_amt,
        LEAST(
          ROUND(COALESCE(h.total_inv_amt, 0)::numeric, 2),
          ROUND(COALESCE(adj.adj_amt, 0) + COALESCE(paid.paid_amt, 0), 2)
        ) AS realised
      FROM sss.sst_invoice_hdr h
      CROSS JOIN bounds b
      LEFT JOIN LATERAL (
        SELECT SUM(COALESCE(d.adj_amt, 0)) AS adj_amt
          FROM sss.sst_bill_adj_dtl d
         WHERE UPPER(TRIM(d.invoice_no::text)) = UPPER(TRIM(h.invoice_no::text))
           AND d.invoice_date::date = h.invoice_date::date
           AND UPPER(TRIM(COALESCE(d.invoice_loc, ''))) = UPPER(TRIM(h.loc_code::text))
      ) adj ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(COALESCE(r.received_amt, 0)) AS paid_amt
          FROM sss.sst_mr_dtl r
         WHERE NULLIF(TRIM(r.invoice_no::text), '') IS NOT NULL
           AND TRIM(r.invoice_no::text) <> '0'
           AND UPPER(TRIM(r.invoice_no::text)) = UPPER(TRIM(h.invoice_no::text))
           AND r.invoice_date::date = h.invoice_date::date
           AND UPPER(TRIM(COALESCE(r.invoice_loc, ''))) = UPPER(TRIM(h.loc_code::text))
      ) paid ON TRUE
      WHERE (h.tenant_id = ? OR (? = 1 AND h.tenant_id IS NULL))
        AND COALESCE(UPPER(TRIM(h.cancel_flag::text)), '') NOT IN ('Y', 'C', '1', 'TRUE')
        AND h.invoice_date::date >= b.fy_start
        AND h.invoice_date::date <= b.today
    ),
    bill_sum AS (
      SELECT
        code,
        COUNT(*) AS prepared_nos,
        COALESCE(SUM(bill_amt), 0) AS prepared_amt,
        COUNT(*) FILTER (WHERE submitted) AS submitted_nos,
        COALESCE(SUM(bill_amt) FILTER (WHERE submitted), 0) AS submitted_amt,
        COALESCE(SUM(GREATEST(bill_amt - realised, 0)) FILTER (WHERE age <= 30), 0) AS os30,
        COALESCE(SUM(GREATEST(bill_amt - realised, 0)) FILTER (WHERE age BETWEEN 31 AND 60), 0) AS os60,
        COALESCE(SUM(GREATEST(bill_amt - realised, 0)) FILTER (WHERE age BETWEEN 61 AND 90), 0) AS os90,
        COALESCE(SUM(GREATEST(bill_amt - realised, 0)) FILTER (WHERE age >= 91), 0) AS os_over
      FROM bill_age
      GROUP BY code
    ),
    mr_sum AS (
      SELECT
        TRIM(h.bp_code::text) AS code,
        COUNT(*) AS nos,
        COALESCE(SUM(ROUND(COALESCE(h.received_amt, 0)::numeric, 2)), 0) AS amt
      FROM sss.sst_mr_hdr h
      CROSS JOIN bounds b
      WHERE h.tenant_id = ?
        AND h.mr_date::date >= b.fy_start
        AND h.mr_date::date <= b.today
      GROUP BY TRIM(h.bp_code::text)
    )
    SELECT
      bp.record_id, bp.bp_grp_code, bp.bp_name, bp.loc_code,
      COUNT(*) FILTER (WHERE d.ddt >= b.last_start AND d.ddt < b.month_start AND d.lane = 'FTL') AS last_ftl_nos,
      COALESCE(SUM(d.amt) FILTER (WHERE d.ddt >= b.last_start AND d.ddt < b.month_start AND d.lane = 'FTL'), 0) AS last_ftl_amt,
      COUNT(*) FILTER (WHERE d.ddt >= b.last_start AND d.ddt < b.month_start AND d.lane = 'PTL') AS last_ptl_nos,
      COALESCE(SUM(d.amt) FILTER (WHERE d.ddt >= b.last_start AND d.ddt < b.month_start AND d.lane = 'PTL'), 0) AS last_ptl_amt,
      COUNT(*) FILTER (WHERE d.ddt >= b.month_start AND d.ddt <= b.today AND d.lane = 'FTL') AS month_ftl_nos,
      COALESCE(SUM(d.amt) FILTER (WHERE d.ddt >= b.month_start AND d.ddt <= b.today AND d.lane = 'FTL'), 0) AS month_ftl_amt,
      COUNT(*) FILTER (WHERE d.ddt >= b.month_start AND d.ddt <= b.today AND d.lane = 'PTL') AS month_ptl_nos,
      COALESCE(SUM(d.amt) FILTER (WHERE d.ddt >= b.month_start AND d.ddt <= b.today AND d.lane = 'PTL'), 0) AS month_ptl_amt,
      COUNT(*) FILTER (WHERE d.ddt >= b.fy_start AND d.ddt <= b.today AND d.lane = 'FTL') AS fy_ftl_nos,
      COALESCE(SUM(d.amt) FILTER (WHERE d.ddt >= b.fy_start AND d.ddt <= b.today AND d.lane = 'FTL'), 0) AS fy_ftl_amt,
      COUNT(*) FILTER (WHERE d.ddt >= b.fy_start AND d.ddt <= b.today AND d.lane = 'PTL') AS fy_ptl_nos,
      COALESCE(SUM(d.amt) FILTER (WHERE d.ddt >= b.fy_start AND d.ddt <= b.today AND d.lane = 'PTL'), 0) AS fy_ptl_amt,
      COUNT(*) FILTER (WHERE NOT d.delivered) AS undelivered,
      COUNT(*) FILTER (WHERE NOT d.billed) AS unbilled,
      COALESCE(MAX(bs.prepared_nos), 0) AS prepared_nos,
      COALESCE(MAX(bs.prepared_amt), 0) AS prepared_amt,
      COALESCE(MAX(bs.submitted_nos), 0) AS submitted_nos,
      COALESCE(MAX(bs.submitted_amt), 0) AS submitted_amt,
      COALESCE(MAX(ms.nos), 0) AS receipt_nos,
      COALESCE(MAX(ms.amt), 0) AS receipt_amt,
      COALESCE(MAX(bs.os30), 0) AS os30,
      COALESCE(MAX(bs.os60), 0) AS os60,
      COALESCE(MAX(bs.os90), 0) AS os90,
      COALESCE(MAX(bs.os_over), 0) AS os_over
    FROM sss.ssm_business_partner bp
    JOIN dkt d ON d.party_id = bp.record_id
    CROSS JOIN bounds b
    LEFT JOIN bill_sum bs ON bs.code = TRIM(bp.bp_grp_code::text)
    LEFT JOIN mr_sum ms ON ms.code = TRIM(bp.bp_grp_code::text)
    WHERE bp.tenant_id = ?
    GROUP BY bp.record_id, bp.bp_grp_code, bp.bp_name, bp.loc_code, b.today, b.month_start, b.last_start, b.fy_start
    ORDER BY COALESCE(SUM(d.amt) FILTER (WHERE d.ddt >= b.fy_start AND d.ddt <= b.today), 0) DESC
    LIMIT 50
  `, [tenant_id, tenant_id, tenant_id, tenant_id, tenant_id]);

  const customers = (customerRows.rows || []).map(r => {
    const fyAmt = Number(r.fy_ftl_amt || 0) + Number(r.fy_ptl_amt || 0);
    const nos = (value) => Number(value || 0);
    return {
      name: r.bp_name || '-',
      bpId: r.record_id ?? '',
      bpCode: r.bp_grp_code || '-',
      locCode: r.loc_code || '-',
      lastFtlAmt: fmtL(r.last_ftl_amt),
      lastFtlNos: nos(r.last_ftl_nos),
      lastPtlAmt: fmtL(r.last_ptl_amt),
      lastPtlNos: nos(r.last_ptl_nos),
      monthFtlAmt: fmtL(r.month_ftl_amt),
      monthFtlNos: nos(r.month_ftl_nos),
      monthPtlAmt: fmtL(r.month_ptl_amt),
      monthPtlNos: nos(r.month_ptl_nos),
      fyFtlAmt: fmtL(r.fy_ftl_amt),
      fyFtlNos: nos(r.fy_ftl_nos),
      fyPtlAmt: fmtL(r.fy_ptl_amt),
      fyPtlNos: nos(r.fy_ptl_nos),
      undelivered: nos(r.undelivered),
      unbilled: nos(r.unbilled),
      preparedNos: nos(r.prepared_nos),
      preparedAmt: fmtL(r.prepared_amt),
      submittedNos: nos(r.submitted_nos),
      submittedAmt: fmtL(r.submitted_amt),
      receiptNos: nos(r.receipt_nos),
      receiptAmt: fmtL(r.receipt_amt),
      os30: fmtL(r.os30),
      os60: fmtL(r.os60),
      os90: fmtL(r.os90),
      osOver: fmtL(r.os_over),
      total: fyAmt,
      totalLabel: fmtL(fyAmt),
    };
  });

  /* ---------- Vendor wise analysis (hire vouchers) ---------- */
  const vendorRows = await db.raw(`
    WITH asof AS (
      SELECT (timezone('Asia/Kolkata', now()))::date AS today
    ),
    bounds AS (
      SELECT
        today,
        date_trunc('month', today)::date AS month_start,
        (date_trunc('month', today) - interval '1 month')::date AS last_start,
        CASE WHEN EXTRACT(MONTH FROM today) >= 4
             THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
             ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
        END AS fy_start
      FROM asof
    ),
    hdr AS (
      SELECT
        vh.vendor_name,
        vh.tenant_id,
        vh.vha_no,
        vh.vha_loc,
        vh.vha_date,
        vh.vha_date::date AS vdt,
        NULLIF(TRIM(vh.vehicle_regis_no), '') AS vehicle_regis_no,
        ROUND(COALESCE(vh.vha_total_amt, 0)::numeric, 2) AS total_amt,
        ROUND(COALESCE(vh.vha_advance_total, 0)::numeric, 2) AS paid,
        ROUND(COALESCE(vh.vha_tds_amt, 0)::numeric, 2) AS deductions
      FROM sss.sst_vha_hdr vh
      CROSS JOIN bounds b
      WHERE (vh.tenant_id = ? OR (? = 1 AND vh.tenant_id IS NULL))
        AND vh.record_status = 0
        AND vh.vendor_name IS NOT NULL AND TRIM(vh.vendor_name) <> ''
        AND (
          (vh.vha_date::date >= b.fy_start AND vh.vha_date::date <= b.today)
          OR (vh.vha_date::date >= b.last_start AND vh.vha_date::date < b.month_start)
        )
    ),
    trips AS (
      SELECT
        h.vendor_name,
        h.vdt,
        vd.mnf_no,
        BOOL_OR(mh.mnf_arrival_time IS NOT NULL) AS arrived
      FROM hdr h
      JOIN sss.sst_vha_dtl vd
        ON vd.vha_no = h.vha_no AND vd.vha_loc = h.vha_loc AND vd.vha_date = h.vha_date
      LEFT JOIN sss.sst_mnf_hdr mh
        ON mh.mnf_no = vd.mnf_no
       AND mh.record_status = 0
       AND mh.tenant_id = COALESCE(h.tenant_id, ?)
      WHERE vd.mnf_no IS NOT NULL
      GROUP BY h.vendor_name, h.vdt, vd.mnf_no
    ),
    hire_sum AS (
      SELECT
        h.vendor_name,
        COUNT(DISTINCT h.vehicle_regis_no)::int AS engaged,
        COALESCE(SUM(h.total_amt) FILTER (WHERE h.vdt >= b.last_start AND h.vdt < b.month_start), 0) AS last_hire,
        COALESCE(SUM(h.paid) FILTER (WHERE h.vdt >= b.last_start AND h.vdt < b.month_start), 0) AS last_paid,
        COALESCE(SUM(h.deductions) FILTER (WHERE h.vdt >= b.last_start AND h.vdt < b.month_start), 0) AS last_deductions,
        COALESCE(SUM(h.total_amt) FILTER (WHERE h.vdt >= b.month_start AND h.vdt <= b.today), 0) AS month_hire,
        COALESCE(SUM(h.paid) FILTER (WHERE h.vdt >= b.month_start AND h.vdt <= b.today), 0) AS month_paid,
        COALESCE(SUM(h.deductions) FILTER (WHERE h.vdt >= b.month_start AND h.vdt <= b.today), 0) AS month_deductions,
        COALESCE(SUM(h.total_amt) FILTER (WHERE h.vdt >= b.fy_start AND h.vdt <= b.today), 0) AS fy_hire,
        COALESCE(SUM(h.paid) FILTER (WHERE h.vdt >= b.fy_start AND h.vdt <= b.today), 0) AS fy_paid,
        COALESCE(SUM(h.deductions) FILTER (WHERE h.vdt >= b.fy_start AND h.vdt <= b.today), 0) AS fy_deductions
      FROM hdr h
      CROSS JOIN bounds b
      GROUP BY h.vendor_name
    ),
    trip_sum AS (
      SELECT
        t.vendor_name,
        COUNT(DISTINCT t.mnf_no) FILTER (WHERE t.vdt >= b.last_start AND t.vdt < b.month_start)::int AS last_trips,
        COUNT(DISTINCT t.mnf_no) FILTER (WHERE t.vdt >= b.last_start AND t.vdt < b.month_start AND t.arrived)::int AS last_arrived,
        COUNT(DISTINCT t.mnf_no) FILTER (WHERE t.vdt >= b.month_start AND t.vdt <= b.today)::int AS month_trips,
        COUNT(DISTINCT t.mnf_no) FILTER (WHERE t.vdt >= b.month_start AND t.vdt <= b.today AND t.arrived)::int AS month_arrived,
        COUNT(DISTINCT t.mnf_no) FILTER (WHERE t.vdt >= b.fy_start AND t.vdt <= b.today)::int AS fy_trips,
        COUNT(DISTINCT t.mnf_no) FILTER (WHERE t.vdt >= b.fy_start AND t.vdt <= b.today AND t.arrived)::int AS fy_arrived
      FROM trips t
      CROSS JOIN bounds b
      GROUP BY t.vendor_name
    )
    SELECT
      h.vendor_name,
      h.engaged,
      h.last_hire, h.last_paid, h.last_deductions,
      h.month_hire, h.month_paid, h.month_deductions,
      h.fy_hire, h.fy_paid, h.fy_deductions,
      COALESCE(t.last_trips, 0) AS last_trips,
      COALESCE(t.last_arrived, 0) AS last_arrived,
      COALESCE(t.month_trips, 0) AS month_trips,
      COALESCE(t.month_arrived, 0) AS month_arrived,
      COALESCE(t.fy_trips, 0) AS fy_trips,
      COALESCE(t.fy_arrived, 0) AS fy_arrived
    FROM hire_sum h
    LEFT JOIN trip_sum t ON t.vendor_name = h.vendor_name
    ORDER BY h.fy_hire DESC
    LIMIT 50
  `, [tenant_id, tenant_id, tenant_id]);

  const vendorPeriod = (prefix, row) => {
    const trips = Number(row[`${prefix}_trips`] || 0);
    const arrived = Number(row[`${prefix}_arrived`] || 0);
    const hire = Number(row[`${prefix}_hire`] || 0);
    const paid = Number(row[`${prefix}_paid`] || 0);
    return {
      [`${prefix}OnTime`]: arrived,
      [`${prefix}Delayed`]: Math.max(trips - arrived, 0),
      [`${prefix}Safe`]: arrived,
      [`${prefix}Remarked`]: 0,
      [`${prefix}Trips`]: trips,
      [`${prefix}Hire`]: fmtL(hire),
      [`${prefix}Paid`]: fmtL(paid),
      [`${prefix}Balance`]: fmtL(hire - paid),
      [`${prefix}Deductions`]: fmtL(row[`${prefix}_deductions`]),
    };
  };

  const vendors = (vendorRows.rows || []).map(r => {
    const fyTrips = Number(r.fy_trips || 0);
    const fyArrived = Number(r.fy_arrived || 0);
    const rating = fyTrips ? (3 + 2 * (fyArrived / fyTrips)).toFixed(1) : '0.0';
    return {
      name: r.vendor_name,
      type: 'Vendor',
      pan: '-',
      gstin: '-',
      location: '-',
      engaged: Number(r.engaged || 0),
      ...vendorPeriod('last', r),
      ...vendorPeriod('month', r),
      ...vendorPeriod('fy', r),
      total: Number(r.fy_hire || 0),
      totalHire: fmtL(r.fy_hire),
      rating: `${rating} / 5`,
    };
  });

  const orders = await getOrderBoard(tenant_id);
  const despatches = await getDespatchBoard(tenant_id);

  return {
    kpis: [
      { label: 'In Transit', value: inTransit.toLocaleString('en-IN'), sub: 'On open manifests', tone: 'blue', accent: 'blue', Icon: 'LocalShipping' },
      { label: 'Delivered', value: delivered.toLocaleString('en-IN'), sub: `${deliveryRate} delivery rate`, tone: 'green', accent: 'purple', Icon: 'CheckCircle' },
      { label: 'Billing Submitted', value: fmtL(billedAmt), sub: `${billedCount} invoices`, tone: 'green', accent: 'violet', Icon: 'ReceiptLong' },
      { label: 'Realised', value: fmtL(realisedAmt), sub: 'Against submitted bills', tone: 'blue', accent: 'blue', Icon: 'AccountBalanceWallet' },
    ],
    ops: [
      { title: 'Pickup', accent: 'purple', Icon: 'ShoppingBag', rows: [['Orders Placed', totalDockets.toLocaleString('en-IN')], ['Pickup Done', pickupDone.toLocaleString('en-IN')], ['Pending', pickupPending.toLocaleString('en-IN'), '#ea580c']] },
      { title: 'Dockets', accent: 'blue', Icon: 'Inventory2', rows: [['Booked', totalDockets.toLocaleString('en-IN')], ['Waiting for Dispatch', Number(waitingForDispatchRow?.count || 0).toLocaleString('en-IN')], ['In Transit (Vehicle)', inTransit.toLocaleString('en-IN')]] },
      { title: 'Undelivered', accent: 'orange', Icon: 'CancelScheduleSend', rows: [['Undelivered Dockets', undelivered.toLocaleString('en-IN')], ['EWB Expiring Today', Number(ewbRow?.count || 0).toLocaleString('en-IN')], ['Delivered Not Billed', fmtL(Math.max(totalAmt - billedAmt, 0))]] },
      { title: 'Delivered', accent: 'green', Icon: 'AssignmentTurnedIn', rows: [['Delivered', delivered.toLocaleString('en-IN')], ['Undelivered', undelivered.toLocaleString('en-IN'), '#dc2626'], ['Delivery Rate', deliveryRate]] },
      { title: 'Billing & Realisation', accent: 'violet', Icon: 'Receipt', rows: [['Submitted', fmtL(billedAmt)], ['Unsubmitted', fmtL(unsubmittedAmt), '#ea580c'], ['Realised', fmtL(realisedAmt)]] },
    ],
    perf,
    customers,
    vendors,
    orders,
    despatches,
    vehicles: await getVehicleBoard(tenant_id),
    deliveries: await getDeliveryBoard(tenant_id),
    revenue: await getRevenueBoard(tenant_id),
    collection: await getCollectionBoard(tenant_id),
    outstanding: await getOutstandingBoard(tenant_id),
    hire: await getHireBoard(tenant_id),
    ewb: await getEwbBoard(tenant_id),
  };
};

const getInTransitVehicleLocations = async (tenant_id) => {
  return db.raw(`
    SELECT DISTINCT ON (scygd.vehicle_no)
        scygd.id, scygd.vehicle_no, scygd.latitude, scygd.longitude
    FROM sss.sst_cargo_yaan_gps_data scygd
    WHERE scygd.vehicle_no IN (
        SELECT desp_veh_no
        FROM sss.sst_mnf_hdr
        WHERE tenant_id = ?
          AND record_status = 0
          AND mnf_arrival_time IS NULL
          AND desp_veh_no IS NOT NULL
    )
    ORDER BY scygd.vehicle_no, scygd.id DESC
  `, [tenant_id]).then(r => r.rows);
};

const getInTransitDockets = async (tenant_id) => {
  return db('sss.sst_mnf_dtl as md')
    .join('sss.sst_mnf_hdr as mh', function () {
      this.on('mh.mnf_no', 'md.mnf_no')
        .andOn('mh.mnf_loc', 'md.mnf_loc')
        .andOn('mh.mnf_date', 'md.mnf_date');
    })
    .join('sss.sst_docket as d', 'd.docket_no', 'md.dwb_no')
    .leftJoin('sss.ssm_business_partner as cnor', 'cnor.record_id', 'd.cnor_id')
    .leftJoin('sss.ssm_business_partner as cnee', 'cnee.record_id', 'd.cnee_id')
    .where('mh.tenant_id', tenant_id)
    .where('mh.record_status', 0)
    .whereNull('mh.mnf_arrival_time')
    .select(
      'd.docket_no',
      'd.docket_date',
      'd.docket_loc',
      'd.docket_pickup_town',
      'd.docket_to_loc',
      'd.docket_dly_town',
      'd.docket_pay_type',
      'd.docket_tot_pkgs',
      'd.docket_act_wt',
      'd.docket_chrg_wt',
      'd.docket_tot_amt',
      'd.docket_load_type',
      'd.desp_pkgs',
      'd.docket_goods_desc',
      'cnor.bp_name as cnor_name',
      'cnee.bp_name as cnee_name',
      'mh.mnf_no',
      'mh.desp_veh_no',
      'mh.mnf_loc as mnf_from_loc',
      'mh.mnf_to_loc',
    )
    .orderBy('d.docket_date', 'desc');
};

const ORDER_PERIODS = [
  ['today', 'ddt = asof.today'],
  ['week', 'ddt >= asof.today - 6'],
  ['month', "ddt >= date_trunc('month', asof.today)::date"],
  ['fy', 'TRUE'],
];
const ORDER_LANES = ['FTL', 'PTL'];
const ORDER_METRICS = [
  ['total', 'TRUE'],
  ['ontime', 'placed AND on_time'],
  ['delay', 'placed AND NOT on_time'],
  ['pend_same', 'NOT placed AND ddt = asof.today'],
  ['pend_last', 'NOT placed AND ddt = asof.today - 1'],
  ['pend_over', 'NOT placed AND ddt <= asof.today - 2'],
];

const PLACE_DATE_SQL = `(
        SELECT MIN(mh.mnf_date)::date
          FROM sss.sst_mnf_dtl md
          JOIN sss.sst_mnf_hdr mh
            ON mh.mnf_no = md.mnf_no AND mh.mnf_loc = md.mnf_loc AND mh.mnf_date = md.mnf_date
         WHERE md.dwb_no = d.docket_no
           AND mh.tenant_id = d.tenant_id
           AND mh.record_status = 0
      )`;

const orderBoardSql = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  fy AS (
    SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
           END AS start,
           today
      FROM asof
  ),
  base AS (
    SELECT
      d.docket_date::date AS ddt,
      CASE WHEN UPPER(TRIM(COALESCE(d.docket_load_type, ''))) = 'FTL' THEN 'FTL' ELSE 'PTL' END AS lane,
      (${PLACE_DATE_SQL} IS NOT NULL) AS placed,
      (
        ${PLACE_DATE_SQL} IS NOT NULL
        AND ${PLACE_DATE_SQL} <= d.docket_date::date
      ) AS on_time
    FROM sss.sst_docket d
    CROSS JOIN fy
    WHERE d.tenant_id = ?
      AND d.record_status = 0
      AND d.docket_date::date >= fy.start
      AND d.docket_date::date <= fy.today
  )
`;

const laneBucket = (row, period, lane) => {
  const key = `${period}_${lane.toLowerCase()}_`;
  const num = (name) => Number(row?.[`${key}${name}`] || 0);
  const pending = {
    same: num('pend_same'),
    last: num('pend_last'),
    over: num('pend_over'),
  };
  pending.total = pending.same + pending.last + pending.over;
  const onTime = num('ontime');
  const delay = num('delay');
  return { total: num('total'), placed: onTime + delay, onTime, delay, pending };
};

const getOrderBoard = async (tenant_id) => {
  const selects = ORDER_PERIODS.flatMap(([period, periodSql]) =>
    ORDER_LANES.flatMap((lane) =>
      ORDER_METRICS.map(([metric, metricSql]) =>
        `COUNT(*) FILTER (WHERE ${periodSql} AND lane = '${lane}' AND ${metricSql})::int AS ${period}_${lane.toLowerCase()}_${metric}`
      )
    )
  ).join(',\n');
  const result = await db.raw(`
    ${orderBoardSql}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN base ON TRUE
  `, [tenant_id]);
  const row = result.rows?.[0] || {};
  const labels = { today: 'Today', week: 'Last 7 days', month: 'This month', fy: 'This FY' };
  const periods = ORDER_PERIODS.map(([key]) => {
    const ftl = laneBucket(row, key, 'FTL');
    const ptl = laneBucket(row, key, 'PTL');
    return { key, label: labels[key], ftl, ptl, total: ftl.total + ptl.total };
  });
  const fyYear = Number(row.fy_year || 0);
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods,
  };
};

const ORDER_PERIOD_SQL = {
  today: 'd.docket_date::date = (SELECT today FROM asof)',
  week: 'd.docket_date::date >= (SELECT today FROM asof) - 6',
  month: "d.docket_date::date >= date_trunc('month', (SELECT today FROM asof))::date",
  fy: 'TRUE',
};
const ORDER_LANE_SQL = {
  FTL: "UPPER(TRIM(COALESCE(d.docket_load_type, ''))) = 'FTL'",
  PTL: "UPPER(TRIM(COALESCE(d.docket_load_type, ''))) <> 'FTL'",
  all: 'TRUE',
};
const ORDER_SLICE_SQL = {
  all: 'TRUE',
  placed: "placement LIKE 'Placed%'",
  ontime: "placement = 'Placed · on time'",
  delay: "placement = 'Placed · delay'",
  pending: "placement LIKE 'Pending%'",
  pend_same: "placement = 'Pending · same day'",
  pend_last: "placement = 'Pending · last day'",
  pend_over: "placement = 'Pending · > 2 days'",
};

const getOrderDockets = async (tenant_id, { period = 'fy', lane = 'all', slice = 'all' } = {}) => {
  const periodSql = ORDER_PERIOD_SQL[period];
  const laneSql = ORDER_LANE_SQL[lane];
  const sliceSql = ORDER_SLICE_SQL[slice];
  if (!periodSql || !laneSql || !sliceSql) {
    const error = new Error('Unknown order slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    WITH asof AS (
      SELECT (timezone('Asia/Kolkata', now()))::date AS today
    ),
    fy AS (
      SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                  THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                  ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
             END AS start,
             today
        FROM asof
    ),
    base AS (
      SELECT
        d.docket_no,
        to_char(d.docket_date::date, 'YYYY-MM-DD') AS docket_date,
        d.docket_loc,
        d.docket_to_loc,
        d.docket_pickup_town,
        d.docket_dly_town,
        CASE WHEN UPPER(TRIM(COALESCE(d.docket_load_type, ''))) = 'FTL' THEN 'FTL' ELSE 'PTL' END AS lane,
        d.docket_tot_pkgs,
        d.desp_pkgs,
        d.docket_act_wt,
        cnor.bp_name AS cnor_name,
        cnee.bp_name AS cnee_name,
        to_char(${PLACE_DATE_SQL}, 'YYYY-MM-DD') AS place_date,
        (
          ${PLACE_DATE_SQL} IS NOT NULL
          AND ${PLACE_DATE_SQL} <= d.docket_date::date
        ) AS on_time,
        CASE
          WHEN ${PLACE_DATE_SQL} IS NULL AND d.docket_date::date = (SELECT today FROM asof) THEN 'Pending · same day'
          WHEN ${PLACE_DATE_SQL} IS NULL AND d.docket_date::date = (SELECT today FROM asof) - 1 THEN 'Pending · last day'
          WHEN ${PLACE_DATE_SQL} IS NULL THEN 'Pending · > 2 days'
          WHEN ${PLACE_DATE_SQL} <= d.docket_date::date THEN 'Placed · on time'
          ELSE 'Placed · delay'
        END AS placement
      FROM sss.sst_docket d
      CROSS JOIN fy
      LEFT JOIN sss.ssm_business_partner cnor ON cnor.record_id = d.cnor_id
      LEFT JOIN sss.ssm_business_partner cnee ON cnee.record_id = d.cnee_id
      WHERE d.tenant_id = ?
        AND d.record_status = 0
        AND d.docket_date::date >= fy.start
        AND d.docket_date::date <= fy.today
        AND ${periodSql}
        AND ${laneSql}
    )
    SELECT * FROM base
    WHERE ${sliceSql}
    ORDER BY docket_date DESC, docket_no DESC
    LIMIT 1000
  `, [tenant_id]);
  return result.rows || [];
};

const DESPATCH_SOURCES = ['origin', 'hub', 'dest'];
const DESPATCH_BUCKETS = ['same', 'next', 'after', 'd1', 'd2', 'over'];

const DESPATCH_FLAGGED_SQL = `
  flagged AS (
    SELECT
      d.docket_no,
      to_char(d.docket_date::date, 'YYYY-MM-DD') AS docket_date,
      d.docket_date::date AS ddt,
      d.docket_loc,
      d.docket_to_loc,
      d.docket_pickup_town,
      d.docket_dly_town,
      CASE WHEN UPPER(TRIM(COALESCE(d.docket_load_type, ''))) = 'FTL' THEN 'FTL' ELSE 'PTL' END AS lane,
      d.docket_tot_pkgs,
      d.desp_pkgs,
      d.docket_act_wt,
      cnor.bp_name AS cnor_name,
      cnee.bp_name AS cnee_name,
      moves.origin_date,
      moves.hub_date,
      moves.dest_date,
      COALESCE(moves.open_origin, FALSE) AS open_origin,
      COALESCE(moves.open_hub, FALSE) AS open_hub,
      COALESCE(moves.open_dest, FALSE) AS open_dest,
      COALESCE(stops.at_hub, FALSE) AS at_hub,
      stops.hub_ready,
      COALESCE(stops.at_dest, FALSE) AS at_dest,
      stops.dest_ready
    FROM sss.sst_docket d
    CROSS JOIN fy
    LEFT JOIN sss.ssm_business_partner cnor ON cnor.record_id = d.cnor_id
    LEFT JOIN sss.ssm_business_partner cnee ON cnee.record_id = d.cnee_id
    LEFT JOIN LATERAL (
      SELECT
        MIN(mh.mnf_date) FILTER (
          WHERE LOWER(TRIM(COALESCE(mh.mnf_type, ''))) <> 'ld'
            AND UPPER(TRIM(COALESCE(mh.mnf_loc, ''))) = UPPER(TRIM(COALESCE(d.docket_loc, '')))
        )::date AS origin_date,
        MIN(mh.mnf_date) FILTER (
          WHERE LOWER(TRIM(COALESCE(mh.mnf_type, ''))) <> 'ld'
            AND UPPER(TRIM(COALESCE(mh.mnf_loc, ''))) <> UPPER(TRIM(COALESCE(d.docket_loc, '')))
            AND UPPER(TRIM(COALESCE(mh.mnf_loc, ''))) <> UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
        )::date AS hub_date,
        MIN(mh.mnf_date) FILTER (
          WHERE LOWER(TRIM(COALESCE(mh.mnf_type, ''))) = 'ld'
        )::date AS dest_date,
        BOOL_OR(
          mh.mnf_arrival_time IS NULL
          AND LOWER(TRIM(COALESCE(mh.mnf_type, ''))) <> 'ld'
          AND UPPER(TRIM(COALESCE(mh.mnf_loc, ''))) = UPPER(TRIM(COALESCE(d.docket_loc, '')))
        ) AS open_origin,
        BOOL_OR(
          mh.mnf_arrival_time IS NULL
          AND LOWER(TRIM(COALESCE(mh.mnf_type, ''))) <> 'ld'
          AND UPPER(TRIM(COALESCE(mh.mnf_loc, ''))) <> UPPER(TRIM(COALESCE(d.docket_loc, '')))
          AND UPPER(TRIM(COALESCE(mh.mnf_loc, ''))) <> UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
        ) AS open_hub,
        BOOL_OR(
          mh.mnf_arrival_time IS NULL
          AND LOWER(TRIM(COALESCE(mh.mnf_type, ''))) = 'ld'
        ) AS open_dest
      FROM sss.sst_mnf_dtl md
      JOIN sss.sst_mnf_hdr mh
        ON mh.mnf_no = md.mnf_no AND mh.mnf_loc = md.mnf_loc AND mh.mnf_date = md.mnf_date
      WHERE md.dwb_no = d.docket_no
        AND mh.tenant_id = d.tenant_id
        AND mh.record_status = 0
    ) moves ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        BOOL_OR(
          COALESCE(u.pkgs_received, 0) > COALESCE(u.desp_pkgs, 0)
          AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) <> UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
          AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) <> UPPER(TRIM(COALESCE(d.docket_loc, '')))
        ) AS at_hub,
        MIN(u.arrival_date) FILTER (
          WHERE UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) <> UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
            AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) <> UPPER(TRIM(COALESCE(d.docket_loc, '')))
        )::date AS hub_ready,
        BOOL_OR(
          COALESCE(u.pkgs_received, 0) > COALESCE(u.desp_pkgs, 0)
          AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) = UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
          AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) <> UPPER(TRIM(COALESCE(d.docket_loc, '')))
        ) AS at_dest,
        MIN(u.arrival_date) FILTER (
          WHERE UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) = UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
            AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) <> UPPER(TRIM(COALESCE(d.docket_loc, '')))
        )::date AS dest_ready
      FROM sss.sst_unloading_dtl u
      WHERE u.docket_no = d.docket_no
    ) stops ON TRUE
    WHERE d.tenant_id = ?
      AND d.record_status = 0
      AND d.docket_date::date <= fy.today
      AND (
        d.docket_date::date >= fy.start
        OR EXISTS (
          SELECT 1
            FROM sss.sst_unloading_dtl u
           WHERE u.docket_no = d.docket_no
             AND u.arrival_date::date >= fy.start
             AND u.arrival_date::date <= fy.today
             AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) <> UPPER(TRIM(COALESCE(d.docket_loc, '')))
        )
      )
  )
`;

const DESPATCH_LEG_SQL = `
  CASE
    WHEN dest_date IS NOT NULL OR open_dest THEN 'dest_sent'
    WHEN open_hub THEN 'hub_sent'
    WHEN open_origin THEN 'origin_sent'
    WHEN at_dest THEN 'dest_wait'
    WHEN at_hub THEN 'hub_wait'
    WHEN hub_date IS NOT NULL THEN 'hub_sent'
    WHEN origin_date IS NOT NULL THEN 'origin_sent'
    ELSE 'origin_wait'
  END
`;

const DESPATCH_BUCKET_SQL = `
  CASE
    WHEN leg = 'origin_wait' AND (SELECT today FROM asof) - ddt <= 1 THEN 'd1'
    WHEN leg = 'origin_wait' AND (SELECT today FROM asof) - ddt = 2 THEN 'd2'
    WHEN leg = 'origin_wait' THEN 'over'
    WHEN leg = 'origin_sent' AND COALESCE(origin_date, ddt) - ddt <= 0 THEN 'same'
    WHEN leg = 'origin_sent' AND COALESCE(origin_date, ddt) - ddt = 1 THEN 'next'
    WHEN leg = 'origin_sent' THEN 'after'
    WHEN leg = 'hub_wait' AND hub_ready IS NOT NULL AND (SELECT today FROM asof) - hub_ready <= 1 THEN 'd1'
    WHEN leg = 'hub_wait' AND hub_ready IS NOT NULL AND (SELECT today FROM asof) - hub_ready = 2 THEN 'd2'
    WHEN leg = 'hub_wait' THEN 'over'
    WHEN leg = 'dest_wait' AND dest_ready IS NOT NULL AND (SELECT today FROM asof) - dest_ready <= 1 THEN 'd1'
    WHEN leg = 'dest_wait' AND dest_ready IS NOT NULL AND (SELECT today FROM asof) - dest_ready = 2 THEN 'd2'
    WHEN leg = 'dest_wait' THEN 'over'
    WHEN leg = 'dest_sent' AND dest_ready IS NOT NULL AND dest_date IS NOT NULL AND dest_date - dest_ready <= 0 THEN 'same'
    WHEN leg = 'dest_sent' AND dest_ready IS NOT NULL AND dest_date - dest_ready = 1 THEN 'next'
    WHEN leg = 'dest_sent' AND dest_ready IS NOT NULL THEN 'after'
    WHEN leg = 'dest_sent' AND dest_date IS NOT NULL AND dest_date - ddt <= 0 THEN 'same'
    WHEN leg = 'dest_sent' AND dest_date IS NOT NULL AND dest_date - ddt = 1 THEN 'next'
    WHEN leg = 'dest_sent' THEN 'after'
    WHEN leg = 'hub_sent' AND hub_ready IS NOT NULL AND hub_date IS NOT NULL AND hub_date - hub_ready <= 0 THEN 'same'
    WHEN leg = 'hub_sent' AND hub_ready IS NOT NULL AND hub_date - hub_ready = 1 THEN 'next'
    ELSE 'after'
  END
`;

const despatchBoardSql = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  fy AS (
    SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
           END AS start,
           today
      FROM asof
  ),
  ${DESPATCH_FLAGGED_SQL},
  legged AS (
    SELECT *, ${DESPATCH_LEG_SQL} AS leg
      FROM flagged
  ),
  base AS (
    SELECT *,
           CASE
             WHEN leg IN ('origin_wait', 'origin_sent') THEN 'origin'
             WHEN leg IN ('dest_wait', 'dest_sent') THEN 'dest'
             ELSE 'hub'
           END AS source,
           ${DESPATCH_BUCKET_SQL} AS bucket,
           CASE
             WHEN origin_date IS NULL AND (SELECT today FROM asof) - ddt <= 1 THEN 'd1'
             WHEN origin_date IS NULL AND (SELECT today FROM asof) - ddt = 2 THEN 'd2'
             WHEN origin_date IS NULL THEN 'over'
             WHEN origin_date - ddt <= 0 THEN 'same'
             WHEN origin_date - ddt = 1 THEN 'next'
             ELSE 'after'
           END AS origin_bucket
      FROM legged
  )
`;

const fillDespatchSide = (counts) => {
  const side = { ...counts };
  side.despatched = side.same + side.next + side.after;
  side.undespatched = side.d1 + side.d2 + side.over;
  side.total = side.despatched + side.undespatched;
  return side;
};

const despatchLane = (row, period, lane) => {
  const prefix = `${period}_${lane.toLowerCase()}_`;
  const num = (name) => Number(row?.[`${prefix}${name}`] || 0);
  const side = (source) => fillDespatchSide({
    same: num(`${source}_same`),
    next: num(`${source}_next`),
    after: num(`${source}_after`),
    d1: num(`${source}_d1`),
    d2: num(`${source}_d2`),
    over: num(`${source}_over`),
  });
  const origin = side('origin');
  const hub = side('hub');
  const dest = side('dest');
  return { origin, hub, dest, total: origin.total };
};

const DESPATCH_SLAB_PERIODS = ['today', 'week', 'month', 'fy'];

const despatchDateExpr = (source) => (
  source === 'hub' ? 'hub_ready' : source === 'dest' ? 'COALESCE(dest_ready, dest_date)' : 'ddt'
);

const despatchPeriodSql = (period, dateExpr) => {
  const today = '(SELECT today FROM asof)';
  const start = '(SELECT start FROM fy)';
  if (period === 'today') return `${dateExpr} = ${today}`;
  if (period === 'week') return `${dateExpr} >= ${today} - 6 AND ${dateExpr} <= ${today}`;
  if (period === 'month') return `${dateExpr} >= date_trunc('month', ${today})::date AND ${dateExpr} <= ${today}`;
  return `${dateExpr} >= ${start} AND ${dateExpr} <= ${today}`;
};

const getDespatchBoard = async (tenant_id) => {
  const selects = DESPATCH_SLAB_PERIODS.flatMap((period) =>
    ORDER_LANES.flatMap((lane) =>
      DESPATCH_SOURCES.flatMap((source) =>
        DESPATCH_BUCKETS.map((bucket) =>
          `COUNT(*) FILTER (WHERE ${despatchPeriodSql(period, despatchDateExpr(source))} AND lane = '${lane}' AND ${source === 'origin' ? 'TRUE' : `source = '${source}'`} AND ${source === 'origin' ? 'origin_bucket' : 'bucket'} = '${bucket}')::int AS ${period}_${lane.toLowerCase()}_${source}_${bucket}`
        )
      )
    )
  ).join(',\n');
  const result = await db.raw(`
    ${despatchBoardSql}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN base ON TRUE
  `, [tenant_id]);
  const row = result.rows?.[0] || {};
  const labels = { today: 'Today', week: 'Last 7 days', month: 'This month', fy: 'This FY' };
  const periods = DESPATCH_SLAB_PERIODS.map((key) => {
    const ftl = despatchLane(row, key, 'FTL');
    const ptl = despatchLane(row, key, 'PTL');
    return { key, label: labels[key], ftl, ptl, total: ftl.total + ptl.total };
  });
  const fyYear = Number(row.fy_year || 0);
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods,
  };
};

const despatchListPeriodSql = (period, slice) => {
  if (slice === 'hub' || slice.startsWith('hub_')) return despatchPeriodSql(period, 'hub_ready');
  if (slice === 'dest' || slice.startsWith('dest_')) return despatchPeriodSql(period, 'COALESCE(dest_ready, dest_date)');
  if (slice === 'all') return despatchPeriodSql(period, 'ddt');
  return despatchPeriodSql(period, 'ddt');
};

const DESPATCH_LANE_SQL = {
  FTL: "lane = 'FTL'",
  PTL: "lane = 'PTL'",
  all: 'TRUE',
};
const DESPATCH_SLICE_SQL = {
  all: 'TRUE',
  origin: 'TRUE',
  hub: "source = 'hub'",
  dest: "source = 'dest'",
  origin_sent: "origin_bucket IN ('same','next','after')",
  origin_wait: "origin_bucket IN ('d1','d2','over')",
  hub_sent: "source = 'hub' AND bucket IN ('same','next','after')",
  hub_wait: "source = 'hub' AND bucket IN ('d1','d2','over')",
  dest_sent: "source = 'dest' AND bucket IN ('same','next','after')",
  dest_wait: "source = 'dest' AND bucket IN ('d1','d2','over')",
};
DESPATCH_SOURCES.forEach((source) => {
  DESPATCH_BUCKETS.forEach((bucket) => {
    DESPATCH_SLICE_SQL[`${source}_${bucket}`] = source === 'origin'
      ? `origin_bucket = '${bucket}'`
      : `source = '${source}' AND bucket = '${bucket}'`;
  });
});

const getDespatchDockets = async (tenant_id, { period = 'fy', lane = 'all', slice = 'all' } = {}) => {
  const periodSql = DESPATCH_SLAB_PERIODS.includes(period) ? despatchListPeriodSql(period, slice) : null;
  const laneSql = DESPATCH_LANE_SQL[lane];
  const sliceSql = DESPATCH_SLICE_SQL[slice];
  if (!periodSql || !laneSql || !sliceSql) {
    const error = new Error('Unknown despatch slice');
    error.status = 400;
    throw error;
  }
  const originSlice = slice === 'all' || slice === 'origin' || slice.startsWith('origin_');
  const result = await db.raw(`
    ${despatchBoardSql}
    SELECT
      docket_no, docket_date, docket_loc, docket_to_loc, docket_pickup_town, docket_dly_town,
      lane, docket_tot_pkgs, desp_pkgs, docket_act_wt, cnor_name, cnee_name,
      ${originSlice ? "'origin'" : 'source'} AS source,
      ${originSlice ? 'origin_bucket' : 'bucket'} AS bucket,
      CASE
        WHEN ${originSlice ? 'origin_date IS NOT NULL' : "leg IN ('origin_sent', 'hub_sent', 'dest_sent')"}
          THEN to_char(${originSlice ? 'origin_date' : "CASE WHEN leg = 'origin_sent' THEN origin_date WHEN leg = 'hub_sent' THEN hub_date ELSE dest_date END"}, 'YYYY-MM-DD')
        ELSE NULL
      END AS desp_date,
      CASE
        WHEN ${originSlice ? 'FALSE' : "source = 'hub'"} THEN to_char(hub_ready, 'YYYY-MM-DD')
        WHEN ${originSlice ? 'FALSE' : "source = 'dest'"} THEN to_char(dest_ready, 'YYYY-MM-DD')
        ELSE NULL
      END AS arrival_date
    FROM base
    WHERE ${periodSql}
      AND ${laneSql}
      AND ${sliceSql}
    ORDER BY ${originSlice ? 'ddt' : "CASE WHEN source = 'hub' THEN hub_ready WHEN source = 'dest' THEN COALESCE(dest_ready, dest_date) ELSE ddt END"} DESC, docket_no DESC
    LIMIT 1000
  `, [tenant_id]);
  return result.rows || [];
};

const VEHICLE_STAGES = ['arrived', 'transit'];
const VEHICLE_BUCKETS = ['on', 'd1', 'd2', 'over'];

const VEHICLE_SQL = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  fy AS (
    SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
           END AS start,
           today
      FROM asof
  ),
  trips AS (
    SELECT
      mh.mnf_no,
      mh.mnf_loc,
      mh.mnf_to_loc,
      mh.mnf_from_town,
      mh.mnf_to_town,
      TRIM(mh.desp_veh_no) AS vehicle_no,
      mh.mnf_date::date AS mnf_date,
      timezone('Asia/Kolkata', mh.mnf_arrival_time)::date AS arr_date,
      mh.mnf_date::date + FLOOR(COALESCE(dist.transit_time_hrs, 0) / 24)::int AS exp_date,
      (mh.mnf_arrival_time IS NOT NULL) AS arrived
    FROM sss.sst_mnf_hdr mh
    CROSS JOIN fy
    LEFT JOIN sss.ssm_distance dist
      ON dist.from_loc = mh.mnf_loc
     AND dist.to_loc = mh.mnf_to_loc
     AND dist.from_town = mh.mnf_from_town
     AND dist.to_town = mh.mnf_to_town
    WHERE mh.tenant_id = ?
      AND mh.record_status = 0
      AND NULLIF(TRIM(COALESCE(mh.desp_veh_no, '')), '') IS NOT NULL
      AND mh.mnf_date::date <= fy.today
      AND (
        mh.mnf_date::date >= fy.start
        OR (
          mh.mnf_arrival_time IS NOT NULL
          AND timezone('Asia/Kolkata', mh.mnf_arrival_time)::date >= fy.start
          AND timezone('Asia/Kolkata', mh.mnf_arrival_time)::date <= fy.today
        )
      )
  ),
  scored AS (
    SELECT *,
           CASE WHEN arrived THEN 'arrived' ELSE 'transit' END AS stage,
           CASE
             WHEN arrived AND arr_date - exp_date <= 0 THEN 'on'
             WHEN arrived AND arr_date - exp_date = 1 THEN 'd1'
             WHEN arrived AND arr_date - exp_date = 2 THEN 'd2'
             WHEN arrived THEN 'over'
             WHEN (SELECT today FROM asof) - exp_date <= 0 THEN 'on'
             WHEN (SELECT today FROM asof) - exp_date = 1 THEN 'd1'
             WHEN (SELECT today FROM asof) - exp_date = 2 THEN 'd2'
             ELSE 'over'
           END AS bucket
      FROM trips
  )
`;

const VEHICLE_PERIODS = [
  ['today', 'today'],
  ['week', 'week'],
  ['month', 'month'],
  ['fy', 'fy'],
];

const vehiclePeriodSql = (period, dateExpr) => {
  const today = '(SELECT today FROM asof)';
  const start = '(SELECT start FROM fy)';
  if (period === 'today') return `${dateExpr} = ${today}`;
  if (period === 'week') return `${dateExpr} >= ${today} - 6 AND ${dateExpr} <= ${today}`;
  if (period === 'month') return `${dateExpr} >= date_trunc('month', ${today})::date AND ${dateExpr} <= ${today}`;
  return `${dateExpr} >= ${start} AND ${dateExpr} <= ${today}`;
};

const vehicleDateExpr = (stage) => (stage === 'arrived' ? 'arr_date' : 'mnf_date');

const vehicleSide = (row, period, stage) => {
  const num = (bucket) => Number(row?.[`${period}_${stage}_${bucket}`] || 0);
  const side = { on: num('on'), d1: num('d1'), d2: num('d2'), over: num('over') };
  side.total = side.on + side.d1 + side.d2 + side.over;
  return side;
};

const getVehicleBoard = async (tenant_id) => {
  const selects = VEHICLE_PERIODS.flatMap(([period]) =>
    VEHICLE_STAGES.flatMap((stage) =>
      VEHICLE_BUCKETS.map((bucket) =>
        `COUNT(*) FILTER (WHERE stage = '${stage}' AND bucket = '${bucket}' AND ${vehiclePeriodSql(period, vehicleDateExpr(stage))})::int AS ${period}_${stage}_${bucket}`
      )
    )
  ).join(',\n');
  const result = await db.raw(`
    ${VEHICLE_SQL}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN scored ON TRUE
  `, [tenant_id]);
  const row = result.rows?.[0] || {};
  const fyYear = Number(row.fy_year || 0);
  const labels = { today: 'Today', week: 'Last 7 days', month: 'This month', fy: 'This FY' };
  const periods = VEHICLE_PERIODS.map(([key]) => ({
    key,
    label: labels[key],
    arrived: vehicleSide(row, key, 'arrived'),
    transit: vehicleSide(row, key, 'transit'),
  }));
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods,
  };
};

const VEHICLE_SLICE_SQL = { all: 'TRUE', arrived: "stage = 'arrived'", transit: "stage = 'transit'" };
VEHICLE_STAGES.forEach((stage) => {
  VEHICLE_BUCKETS.forEach((bucket) => {
    VEHICLE_SLICE_SQL[`${stage}_${bucket}`] = `stage = '${stage}' AND bucket = '${bucket}'`;
  });
});

const getVehicleTrips = async (tenant_id, { period = 'fy', slice = 'arrived' } = {}) => {
  const sliceSql = VEHICLE_SLICE_SQL[slice];
  const stage = slice === 'all' ? 'all' : slice.startsWith('transit') ? 'transit' : 'arrived';
  const periodSql = !VEHICLE_PERIODS.some(([key]) => key === period) ? null
    : stage === 'all'
      ? `((stage = 'arrived' AND ${vehiclePeriodSql(period, 'arr_date')}) OR (stage = 'transit' AND ${vehiclePeriodSql(period, 'mnf_date')}))`
      : vehiclePeriodSql(period, vehicleDateExpr(stage));
  if (!sliceSql || !periodSql) {
    const error = new Error('Unknown vehicle slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    ${VEHICLE_SQL}
    SELECT mnf_no, mnf_loc, mnf_to_loc, mnf_from_town, mnf_to_town, vehicle_no,
           to_char(mnf_date, 'YYYY-MM-DD') AS mnf_date,
           to_char(exp_date, 'YYYY-MM-DD') AS exp_date,
           to_char(arr_date, 'YYYY-MM-DD') AS arr_date,
           stage, bucket
      FROM scored
     WHERE ${sliceSql}
       AND ${periodSql}
     ORDER BY mnf_date DESC, mnf_no DESC
     LIMIT 1000
  `, [tenant_id]);
  return result.rows || [];
};

const DELIVERY_DELIVERED_BUCKETS = ['on', 'd1', 'd2', 'over'];
const DELIVERY_PENDING_BUCKETS = ['same', 'last', 'd2', 'over'];
const DELIVERY_PERIODS = [
  ['today', 'Today'],
  ['week', 'Last 7 days'],
  ['month', 'This month'],
  ['fy', 'This FY'],
];

const DELIVERY_SQL = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  fy AS (
    SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
           END AS start,
           today
      FROM asof
  ),
  flagged AS (
    SELECT
      d.docket_no,
      to_char(d.docket_date::date, 'YYYY-MM-DD') AS docket_date,
      d.docket_date::date AS ddt,
      d.docket_loc,
      d.docket_to_loc,
      d.docket_pickup_town,
      d.docket_dly_town,
      CASE WHEN UPPER(TRIM(COALESCE(d.docket_load_type, ''))) = 'FTL' THEN 'FTL' ELSE 'PTL' END AS lane,
      d.docket_tot_pkgs,
      d.docket_act_wt,
      cnor.bp_name AS cnor_name,
      cnee.bp_name AS cnee_name,
      note.dly_date,
      COALESCE(note.delivered, FALSE) AS delivered,
      COALESCE(note.has_pod, FALSE) AS has_pod,
      stops.dest_arr
    FROM sss.sst_docket d
    CROSS JOIN fy
    LEFT JOIN sss.ssm_business_partner cnor ON cnor.record_id = d.cnor_id
    LEFT JOIN sss.ssm_business_partner cnee ON cnee.record_id = d.cnee_id
    LEFT JOIN LATERAL (
      SELECT
        dn.dly_date::date AS dly_date,
        LOWER(TRIM(COALESCE(dn.delivery_status, ''))) = 'delivered' AS delivered,
        (
          NULLIF(TRIM(COALESCE(dn.pod_url, '')), '') IS NOT NULL
          OR NULLIF(TRIM(COALESCE(dn.pod_back_url, '')), '') IS NOT NULL
        ) AS has_pod
      FROM sss.sst_dly_note dn
      WHERE dn.docket_no = d.docket_no
      ORDER BY dn.record_id DESC
      LIMIT 1
    ) note ON TRUE
    LEFT JOIN LATERAL (
      SELECT MIN(u.arrival_date)::date AS dest_arr
        FROM sss.sst_unloading_dtl u
       WHERE u.docket_no = d.docket_no
         AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) = UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
    ) stops ON TRUE
    WHERE d.tenant_id = ?
      AND d.record_status = 0
      AND d.docket_date::date <= fy.today
      AND (
        d.docket_date::date >= fy.start
        OR EXISTS (
          SELECT 1
            FROM sss.sst_unloading_dtl u
           WHERE u.docket_no = d.docket_no
             AND u.arrival_date::date >= fy.start
             AND u.arrival_date::date <= fy.today
             AND UPPER(TRIM(COALESCE(u.unld_loc_code, ''))) = UPPER(TRIM(COALESCE(d.docket_to_loc, '')))
        )
        OR EXISTS (
          SELECT 1
            FROM sss.sst_dly_note dn
           WHERE dn.docket_no = d.docket_no
             AND dn.dly_date::date >= fy.start
             AND dn.dly_date::date <= fy.today
             AND LOWER(TRIM(COALESCE(dn.delivery_status, ''))) = 'delivered'
        )
      )
  ),
  scored AS (
    SELECT *,
           CASE
             WHEN delivered THEN 'delivered'
             WHEN dest_arr IS NOT NULL THEN 'pending'
           END AS stage,
           CASE
             WHEN delivered AND COALESCE(dly_date, ddt) - COALESCE(dest_arr, ddt) <= 0 THEN 'on'
             WHEN delivered AND COALESCE(dly_date, ddt) - COALESCE(dest_arr, ddt) = 1 THEN 'd1'
             WHEN delivered AND COALESCE(dly_date, ddt) - COALESCE(dest_arr, ddt) = 2 THEN 'd2'
             WHEN delivered THEN 'over'
             WHEN (SELECT today FROM asof) - dest_arr <= 0 THEN 'same'
             WHEN (SELECT today FROM asof) - dest_arr = 1 THEN 'last'
             WHEN (SELECT today FROM asof) - dest_arr = 2 THEN 'd2'
             ELSE 'over'
           END AS bucket
      FROM flagged
     WHERE delivered OR dest_arr IS NOT NULL
  )
`;

const deliveryPeriodSql = (period, dateExpr) => {
  const today = '(SELECT today FROM asof)';
  const start = '(SELECT start FROM fy)';
  if (period === 'today') return `${dateExpr} = ${today}`;
  if (period === 'week') return `${dateExpr} >= ${today} - 6 AND ${dateExpr} <= ${today}`;
  if (period === 'month') return `${dateExpr} >= date_trunc('month', ${today})::date AND ${dateExpr} <= ${today}`;
  return `${dateExpr} >= ${start} AND ${dateExpr} <= ${today}`;
};

const deliveryDateExpr = (stage) => (stage === 'delivered' ? 'COALESCE(dly_date, ddt)' : 'dest_arr');

const deliverySide = (row, period, stage, buckets) => {
  const side = {};
  buckets.forEach((bucket) => {
    side[bucket] = Number(row?.[`${period}_${stage}_${bucket}`] || 0);
  });
  side.total = buckets.reduce((sum, bucket) => sum + side[bucket], 0);
  return side;
};

const getDeliveryBoard = async (tenant_id) => {
  const selects = DELIVERY_PERIODS.flatMap(([period]) => [
    ...DELIVERY_DELIVERED_BUCKETS.map((bucket) =>
      `COUNT(*) FILTER (WHERE stage = 'delivered' AND bucket = '${bucket}' AND ${deliveryPeriodSql(period, deliveryDateExpr('delivered'))})::int AS ${period}_delivered_${bucket}`
    ),
    `COUNT(*) FILTER (WHERE stage = 'delivered' AND NOT COALESCE(has_pod, FALSE) AND ${deliveryPeriodSql(period, deliveryDateExpr('delivered'))})::int AS ${period}_delivered_nopod`,
    ...DELIVERY_PENDING_BUCKETS.map((bucket) =>
      `COUNT(*) FILTER (WHERE stage = 'pending' AND bucket = '${bucket}' AND ${deliveryPeriodSql(period, deliveryDateExpr('pending'))})::int AS ${period}_pending_${bucket}`
    ),
  ]).join(',\n');
  const result = await db.raw(`
    ${DELIVERY_SQL}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN scored ON TRUE
  `, [tenant_id]);
  const row = result.rows?.[0] || {};
  const fyYear = Number(row.fy_year || 0);
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods: DELIVERY_PERIODS.map(([key, label]) => ({
      key,
      label,
      delivered: {
        ...deliverySide(row, key, 'delivered', DELIVERY_DELIVERED_BUCKETS),
        nopod: Number(row?.[`${key}_delivered_nopod`] || 0),
      },
      pending: deliverySide(row, key, 'pending', DELIVERY_PENDING_BUCKETS),
    })),
  };
};

const DELIVERY_SLICE_SQL = {
  all: 'TRUE',
  delivered: "stage = 'delivered'",
  pending: "stage = 'pending'",
};
DELIVERY_DELIVERED_BUCKETS.forEach((bucket) => {
  DELIVERY_SLICE_SQL[`delivered_${bucket}`] = `stage = 'delivered' AND bucket = '${bucket}'`;
});
DELIVERY_SLICE_SQL.delivered_nopod = "stage = 'delivered' AND NOT COALESCE(has_pod, FALSE)";
DELIVERY_PENDING_BUCKETS.forEach((bucket) => {
  DELIVERY_SLICE_SQL[`pending_${bucket}`] = `stage = 'pending' AND bucket = '${bucket}'`;
});

const getDeliveryDockets = async (tenant_id, { period = 'fy', slice = 'delivered' } = {}) => {
  const sliceSql = DELIVERY_SLICE_SQL[slice];
  const stage = slice === 'all' ? 'all' : slice.startsWith('pending') ? 'pending' : 'delivered';
  const periodSql = !DELIVERY_PERIODS.some(([key]) => key === period) ? null
    : stage === 'all'
      ? `((stage = 'delivered' AND ${deliveryPeriodSql(period, 'COALESCE(dly_date, ddt)')}) OR (stage = 'pending' AND ${deliveryPeriodSql(period, 'dest_arr')}))`
      : deliveryPeriodSql(period, deliveryDateExpr(stage));
  if (!sliceSql || !periodSql) {
    const error = new Error('Unknown delivery slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    ${DELIVERY_SQL}
    SELECT docket_no, docket_date, docket_loc, docket_to_loc, docket_pickup_town, docket_dly_town,
           lane, docket_tot_pkgs, docket_act_wt, cnor_name, cnee_name,
           to_char(dest_arr, 'YYYY-MM-DD') AS dest_arr,
           to_char(dly_date, 'YYYY-MM-DD') AS dly_date,
           stage, bucket
      FROM scored
     WHERE ${sliceSql}
       AND ${periodSql}
     ORDER BY ${stage === 'pending' ? 'dest_arr' : stage === 'all' ? 'COALESCE(dly_date, dest_arr, ddt)' : 'COALESCE(dly_date, ddt)'} DESC, docket_no DESC
     LIMIT 1000
  `, [tenant_id]);
  return result.rows || [];
};

const REVENUE_PAYS = ['topay', 'paid', 'tbb'];
const REVENUE_BUCKETS = ['billed', 'unbilled'];
const REVENUE_PERIODS = [
  ['today', 'Today'],
  ['week', 'Last 7 days'],
  ['month', 'This month'],
  ['fy', 'This FY'],
];

const REVENUE_SQL = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  fy AS (
    SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
           END AS start,
           today
      FROM asof
  ),
  flagged AS (
    SELECT
      d.docket_no,
      to_char(d.docket_date::date, 'YYYY-MM-DD') AS docket_date,
      d.docket_date::date AS ddt,
      d.docket_loc,
      d.docket_to_loc,
      d.docket_pickup_town,
      d.docket_dly_town,
      CASE
        WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) IN ('TO PAY', 'TOPAY', 'TO-PAY') THEN 'topay'
        WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) IN ('PAID', 'PAID BASIS') THEN 'paid'
        WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) = 'TBB' THEN 'tbb'
      END AS pay,
      ROUND(COALESCE(d.docket_tot_amt, 0)::numeric, 2) AS amt,
      cnor.bp_name AS cnor_name,
      cnee.bp_name AS cnee_name,
      bill.invoice_no,
      bill.invoice_date,
      (bill.invoice_no IS NOT NULL) AS billed
    FROM sss.sst_docket d
    CROSS JOIN fy
    LEFT JOIN sss.ssm_business_partner cnor ON cnor.record_id = d.cnor_id
    LEFT JOIN sss.ssm_business_partner cnee ON cnee.record_id = d.cnee_id
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(DISTINCT h.invoice_no::text, ', ' ORDER BY h.invoice_no::text) AS invoice_no,
        to_char(MIN(h.invoice_date)::date, 'YYYY-MM-DD') AS invoice_date
      FROM sss.sst_invoice_dtl dtl
      JOIN sss.sst_invoice_hdr h
        ON CAST(h.invoice_no AS INTEGER) = CAST(dtl.invoice_no AS INTEGER)
       AND CAST(h.invoice_date AS DATE) = CAST(dtl.invoice_date AS DATE)
       AND UPPER(TRIM(h.loc_code::text)) = UPPER(TRIM(dtl.invoice_loc::text))
      WHERE dtl.docket_no = d.docket_no
        AND COALESCE(UPPER(TRIM(h.cancel_flag::text)), '') NOT IN ('Y', 'C', '1', 'TRUE')
    ) bill ON TRUE
    WHERE d.tenant_id = ?
      AND d.record_status = 0
      AND d.docket_date::date <= fy.today
      AND d.docket_date::date >= fy.start
  ),
  scored AS (
    SELECT * FROM flagged WHERE pay IS NOT NULL
  )
`;

const revenuePeriodSql = (period) => {
  const today = '(SELECT today FROM asof)';
  const start = '(SELECT start FROM fy)';
  if (period === 'today') return `ddt = ${today}`;
  if (period === 'week') return `ddt >= ${today} - 6 AND ddt <= ${today}`;
  if (period === 'month') return `ddt >= date_trunc('month', ${today})::date AND ddt <= ${today}`;
  return `ddt >= ${start} AND ddt <= ${today}`;
};

const revenueSide = (row, period, pay) => {
  const money = (bucket) => Number(row?.[`${period}_${pay}_${bucket}`] || 0);
  const side = { billed: money('billed'), unbilled: money('unbilled') };
  side.total = Math.round((side.billed + side.unbilled) * 100) / 100;
  return side;
};

const tbbSide = (row, period) => {
  const side = revenueSide(row, period, 'tbb');
  side.billedCount = Number(row?.[`${period}_tbb_billed_count`] || 0);
  side.unbilledCount = Number(row?.[`${period}_tbb_unbilled_count`] || 0);
  side.totalCount = side.billedCount + side.unbilledCount;
  return side;
};

const cashSide = (row, period, pay) => {
  const amount = revenueSide(row, period, pay).total;
  return {
    count: Number(row?.[`${period}_${pay}_count`] || 0),
    amount,
    total: amount,
  };
};

const revenueMonthSql = (key) => `to_char(ddt, 'YYYY-MM') = '${key}'`;

const revenueMonthKey = (period) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(period || ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
};

const getRevenueBoard = async (tenant_id) => {
  const selects = [
    ...REVENUE_PERIODS.flatMap(([period]) =>
      REVENUE_PAYS.flatMap((pay) =>
        REVENUE_BUCKETS.map((bucket) =>
          `ROUND(COALESCE(SUM(amt) FILTER (WHERE pay = '${pay}' AND billed = ${bucket === 'billed'} AND ${revenuePeriodSql(period)}), 0), 2) AS ${period}_${pay}_${bucket}`
        )
      )
    ),
    ...REVENUE_PERIODS.flatMap(([period]) =>
      ['topay', 'paid'].map((pay) =>
        `COUNT(*) FILTER (WHERE pay = '${pay}' AND ${revenuePeriodSql(period)})::int AS ${period}_${pay}_count`
      )
    ),
    ...REVENUE_PERIODS.flatMap(([period]) =>
      REVENUE_BUCKETS.map((bucket) =>
        `COUNT(*) FILTER (WHERE pay = 'tbb' AND billed = ${bucket === 'billed'} AND ${revenuePeriodSql(period)})::int AS ${period}_tbb_${bucket}_count`
      )
    ),
  ].join(',\n');
  const result = await db.raw(`
    ${REVENUE_SQL}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN scored ON TRUE
  `, [tenant_id]);
  const row = result.rows?.[0] || {};
  const fyYear = Number(row.fy_year || 0);
  const monthResult = await db.raw(`
    ${REVENUE_SQL}
    SELECT to_char(gs.month_start::date, 'YYYY-MM') AS month_key,
           ROUND(COALESCE(SUM(s.amt) FILTER (WHERE s.pay = 'topay'), 0), 2) AS topay,
           COUNT(*) FILTER (WHERE s.pay = 'topay')::int AS topay_count,
           ROUND(COALESCE(SUM(s.amt) FILTER (WHERE s.pay = 'paid'), 0), 2) AS paid,
           COUNT(*) FILTER (WHERE s.pay = 'paid')::int AS paid_count,
           ROUND(COALESCE(SUM(s.amt) FILTER (WHERE s.pay = 'tbb' AND s.billed), 0), 2) AS tbb_billed,
           COUNT(*) FILTER (WHERE s.pay = 'tbb' AND s.billed)::int AS tbb_billed_count,
           ROUND(COALESCE(SUM(s.amt) FILTER (WHERE s.pay = 'tbb' AND NOT s.billed), 0), 2) AS tbb_unbilled,
           COUNT(*) FILTER (WHERE s.pay = 'tbb' AND NOT s.billed)::int AS tbb_unbilled_count
      FROM generate_series(
             (SELECT start FROM fy),
             (SELECT (start + interval '11 months')::date FROM fy),
             interval '1 month'
           ) AS gs(month_start)
      LEFT JOIN scored s
        ON s.ddt >= gs.month_start::date
       AND s.ddt < (gs.month_start::date + interval '1 month')::date
       AND s.ddt <= (SELECT today FROM fy)
     GROUP BY gs.month_start
     ORDER BY gs.month_start
  `, [tenant_id]);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = (monthResult.rows || []).map((item) => {
    const key = item.month_key;
    const monthNo = Number(String(key || '').slice(5, 7));
    const year = String(key || '').slice(0, 4);
    const topay = Number(item.topay || 0);
    const paid = Number(item.paid || 0);
    const billed = Number(item.tbb_billed || 0);
    const unbilled = Number(item.tbb_unbilled || 0);
    const billedCount = Number(item.tbb_billed_count || 0);
    const unbilledCount = Number(item.tbb_unbilled_count || 0);
    const tbb = Math.round((billed + unbilled) * 100) / 100;
    return {
      key,
      label: `${monthNames[monthNo - 1] || key} ${year}`,
      topay: { count: Number(item.topay_count || 0), amount: topay, total: topay },
      paid: { count: Number(item.paid_count || 0), amount: paid, total: paid },
      tbb: {
        billed,
        unbilled,
        total: tbb,
        billedCount,
        unbilledCount,
        totalCount: billedCount + unbilledCount,
      },
      count: Number(item.topay_count || 0) + Number(item.paid_count || 0) + billedCount + unbilledCount,
      total: Math.round((topay + paid + tbb) * 100) / 100,
    };
  });
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods: REVENUE_PERIODS.map(([key, label]) => ({
      key,
      label,
      topay: cashSide(row, key, 'topay'),
      paid: cashSide(row, key, 'paid'),
      tbb: tbbSide(row, key),
    })),
    months,
  };
};

const REVENUE_SLICE_SQL = { all: 'TRUE' };
REVENUE_PAYS.forEach((pay) => {
  REVENUE_SLICE_SQL[pay] = `pay = '${pay}'`;
  REVENUE_SLICE_SQL[`${pay}_billed`] = `pay = '${pay}' AND billed`;
  REVENUE_SLICE_SQL[`${pay}_unbilled`] = `pay = '${pay}' AND NOT billed`;
});

const getRevenueDockets = async (tenant_id, { period = 'fy', slice = 'all' } = {}) => {
  const sliceSql = REVENUE_SLICE_SQL[slice];
  const monthKey = revenueMonthKey(period);
  const periodSql = REVENUE_PERIODS.some(([key]) => key === period)
    ? revenuePeriodSql(period)
    : (monthKey ? revenueMonthSql(monthKey) : null);
  if (!sliceSql || !periodSql) {
    const error = new Error('Unknown revenue slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    ${REVENUE_SQL}
    SELECT docket_no, docket_date, docket_loc, docket_to_loc, docket_pickup_town, docket_dly_town,
           pay, amt, cnor_name, cnee_name, invoice_no, invoice_date, billed
      FROM scored
     WHERE ${sliceSql}
       AND ${periodSql}
     ORDER BY ddt DESC, docket_no DESC
     LIMIT 1000
  `, [tenant_id]);
  return result.rows || [];
};

const collectionPeriodSql = (period, col) => {
  const today = '(SELECT today FROM asof)';
  const start = '(SELECT start FROM fy)';
  if (period === 'today') return `${col} = ${today}`;
  if (period === 'week') return `${col} >= ${today} - 6 AND ${col} <= ${today}`;
  if (period === 'month') return `${col} >= date_trunc('month', ${today})::date AND ${col} <= ${today}`;
  return `${col} >= ${start} AND ${col} <= ${today}`;
};

const COLLECTION_SQL = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  fy AS (
    SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
           END AS start,
           today
      FROM asof
  ),
  bills AS (
    SELECT
      h.invoice_no::text AS invoice_no,
      to_char(h.invoice_date::date, 'YYYY-MM-DD') AS invoice_date,
      h.invoice_date::date AS idt,
      h.loc_code,
      h.bp_name,
      (h.inv_sub_date IS NOT NULL) AS submitted,
      to_char(h.inv_sub_date::date, 'YYYY-MM-DD') AS inv_sub_date,
      ROUND(COALESCE(h.total_inv_amt, 0)::numeric, 2) AS bill_amt,
      LEAST(
        ROUND(COALESCE(h.total_inv_amt, 0)::numeric, 2),
        ROUND(COALESCE(adj.adj_amt, 0) + COALESCE(paid.paid_amt, 0), 2)
      ) AS realised
    FROM sss.sst_invoice_hdr h
    CROSS JOIN fy
    LEFT JOIN LATERAL (
      SELECT SUM(COALESCE(d.adj_amt, 0)) AS adj_amt
        FROM sss.sst_bill_adj_dtl d
       WHERE UPPER(TRIM(d.invoice_no::text)) = UPPER(TRIM(h.invoice_no::text))
         AND d.invoice_date::date = h.invoice_date::date
         AND UPPER(TRIM(COALESCE(d.invoice_loc, ''))) = UPPER(TRIM(h.loc_code::text))
    ) adj ON TRUE
    LEFT JOIN LATERAL (
      SELECT SUM(COALESCE(r.received_amt, 0)) AS paid_amt
        FROM sss.sst_mr_dtl r
       WHERE NULLIF(TRIM(r.invoice_no::text), '') IS NOT NULL
         AND TRIM(r.invoice_no::text) <> '0'
         AND UPPER(TRIM(r.invoice_no::text)) = UPPER(TRIM(h.invoice_no::text))
         AND r.invoice_date::date = h.invoice_date::date
         AND UPPER(TRIM(COALESCE(r.invoice_loc, ''))) = UPPER(TRIM(h.loc_code::text))
    ) paid ON TRUE
    WHERE (h.tenant_id = ? OR (? = 1 AND h.tenant_id IS NULL))
      AND COALESCE(UPPER(TRIM(h.cancel_flag::text)), '') NOT IN ('Y', 'C', '1', 'TRUE')
      AND h.invoice_date::date <= fy.today
      AND h.invoice_date::date >= fy.start
  ),
  receipts AS (
    SELECT
      h.mr_no,
      to_char(h.mr_date::date, 'YYYY-MM-DD') AS mr_date,
      h.mr_date::date AS mdt,
      h.loc_code,
      h.bp_name,
      h.pay_mode,
      h.mr_reason,
      ROUND(COALESCE(h.received_amt, 0)::numeric, 2) AS amt,
      CASE
        WHEN COALESCE(h.mr_reason, 0) IN (3, 4) THEN GREATEST(
          ROUND(COALESCE(h.received_amt, 0)::numeric, 2) - ROUND(COALESCE(adj.adj_amt, 0), 2),
          0
        )
        ELSE 0
      END AS unadjusted
    FROM sss.sst_mr_hdr h
    CROSS JOIN fy
    LEFT JOIN LATERAL (
      SELECT SUM(COALESCE(d.adj_amt, 0)) AS adj_amt
        FROM sss.sst_bill_adj_dtl d
       WHERE UPPER(TRIM(d.mr_no::text)) = UPPER(TRIM(h.mr_no::text))
         AND d.mr_date::date = h.mr_date::date
         AND UPPER(TRIM(COALESCE(d.mr_loc, ''))) = UPPER(TRIM(h.loc_code::text))
    ) adj ON TRUE
    WHERE h.tenant_id = ?
      AND h.mr_date::date <= fy.today
      AND h.mr_date::date >= fy.start
  ),
  facts AS (
    SELECT idt AS dt, 'bill'::text AS kind, bill_amt AS amt, submitted, realised, 0::numeric AS unadjusted
      FROM bills
    UNION ALL
    SELECT mdt, 'receipt', amt, FALSE, 0::numeric, unadjusted
      FROM receipts
  )
`;

const getCollectionBoard = async (tenant_id) => {
  const selects = REVENUE_PERIODS.flatMap(([period]) => {
    const on = collectionPeriodSql(period, 'dt');
    return [
      `ROUND(COALESCE(SUM(amt) FILTER (WHERE kind = 'bill' AND ${on}), 0), 2) AS ${period}_raised`,
      `ROUND(COALESCE(SUM(amt) FILTER (WHERE kind = 'bill' AND submitted AND ${on}), 0), 2) AS ${period}_submitted`,
      `ROUND(COALESCE(SUM(amt) FILTER (WHERE kind = 'bill' AND NOT submitted AND ${on}), 0), 2) AS ${period}_unsubmitted`,
      `ROUND(COALESCE(SUM(realised) FILTER (WHERE kind = 'bill' AND ${on}), 0), 2) AS ${period}_realised`,
      `ROUND(COALESCE(SUM(amt - realised) FILTER (WHERE kind = 'bill' AND ${on}), 0), 2) AS ${period}_outstanding`,
      `ROUND(COALESCE(SUM(amt) FILTER (WHERE kind = 'receipt' AND ${on}), 0), 2) AS ${period}_receipt`,
      `ROUND(COALESCE(SUM(unadjusted) FILTER (WHERE kind = 'receipt' AND ${on}), 0), 2) AS ${period}_unadjusted`,
    ];
  }).join(',\n');
  const result = await db.raw(`
    ${COLLECTION_SQL}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN facts ON TRUE
  `, [tenant_id, tenant_id, tenant_id]);
  const row = result.rows?.[0] || {};
  const fyYear = Number(row.fy_year || 0);
  const money = (period, key) => Number(row[`${period}_${key}`] || 0);
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods: REVENUE_PERIODS.map(([key, label]) => ({
      key,
      label,
      raised: money(key, 'raised'),
      submitted: money(key, 'submitted'),
      unsubmitted: money(key, 'unsubmitted'),
      realised: money(key, 'realised'),
      outstanding: money(key, 'outstanding'),
      receipt: money(key, 'receipt'),
      unadjusted: money(key, 'unadjusted'),
    })),
  };
};

const collectionSliceSql = (slice) => {
  if (slice === 'submitted') return "submitted AND (bill_amt - realised) >= 0";
  if (slice === 'unsubmitted') return 'NOT submitted';
  if (slice === 'realised') return 'realised > 0';
  if (slice === 'outstanding') return '(bill_amt - realised) > 0.009';
  return 'TRUE';
};

const getCollectionBills = async (tenant_id, { period = 'fy', slice = 'raised' } = {}) => {
  if (!REVENUE_PERIODS.some(([key]) => key === period) || !['raised', 'submitted', 'unsubmitted', 'realised', 'outstanding'].includes(slice)) {
    const error = new Error('Unknown collection slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    ${COLLECTION_SQL}
    SELECT invoice_no, invoice_date, loc_code, bp_name, submitted, inv_sub_date,
           bill_amt, realised, ROUND((bill_amt - realised)::numeric, 2) AS outstanding
      FROM bills
     WHERE ${collectionPeriodSql(period, 'idt')}
       AND ${collectionSliceSql(slice)}
     ORDER BY idt DESC, invoice_no DESC
  `, [tenant_id, tenant_id, tenant_id]);
  return result.rows || [];
};

const OUTSTANDING_SQL = `
  ${COLLECTION_SQL},
  aged AS (
    SELECT bills.*,
           ((SELECT today FROM asof) - idt)::int AS age,
           GREATEST(ROUND((bill_amt - realised)::numeric, 2), 0) AS os
      FROM bills
  )
`;

const outstandingAgeSql = (slice) => {
  if (slice === 'd30') return 'age <= 30';
  if (slice === 'd60') return 'age BETWEEN 31 AND 60';
  if (slice === 'd90') return 'age BETWEEN 61 AND 90';
  if (slice === 'over') return 'age >= 91';
  return 'os > 0.009';
};

const getOutstandingBoard = async (tenant_id) => {
  const buckets = [
    ['d30', 'age <= 30'],
    ['d60', 'age BETWEEN 31 AND 60'],
    ['d90', 'age BETWEEN 61 AND 90'],
    ['over', 'age >= 91'],
    ['total', 'os > 0.009'],
  ];
  const selects = REVENUE_PERIODS.flatMap(([period]) => {
    const on = collectionPeriodSql(period, 'idt');
    return buckets.map(([key, age]) => (
      `ROUND(COALESCE(SUM(os) FILTER (WHERE ${on} AND ${age}), 0), 2) AS ${period}_${key}`
    ));
  }).join(',\n');
  const result = await db.raw(`
    ${OUTSTANDING_SQL}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN aged ON TRUE
  `, [tenant_id, tenant_id, tenant_id]);
  const row = result.rows?.[0] || {};
  const fyYear = Number(row.fy_year || 0);
  const money = (period, key) => Number(row[`${period}_${key}`] || 0);
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods: REVENUE_PERIODS.map(([key, label]) => ({
      key,
      label,
      d30: money(key, 'd30'),
      d60: money(key, 'd60'),
      d90: money(key, 'd90'),
      over: money(key, 'over'),
      total: money(key, 'total'),
    })),
  };
};

const getOutstandingBills = async (tenant_id, { period = 'fy', slice = 'total' } = {}) => {
  if (!REVENUE_PERIODS.some(([key]) => key === period) || !['d30', 'd60', 'd90', 'over', 'total'].includes(slice)) {
    const error = new Error('Unknown outstanding slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    ${OUTSTANDING_SQL}
    SELECT invoice_no, invoice_date, loc_code, bp_name, age,
           bill_amt, realised, os AS outstanding
      FROM aged
     WHERE ${collectionPeriodSql(period, 'idt')}
       AND ${outstandingAgeSql(slice)}
       AND os > 0.009
     ORDER BY age DESC, idt DESC, invoice_no DESC
  `, [tenant_id, tenant_id, tenant_id]);
  return result.rows || [];
};

const HIRE_SQL = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  fy AS (
    SELECT CASE WHEN EXTRACT(MONTH FROM today) >= 4
                THEN make_date(EXTRACT(YEAR FROM today)::int, 4, 1)
                ELSE make_date(EXTRACT(YEAR FROM today)::int - 1, 4, 1)
           END AS start,
           today
      FROM asof
  ),
  vouchers AS (
    SELECT
      h.vha_no::text AS vha_no,
      to_char(h.vha_date::date, 'YYYY-MM-DD') AS vha_date,
      h.vha_date::date AS vdt,
      h.vha_loc,
      h.vha_to_loc,
      h.vha_type,
      h.vehicle_regis_no,
      h.vendor_name,
      ROUND(COALESCE(h.vha_total_amt, COALESCE(h.vha_hire_amt, 0) + COALESCE(h.vha_loading_amt, 0) + COALESCE(h.vha_dc_amt, 0))::numeric, 2) AS total_amt,
      ROUND(COALESCE(h.vha_advance_total, 0)::numeric, 2) AS advance,
      ROUND(COALESCE(h.vha_balance_amt, 0)::numeric, 2) AS balance
    FROM sss.sst_vha_hdr h
    CROSS JOIN fy
    WHERE (h.tenant_id = ? OR (? = 1 AND h.tenant_id IS NULL))
      AND h.record_status = 0
      AND h.vha_date::date <= fy.today
      AND h.vha_date::date >= fy.start
  )
`;

const getHireBoard = async (tenant_id) => {
  const selects = REVENUE_PERIODS.flatMap(([period]) => {
    const on = collectionPeriodSql(period, 'vdt');
    return [
      `COUNT(*) FILTER (WHERE ${on})::int AS ${period}_total_count`,
      `ROUND(COALESCE(SUM(total_amt) FILTER (WHERE ${on}), 0), 2) AS ${period}_total_amt`,
      `COUNT(*) FILTER (WHERE ${on} AND ABS(advance) > 0.009)::int AS ${period}_advance_count`,
      `ROUND(COALESCE(SUM(advance) FILTER (WHERE ${on}), 0), 2) AS ${period}_advance_amt`,
      `COUNT(*) FILTER (WHERE ${on} AND ABS(balance) > 0.009)::int AS ${period}_balance_count`,
      `ROUND(COALESCE(SUM(balance) FILTER (WHERE ${on}), 0), 2) AS ${period}_balance_amt`,
    ];
  }).join(',\n');
  const result = await db.raw(`
    ${HIRE_SQL}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of,
           to_char(MIN(fy.start), 'YYYY-MM-DD') AS fy_start,
           EXTRACT(YEAR FROM MIN(fy.start))::int AS fy_year
      FROM asof
     CROSS JOIN fy
      LEFT JOIN vouchers ON TRUE
  `, [tenant_id, tenant_id]);
  const row = result.rows?.[0] || {};
  const fyYear = Number(row.fy_year || 0);
  const num = (period, key) => Number(row[`${period}_${key}`] || 0);
  const side = (period, key) => ({ count: num(period, `${key}_count`), amount: num(period, `${key}_amt`) });
  return {
    asOf: row.as_of || '',
    fyStart: row.fy_start || '',
    fyLabel: fyYear ? `FY ${fyYear}-${String(fyYear + 1).slice(-2)}` : 'This FY',
    periods: REVENUE_PERIODS.map(([key, label]) => ({
      key,
      label,
      total: side(key, 'total'),
      advance: side(key, 'advance'),
      balance: side(key, 'balance'),
    })),
  };
};

const hireSliceSql = (slice) => {
  if (slice === 'advance') return 'ABS(advance) > 0.009';
  if (slice === 'balance') return 'ABS(balance) > 0.009';
  return 'TRUE';
};

const getHireVouchers = async (tenant_id, { period = 'fy', slice = 'total' } = {}) => {
  const sliceKey = slice === 'hire' ? 'total' : slice;
  if (!REVENUE_PERIODS.some(([key]) => key === period) || !['total', 'advance', 'balance'].includes(sliceKey)) {
    const error = new Error('Unknown lorry hire slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    ${HIRE_SQL}
    SELECT vha_no, vha_date, vha_loc, vha_to_loc, vha_type, vehicle_regis_no, vendor_name,
           total_amt, advance, balance
      FROM vouchers
     WHERE ${collectionPeriodSql(period, 'vdt')}
       AND ${hireSliceSql(sliceKey)}
     ORDER BY vdt DESC, vha_no DESC
  `, [tenant_id, tenant_id]);
  return result.rows || [];
};

const EWB_SQL = `
  WITH asof AS (
    SELECT (timezone('Asia/Kolkata', now()))::date AS today
  ),
  bills AS (
    SELECT
      e.ewb_no::text AS ewb_no,
      e.docket_no,
      to_char(e.docket_date::date, 'YYYY-MM-DD') AS docket_date,
      e.docket_loc,
      to_char(e.ewb_date::date, 'YYYY-MM-DD') AS ewb_date,
      to_char(e.ewb_valid_upto::date, 'YYYY-MM-DD') AS valid_upto,
      e.ewb_valid_upto::date AS vdt,
      e.cnor_name,
      e.cnee_name,
      COALESCE(note.delivered, FALSE) AS delivered
    FROM sss.sst_docket_ewb e
    CROSS JOIN asof
    LEFT JOIN LATERAL (
      SELECT LOWER(TRIM(COALESCE(dn.delivery_status, ''))) = 'delivered' AS delivered
        FROM sss.sst_dly_note dn
       WHERE dn.docket_no = e.docket_no
       ORDER BY dn.record_id DESC
       LIMIT 1
    ) note ON TRUE
    WHERE (e.tenant_id = ? OR (? = 1 AND e.tenant_id IS NULL))
      AND e.ewb_valid_upto IS NOT NULL
  )
`;

const EWB_SLICES = [
  ['expired', 'Expired', 'vdt < (SELECT today FROM asof)'],
  ['today', 'Today', 'vdt = (SELECT today FROM asof)'],
  ['next', 'Tomorrow', 'vdt = (SELECT today FROM asof) + 1'],
  ['d2', 'In 2 days', 'vdt = (SELECT today FROM asof) + 2'],
  ['week', 'In 3–7 days', 'vdt > (SELECT today FROM asof) + 2 AND vdt <= (SELECT today FROM asof) + 7'],
];

const getEwbBoard = async (tenant_id) => {
  const selects = EWB_SLICES.map(([key, , where]) => (
    `COUNT(*) FILTER (WHERE ${where} AND delivered)::int AS ${key}_delivered, COUNT(*) FILTER (WHERE ${where} AND NOT delivered)::int AS ${key}_undelivered`
  )).join(',\n');
  const result = await db.raw(`
    ${EWB_SQL}
    SELECT ${selects},
           to_char(MIN(asof.today), 'YYYY-MM-DD') AS as_of
      FROM asof
      LEFT JOIN bills ON TRUE
  `, [tenant_id, tenant_id]);
  const row = result.rows?.[0] || {};
  return {
    asOf: row.as_of || '',
    rows: EWB_SLICES.map(([key, label]) => ({
      key,
      label,
      delivered: Number(row[`${key}_delivered`] || 0),
      undelivered: Number(row[`${key}_undelivered`] || 0),
    })),
  };
};

const getEwbBills = async (tenant_id, { slice = 'today', side = 'undelivered' } = {}) => {
  const found = EWB_SLICES.find(([key]) => key === slice);
  const sideSql = side === 'delivered' ? 'delivered' : side === 'undelivered' ? 'NOT delivered' : '';
  if (!found || !sideSql) {
    const error = new Error('Unknown e-way bill slice');
    error.status = 400;
    throw error;
  }
  const result = await db.raw(`
    ${EWB_SQL}
    SELECT ewb_no, docket_no, docket_date, docket_loc, ewb_date, valid_upto, cnor_name, cnee_name, delivered
      FROM bills
     WHERE ${found[2]}
       AND ${sideSql}
     ORDER BY vdt, ewb_no
  `, [tenant_id, tenant_id]);
  return result.rows || [];
};

const getCollectionReceipts = async (tenant_id, { period = 'fy', slice = 'receipt' } = {}) => {
  if (!REVENUE_PERIODS.some(([key]) => key === period)) {
    const error = new Error('Unknown collection period');
    error.status = 400;
    throw error;
  }
  const extra = slice === 'unadjusted' ? 'AND unadjusted > 0.009' : '';
  const result = await db.raw(`
    ${COLLECTION_SQL}
    SELECT mr_no, mr_date, loc_code, bp_name, pay_mode, mr_reason, amt, unadjusted
      FROM receipts
     WHERE ${collectionPeriodSql(period, 'mdt')}
       ${extra}
     ORDER BY mdt DESC, mr_no DESC
  `, [tenant_id, tenant_id, tenant_id]);
  return result.rows || [];
};

module.exports = {
  getDashboardStats,
  getDashboardOverview,
  getInTransitVehicleLocations,
  getInTransitDockets,
  getOrderBoard,
  getOrderDockets,
  getDespatchBoard,
  getDespatchDockets,
  getVehicleBoard,
  getVehicleTrips,
  getDeliveryBoard,
  getDeliveryDockets,
  getRevenueBoard,
  getRevenueDockets,
  getCollectionBoard,
  getCollectionBills,
  getCollectionReceipts,
  getOutstandingBoard,
  getOutstandingBills,
  getHireBoard,
  getHireVouchers,
  getEwbBoard,
  getEwbBills,
};
