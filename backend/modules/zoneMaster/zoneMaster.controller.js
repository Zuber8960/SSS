const db = require('../../config/db');

const ZONE_TABLE = 'sss.ssm_cust_zone';

module.exports = {

    async getAllZoneData(tenant_id) {
        const query = db(ZONE_TABLE).select('*');
        if (tenant_id) query.where({ tenant_id });
        return query.orderBy('record_id', 'asc');
    },

    async getZoneDataByRecId(recId, tenant_id) {
        const query = db(ZONE_TABLE).where({ record_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.first();
    },

    async saveZoneData(userId, payload) {
        // zone_code is intentionally omitted — DB default nextval('sss.ssm_cust_zone_code_seq') generates it
        const record = {
            tenant_id: payload.tenant_id,
            loc_code: payload.loc_code || null,
            cust_code: payload.cust_code || null,
            cust_name: payload.cust_name || null,
            zone_name: payload.zone_name || null,
            record_created_by: userId,
            record_created_on: new Date(),
        };
        return db(ZONE_TABLE).insert(record).returning('*');
    },

    async updateZoneData(recId, payload, tenant_id, userId) {
        const updates = {
            loc_code: payload.loc_code || null,
            cust_code: payload.cust_code || null,
            cust_name: payload.cust_name || null,
            zone_name: payload.zone_name || null,
            record_updated_by: userId,
            record_updated_on: new Date(),
        };
        const query = db(ZONE_TABLE).where({ record_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.update(updates).returning('*');
    },

    async deleteZoneData(recId, tenant_id) {
        const query = db(ZONE_TABLE).where({ record_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.del();
    }
};
