const db = require('../../config/db');

const TABLE = 'sss.ssm_vehicle_master';

/**
 * Normalise a checkbox/flag value coming from the client into 'Y' / 'N'.
 *
 * The frontend submits multipart/form-data, so every value arrives as a STRING.
 * A naive truthy check would turn the string "false" into 'Y' (non-empty strings
 * are truthy), silently marking every equipment checkbox as ticked. Accept the
 * real booleans too, because JSON callers still send them.
 */
function toYn(value) {
  if (value === true) return 'Y';
  if (value === false || value === null || value === undefined) return 'N';
  const s = String(value).trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1' ? 'Y' : 'N';
}

/**
 * Coerce a value for a numeric/date column.
 *
 * The frontend posts multipart/form-data, so every field arrives as a STRING.
 * PostgreSQL rejects '' for numeric/date with:
 *   invalid input syntax for type numeric: ""
 * so blanks must become NULL. Rows in these tables have NOT NULL numeric/date
 * columns, so callers fall back to a safe zero/epoch where NULL is not allowed.
 */
const NUMERIC_FALLBACK = 0;
const DATE_FALLBACK = '1900-01-01';

function toNum(value, fallback = null) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Accepts Date, 'YYYY-MM-DD' and Date-ish strings; returns null for blanks.
function toDate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const d = (v) => toDate(v);          // nullable date
const dn = (v) => toDate(v) || DATE_FALLBACK;  // NOT NULL date
const nn = (v) => toNum(v, NUMERIC_FALLBACK);   // NOT NULL numeric
const s = (v) => (v === null || v === undefined ? '' : String(v)); // NOT NULL varchar

/**
 * Map frontend form fields to database column names
 */
function mapFormToDb(payload) {
  return {
    company_code: toNum(payload.company_code),
    division_code: toNum(payload.division_code),
    // --- NOT NULL varchar ---
    lry_ownership: s(payload.owner_name),
    lry_branch_code: s(payload.branch_code),
    lry_regis_no: s(payload.vehicle_no),
    lry_chasis_no: s(payload.chassis_no),
    lry_engine_no: s(payload.engine_no),
    lry_make: s(payload.make),
    lry_model: s(payload.model),
    lry_body_type: s(payload.body_type),
    lry_active: toYn(payload.is_active === 'Active' ? 'Y' : 'N'),
    lry_tax_doc_no: s(payload.tax_token),
    lry_tax_place: s(payload.tax_issue_place),
    lry_insur_co: s(payload.insurance_company_name),
    // --- NOT NULL numeric ---
    lry_regis_year: nn(payload.regis_year),
    lry_laden_weight: nn(payload.laden_weight_kg),
    lry_unladen_weight: nn(payload.unladen_weight_kg),
    lry_capacity: nn(payload.carrying_capacity_kg),
    lry_length_ft: nn(payload.length_mm),
    lry_breadth_ft: nn(payload.breadth_mm),
    lry_height_ft: nn(payload.height_mm),
    // --- NOT NULL date ---
    lry_tax_from: dn(payload.tax_from_date),
    lry_tax_upto: dn(payload.tax_exp_date),
    lry_fitness_from: dn(payload.fitness_from_date),
    lry_fitness_upto: dn(payload.fitness_exp_date),
    // --- nullable ---
    lry_fleet_no: payload.fleet_no,
    lry_regis_rto: payload.regis_rto,
    lry_insur_policy_no: payload.insurance_policy_no,
    lry_insur_type: payload.insurance_type,
    lry_insur_doc_no: payload.insurance_cert_no,
    lry_insur_amt: toNum(payload.insurance_amount),
    lry_insur_from: d(payload.insurance_from_date),
    lry_insur_to: d(payload.insurance_to_date),
    lry_black_listed_flg: toYn(payload.black_listed),
    gps_provider: payload.gps_service_provider,
    max_no_tyres: toNum(payload.max_no_tyres),
    no_of_fitted_tyre: toNum(payload.num_fitted_tyre),
    no_of_stapney: toNum(payload.num_stepney),
    volume_cbm: toNum(payload.volume_cbm),
    floor_type: payload.floor_type,
    toll_tag_1: payload.fastag_provider,
    tolltag_no_1: payload.fastag_id,
    driver_pay_type: payload.driver_pay_type,
    emission_stage: payload.emission_stage,
    puc_no: payload.puc_no,
    puc_exp_date: d(payload.puc_exp_date),
    cabin_type: payload.cabin_type,
    battery_capacity: payload.battery_capacity,
    fuel_type: payload.fuel_type,
    fuel_tank_capacity: payload.fuel_tank_capacity,
    def_tank_capacity: payload.def_tank_capacity,
    financer: payload.financer,
    loan_no: payload.loan_no,
    hp_status: payload.hp_status,
    first_aid_yn: toYn(payload.has_first_aid),
    fire_extng_yn: toYn(payload.has_fire_extinguisher),
    speed_gnor_yn: toYn(payload.has_speed_governor),
    abs_yn: toYn(payload.has_abs),
    camera_rare_view_yn: toYn(payload.has_rear_view_camera),
    jack_n_rod_yn: toYn(payload.has_jack),
    tool_kit_yn: toYn(payload.has_tool_kit),
    cabin_ac_yn: toYn(payload.has_cabin),
    engine_power: payload.engine_power_hp,
    def_to_fuel_ratio: payload.fuel_ratio,
    ground_clearence_mm: toNum(payload.ground_clearence_mm),
    tyre_size: payload.tyre_size,
    permitfilepath: payload.doc_permit,
    insaurancefilepath: payload.doc_insurance,
    vehiclercfilepath: payload.doc_vehicle_rc,
    fitnessfilepath: payload.doc_fitness,
    pollutionfilepath: payload.doc_pollution,
  };
}

/**
 * Map DB row back to frontend-friendly format
 */
function mapDbToForm(row) {
  if (!row) return null;
  return {
    rec_id: row.rec_id,
    company_code: row.company_code,
    division_code: row.division_code,
    owner_name: row.lry_ownership,
    branch_code: row.lry_branch_code,
    vehicle_no: row.lry_regis_no,
    chassis_no: row.lry_chasis_no,
    engine_no: row.lry_engine_no,
    regis_year: row.lry_regis_year,
    make: row.lry_make,
    model: row.lry_model,
    body_type: row.lry_body_type,
    is_active: row.lry_active === 'Y' ? 'Active' : 'Inactive',
    fleet_no: row.lry_fleet_no,
    laden_weight_kg: row.lry_laden_weight,
    unladen_weight_kg: row.lry_unladen_weight,
    carrying_capacity_kg: row.lry_capacity,
    length_mm: row.lry_length_ft,
    breadth_mm: row.lry_breadth_ft,
    height_mm: row.lry_height_ft,
    tax_token: row.lry_tax_doc_no,
    tax_from_date: row.lry_tax_from,
    tax_exp_date: row.lry_tax_upto,
    tax_issue_place: row.lry_tax_place,
    regis_rto: row.lry_regis_rto,
    fitness_from_date: row.lry_fitness_from,
    fitness_exp_date: row.lry_fitness_upto,
    insurance_policy_no: row.lry_insur_policy_no,
    insurance_type: row.lry_insur_type,
    insurance_cert_no: row.lry_insur_doc_no,
    insurance_amount: row.lry_insur_amt,
    insurance_from_date: row.lry_insur_from,
    insurance_to_date: row.lry_insur_to,
    insurance_company_name: row.lry_insur_co,
    black_listed: row.lry_black_listed_flg === 'Y' ? 'Yes' : 'No',
    gps_service_provider: row.gps_provider,
    max_no_tyres: row.max_no_tyres,
    num_fitted_tyre: row.no_of_fitted_tyre,
    num_stepney: row.no_of_stapney,
    volume_cbm: row.volume_cbm,
    floor_type: row.floor_type,
    fastag_provider: row.toll_tag_1,
    fastag_id: row.tolltag_no_1,
    driver_pay_type: row.driver_pay_type,
    emission_stage: row.emission_stage,
    puc_no: row.puc_no,
    puc_exp_date: row.puc_exp_date,
    cabin_type: row.cabin_type,
    battery_capacity: row.battery_capacity,
    fuel_type: row.fuel_type,
    fuel_tank_capacity: row.fuel_tank_capacity,
    def_tank_capacity: row.def_tank_capacity,
    financer: row.financer,
    loan_no: row.loan_no,
    hp_status: row.hp_status,
    has_first_aid: row.first_aid_yn === 'Y',
    has_fire_extinguisher: row.fire_extng_yn === 'Y',
    has_speed_governor: row.speed_gnor_yn === 'Y',
    has_abs: row.abs_yn === 'Y',
    has_rear_view_camera: row.camera_rare_view_yn === 'Y',
    has_jack: row.jack_n_rod_yn === 'Y',
    has_tool_kit: row.tool_kit_yn === 'Y',
    has_cabin: row.cabin_ac_yn === 'Y',
    engine_power_hp: row.engine_power,
    fuel_ratio: row.def_to_fuel_ratio,
    ground_clearence_mm: row.ground_clearence_mm,
    tyre_size: row.tyre_size,
    doc_permit: row.permitfilepath,
    doc_insurance: row.insaurancefilepath,
    doc_vehicle_rc: row.vehiclercfilepath,
    doc_fitness: row.fitnessfilepath,
    doc_pollution: row.pollutionfilepath,
    aud_user: row.aud_user,
    aud_branch: row.aud_branch,
    aud_date: row.aud_date,
  };
}

module.exports = {

  async getAll(recId, tenant_id) {
    const query = db(TABLE).select('*');
    if (tenant_id) query.where({ tenant_id });
    const rows = await query;
    return rows.map(mapDbToForm);
  },
  async getByVehicleId(vehicleId, tenant_id) {
    const query = db(TABLE).where({ lry_regis_no: vehicleId });
    if (tenant_id) query.andWhere({ tenant_id });
    const row = await query.first();
    return mapDbToForm(row);
  },

  async getByRecId(recId, tenant_id) {
    const query = db(TABLE).where({ rec_id: recId });
    if (tenant_id) query.andWhere({ tenant_id });
    const row = await query.first();
    return mapDbToForm(row);
  },

  async create(recId, payload, tenant_id) {
    let dbPayload = mapFormToDb(payload);

    dbPayload.tenant_id = tenant_id;
    dbPayload.aud_user = recId;
    dbPayload.aud_branch = payload.branch_code;
    dbPayload.aud_date = new Date();

    // ✅ remove undefined
    dbPayload = Object.fromEntries(
      Object.entries(dbPayload).filter(([_, v]) => v !== undefined)
    );

    try {
      const [row] = await db(TABLE)
        .insert(dbPayload)
        .returning("*");

      return mapDbToForm(row);
    } catch (err) {
      console.error("Insert failed:", err);
      throw err;
    }
  },

  async update(recId, payload, tenant_id) {
    const dbPayload = mapFormToDb(payload);
    delete dbPayload.tenant_id;
    dbPayload.aud_user = recId;
    dbPayload.aud_branch = payload.branch_code;
    dbPayload.aud_date = new Date();
    const query = db(TABLE).where({ rec_id: recId });
    if (tenant_id) query.andWhere({ tenant_id });
    const [row] = await query.update(dbPayload).returning('*');
    return mapDbToForm(row);
  },

  async remove(recId, tenant_id) {
    const query = db(TABLE).where({ rec_id: recId });
    if (tenant_id) query.andWhere({ tenant_id });
    return query.del();
  }
};