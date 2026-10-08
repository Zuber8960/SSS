const db = require('../../config/db');

const TABLE = 'sss.ssm_vehicle_type';

module.exports = {
  // GET /vehicleType — all rows (tenant scoped when token carries tenant_id)
  async getAll(tenant_id) {
    const query = db(TABLE).select('*');
    if (tenant_id) query.where({ tenant_id });
    return query.orderBy('vehicle_type', 'asc');
  },

  // GET /vehicleType/types — distinct vehicle_type values for dropdowns
  async getTypes(tenant_id) {
    const query = db(TABLE).distinct('vehicle_type').select('vehicle_type');
    if (tenant_id) query.where({ tenant_id });
    const rows = await query.whereNotNull('vehicle_type').orderBy('vehicle_type', 'asc');
    return rows.map((r) => r.vehicle_type).filter(Boolean);
  },

  // GET /vehicleType/:recId — single row
  async getByRecId(recId, tenant_id) {
    const query = db(TABLE).where({ rec_id: recId });
    if (tenant_id) query.andWhere({ tenant_id });
    return query.first();
  },
};
