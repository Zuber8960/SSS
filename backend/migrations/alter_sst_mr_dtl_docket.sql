ALTER TABLE sss.sst_mr_dtl
  ADD COLUMN IF NOT EXISTS docket_no varchar(50),
  ADD COLUMN IF NOT EXISTS docket_date date,
  ADD COLUMN IF NOT EXISTS docket_loc varchar(20);

CREATE INDEX IF NOT EXISTS sst_mr_dtl_docket_idx
  ON sss.sst_mr_dtl (docket_no, docket_date, docket_loc);
