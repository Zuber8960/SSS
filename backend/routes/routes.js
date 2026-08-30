// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const userRoutes = require("../modules/userMaster/user.routes");
const locationMasterRoutes = require("../modules/locationMaster/locationMaster.routes");
const companyMasterRoutes = require("../modules/companyMaster/companyMaster.routes");
const divisionMasterRoutes = require("../modules/divisionMaster/divisionMaster.routes");
const businessPartnerRoutes = require("../modules/businessPartner/businessPartner.routes");
const docketRoutes = require("../modules/docket/dcoket.routes");
const roleRoutes = require("../modules/roleMaster/role.routes");
const menuRoutes = require("../modules/menuMaster/menu.routes");
const userRoleRoutes = require("../modules/userRole/userRole.routes");
const tenantRoutes = require("../modules/tenantMaster/tenant.routes");
const UserController = require('../modules/userMaster/user.controller');
const TenantController = require('../modules/tenantMaster/tenant.controller');
const manifestRoutes = require("../modules/manifest/manifest.routes");
const lorryMasterRoutes = require("../modules/lorryMaster/lorryMaster.routes");
const hireVoucherRoutes = require("../modules/hireVoucher/hireVoucher.routes");
const materialGroupRoutes = require("../modules/materialGroup/materialGroup.routes");
const deliveryNoteRoutes = require("../modules/deliveryNote/deliveryNote.routes");
const customerBillRoutes = require("../modules/customerBill/customerBill.routes");
const cnsRoutes = require("../modules/manifest/cns.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");
const pincodeMasterRoutes = require("../modules/pincodeMaster/pincodeMaster.routes");
const LocationMasterController = require('../modules/locationMaster/locationMaster.controller');
const DocketController = require('../modules/docket/docket.controller');
const ManifestController = require('../modules/manifest/manifest.controller');
const { getStatesWithCities } = require("../common/commonCache");
const axios = require('axios');
const db = require('../config/db');

router.post('/login', async (req, res) => {
  try {
    const { userId, password, tenantToken, loc_id, division_code } = req.body;

    // Validate input
    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID and password are required'
      });
    }

    // Resolve tenant_id from tenant JWT
    let tenant_id = null,locId,divisionId;
    if (tenantToken) {
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
      const decoded = jwt.verify(tenantToken, secret);
      tenant_id = decoded.tenant_id ?? null;
    };


    // Authenticate user from database
    const user = await UserController.authenticateUser(userId, password, tenant_id);

    if (user) {
      // Fetch first loc_code for this tenant from ssm_location
      let query = db('sss.ssm_location')
        .where({ tenant_id: user.tenant_id })
        .orderBy('record_id', 'asc')
        .select('loc_id')
        .first();
      query.where({loc_code: loc_id});
      const locRow = await query;
      locId = locRow?.loc_id || '000';
      divisionId = division_code > 0 ? division_code : '0';

      // Generate JWT token
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
      const token = jwt.sign(
        {
          recId: user.rec_id,
          userId: user.user_id,
          userName: user.user_name,
          isAdmin: user.is_admin,
          tenant_id: user.tenant_id,
          locId,
          divisionId,
          loc_code: loc_id,
        },
        secret,
        { expiresIn: '24h' }
      );


      const authGet = await axios.get(
        'https://api.whitebooks.in/ewaybillapi/v1.03/authenticate',
        {
          params: {
            email: process.env.email,
            username: 'cargoyaan1_API_HAR',
            password: 'CYsss@221274',
          },
          headers: {
            accept: '*/*',
            ip_address: process.env.IP_ADDRESS,
            client_id: process.env.client_id,
            client_secret: process.env.client_secret,
            gstin: process.env.GSTIN,
          },
        }
      );

      console.log(authGet);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          rec_id: user.rec_id,
          user_id: user.user_id,
          user_name: user.user_name,
          email_id: user.email_id,
          mobile_no: user.mobile_no,
          is_admin: user.is_admin,
          tenant_id: user.tenant_id,
          loc_code: loc_id,
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid User ID or Password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { user_id, email_id, mobile_no, new_password } = req.body;
    console.log('Reset password request:', { user_id, email_id, mobile_no });

    // Validate input
    if (!user_id || !email_id || !mobile_no || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Email, Mobile No, and New Password are required'
      });
    }

    // Find user by user_id, email_id, and mobile_no
    const { err, user } = await UserController.getUserByCredentials(user_id, email_id, mobile_no);
    if (err.msg) {
      return res.status(400).json({
        success: false,
        message: err.msg
      });
    }

    // Update user's password
    await UserController.updateUserPassword(user.rec_id, new_password);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

// Public read-only endpoints (no auth) — used by dev tools and unauthenticated contexts
router.use('/pincodeMaster', pincodeMasterRoutes);

router.get('/public/locations', async (req, res) => {
  try {
    const data = await LocationMasterController.getAllLocationData(null, null);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Public locations error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving location data' });
  }
});

router.get('/public/docket/:docketNo', async (req, res) => {
  try {
    const data = await DocketController.getDocketByRecId(null, null, req.params.docketNo);
    if (data) res.json({ success: true, data });
    else res.status(404).json({ success: false, message: 'Docket not found' });
  } catch (error) {
    console.error('Public docket error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving docket' });
  }
});

router.get('/public/manifest/by-docket/:docketNo', async (req, res) => {
  try {
    const data = await ManifestController.getManifestsByDocketNo(req.params.docketNo);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Public manifest error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving manifests' });
  }
});

router.use('/tenant', tenantRoutes);
router.use('/user', authMiddleware, userRoutes);
router.use('/locationMaster', authMiddleware, locationMasterRoutes);
router.use('/companyMaster', authMiddleware, companyMasterRoutes);
router.use('/divisionMaster', authMiddleware, divisionMasterRoutes);
router.use('/businessPartner', authMiddleware, businessPartnerRoutes);
router.use('/docket', authMiddleware, docketRoutes);
router.use('/roleMaster', authMiddleware, roleRoutes);
router.use('/menuMaster', authMiddleware, menuRoutes);
router.use('/userRole', authMiddleware, userRoleRoutes);
router.use('/manifest', authMiddleware, manifestRoutes);
router.use('/lorryMaster', authMiddleware, lorryMasterRoutes);
router.use('/hireVoucher', authMiddleware, hireVoucherRoutes);
router.use('/materialGroup', authMiddleware, materialGroupRoutes);
router.use('/deliveryNote', authMiddleware, deliveryNoteRoutes);
router.use('/customerBill', authMiddleware, customerBillRoutes);
router.use('/cns', authMiddleware, cnsRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);
// pincodeMaster is mounted publicly above (no req.user dependency)

router.get('/stateCity', authMiddleware, async (req, res) => {
    try {
        const data = await getStatesWithCities();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('StateCityMaster error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving state/city data' });
    }
});

module.exports = router;
