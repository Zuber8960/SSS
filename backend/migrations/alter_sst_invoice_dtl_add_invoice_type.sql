-- Copy billing type onto invoice details (same value as sst_invoice_hdr.invoice_type).
-- Header was VARCHAR(1), which cannot store DN (Debit Note).

BEGIN;

ALTER TABLE sss.sst_invoice_hdr
  ALTER COLUMN invoice_type TYPE VARCHAR(10);

ALTER TABLE sss.sst_invoice_dtl
  ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(10);

UPDATE sss.sst_invoice_dtl d
SET invoice_type = h.invoice_type
FROM sss.sst_invoice_hdr h
WHERE d.invoice_no IS NOT DISTINCT FROM h.invoice_no
  AND d.invoice_date IS NOT DISTINCT FROM h.invoice_date
  AND d.invoice_loc IS NOT DISTINCT FROM h.loc_code
  AND (d.invoice_type IS NULL OR TRIM(d.invoice_type) = '');

UPDATE sss.sst_invoice_hdr SET invoice_type = 'R' WHERE invoice_type IN ('C', 'Regular');
UPDATE sss.sst_invoice_hdr SET invoice_type = 'D' WHERE invoice_type IN ('DN', 'Debit Note');
UPDATE sss.sst_invoice_dtl SET invoice_type = 'R' WHERE invoice_type IN ('C', 'Regular');
UPDATE sss.sst_invoice_dtl SET invoice_type = 'D' WHERE invoice_type IN ('DN', 'Debit Note');

COMMIT;
