const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const TenantController = require('./tenant.controller');

/**
 * GET /
 * Returns all active tenants with their config values.
 * No auth required — used to populate tenant selection on the login screen.
 */
router.get('/', async (req, res) => {
  try {
    const tenants = await TenantController.getAllTenants();
    res.status(200).json({
      success: true,
      data: tenants
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenants'
    });
  }
});

/**
 * POST /login
 * Body: { userId, password }
 * Authenticates a tenant and returns tenant identity + full config JSONB.
 * No auth required — this is the pre-login endpoint.
 */
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'userId and password are required'
      });
    }

    const result = await TenantController.authenticateTenant(userId, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const { tenant, config_value } = result;

    const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
    const tenantToken = jwt.sign(
      {
        tenantCode: tenant.tenant_code,
        tenant_id: tenant.rec_id
      },
      secret,
      { expiresIn: '5h' }
    );

    return res.status(200).json({
      success: true,
      tenantCode: tenant.tenant_code,
      tenantSlug: config_value ? config_value.tenant_slug : null,
      config: config_value,
      tenantToken
    });
  } catch (error) {
    console.error('Tenant login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during tenant authentication'
    });
  }
});

module.exports = router;
