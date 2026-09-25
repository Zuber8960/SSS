const db = require('../../config/db');

const ZONE_TOWN_TABLE = 'sss.ssm_town_zone';

// Columns the client is allowed to write (audit columns are set by the API).
const UPDATABLE_COLUMNS = [
    'cust_loc_code', 'cust_code', 'cust_name',
    'zone_code', 'zone_name',
    'loc_code', 'town_name',
];

// Normalise a code / name so duplicates are detected case-insensitively.
const norm = (value) => String(value ?? '').trim().toUpperCase();

// '' / undefined / null → null (keeps VARCHAR columns tidy)
const orNull = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === '' ? null : text;
};

module.exports = {

    /** GET /zone-town?zone_code=&loc_code=&cust_code=&cust_loc_code= */
    async getAllZoneTowns(tenant_id, filters = {}) {
        const query = db(ZONE_TOWN_TABLE).select('*');
        if (tenant_id) query.where({ tenant_id });

        const { zone_code, loc_code, cust_code, cust_loc_code } = filters;
        if (zone_code !== undefined && zone_code !== null && zone_code !== '') {
            query.andWhere({ zone_code });
        }
        if (loc_code) query.andWhere({ loc_code });
        if (cust_code) query.andWhere({ cust_code });
        if (cust_loc_code) query.andWhere({ cust_loc_code });

        return query.orderBy('record_id', 'asc');
    },

    async getZoneTownByRecId(recId, tenant_id) {
        const query = db(ZONE_TOWN_TABLE).where({ record_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.first();
    },

    /**
     * Bulk-map towns to a zone.
     * payload: {
     *   cust_loc_code, cust_code, cust_name,     // customer header (parent zone)
     *   zone_code, zone_name,                    // zone being mapped
     *   towns: [{ loc_code, town_name }, ...]    // towns picked from the location master
     * }
     * Towns already mapped to the same zone (per location) are skipped, as are
     * duplicates inside the incoming batch itself.
     */
    async saveZoneTowns(userId, payload, tenant_id) {
        const { cust_loc_code, cust_code, cust_name, zone_code, zone_name, towns } = payload || {};

        if (!tenant_id) throw new Error('tenant_id is required');
        if (zone_code === undefined || zone_code === null || zone_code === '') {
            throw new Error('zone_code is required');
        }
        if (!Array.isArray(towns) || towns.length === 0) {
            throw new Error('towns array is required');
        }

        // Towns already mapped to this zone (case-insensitive: location + town name)
        const existingQuery = db(ZONE_TOWN_TABLE).where({ zone_code });
        existingQuery.andWhere({ tenant_id });
        const existing = await existingQuery;
        const existingKeys = new Set(existing.map((r) => `${norm(r.loc_code)}|${norm(r.town_name)}`));

        const seen = new Set();
        const toInsert = [];
        for (const t of towns) {
            if (!t || !t.loc_code || !t.town_name) continue;
            const key = `${norm(t.loc_code)}|${norm(t.town_name)}`;
            if (existingKeys.has(key) || seen.has(key)) continue;
            seen.add(key);
            toInsert.push({
                loc_code: String(t.loc_code).trim(),
                town_name: String(t.town_name).trim().toUpperCase(),
            });
        }

        if (toInsert.length === 0) return [];

        const now = new Date();
        const records = toInsert.map((t) => ({
            tenant_id,
            cust_loc_code: orNull(cust_loc_code),
            cust_code: orNull(cust_code),
            cust_name: orNull(cust_name),
            zone_code: Number(zone_code),
            zone_name: orNull(zone_name),
            loc_code: t.loc_code,
            town_name: t.town_name,
            record_created_by: userId,
            record_created_on: now,
        }));

        return db(ZONE_TOWN_TABLE).insert(records).returning('*');
    },

    /** PUT /zone-town/:recId — update a single town ↔ zone mapping. */
    async updateZoneTown(recId, payload, tenant_id, userId) {
        const updates = {};
        for (const column of UPDATABLE_COLUMNS) {
            if (payload == null || !(column in payload)) continue;
            if (column === 'zone_code') {
                const zoneCode = payload[column];
                updates[column] = (zoneCode === '' || zoneCode === null) ? null : Number(zoneCode);
            } else {
                updates[column] = orNull(payload[column]);
            }
        }

        if (Object.keys(updates).length === 0) {
            throw new Error('No updatable fields supplied');
        }
        if (updates.zone_code === null) {
            throw new Error('zone_code is required');
        }
        if ('town_name' in updates && updates.town_name === null) {
            throw new Error('town_name is required');
        }

        updates.record_updated_by = userId;
        updates.record_updated_on = new Date();

        const query = db(ZONE_TOWN_TABLE).where({ record_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.update(updates).returning('*');
    },

    async deleteZoneTown(recId, tenant_id) {
        const query = db(ZONE_TOWN_TABLE).where({ record_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.del();
    }
};
