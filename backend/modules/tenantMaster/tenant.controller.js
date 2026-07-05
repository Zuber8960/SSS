const db = require('../../config/db');

const getAllTenants = async () => {
  return db('sss.ssm_tenant_master as t')
    .join('sss.ssm_config as c', 't.tenant_code', 'c.config_key')
    .where({ 't.record_status': 0 })
    .select('t.user_id', 't.tenant_code', 'c.config_value');
};

const authenticateTenant = async (userId, password) => {
  try {
    const tenant = await db('sss.ssm_tenant_master')
      .where({
        user_id: userId,
        tenant_password: password,
        record_status: 0
      })
      .first();

    if (!tenant) {
      return null;
    }

    const config = await db('sss.ssm_config')
      .where({ config_key: tenant.tenant_code })
      .select('config_value')
      .first();

    return {
      tenant,
      config_value: config ? config.config_value : null
    };
  } catch (error) {
    console.error('Tenant authentication error:', error);
    throw error;
  }
};

module.exports = {
  getAllTenants,
  authenticateTenant
};
