const db = require('../../config/db');

const getDashboardStats = async (tenant_id) => {
  const [totalRow] = await db('sss.sst_docket')
    .where({ tenant_id, record_status: 0 })
    .count('rec_id as count');

  const payTypeCounts = await db('sss.sst_docket')
    .where({ tenant_id, record_status: 0 })
    .select('docket_pay_type')
    .count('rec_id as count')
    .groupBy('docket_pay_type');

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);

  const dailyCounts = await db('sss.sst_docket')
    .where({ tenant_id, record_status: 0 })
    .andWhere('docket_date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
    .select(db.raw('DATE(docket_date) as day'))
    .count('rec_id as count')
    .groupByRaw('DATE(docket_date)')
    .orderBy('day', 'asc');

  const [lorryRow] = await db('sss.ssm_vehicle_master')
    .where({ tenant_id })
    .count('rec_id as count');

  const [bpRow] = await db('sss.ssm_business_partner')
    .where({ tenant_id })
    .count('record_id as count');

  return {
    totalDockets: Number(totalRow?.count || 0),
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
