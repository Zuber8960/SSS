const db = require('../../config/db');

const TABLE = 'sss.ssm_lorry_owner_vehicle';
const VEHICLE = 'sss.ssm_vehicle_master';
const BP = 'sss.ssm_business_partner';

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function actor(user) {
  return user?.userName || user?.user_id || user?.recId || null;
}

function isLorryOwner(row) {
  return String(row?.bp_supplier_type || '').trim().toLowerCase() === 'lorry owner';
}

module.exports = {
  async listOwners(tenant_id) {
    const query = db(BP)
      .select(
        'record_id',
        'bp_name',
        'bp_grp_code',
        'bp_pan_no',
        'bp_mobile1',
        'bp_city',
        'loc_code',
        'bp_supplier_type'
      )
      .whereRaw("LOWER(TRIM(COALESCE(bp_supplier_type, ''))) = ?", ['lorry owner'])
      .orderBy('bp_name');
    if (tenant_id) query.andWhere({ tenant_id });
    return query;
  },

  async listAttached(tenant_id, owner_bp_id) {
    if (!owner_bp_id) return [];
    const query = db(`${TABLE} as m`)
      .leftJoin(`${VEHICLE} as v`, 'v.rec_id', 'm.vehicle_rec_id')
      .select(
        'm.rec_id',
        'm.owner_bp_id',
        'm.vehicle_rec_id',
        'm.lry_regis_no',
        'm.status',
        'm.attached_on',
        'v.lry_vehicle_type as vehicle_type',
        'v.lry_make as make',
        'v.lry_model as model',
        'v.lry_ownership as vehicle_ownership',
        'v.lry_owner_name as owner_name',
        'v.lry_active as lry_active'
      )
      .where('m.owner_bp_id', owner_bp_id)
      .andWhere('m.status', 'A')
      .orderBy('m.lry_regis_no');
    if (tenant_id) query.andWhere('m.tenant_id', tenant_id);
    return query;
  },

  async listAvailable(tenant_id, owner_bp_id) {
    const attachedQuery = db(TABLE)
      .select('vehicle_rec_id')
      .where({ status: 'A' });
    if (tenant_id) attachedQuery.andWhere({ tenant_id });

    const query = db(VEHICLE)
      .select(
        'rec_id as vehicle_rec_id',
        'lry_regis_no',
        'lry_vehicle_type as vehicle_type',
        'lry_make as make',
        'lry_model as model',
        'lry_ownership as vehicle_ownership',
        'lry_owner_name as owner_name',
        'lry_active'
      )
      .whereNotIn('rec_id', attachedQuery)
      .orderBy('lry_regis_no');
    if (tenant_id) query.andWhere({ tenant_id });
    return query;
  },

  async getOwnerByVehicle(tenant_id, vehicleNo) {
    const veh = String(vehicleNo || '').replace(/\s+/g, '').toUpperCase();
    if (!veh) return null;
    const query = db(`${TABLE} as m`)
      .leftJoin(`${BP} as bp`, 'bp.record_id', 'm.owner_bp_id')
      .select(
        'm.owner_bp_id',
        'm.lry_regis_no',
        'bp.bp_name as owner_name',
        'bp.bp_grp_code as owner_code',
        'bp.bp_pan_no',
        'bp.bp_mobile1'
      )
      .where('m.status', 'A')
      .whereRaw("REPLACE(UPPER(TRIM(COALESCE(m.lry_regis_no, ''))), ' ', '') = ?", [veh]);
    if (tenant_id) query.andWhere('m.tenant_id', tenant_id);
    return query.first();
  },

  async attach(user, tenant_id, { owner_bp_id, vehicle_rec_ids }) {
    if (!tenant_id) throw fail(400, 'Tenant is required');
    if (!owner_bp_id) throw fail(400, 'Please select a lorry owner');
    const ids = [...new Set((vehicle_rec_ids || []).map((id) => Number(id)).filter((n) => Number.isFinite(n)))];
    if (!ids.length) throw fail(400, 'Please select at least one vehicle to attach');

    const owner = await db(BP)
      .where({ record_id: owner_bp_id, tenant_id })
      .first();
    if (!owner) throw fail(400, 'Lorry owner not found');
    if (!isLorryOwner(owner)) throw fail(400, 'Selected partner is not a Lorry Owner supplier');

    const vehicles = await db(VEHICLE)
      .whereIn('rec_id', ids)
      .modify((q) => { if (tenant_id) q.andWhere({ tenant_id }); });
    if (vehicles.length !== ids.length) throw fail(400, 'One or more vehicles were not found');

    const taken = await db(TABLE)
      .whereIn('vehicle_rec_id', ids)
      .andWhere({ status: 'A', tenant_id });
    if (taken.length) {
      const other = taken.find((r) => Number(r.owner_bp_id) !== Number(owner_bp_id));
      if (other) {
        throw fail(400, `Vehicle ${other.lry_regis_no} is already attached to another owner`);
      }
    }
    const already = new Set(taken.map((r) => Number(r.vehicle_rec_id)));
    const toInsert = vehicles.filter((v) => !already.has(Number(v.rec_id)));
    if (!toInsert.length) {
      return this.listAttached(tenant_id, owner_bp_id);
    }

    const now = new Date();
    const userId = actor(user);
    await db(TABLE).insert(toInsert.map((v) => ({
      tenant_id,
      owner_bp_id,
      vehicle_rec_id: v.rec_id,
      lry_regis_no: v.lry_regis_no,
      status: 'A',
      attached_on: now,
      record_created_by: userId,
      record_created_on: now,
    })));

    return this.listAttached(tenant_id, owner_bp_id);
  },

  async detach(user, tenant_id, { owner_bp_id, rec_ids }) {
    if (!owner_bp_id) throw fail(400, 'Please select a lorry owner');
    const ids = [...new Set((rec_ids || []).map((id) => Number(id)).filter((n) => Number.isFinite(n)))];
    if (!ids.length) throw fail(400, 'Please select at least one vehicle to detach');

    const now = new Date();
    const query = db(TABLE)
      .whereIn('rec_id', ids)
      .andWhere({ owner_bp_id, status: 'A' });
    if (tenant_id) query.andWhere({ tenant_id });
    await query.update({
      status: 'D',
      detached_on: now,
      record_updated_by: actor(user),
      record_updated_on: now,
    });

    return this.listAttached(tenant_id, owner_bp_id);
  },
};
