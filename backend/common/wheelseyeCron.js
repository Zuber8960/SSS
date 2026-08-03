const cron = require('node-cron');
const axios = require('axios');

const WHEELSEYE_API_URL = 'https://api.wheelseye.com/currentLoc';
const WHEELSEYE_ACCESS_TOKEN = '719f7eab-c485-48da-9ab4-8228ee191c05';

async function fetchWheelseyeLocation() {
    try {
        const response = await axios.get(WHEELSEYE_API_URL, {
            params: { accessToken: WHEELSEYE_ACCESS_TOKEN },
            timeout: 30000,
        });
        console.log(`[Wheelseye Cron] ${new Date().toISOString()} - API called successfully`);
        console.log('[Wheelseye Cron] Response:', JSON.stringify(response.data));
        return response.data;
    } catch (error) {
        console.error(`[Wheelseye Cron] ${new Date().toISOString()} - Error calling API:`, error.message);
        if (error.response) {
            console.error('[Wheelseye Cron] Status:', error.response.status);
            console.error('[Wheelseye Cron] Data:', JSON.stringify(error.response.data));
        }
        return null;
    }
}

// Run every 15 minutes
cron.schedule('*/1 * * * *', () => {
    console.log(`[Wheelseye Cron] ${new Date().toISOString()} - Running scheduled job`);
    fetchWheelseyeLocation();
});

// Optional: run once immediately on startup
fetchWheelseyeLocation();

module.exports = {
    fetchWheelseyeLocation,
};