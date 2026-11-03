-- One docket number per tenant.
ALTER TABLE sss.sst_docket
  ADD CONSTRAINT sst_docket_tenant_docket_no_uk UNIQUE (tenant_id, docket_no);
