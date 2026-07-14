const db = require('../../config/db');

const TABLE = 'sss.ssm_vehicle_master';

/**
 * Map frontend form fields to database column names
 */
function mapFormToDb(payload) {
  return {
    company_code: payload.company_code,
    division_code: payload.division_code,
    lry_ownership: payload.owner_name,
    lry_branch_code: payload.branch_code,
    lry_regis_no: payload.vehicle_no,
    lry_chasis_no: payload.chassis_no,
    lry_engine_no: payload.engine_no,
    lry_regis_year: payload.regis_year,
    lry_make: payload.make,
    lry_model: payload.model,
    lry_body_type: payload.body_type,
    lry_active: payload.is_active === 'Active' ? 'Y' : 'N',
    lry_fleet_no: payload.fleet_no,
    lry_laden_weight: payload.laden_weight_kg,
    lry_unladen_weight: payload.unladen_weight_kg,
    lry_capacity: payload.carrying_capacity_kg,
    lry_length_ft: payload.length_mm,
    lry_breadth_ft: payload.breadth_mm,
    lry_height_ft: payload.height_mm,
    lry_tax_doc_no: payload.tax_token,
    lry_tax_from: payload.tax_from_date,
    lry_tax_upto: payload.tax_exp_date,
    lry_tax_place: payload.tax_issue_place,
    lry_regis_rto: payload.regis_rto,
    lry_fitness_from: payload.fitness_from_date,
    lry_fitness_upto: payload.fitness_exp_date,
    lry_insur_policy_no: payload.insurance_policy_no,
    lry_insur_type: payload.insurance_type,
    lry_insur_doc_no: payload.insurance_cert_no,
    lry_insur_amt: payload.insurance_amount,
    lry_insur_from: payload.insurance_from_date,
    lry_insur_to: payload.insurance_to_date,
    lry_insur_co: payload.insurance_company_name,
    lry_black_listed_flg: payload.black_listed === 'Yes' ? 'Y' : 'N',
    gps_provider: payload.gps_service_provider,
    max_no_tyres: payload.max_no_tyres,
    no_of_fitted_tyre: payload.num_fitted_tyre,
    no_of_stapney: payload.num_stepney,
    volume_cbm: payload.volume_cbm,
    floor_type: payload.floor_type,
    toll_tag_1: payload.fastag_provider,
    tolltag_no_1: payload.fastag_id,
    driver_pay_type: payload.driver_pay_type,
    emission_stage: payload.emission_stage,
    puc_no: payload.puc_no,
    puc_exp_date: payload.puc_exp_date,
    cabin_type: payload.cabin_type,
    battery_capacity: payload.battery_capacity,
    fuel_type: payload.fuel_type,
    fuel_tank_capacity: payload.fuel_tank_capacity,
    def_tank_capacity: payload.def_tank_capacity,
    financer: payload.financer,
    loan_no: payload.loan_no,
    hp_status: payload.hp_status,
    first_aid_yn: payload.has_first_aid ? 'Y' : 'N',
    fire_extng_yn: payload.has_fire_extinguisher ? 'Y' : 'N',
    speed_gnor_yn: payload.has_speed_governor ? 'Y' : 'N',
    abs_yn: payload.has_abs ? 'Y' : 'N',
    camera_rare_view_yn: payload.has_rear_view_camera ? 'Y' : 'N',
    jack_n_rod_yn: payload.has_jack ? 'Y' : 'N',
    tool_kit_yn: payload.has_tool_kit ? 'Y' : 'N',
    cabin_ac_yn: payload.has_cabin ? 'Y' : 'N',
    engine_power: payload.engine_power_hp,
    def_to_fuel_ratio: payload.fuel_ratio,
    ground_clearence_mm: payload.ground_clearence_mm,
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

  async getAll(recId, company_code) {
    const query = db(TABLE).select('*');
    if (company_code) query.where({ company_code });
    const rows = await query;
    return rows.map(mapDbToForm);
  },
  async getByVehicleId(vehicleId, company_code) {
    const query = db(TABLE).where({ lry_regis_no: vehicleId });
    if (company_code) query.andWhere({ company_code });
    const row = await query.first();
    return mapDbToForm(row);
  },

  async getByRecId(recId, company_code) {
    const query = db(TABLE).where({ rec_id: recId });
    if (company_code) query.andWhere({ company_code });
    const row = await query.first();
    return mapDbToForm(row);
  },

  async create(recId, payload, company_code) {
    let dbPayload = mapFormToDb(payload);

    dbPayload.company_code = payload.company_code || company_code;
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

  async update(recId, payload, company_code) {
    const dbPayload = mapFormToDb(payload);
    delete dbPayload.company_code;
    dbPayload.aud_user = recId;
    dbPayload.aud_branch = payload.branch_code;
    dbPayload.aud_date = new Date();
    const query = db(TABLE).where({ rec_id: recId });
    if (company_code) query.andWhere({ company_code });
    const [row] = await query.update(dbPayload).returning('*');
    return mapDbToForm(row);
  },

  async remove(recId, company_code) {
    const query = db(TABLE).where({ rec_id: recId });
    if (company_code) query.andWhere({ company_code });
    return query.del();
  }
};