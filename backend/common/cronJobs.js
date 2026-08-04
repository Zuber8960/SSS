const cron = require('node-cron');
const axios = require('axios');
const db = require('../config/db');

// ─── WheelsEye ────────────────────────────────────────────────────────────────

const WHEELSEYE_API_URL = process.env.WHEELSEYE_API_URL;
const WHEELSEYE_ACCESS_TOKEN = process.env.WHEELSEYE_ACCESS_TOKEN;

async function fetchWheelseyeLocation() {
    try {
        const response = await axios.get(WHEELSEYE_API_URL, {
            params: { accessToken: WHEELSEYE_ACCESS_TOKEN },
            timeout: 900000, // 15 minutes
        });

        const vehicles = response.data?.data?.list || [];

        if (!vehicles.length) {
            console.log(`[Wheelseye Cron] ${new Date().toISOString()} - No vehicle data returned`);
            return;
        }

        const rows = vehicles.map(v => ({
            gps_provider: 'we',
            vehicle_no: v.vehicleNumber || '',
            device_id: v.deviceNumber || null,
            latitude: v.latitude != null ? parseFloat(v.latitude) : null,
            longitude: v.longitude != null ? parseFloat(v.longitude) : null,
            speed: v.speed != null ? parseFloat(v.speed) : null,
            ignition: v.ignition != null ? Boolean(v.ignition) : null,
            gps_datetime: v.dttimeInEpoch ? new Date(v.dttimeInEpoch * 1000) : null,
            gps_epoch: v.dttimeInEpoch || null,
            location: null,
            provider_name: v.provider || null,
            vehicle_type: v.vehicleType || null,
            vendor_code: v.vendorCode || null,
            vendor_name: v.venndorName || null,
            angle: v.angle != null ? parseFloat(v.angle) : null,
            charge_on: null,
            accurate: v.accurate != null ? Boolean(v.accurate) : null,
            temperature_status: null,
            raw_response: JSON.stringify(v),
            created_on: new Date(),
        }));

        await db('sss.sst_cargo_yarn_gps_data').insert(rows);
        console.log(`[Wheelseye Cron] ${new Date().toISOString()} - Inserted ${rows.length} records`);
    } catch (error) {
        console.error(`[Wheelseye Cron] ${new Date().toISOString()} - Error:`, error.message);
        if (error.response) {
            console.error('[Wheelseye Cron] Status:', error.response.status);
            console.error('[Wheelseye Cron] Data:', JSON.stringify(error.response.data));
        }
    }
}

// ─── ManiTrack ────────────────────────────────────────────────────────────────

const MANITRACK_API_URL = process.env.MANITRACK_API_URL;
const MANITRACK_USER = process.env.MANITRACK_USER;
const MANITRACK_PASS = process.env.MANITRACK_PASS;

// ManiTrack date format: "04-08-2026 09:55:12" (DD-MM-YYYY HH:mm:ss)
function parseManitrackDate(dateStr) {
    const [datePart, timePart] = dateStr.split(' ');
    const [dd, mm, yyyy] = datePart.split('-');
    return new Date(`${yyyy}-${mm}-${dd}T${timePart}`);
}

async function fetchManitrackLocation() {
    try {
        const response = await axios.get(MANITRACK_API_URL, {
            params: { user: MANITRACK_USER, pass: MANITRACK_PASS },
            timeout: 900000, // 15 minutes
        });

        const vehicles = response.data?.detail_data || [];

        if (!vehicles.length) {
            console.log(`[Manitrack Cron] ${new Date().toISOString()} - No vehicle data returned`);
            return;
        }

        const rows = vehicles.map(v => ({
            gps_provider: 'mt',
            vehicle_no: v.vehicle_no || '',
            device_id: v.device_id || null,
            latitude: v.latitude != null ? parseFloat(v.latitude) : null,
            longitude: v.longitude != null ? parseFloat(v.longitude) : null,
            speed: v.speed != null ? parseFloat(v.speed) : null,
            ignition: v.ignition_status != null ? v.ignition_status === '1' : null,
            gps_datetime: v.date_time ? parseManitrackDate(v.date_time) : null,
            gps_epoch: null,
            location: v.location || null,
            provider_name: null,
            vehicle_type: null,
            vendor_code: null,
            vendor_name: v['vehicle name'] || null,
            angle: null,
            charge_on: null,
            accurate: null,
            temperature_status: v['temperature_status '] || v.temperature_status || null,
            raw_response: JSON.stringify(v),
            created_on: new Date(),
        }));

        await db('sss.sst_cargo_yarn_gps_data').insert(rows);
        console.log(`[Manitrack Cron] ${new Date().toISOString()} - Inserted ${rows.length} records`);
    } catch (error) {
        console.error(`[Manitrack Cron] ${new Date().toISOString()} - Error:`, error.message);
        if (error.response) {
            console.error('[Manitrack Cron] Status:', error.response.status);
            console.error('[Manitrack Cron] Data:', JSON.stringify(error.response.data));
        }
    }
}

// ─── Schedule all jobs ────────────────────────────────────────────────────────

function initCronJobs() {
    cron.schedule('*/1 * * * *', () => {
        console.log(`[Wheelseye Cron] ${new Date().toISOString()} - Running scheduled job`);
        fetchWheelseyeLocation();
    });

    cron.schedule('*/1 * * * *', () => {
        console.log(`[Manitrack Cron] ${new Date().toISOString()} - Running scheduled job`);
        fetchManitrackLocation();
    });

    // Run once immediately on startup
    fetchWheelseyeLocation();
    fetchManitrackLocation();
}

module.exports = {
    initCronJobs,
    fetchWheelseyeLocation,
    fetchManitrackLocation,
};
