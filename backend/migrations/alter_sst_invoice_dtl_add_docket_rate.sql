ALTER TABLE sss.sst_invoice_dtl
  ADD COLUMN IF NOT EXISTS docket_rate numeric(12,2),
  ADD COLUMN IF NOT EXISTS docket_rate_uom varchar(20);
