const db = require('../../config/db');

module.exports = {
  getAllGroups: (tenant_id) => {
    const q = db('sss.ssm_material_group').select('material_group_code', 'material_group_desc').orderBy('material_group_desc');
    if (tenant_id) q.andWhere({ tenant_id });
    return q;
  },

  getSubGroups: (material_group_code, tenant_id) => {
    const q = db('sss.ssm_material_subgroup')
      .select('material_group_code', 'sub_group_code', 'subgroup_desc')
      .orderBy('subgroup_desc');
    if (material_group_code) q.andWhere({ material_group_code });
    if (tenant_id) q.andWhere({ tenant_id });
    return q;
  },
};
