const db = require('../../config/db');

let _cache = null;

module.exports = {
    clearCache() {
        _cache = null;
    },

    async getStatesWithCities() {
        if (_cache) return _cache;

        const rows = await db('sss.ssm_city as c')
            .join('sss.ssm_state as s', 'c.state_code', 's.state_code')
            .select(
                's.state_code',
                's.state_name',
                's.gst_state_code',
                's.zone_name',
                'c.city_code',
                'c.city_name',
                'c.district_name'
            )
            .where('s.status', 'A')
            .where('c.status', 'A')
            .orderBy(['s.state_name', 'c.city_name']);

        // Group into { states: [...], cities: [...] }
        const stateMap = new Map();
        const cities = [];

        for (const row of rows) {
            if (!stateMap.has(row.state_code)) {
                stateMap.set(row.state_code, {
                    state_code: row.state_code,
                    state_name: row.state_name,
                    gst_state_code: row.gst_state_code,
                    zone_name: row.zone_name,
                });
            }
            cities.push({
                state_code: row.state_code,
                city_code: row.city_code,
                city_name: row.city_name,
                district_name: row.district_name,
            });
        }

        _cache = {
            states: Array.from(stateMap.values()),
            cities,
        };

        return _cache;
    },
};
