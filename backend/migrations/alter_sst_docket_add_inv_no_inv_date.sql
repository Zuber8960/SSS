ALTER TABLE sss.sst_docket
  ADD COLUMN IF NOT EXISTS docket_inv_no   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS docket_inv_date DATE;
