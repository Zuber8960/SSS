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

module.exports = { getDashboardStats };
