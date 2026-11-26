// Cargo Yaan is tenant 1. Rows saved before tenant tagging have a blank
// tenant and stay with that company. Every later tenant is strictly its own.
const LEGACY_TENANT_ID = 1;

const isLegacyTenant = (tenantId) => Number(tenantId) === LEGACY_TENANT_ID;

const applyTenant = (query, column, tenantId) => {
  if (tenantId == null || tenantId === '') return query.whereRaw('FALSE');
  if (isLegacyTenant(tenantId)) {
    return query.where(function () {
      this.where(column, tenantId).orWhereNull(column);
    });
  }
  return query.where(column, tenantId);
};

const applyInvoiceTenant = (query, tenantId, alias = '') => {
  const tenantCol = alias ? `${alias}.tenant_id` : 'tenant_id';
  const companyCol = alias ? `${alias}.company_code` : 'company_code';
  if (tenantId == null || tenantId === '') return query.whereRaw('FALSE');
  return query.where(function () {
    this.where(tenantCol, tenantId).orWhere(companyCol, tenantId);
    if (isLegacyTenant(tenantId)) {
      this.orWhere(function () {
        this.whereNull(tenantCol).whereNull(companyCol);
      });
    }
  });
};

const rowOwned = (rowTenant, requestTenant) => {
  if (requestTenant == null || requestTenant === '') return false;
  if (rowTenant == null || rowTenant === '') return isLegacyTenant(requestTenant);
  return String(rowTenant) === String(requestTenant);
};

// One bound tenant id, usable inside raw SQL: (col = ? OR (? = 1 AND col IS NULL))
const tenantSql = (column) => `(${column} = ? OR (? = 1 AND ${column} IS NULL))`;

module.exports = {
  LEGACY_TENANT_ID,
  isLegacyTenant,
  applyTenant,
  applyInvoiceTenant,
  rowOwned,
  tenantSql,
};
