const express = require('express');
const router = express.Router();
const { getVehicleByNumber, getVehicleByChassis, getVehicleByEngine, getVehicleByFastag } = require('./vahan.controller');

router.get('/vehicle', getVehicleByNumber);
router.get('/chassis', getVehicleByChassis);
router.get('/engine', getVehicleByEngine);
router.get('/fastag', getVehicleByFastag);

module.exports = router;
