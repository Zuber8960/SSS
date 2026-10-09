const axios = require('axios');

const ULIP_BASE_URL = process.env.ULIP_BASE_URL || 'https://www.ulip.dpiit.gov.in';
const ULIP_USERNAME = process.env.ULIP_USERNAME;
const ULIP_PASSWORD = process.env.ULIP_PASSWORD;

// In-memory token cache — token expires in 30 min, we refresh at 28 min
let _tokenCache = { token: null, expiresAt: 0 };

async function getUlipToken() {
    if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
        return _tokenCache.token;
    }

    const res = await axios.post(
        `${ULIP_BASE_URL}/ulip/v1.0.0/user/login`,
        { username: ULIP_USERNAME, password: ULIP_PASSWORD },
        { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    // ULIP returns the token inside different keys depending on version
    const token =
        res.data?.token ||
        res.data?.data?.token ||
        res.data?.authToken;

    if (!token) throw new Error('ULIP login succeeded but no token found in response');

    _tokenCache = { token, expiresAt: Date.now() + 28 * 60 * 1000 };
    return token;
}

async function callVahan(endpoint, body) {
    const token = await getUlipToken();
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
}

// GET /vahan/vehicle?vehicleNumber=UP91L0001
// Uses VAHAN/04 — returns JSON vehicle data by registration number
async function getVehicleByNumber(req, res) {
    try {
        const { vehicleNumber } = req.query;
        if (!vehicleNumber) {
            return res.status(400).json({ success: false, message: 'vehicleNumber query param is required' });
        }

        const data = await callVahan('04', { vehiclenumber: vehicleNumber.toUpperCase().trim() });
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

function _handleError(res, err) {
    const status = err.response?.status || 500;
    const upstream = err.response?.data;

    if (upstream) {
        return res.status(status).json({ success: false, message: err.message, upstream });
    }
    return res.status(500).json({ success: false, message: err.message });
}

module.exports = { getVehicleByNumber, getVehicleByChassis, getVehicleByEngine };
