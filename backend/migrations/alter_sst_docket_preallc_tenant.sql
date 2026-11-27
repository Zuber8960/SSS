ALTER TABLE sss.sst_docket_preallc
  ADD COLUMN IF NOT EXISTS tenant_id integer;

CREATE INDEX IF NOT EXISTS sst_docket_preallc_tenant_idx
  ON sss.sst_docket_preallc (tenant_id);
