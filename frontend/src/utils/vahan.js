import Api from '../services/Api';

export const normalizeVehicleNo = (val) =>
  String(val || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const toDate = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  if (!s || /^na$/i.test(s)) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const yearFrom = (val) => {
  const d = toDate(val);
  if (d) return d.slice(0, 4);
  const m = String(val || "").match(/(19|20)\d{2}/);
  return m ? m[0] : "";
};

const parseMaybeJson = (val) => {
  if (typeof val !== "string") return val;
  const s = val.trim();
  if (!s) return null;
  if (s[0] === "{" || s[0] === "[") {
    try { return JSON.parse(s); } catch { return val; }
  }
  return val;
};

const errorFromItem = (item, payload) => {
  const msg = item?.message;
  if (msg && typeof msg === "object" && msg.text) return msg.text;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof item?.response === "string" && item.response && item.responseStatus === "ERROR") return item.response;
  if (item?.responseStatus === "ERROR") return "Vahan returned no details for this vehicle.";
  if (typeof payload?.message === "string" && payload.message && payload.message !== "Success") return payload.message;
  return "Vahan returned no details.";
};

export const unwrapVahan = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { vehicle: null, error: "Vahan returned no details." };
  }
  if (payload.rcRegnNo || payload.rc_regn_no) return { vehicle: payload, error: null };
  const item = Array.isArray(payload.response) ? payload.response[0] : payload.response;
  const inner = parseMaybeJson(item?.response ?? (item && !item.responseStatus ? item : null));
  if (inner && typeof inner === "object" && (inner.rcRegnNo || inner.rc_regn_no)) {
    return { vehicle: inner, error: null };
  }
  return { vehicle: null, error: errorFromItem(item, payload) };
};

export const fetchVahanByVehicleNo = (vehicleNo) =>
  Api.get("/public/vahan/vehicle", { params: { vehicleNumber: normalizeVehicleNo(vehicleNo) } })
    .then((r) => unwrapVahan(r.data?.data || r.data));

const BODY_TYPE_OPTIONS = ["Open Body", "Closed Body", "Container", "Tanker", "Flat Bed", "Refrigerated", "Hydraulic"];
const FUEL_TYPE_OPTIONS = ["Diesel", "Petrol", "CNG", "LNG", "Electric", "Hybrid"];
const FUEL_CODE_MAP = { D: "Diesel", P: "Petrol", C: "CNG", L: "LNG", E: "Electric", B: "Electric", G: "CNG" };

export const matchLorryFuelType = (raw, code) => {
  const s = String(raw || "").trim();
  if (s) {
    const exact = FUEL_TYPE_OPTIONS.find((o) => o.toLowerCase() === s.toLowerCase());
    if (exact) return exact;
    const compact = s.replace(/[\s/_-]+/g, "").toLowerCase();
    if (/diesel/.test(compact)) return "Diesel";
    if (/petrol|motorspirit|\bms\b/.test(compact)) return "Petrol";
    if (/electric|bov|ev/.test(compact)) return "Electric";
    if (/hybrid/.test(compact)) return "Hybrid";
    if (/lng/.test(compact)) return "LNG";
    if (/cng|cngkit/.test(compact)) return "CNG";
    return s;
  }
  const cd = String(code || "").trim().toUpperCase();
  return FUEL_CODE_MAP[cd] || "";
};

export const matchLorryBodyType = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  const exact = BODY_TYPE_OPTIONS.find((o) => o.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  const compact = s.replace(/[\s_-]+/g, "").toLowerCase();
  if (/close/.test(compact)) return "Closed Body";
  if (/open/.test(compact)) return "Open Body";
  if (/container/.test(compact)) return "Container";
  if (/tank/.test(compact)) return "Tanker";
  if (/flat/.test(compact)) return "Flat Bed";
  if (/refrig|reefer/.test(compact)) return "Refrigerated";
  if (/hydraulic/.test(compact)) return "Hydraulic";
  return s;
};

const cleanVahanText = (val) => {
  if (val == null) return "";
  const s = String(val).trim();
  if (!s || /^(na|n\/a|null|undefined|-)$/i.test(s)) return "";
  return s;
};

export const mapVahanToLorryForm = (v) => {
  if (!v) return {};
  const g = (...keys) => {
    for (const k of keys) {
      const val = cleanVahanText(v[k]);
      if (val) return val;
    }
    return "";
  };
  const blacklist = String(g("rcBlacklistStatus", "rc_blacklist_status") || "").trim();
  const status = String(g("rcStatus", "rc_status") || "").toUpperCase();
  const financer = g("rcFinancer", "rc_financer", "rcFinancier", "rc_financier", "financier", "financer", "rcHypth", "rc_hypth");
  return {
    owner_name: g("rcOwnerName", "rc_owner_name"),
    chassis_no: g("rcChasiNo", "rc_chasi_no"),
    engine_no: g("rcEngNo", "rc_eng_no"),
    make: g("rcMakerDesc", "rc_maker_desc"),
    model: g("rcMakerModel", "rc_maker_model"),
    body_type: matchLorryBodyType(g("rcBodyTypeDesc", "rc_body_type_desc")),
    fuel_type: matchLorryFuelType(g("rcFuelDesc", "rc_fuel_desc"), g("rcFuelCd", "rc_fuel_cd")),
    emission_stage: g("rcNormsDesc", "rc_norms_desc"),
    financer,
    hp_status: financer ? "Active" : "",
    insurance_company_name: g("rcInsuranceComp", "rc_insurance_comp"),
    insurance_policy_no: g("rcInsurancePolicyNo", "rc_insurance_policy_no"),
    insurance_to_date: toDate(g("rcInsuranceUpto", "rc_insurance_upto")),
    fitness_exp_date: toDate(g("rcFitUpto", "rc_fit_upto")),
    tax_exp_date: toDate(g("rcTaxUpto", "rc_tax_upto")),
    unladen_weight_kg: g("rcUnldWt", "rc_unld_wt"),
    carrying_capacity_kg: g("rcGvw", "rc_gvw"),
    puc_exp_date: toDate(g("rcPuccUpto", "rc_pucc_upto")),
    black_listed: !blacklist || /^na$/i.test(blacklist) ? "No" : "Yes",
    is_active: status.includes("ACTIVE") ? "Active" : status ? "Inactive" : "Active",
    regis_rto: g("rcRegisteredAt", "rc_registered_at") || g("rtoCd", "rto_cd"),
    regis_year: yearFrom(g("rcRegnDt", "rc_regn_dt") || g("rcManuMonthYr", "rc_manu_month_yr")),
    _vahanClass: g("rcVhClassDesc", "rc_vh_class_desc") || g("rcVchCatgDesc", "rc_vch_catg_desc"),
  };
};
