const axios = require('axios');
const db = require('../../config/db');

const ULIP_BASE_URL = process.env.ULIP_BASE_URL || 'https://www.ulip.dpiit.gov.in';
const ULIP_USERNAME = process.env.ULIP_USERNAME;
const ULIP_PASSWORD = process.env.ULIP_PASSWORD;

// In-memory token cache — token expires in 30 min, we refresh at 28 min
let _tokenCache = { token: null, expiresAt: 0 };

async function getUlipToken() {
    if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
        return _tokenCache.token;
    }

    let res;
    try {
        res = await axios.post(
            `${ULIP_BASE_URL}/ulip/v1.0.0/user/login`,
            { username: ULIP_USERNAME, password: ULIP_PASSWORD },
            { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 15000 }
        );
    } catch (err) {
        console.error('[VAHAN] ULIP login failed:', err.response?.status, JSON.stringify(err.response?.data));
        throw new Error(`ULIP login failed (${err.response?.status ?? err.message})`);
    }

    // Mirror the exact extraction order from the working PowerShell script:
    //   loginJson.token  →  loginJson.response.token  →  loginJson.response.id
    const d = res.data;
    const token =
        d?.token ||
        d?.response?.token ||
        d?.response?.id ||
        d?.authToken;

    if (!token) {
        console.error('[VAHAN] Login response body:', JSON.stringify(d));
        throw new Error('ULIP login succeeded but token not found in response body');
    }

    _tokenCache = { token, expiresAt: Date.now() + 28 * 60 * 1000 };
    return token;
}

async function callVahan(endpoint, body) {
    const token = await getUlipToken();
    try {
        const res = await axios.post(
            `${ULIP_BASE_URL}/ulip/v1.0.0/VAHAN/${endpoint}`,
            body,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: 30000,
            }
        );
        return res.data;
    } catch (err) {
        console.error(`[VAHAN] VAHAN/${endpoint} failed:`, err.response?.status, JSON.stringify(err.response?.data));
        // If token was rejected (401/403/412), clear cache so next call re-authenticates
        if ([401, 403, 412].includes(err.response?.status)) {
            _tokenCache = { token: null, expiresAt: 0 };
        }
        throw err;
    }
}

// Maps camelCase VAHAN/04 JSON fields → snake_case DB columns and upserts
async function upsertVahanRecord(vehicleData) {
    const v = vehicleData;
    const row = {
        rc_regn_no:             v.rcRegnNo,
        rc_regn_dt:             v.rcRegnDt,
        rc_regn_upto:           v.rcRegnUpto,
        rc_purchase_dt:         v.rcPurchaseDt,
        rc_owner_sr:            v.rcOwnerSr,
        rc_owner_name:          v.rcOwnerName,
        state_cd:               v.stateCd,
        rto_cd:                 v.rtoCd,
        rc_registered_at:       v.rcRegisteredAt,
        rc_present_address:     v.rcPresentAddress,
        rc_permanent_address:   v.rcPermanentAddress,
        rc_vch_catg:            v.rcVchCatg,
        rc_vch_catg_desc:       v.rcVchCatgDesc,
        rc_vh_class:            v.rcVhClass,
        rc_vh_class_desc:       v.rcVhClassDesc,
        rc_vh_type:             v.rcVhType,
        rc_chasi_no:            v.rcChasiNo,
        rc_eng_no:              v.rcEngNo,
        rc_maker_desc:          v.rcMakerDesc,
        rc_maker_model:         v.rcMakerModel,
        rc_maker_cd:            v.rcMakerCd,
        rc_model_cd:            v.rcModelCd,
        rc_body_type_desc:      v.rcBodyTypeDesc,
        rc_fuel_desc:           v.rcFuelDesc,
        rc_fuel_cd:             v.rcFuelCd,
        rc_color:               v.rcColor,
        rc_norms_desc:          v.rcNormsDesc,
        rc_norms_cd:            v.rcNormsCd,
        rc_fit_upto:            v.rcFitUpto,
        rc_tax_upto:            v.rcTaxUpto,
        rc_tax_mode:            v.rcTaxMode,
        rc_passenger_tax:       v.rcPassengerTax,
        rc_goods_tax:           v.rcGoodsTax,
        rc_financer:            v.rcFinancer,
        rc_insurance_comp:      v.rcInsuranceComp,
        rc_insurance_policy_no: v.rcInsurancePolicyNo,
        rc_insurance_upto:      v.rcInsuranceUpto,
        rc_manu_month_yr:       v.rcManuMonthYr,
        rc_unld_wt:             v.rcUnldWt,
        rc_gvw:                 v.rcGvw,
        rc_no_cyl:              v.rcNoCyl,
        rc_cubic_cap:           v.rcCubicCap,
        rc_seat_cap:            v.rcSeatCap,
        rc_sleeper_cap:         v.rcSleeperCap,
        rc_stand_cap:           v.rcStandCap,
        rc_wheelbase:           v.rcWheelbase,
        rc_sale_amt:            v.rcSaleAmt,
        rc_own_catg_desc:       v.rcOwnCatgDesc,
        rc_owner_cd_desc:       v.rcOwnerCdDesc,
        rc_pucc_upto:           v.rcPuccUpto,
        rc_pucc_no:             v.rcPuccNo,
        rc_blacklist_status:    v.rcBlacklistStatus,
        rc_noc_details:         v.rcNocDetails,
        rc_noc_dt:              v.rcNocDt,
        rc_status:              v.rcStatus,
        rc_status_as_on:        v.rcStatusAsOn,
        rc_owner_history:       v.rcOwnerHistory ? JSON.stringify(v.rcOwnerHistory) : null,
        raw_response:           JSON.stringify(v),
        updated_at:             new Date(),
    };

    await db('sss.sst_vahan_rc_details')
        .insert(row)
        .onConflict('rc_regn_no')
        .merge();
}

// GET /vahan/vehicle?vehicleNumber=UP91L0001
// Uses VAHAN/04 — returns JSON vehicle data by registration number, saves to DB
async function getVehicleByNumber(req, res) {
    try {
        const { vehicleNumber } = req.query;
        if (!vehicleNumber) {
            return res.status(400).json({ success: false, message: 'vehicleNumber query param is required' });
        }

        const data = await callVahan('04', { vehiclenumber: vehicleNumber.toUpperCase().trim() });

        // Save/update the record in DB (fire-and-forget, don't block the response)
        const vehicleData = data?.response?.[0]?.response;
        if (vehicleData && vehicleData.rcRegnNo) {
            upsertVahanRecord(vehicleData).catch(err =>
                console.error('[VAHAN] DB upsert failed:', err.message)
            );
        }

        return res.json({ success: true, data });
    } catch (err) {
        return _handleError(res, err);
    }
}

// GET /vahan/chassis?chassisNumber=ME4JF509AH7069705
// Uses VAHAN/05 — returns JSON vehicle data by chassis number
async function getVehicleByChassis(req, res) {
    try {
        const { chassisNumber } = req.query;
        if (!chassisNumber) {
            return res.status(400).json({ success: false, message: 'chassisNumber query param is required' });
        }

        const data = await callVahan('05', { chasisnumber: chassisNumber.trim() });
        return res.json({ success: true, data });
    } catch (err) {
        return _handleError(res, err);
    }
}

// GET /vahan/engine?engineNumber=JF50E76069768
// Uses VAHAN/06 — returns JSON vehicle data by engine number
async function getVehicleByEngine(req, res) {
    try {
        const { engineNumber } = req.query;
        if (!engineNumber) {
            return res.status(400).json({ success: false, message: 'engineNumber query param is required' });
        }

        const data = await callVahan('06', { enginenumber: engineNumber.trim() });
        return res.json({ success: true, data });
    } catch (err) {
        return _handleError(res, err);
    }
}

// GET /vahan/fastag?vehicleNumber=RJ32GC2320
// Uses FASTAG/01 — returns FASTag details by vehicle registration number
async function getVehicleByFastag(req, res) {
    try {
        const { vehicleNumber } = req.query;
        if (!vehicleNumber) {
            return res.status(400).json({ success: false, message: 'vehicleNumber query param is required' });
        }

        const data = await callVahan('FASTAG/01', { vehiclenumber: vehicleNumber.toUpperCase().trim() });
        return res.json({ success: true, data });
    } catch (err) {
        return _handleError(res, err);
    }
}

function _handleError(res, err) {
    const status = err.response?.status || 500;
    const upstream = err.response?.data;

    if (upstream) {
        return res.status(status).json({ success: false, message: err.message, upstream });
    }
    return res.status(500).json({ success: false, message: err.message });
}

module.exports = { getVehicleByNumber, getVehicleByChassis, getVehicleByEngine, getVehicleByFastag };
