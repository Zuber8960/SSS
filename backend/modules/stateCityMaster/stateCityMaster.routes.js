const express = require('express');
const router = express.Router();
const StateCityController = require('./stateCityMaster.controller');

// Returns { states: [...], cities: [...] } — both lists in one call, cached in memory
router.get('/', async (req, res) => {
    try {
        const data = await StateCityController.getStatesWithCities();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('StateCityMaster error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving state/city data' });
    }
});

module.exports = router;
