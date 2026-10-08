const express = require('express');
const router = express.Router();
const VehicleTypeController = require('./vehicleType.controller');

/* GET /vehicleType — list all vehicle-type rows (optionally ?status=VL filtered) */
router.get('/', async (req, res) => {
  try {
    const tenant_id = req.tenant_id;
    let data = await VehicleTypeController.getAll(tenant_id);

    const { status } = req.query;
    if (status) data = data.filter((r) => String(r.status) === String(status));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Vehicle Type error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving vehicle type data' });
  }
});

/* GET /vehicleType/types — distinct vehicle_type strings for dropdowns.
   NOTE: declared BEFORE '/:recId' so "types" isn't swallowed as a recId. */
router.get('/types', async (req, res) => {
  try {
    const tenant_id = req.tenant_id;
    let data = await VehicleTypeController.getTypes(tenant_id);

    const { status } = req.query;
    if (status) {
      const all = await VehicleTypeController.getAll(tenant_id);
      const allowed = new Set(
        all.filter((r) => String(r.status) === String(status)).map((r) => r.vehicle_type)
      );
      data = data.filter((t) => allowed.has(t));
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Vehicle Type error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving vehicle types' });
  }
});

/* GET /vehicleType/:recId — single row by rec_id */
router.get('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const tenant_id = req.tenant_id;
    const data = await VehicleTypeController.getByRecId(recId, tenant_id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Vehicle type not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Vehicle Type error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving vehicle type data' });
  }
});

module.exports = router;
