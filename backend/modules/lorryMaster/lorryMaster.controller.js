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

const VARCHAR_LIMITS = {
  lry_ownership: 20,
  lry_branch_code: 20,
  lry_regis_no: 30,
  lry_chasis_no: 50,
  lry_engine_no: 50,
  lry_make: 100,
  lry_model: 100,
  lry_body_type: 100,
  lry_active: 1,
  lry_tax_doc_no: 50,
  lry_tax_place: 50,
  lry_fleet_no: 30,
  lry_regis_rto: 100,
  lry_insur_policy_no: 80,
  lry_insur_type: 80,
  lry_insur_co: 150,
  lry_black_listed_flg: 1,
  driver_pay_type: 50,
  emission_stage: 80,
  fuel_type: 50,
  fuel_tank_capacity: 50,
  def_tank_capacity: 50,
  financer: 150,
  loan_no: 50,
  hp_status: 50,
  def_to_fuel_ratio: 50,
  lry_vehicle_type: 80,
  lry_owner_name: 200,
  aud_user: 50,
  aud_branch: 20,
};

function clipStr(value, max) {
  if (value == null) return value;
  const str = String(value);
  if (str.trim() === '') return str;
  return str.length > max ? str.slice(0, max) : str;
}

function clipPayload(row) {
  const out = { ...row };
  for (const [col, max] of Object.entries(VARCHAR_LIMITS)) {
    if (out[col] != null) out[col] = clipStr(out[col], max);
  }
  return out;
}

/**
 * Map frontend form fields to database column names
 */
function mapFormToDb(payload) {
  return {
    // --- NOT NULL varchar ---
    lry_ownership: s(payload.vehicle_ownership),
    lry_owner_name: payload.owner_name,
    lry_vehicle_type: payload.vehicle_type,
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
    lry_insur_to: d(payload.insurance_to_date),
    lry_black_listed_flg: toYn(payload.black_listed),
    max_no_tyres: toNum(payload.max_no_tyres),
    volume_cbm: toNum(payload.volume_cbm),
    driver_pay_type: payload.driver_pay_type,
    emission_stage: payload.emission_stage,
    puc_exp_date: d(payload.puc_exp_date),
    fuel_type: payload.fuel_type,
    fuel_tank_capacity: payload.fuel_tank_capacity,
    def_tank_capacity: payload.def_tank_capacity,
    financer: payload.financer,
    loan_no: payload.loan_no,
    hp_status: payload.hp_status,
    def_to_fuel_ratio: payload.fuel_ratio,
    ground_clearence_mm: toNum(payload.ground_clearence_mm),
    ...(payload.doc_permit ? { permitfilepath: payload.doc_permit } : {}),
    ...(payload.doc_insurance ? { insaurancefilepath: payload.doc_insurance } : {}),
    ...(payload.doc_vehicle_rc ? { vehiclercfilepath: payload.doc_vehicle_rc } : {}),
    ...(payload.doc_fitness ? { fitnessfilepath: payload.doc_fitness } : {}),
    ...(payload.doc_pollution ? { pollutionfilepath: payload.doc_pollution } : {}),
  };
}

/**
 * Map DB row back to frontend-friendly format
 */
function mapDbToForm(row) {
  if (!row) return null;
  return {
    rec_id: row.rec_id,
    division_code: row.division_code,
    vehicle_ownership: ["Market", "Vendor", "Own"].includes(String(row.lry_ownership || "").trim())
      ? String(row.lry_ownership).trim()
      : "",
    owner_name: row.lry_owner_name
      || (["Market", "Vendor", "Own"].includes(String(row.lry_ownership || "").trim()) ? "" : (row.lry_ownership || "")),
    vehicle_type: row.lry_vehicle_type || "",
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
    unladen_weight_kg: row.lry_unladen_weight,
    carrying_capacity_kg: row.lry_capacity,
    length_mm: row.lry_length_ft,
    breadth_mm: row.lry_breadth_ft,
    height_mm: row.lry_height_ft,
    tax_exp_date: row.lry_tax_upto,
    regis_rto: row.lry_regis_rto,
    fitness_exp_date: row.lry_fitness_upto,
    insurance_policy_no: row.lry_insur_policy_no,
    insurance_type: row.lry_insur_type,
    insurance_to_date: row.lry_insur_to,
    insurance_company_name: row.lry_insur_co,
    black_listed: row.lry_black_listed_flg === 'Y' ? 'Yes' : 'No',
    max_no_tyres: row.max_no_tyres,
    volume_cbm: row.volume_cbm,
    driver_pay_type: row.driver_pay_type,
    emission_stage: row.emission_stage,
    puc_exp_date: row.puc_exp_date,
    fuel_type: row.fuel_type,
    fuel_tank_capacity: row.fuel_tank_capacity,
    def_tank_capacity: row.def_tank_capacity,
    financer: row.financer,
    loan_no: row.loan_no,
    hp_status: row.hp_status,
    fuel_ratio: row.def_to_fuel_ratio,
    ground_clearence_mm: row.ground_clearence_mm,
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

  _assertMandatory(payload) {
    if (!String(payload.vehicle_type || "").trim()) {
      const err = new Error("Vehicle Type is required");
      err.status = 400;
      throw err;
    }
    if (!String(payload.vehicle_ownership || "").trim()) {
      const err = new Error("Vehicle Ownership is required");
      err.status = 400;
      throw err;
    }
  },

  async create(recId, payload, session = {}) {
    this._assertMandatory(payload);
    let dbPayload = clipPayload(mapFormToDb(payload));

    dbPayload.tenant_id = session.tenant_id ?? null;
    dbPayload.division_code = toNum(session.division_code);
    dbPayload.aud_user = clipStr(recId, 50);
    dbPayload.aud_branch = clipStr(session.loc_code || payload.branch_code, 20);
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

  async update(recId, payload, session = {}) {
    this._assertMandatory(payload);
    const dbPayload = clipPayload(mapFormToDb(payload));
    ['permitfilepath', 'insaurancefilepath', 'vehiclercfilepath', 'fitnessfilepath', 'pollutionfilepath']
      .forEach((k) => { if (!dbPayload[k]) delete dbPayload[k]; });
    delete dbPayload.tenant_id;
    dbPayload.division_code = toNum(session.division_code);
    dbPayload.aud_user = clipStr(recId, 50);
    dbPayload.aud_branch = clipStr(session.loc_code || payload.branch_code, 20);
    dbPayload.aud_date = new Date();
    const query = db(TABLE).where({ rec_id: recId });
    if (session.tenant_id) query.andWhere({ tenant_id: session.tenant_id });
    const [row] = await query.update(dbPayload).returning('*');
    return mapDbToForm(row);
  },

  async remove(recId, tenant_id) {
    const query = db(TABLE).where({ rec_id: recId });
    if (tenant_id) query.andWhere({ tenant_id });
    return query.del();
  }
};