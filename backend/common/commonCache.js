const db = require('../config/db');

// ── State / City cache ───────────────────────────────────────────────────────
let _stateCityCache = null;

async function getStatesWithCities() {
    if (_stateCityCache) return _stateCityCache;

    const query = db('sss.ssm_state as s')
        .leftJoin('sss.ssm_city as c', 'c.state_code', 's.state_code')
        .select('s.state_code', 's.state_name', 's.gst_state_code', 's.zone_name',
                'c.city_code', 'c.city_name', 'c.district_name')
        .where('s.status', 'A')
        .orderBy(['s.state_name', 'c.city_name']);
    const rows = await query;

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

    _stateCityCache = { states: Array.from(stateMap.values()), cities };
    return _stateCityCache;
}

function clearStateCityCache() {
    _stateCityCache = null;
}

// ── Add more cached lookups below as needed ──────────────────────────────────

module.exports = {
    getStatesWithCities,
    clearStateCityCache,
};
