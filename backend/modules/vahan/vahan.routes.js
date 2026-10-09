const express = require('express');
const router = express.Router();
const { getVehicleByNumber, getVehicleByChassis, getVehicleByEngine } = require('./vahan.controller');

router.get('/vehicle', getVehicleByNumber);
router.get('/chassis', getVehicleByChassis);
router.get('/engine', getVehicleByEngine);

module.exports = router;
