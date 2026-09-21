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
      .whereRaw("COALESCE(ih.cancel_flag::text, '0') NOT IN ('1','true')")
      .sum('ih.total_inv_amt as amt')
      .count('ih.invoice_no as count')
      .then(r => r[0]),

    // Unsubmitted invoices
    db('sss.sst_invoice_hdr as ih')
      .where('ih.tenant_id', tenant_id)
      .whereNull('ih.inv_sub_date')
      .whereRaw("COALESCE(ih.cancel_flag::text, '0') NOT IN ('1','true')")
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


  /* ---------- Customer wise analysis (consignor level) ---------- */
  const customerRows = await db.raw(`
    SELECT
      bp.record_id, bp.bp_name, bp.bp_pan_no, bp.bp_gstin, bp.bp_city, bp.bp_credit_days,
      COALESCE(d.total, 0)       AS total,
      COALESCE(d.delivered, 0)   AS delivered,
      COALESCE(d.undelivered, 0) AS undelivered,
      COALESCE(d.below_cd, 0)    AS below_cd,
      COALESCE(d.above_cd, 0)    AS above_cd,
      COALESCE(d.os_days, 0)     AS os_days,
      COALESCE(inv.billed, 0)    AS billed,
      COALESCE(inv.submitted, 0) AS submitted
    FROM sss.ssm_business_partner bp
    LEFT JOIN (
      SELECT dkt.cnor_id,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE dkt.desp_pkgs >= dkt.docket_tot_pkgs AND dkt.docket_tot_pkgs > 0) AS delivered,
             COUNT(*) FILTER (WHERE dkt.docket_tot_pkgs - dkt.desp_pkgs > 0) AS undelivered,
             COUNT(*) FILTER (WHERE dkt.desp_pkgs >= dkt.docket_tot_pkgs AND dkt.docket_tot_pkgs > 0
                AND CURRENT_DATE - dkt.docket_date::date <= COALESCE(bpx.bp_credit_days, 30)) AS below_cd,
             COUNT(*) FILTER (WHERE dkt.desp_pkgs >= dkt.docket_tot_pkgs AND dkt.docket_tot_pkgs > 0
                AND CURRENT_DATE - dkt.docket_date::date > COALESCE(bpx.bp_credit_days, 30)) AS above_cd,
             MAX(CURRENT_DATE - dkt.docket_date::date) AS os_days
      FROM sss.sst_docket dkt
      LEFT JOIN sss.ssm_business_partner bpx
        ON bpx.record_id = dkt.cnor_id AND bpx.tenant_id = dkt.tenant_id
      WHERE dkt.tenant_id = ? AND dkt.record_status = 0
      GROUP BY dkt.cnor_id
    ) d ON d.cnor_id = bp.record_id
    LEFT JOIN (
      SELECT ih.bp_code,
             SUM(ih.total_inv_amt) AS billed,
             SUM(CASE WHEN ih.inv_sub_date IS NOT NULL THEN ih.total_inv_amt ELSE 0 END) AS submitted
      FROM sss.sst_invoice_hdr ih
      WHERE ih.tenant_id = ?
        AND COALESCE(ih.cancel_flag::text, '0') NOT IN ('1','true')
      GROUP BY ih.bp_code
    ) inv ON inv.bp_code = bp.record_id
    WHERE bp.tenant_id = ?
      AND COALESCE(d.total, 0) > 0
    ORDER BY d.total DESC
    LIMIT 50
  `, [tenant_id, tenant_id, tenant_id]);

  const customers = (customerRows.rows || []).map(r => ({
    name: r.bp_name || '-',
    pan: r.bp_pan_no || '-',
    gstin: r.bp_gstin || '-',
    location: r.bp_city || '-',
    total: Number(r.total),
    delivered: Number(r.delivered),
    undelivered: Number(r.undelivered),
    billed: fmtL(r.billed),
    submitted: fmtL(r.submitted),
    realised: fmtL(r.submitted),
    belowCd: Number(r.below_cd),
    aboveCd: Number(r.above_cd),
    osDays: Number(r.os_days),
    cn: 0,
    dn: 0,
  }));

  /* ---------- Vendor wise analysis (hire vouchers) ---------- */
  const vendorRows = await db.raw(`
    SELECT
      vh.vendor_name,
      COUNT(*)                                        AS vouchers,
      SUM(COALESCE(vh.vha_total_amt, 0))              AS total_hire,
      SUM(COALESCE(vh.vha_advance_total, 0))          AS paid,
      SUM(COALESCE(vh.vha_total_amt, 0)) - SUM(COALESCE(vh.vha_advance_total, 0)) AS balance,
      SUM(COALESCE(vh.vha_tds_amt, 0))                AS deductions,
      COUNT(DISTINCT vh.vehicle_regis_no)             AS engaged,
      COUNT(DISTINCT vd.mnf_no)                       AS trips,
      COUNT(DISTINCT CASE WHEN mh.mnf_arrival_time IS NOT NULL THEN vd.mnf_no END) AS arrived_trips
    FROM sss.sst_vha_hdr vh
    LEFT JOIN sss.sst_vha_dtl vd
      ON vd.vha_no = vh.vha_no AND vd.vha_loc = vh.vha_loc AND vd.vha_date = vh.vha_date
    LEFT JOIN sss.sst_mnf_hdr mh
      ON mh.mnf_no = vd.mnf_no AND mh.tenant_id = vh.tenant_id AND mh.record_status = 0
    WHERE vh.tenant_id = ? AND vh.record_status = 0
      AND vh.vendor_name IS NOT NULL AND vh.vendor_name <> ''
    GROUP BY vh.vendor_name
    ORDER BY total_hire DESC
    LIMIT 50
  `, [tenant_id]);

  const vendors = (vendorRows.rows || []).map(r => {
    const trips = Number(r.trips || 0);
    const arrived = Number(r.arrived_trips || 0);
    const delayed = Math.max(trips - arrived, 0);
    const onTimeRatio = trips ? arrived / trips : 1;
    const rating = trips ? (3 + 2 * onTimeRatio).toFixed(1) : '0.0';
    return {
      name: r.vendor_name,
      type: 'Vendor',
      pan: '-',
      gstin: '-',
      location: '-',
      engaged: Number(r.engaged || 0),
      totalHire: fmtL(r.total_hire),
      onTime: arrived,
      delayed,
      safe: arrived,
      remarked: 0,
      paid: fmtL(r.paid),
      balance: fmtL(r.balance),
      deductions: fmtL(r.deductions),
      rating: `${rating} / 5`,
    };
  });

  return {
    kpis: [
      { label: 'Orders Placed', value: totalDockets.toLocaleString('en-IN'), sub: 'Total dockets booked', tone: 'green', accent: 'green', Icon: 'ShoppingBag' },
      { label: 'Pickup Pending', value: pickupPending.toLocaleString('en-IN'), sub: `${pickupDone.toLocaleString('en-IN')} picked up`, tone: 'orange', accent: 'orange', Icon: 'PendingActions' },
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

module.exports = { getDashboardStats, getDashboardOverview, getInTransitVehicleLocations, getInTransitDockets };
