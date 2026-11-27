DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sss' AND table_name = 'sst_mr_hdr' AND column_name = 'instr_no'
  ) THEN
    ALTER TABLE sss.sst_mr_hdr RENAME COLUMN instr_no TO chq_utr_no;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sss' AND table_name = 'sst_mr_hdr' AND column_name = 'instr_date'
  ) THEN
    ALTER TABLE sss.sst_mr_hdr RENAME COLUMN instr_date TO chq_utr_date;
  END IF;
END $$;
