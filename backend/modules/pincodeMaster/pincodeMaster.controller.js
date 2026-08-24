const db = require('../../config/db');

// Whitelist of allowed columns for filtering (prevents SQL injection via keys)
const FILTER_COLUMNS = {
  id: 'id',
  circle_name: 'circle_name',
  region_name: 'region_name',
  division_name: 'division_name',
  office_name: 'office_name',
  pincode: 'pincode',
  office_type: 'office_type',
  district: 'district',
  state_code: 'state_code',
  state_name: 'state_name',
  latitude: 'latitude',
  longitude: 'longitude',
};

const filterValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== '';

module.exports = {
  // Fetch all pincode rows with optional dynamic filters based on any column.
  // Example: ?pincode=5000&state_name=telangana&district=hyd
  async getPincodeData(filters = {}) {
    const { limit, offset } = filters;

    let query = db('sss.sst_pincode_master');

    // Build dynamic where clauses from allowed filter keys
    for (const [key, column] of Object.entries(FILTER_COLUMNS)) {
      const value = filters[key];
      if (filterValue(value)) {
        const strValue = String(value).trim();
        // Exact match for id, pincode and state_code; ILIKE for descriptive fields
        if (column === 'id' || column === 'pincode' || column === 'state_code') {
          query = query.where(column, strValue);
        } else {
          query = query.whereILike(column, `%${strValue}%`);
        }
      }
    }

    if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
      query = query.limit(Number(limit));
    }
    if (Number.isFinite(Number(offset)) && Number(offset) >= 0) {
      query = query.offset(Number(offset));
    }

    return query.orderBy('pincode');
  },

  // Fetch a single pincode row by exact pincode value.
  async getPincodeByPincode(pincode) {
    if (!filterValue(pincode)) return null;
    return db('sss.sst_pincode_master')
      .whereILike('pincode', `%${String(pincode).trim()}%`)
  },

  // Fetch distinct states available in the master table (useful for dropdowns).
  async getDistinctStates() {
    return db('sss.sst_pincode_master')
      .distinct('state_code', 'state_name')
      .orderBy('state_name');
  },

  // Fetch distinct districts for a given state.
  async getDistrictsByState(stateName) {
    let query = db('sss.sst_pincode_master')
      .distinct('district')
      .whereNotNull('district')
      .orderBy('district');
    if (filterValue(stateName)) {
      query = query.whereILike('state_name', `%${String(stateName).trim()}%`);
    }
    return query;
  },
};